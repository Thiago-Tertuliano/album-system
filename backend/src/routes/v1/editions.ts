import type { FastifyPluginAsync } from 'fastify';
import type { SQL } from 'drizzle-orm';
import { eq, asc, and, or, sql } from 'drizzle-orm';
import { editions, stickerSlots, albumPages } from '../../db/schema.js';
import type { Db } from '../../db/client.js';
import { resolveStickerImageUrl } from '../../util/stickerImageUrl.js';
import { inferLastStickerCardsNumericId } from '../../lib/lastStickerCardImages.js';

function previewSourceUrl(meta: Record<string, unknown> | null): string | null {
  const u = meta?.source_url;
  return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null;
}

/** Evita comparar slug textual à coluna uuid (`22P02` no Postgres). */
function editionSlugOrIdWhere(idOrSlug: string): SQL {
  const trimmed = idOrSlug.trim();
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  if (uuidLike) {
    return or(eq(editions.slug, trimmed), eq(editions.id, trimmed))!;
  }
  return eq(editions.slug, trimmed);
}

const editionSelect = {
  id: editions.id,
  slug: editions.slug,
  name: editions.name,
  year: editions.year,
  host_country: editions.hostCountry,
  publisher: editions.publisher,
  cover_image_url: editions.coverImageUrl,
  sticker_total: editions.stickerTotal,
  status: editions.status,
  estimated_pack_price_cents: editions.estimatedPackPriceCents,
  collector_notes: editions.collectorNotes,
};

export type EditionsRoutesOpts = {
  stickerImageUrlTemplate?: string;
  stickerImageProxyTemplate?: string;
};

export const editionsRoutes = (db: Db, opts?: EditionsRoutesOpts): FastifyPluginAsync => {
  const tpl = opts?.stickerImageUrlTemplate;
  const proxyTpl = opts?.stickerImageProxyTemplate;

  return async (app) => {
    app.get('/editions', async (_req, reply) => {
      const rows = await db
        .select(editionSelect)
        .from(editions)
        .where(eq(editions.status, 'published'))
        .orderBy(asc(editions.year));

      return reply.send({ items: rows });
    });

    app.get<{ Params: { id: string } }>('/editions/:id', async (req, reply) => {
      const idOrSlug = req.params.id;
      const row = await db
        .select(editionSelect)
        .from(editions)
        .where(editionSlugOrIdWhere(idOrSlug))
        .limit(1);

      if (!row.length) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edição não encontrada' } });
      }

      return reply.send(row[0]);
    });

    app.get<{ Params: { id: string }; Querystring: { page?: string; limit?: string } }>(
      '/editions/:id/stickers',
      async (req, reply) => {
        const idOrSlug = req.params.id;
        const editionRows = await db
          .select({
            id: editions.id,
            slug: editions.slug,
            collector_notes: editions.collectorNotes,
          })
          .from(editions)
          .where(editionSlugOrIdWhere(idOrSlug))
          .limit(1);

        if (!editionRows.length) {
          return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edição não encontrada' } });
        }

        const editionId = editionRows[0].id;
        const editionSlug = editionRows[0].slug;
        const collectorNotes = editionRows[0].collector_notes;
        const limit = Math.min(Number(req.query.limit) || 500, 1000);
        const page = Math.max(Number(req.query.page) || 1, 1);
        const offset = (page - 1) * limit;

        const [{ total: totalRaw }] = await db
          .select({ total: sql<number>`cast(count(*) as int)` })
          .from(stickerSlots)
          .where(eq(stickerSlots.editionId, editionId));

        const total = Number(totalRaw ?? 0);

        const stickers = await db
          .select({
            id: stickerSlots.id,
            edition_id: stickerSlots.editionId,
            page_id: stickerSlots.pageId,
            album_label: stickerSlots.albumLabel,
            sort_index: stickerSlots.sortIndex,
            index_on_page: stickerSlots.indexOnPage,
            category: stickerSlots.category,
            is_special: stickerSlots.isSpecial,
            display_name: stickerSlots.displayName,
            team_code: stickerSlots.teamCode,
            team_name: stickerSlots.teamName,
            shirt_number: stickerSlots.shirtNumber,
            position: stickerSlots.position,
            image_url: stickerSlots.imageUrl,
            owned: stickerSlots.owned,
            duplicate_count: stickerSlots.duplicateCount,
            metadata: stickerSlots.metadata,
            page_number: albumPages.pageNumber,
          })
          .from(stickerSlots)
          .leftJoin(albumPages, eq(stickerSlots.pageId, albumPages.id))
          .where(and(eq(stickerSlots.editionId, editionId)))
          .orderBy(asc(stickerSlots.sortIndex))
          .limit(limit)
          .offset(offset);

        let lastStickerNid = inferLastStickerCardsNumericId(
          collectorNotes,
          stickers.map((r) => ({ metadata: r.metadata }))
        );

        if (lastStickerNid == null) {
          const metaSamples = await db
            .select({ metadata: stickerSlots.metadata })
            .from(stickerSlots)
            .where(eq(stickerSlots.editionId, editionId))
            .orderBy(asc(stickerSlots.sortIndex))
            .limit(80);
          lastStickerNid = inferLastStickerCardsNumericId(
            collectorNotes,
            metaSamples.map((r) => ({ metadata: r.metadata }))
          );
        }

        const items = stickers.map((row) => {
          const meta = row.metadata as Record<string, unknown> | null;
          return {
            ...row,
            image_url: resolveStickerImageUrl({
              storedUrl: row.image_url,
              albumLabel: row.album_label,
              editionSlug,
              template: tpl,
              lastStickerCardsNumericId: lastStickerNid,
              imageProxyTemplate: proxyTpl,
            }),
            preview_source_url: previewSourceUrl(meta),
          };
        });

        return reply.send({
          edition_id: editionId,
          page,
          limit,
          total,
          items,
        });
      }
    );

    app.patch<{
      Params: { id: string; stickerId: string };
      Body: { owned?: unknown; duplicate_count?: unknown };
    }>('/editions/:id/stickers/:stickerId/collection', async (req, reply) => {
      const idOrSlug = req.params.id;
      const { stickerId } = req.params;

      const editionRows = await db
        .select({ id: editions.id })
        .from(editions)
        .where(editionSlugOrIdWhere(idOrSlug))
        .limit(1);

      if (!editionRows.length) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edição não encontrada' } });
      }
      const editionId = editionRows[0].id;

      const patch: {
        owned?: boolean;
        duplicateCount?: number;
        updatedAt: SQL;
      } = { updatedAt: sql`now()` };

      if (req.body.owned !== undefined) {
        if (typeof req.body.owned !== 'boolean') {
          return reply.code(400).send({
            error: { code: 'BAD_REQUEST', message: 'Campo `owned` deve ser boolean.' },
          });
        }
        patch.owned = req.body.owned;
      }

      if (req.body.duplicate_count !== undefined) {
        if (
          typeof req.body.duplicate_count !== 'number' ||
          !Number.isInteger(req.body.duplicate_count) ||
          req.body.duplicate_count < 0
        ) {
          return reply.code(400).send({
            error: {
              code: 'BAD_REQUEST',
              message: 'Campo `duplicate_count` deve ser inteiro maior ou igual a zero.',
            },
          });
        }
        patch.duplicateCount = req.body.duplicate_count;
      }

      if (Object.keys(patch).length === 1) {
        return reply.code(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: 'Informe ao menos um campo para atualizar (`owned` ou `duplicate_count`).',
          },
        });
      }

      const updated = await db
        .update(stickerSlots)
        .set(patch)
        .where(and(eq(stickerSlots.id, stickerId), eq(stickerSlots.editionId, editionId)))
        .returning({
          id: stickerSlots.id,
          owned: stickerSlots.owned,
          duplicate_count: stickerSlots.duplicateCount,
        });

      if (!updated.length) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Figurinha não encontrada' } });
      }

      return reply.send(updated[0]);
    });

    /** Páginas do álbum com preview — navegação “folha inteira”. */
    app.get<{ Params: { id: string } }>('/editions/:id/pages', async (req, reply) => {
      const idOrSlug = req.params.id;
      const editionRows = await db
        .select({ id: editions.id })
        .from(editions)
        .where(editionSlugOrIdWhere(idOrSlug))
        .limit(1);

      if (!editionRows.length) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edição não encontrada' } });
      }

      const editionId = editionRows[0].id;
      const pages = await db
        .select({
          id: albumPages.id,
          page_number: albumPages.pageNumber,
          title: albumPages.title,
          preview_image_url: albumPages.previewImageUrl,
        })
        .from(albumPages)
        .where(eq(albumPages.editionId, editionId))
        .orderBy(asc(albumPages.pageNumber));

      return reply.send({ edition_id: editionId, items: pages });
    });
  };
};
