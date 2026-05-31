import fs from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { SQL } from 'drizzle-orm';
import { and, asc, eq, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { albumPages, editions, stickerSlots } from '../../db/schema.js';
import { verifyAdminToken } from '../../auth/jwt.js';
import { parseLastStickerMarkdown } from '../../import/parseLastStickerMarkdown.js';
import type { ParsedSticker } from '../../import/parseLastStickerMarkdown.js';
import { replaceEditionCatalog } from '../../import/catalogUpsert.js';
import { resolveLastStickerCardsNumericId } from '../../lib/lastStickerCardImages.js';
import { runCacheStickerImagesJob } from '../../jobs/cacheStickerImages.js';

function editionSlugOrIdWhere(idOrSlug: string): SQL {
  const trimmed = idOrSlug.trim();
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  if (uuidLike) return or(eq(editions.slug, trimmed), eq(editions.id, trimmed))!;
  return eq(editions.slug, trimmed);
}

function normalizeEmpty(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function requireAdmin(req: FastifyRequest, reply: FastifyReply, jwtSecret: string) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  const payload = token ? verifyAdminToken(token, jwtSecret) : null;

  if (!payload) {
    await reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Token administrativo invalido.' } });
    return false;
  }

  return true;
}

const statusSchema = z.enum(['draft', 'published', 'archived']);
type EditionStatus = z.infer<typeof statusSchema>;
const nullableUrlSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().url().or(z.string().startsWith('/')).nullable().optional()
);

function normalizeStatus(value: string): EditionStatus {
  return statusSchema.safeParse(value).success ? (value as EditionStatus) : 'draft';
}

const editionCreateSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2),
  year: z.coerce.number().int().min(1800).max(2200),
  host_country: z.string().nullish(),
  publisher: z.string().min(1).default('Panini'),
  cover_image_url: nullableUrlSchema,
  status: statusSchema.default('draft'),
  estimated_pack_price_cents: z.coerce.number().int().nonnegative().nullish(),
  collector_notes: z.record(z.unknown()).nullish(),
});

const editionPatchSchema = editionCreateSchema.partial().omit({ slug: true });

const importSchema = z.object({
  markdown: z.string().min(20),
  source_tag: z.string().min(1).default('admin-laststicker-markdown'),
  status: statusSchema.optional(),
  collector_notes: z.record(z.unknown()).nullish(),
  run_cache_job: z.boolean().default(false),
  include_extra_sets: z.boolean().default(false),
});

const cacheJobSchema = z.object({
  include_extra_sets: z.boolean().default(false),
});

const pagePatchSchema = z.object({
  page_number: z.coerce.number().int().positive().optional(),
  title: z.string().nullish(),
  preview_image_url: nullableUrlSchema,
});

const stickerPatchSchema = z.object({
  page_id: z.string().uuid().nullable().optional(),
  album_label: z.string().min(1).optional(),
  sort_index: z.coerce.number().int().positive().optional(),
  index_on_page: z.coerce.number().int().positive().nullable().optional(),
  category: z.string().min(1).optional(),
  is_special: z.boolean().optional(),
  display_name: z.string().min(1).optional(),
  team_code: z.string().nullable().optional(),
  team_name: z.string().nullable().optional(),
  shirt_number: z.coerce.number().int().positive().nullable().optional(),
  position: z.string().nullable().optional(),
  image_url: nullableUrlSchema,
  metadata: z.record(z.unknown()).nullable().optional(),
});

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
  created_at: editions.createdAt,
  updated_at: editions.updatedAt,
};

const COVER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']);

export type AdminRoutesOpts = {
  jwtSecret: string;
};

function isBaseStickerType(stickerType: string): boolean {
  const normalized = stickerType.trim().toLowerCase();
  return normalized === '-' || normalized === 'foil' || normalized === 'metal';
}

function isStandardAlbumLabel(albumLabel: string): boolean {
  const label = albumLabel.trim();
  if (!label) return false;
  if (label.includes('-')) return false;
  if (/x$/i.test(label)) return false;

  return (
    /^\d{1,4}$/.test(label) ||
    /^00$/i.test(label) ||
    /^E\d{1,4}$/i.test(label) ||
    /^CB\d{1,4}$/i.test(label) ||
    /^FWC\d{1,3}$/i.test(label) ||
    /^[A-Z]{3}\d{1,2}$/i.test(label)
  );
}

function isStandardAlbumSticker(sticker: ParsedSticker): boolean {
  return isBaseStickerType(sticker.stickerType) && isStandardAlbumLabel(sticker.albumLabel);
}

function dedupeAndReindexStickers(stickers: ParsedSticker[]): {
  items: ParsedSticker[];
  duplicatesSkipped: number;
} {
  const seen = new Set<string>();
  const items: ParsedSticker[] = [];
  let duplicatesSkipped = 0;

  for (const sticker of stickers) {
    const key = sticker.albumLabel.trim().toLowerCase();
    if (seen.has(key)) {
      duplicatesSkipped += 1;
      continue;
    }
    seen.add(key);
    items.push({ ...sticker, sortIndex: items.length + 1 });
  }

  return { items, duplicatesSkipped };
}

export const adminRoutes = (db: Db, opts: AdminRoutesOpts): FastifyPluginAsync => {
  return async (app) => {
    app.addHook('preHandler', async (req, reply) => {
      const ok = await requireAdmin(req, reply, opts.jwtSecret);
      if (!ok) return reply;
    });

    app.get('/editions', async (_req, reply) => {
      const rows = await db.select(editionSelect).from(editions).orderBy(asc(editions.year), asc(editions.name));
      return reply.send({ items: rows });
    });

    app.get('/assets/covers', async (_req, reply) => {
      const coversDir = path.join(process.cwd(), 'public', 'covers');

      try {
        const files = await fs.readdir(coversDir, { withFileTypes: true });
        const items = files
          .filter((file) => file.isFile() && COVER_EXTENSIONS.has(path.extname(file.name).toLowerCase()))
          .map((file) => ({
            filename: file.name,
            path: `/static/covers/${encodeURIComponent(file.name)}`,
          }))
          .sort((a, b) => a.filename.localeCompare(b.filename));

        return reply.send({ items });
      } catch (err) {
        const code = err instanceof Error && 'code' in err ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === 'ENOENT') return reply.send({ items: [] });
        throw err;
      }
    });

    app.get<{ Params: { id: string } }>('/editions/:id', async (req, reply) => {
      const [row] = await db.select(editionSelect).from(editions).where(editionSlugOrIdWhere(req.params.id)).limit(1);
      if (!row) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edicao nao encontrada.' } });
      return reply.send(row);
    });

    app.post<{ Body: unknown }>('/editions', async (req, reply) => {
      const parsed = editionCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: 'Dados da edicao invalidos.',
            fields: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const input = parsed.data;
      const [existing] = await db.select({ id: editions.id }).from(editions).where(eq(editions.slug, input.slug)).limit(1);
      if (existing) {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Ja existe uma edicao com este slug. Altere o slug ou edite a edicao existente.',
            fields: {
              slug: ['Slug ja cadastrado.'],
            },
          },
        });
      }

      const [row] = await db
        .insert(editions)
        .values({
          slug: input.slug,
          name: input.name,
          year: input.year,
          hostCountry: normalizeEmpty(input.host_country),
          publisher: input.publisher,
          coverImageUrl: normalizeEmpty(input.cover_image_url),
          status: input.status,
          estimatedPackPriceCents: input.estimated_pack_price_cents ?? null,
          collectorNotes: input.collector_notes ?? null,
        })
        .returning(editionSelect);

      return reply.code(201).send(row);
    });

    app.patch<{ Params: { id: string }; Body: unknown }>('/editions/:id', async (req, reply) => {
      const parsed = editionPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Dados da edicao invalidos.' } });
      }

      const patch: Partial<typeof editions.$inferInsert> = { updatedAt: new Date() };
      const input = parsed.data;
      if (input.name !== undefined) patch.name = input.name;
      if (input.year !== undefined) patch.year = input.year;
      if (input.host_country !== undefined) patch.hostCountry = normalizeEmpty(input.host_country);
      if (input.publisher !== undefined) patch.publisher = input.publisher;
      if (input.cover_image_url !== undefined) patch.coverImageUrl = normalizeEmpty(input.cover_image_url);
      if (input.status !== undefined) patch.status = input.status;
      if (input.estimated_pack_price_cents !== undefined) {
        patch.estimatedPackPriceCents = input.estimated_pack_price_cents ?? null;
      }
      if (input.collector_notes !== undefined) patch.collectorNotes = input.collector_notes ?? null;

      const updated = await db.update(editions).set(patch).where(editionSlugOrIdWhere(req.params.id)).returning(editionSelect);
      if (!updated.length) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edicao nao encontrada.' } });
      }
      return reply.send(updated[0]);
    });

    app.delete<{ Params: { id: string } }>('/editions/:id', async (req, reply) => {
      const deleted = await db
        .delete(editions)
        .where(editionSlugOrIdWhere(req.params.id))
        .returning({ id: editions.id, slug: editions.slug, name: editions.name });

      if (!deleted.length) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edicao nao encontrada.' } });
      }

      return reply.send({ deleted: deleted[0] });
    });

    app.post<{ Params: { id: string }; Body: unknown }>('/editions/:id/import/laststicker-md', async (req, reply) => {
      const parsed = importSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: 'Snapshot Markdown invalido. Cole o checklist em Markdown copiado do LastSticker.',
            fields: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const [current] = await db.select(editionSelect).from(editions).where(editionSlugOrIdWhere(req.params.id)).limit(1);
      if (!current) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edicao nao encontrada.' } });
      }

      const parsedStickers = parseLastStickerMarkdown(parsed.data.markdown);
      const filteredStickers = parsed.data.include_extra_sets
        ? parsedStickers
        : parsedStickers.filter(isStandardAlbumSticker);
      const { items: stickers, duplicatesSkipped } = dedupeAndReindexStickers(filteredStickers);
      if (stickers.length === 0) {
        const message =
          parsedStickers.length > 0
            ? 'O checklist foi lido, mas nenhuma figurinha padrao sobrou depois do filtro. Verifique se os codigos seguem o padrao do album ou marque "Incluir extras/update sets".'
            : 'Nenhuma figurinha foi encontrada no Markdown. Copie a tabela/checklist em Markdown do LastSticker.';
        return reply.code(400).send({
          error: {
            code: 'BAD_REQUEST',
            message,
            details: {
              total_parsed: parsedStickers.length,
              total_filtered: parsedStickers.length - filteredStickers.length,
              include_extra_sets: parsed.data.include_extra_sets,
            },
          },
        });
      }

      const sampleUrl = stickers.find((s) => s.sourceUrl?.includes('laststicker.com/cards/'))?.sourceUrl;
      const { numericId, albumSlug } = await resolveLastStickerCardsNumericId(sampleUrl);
      const collectorNotes = {
        ...(current.collector_notes ?? {}),
        ...(parsed.data.collector_notes ?? {}),
      };

      const result = await db.transaction((tx) =>
        replaceEditionCatalog(
          tx,
          {
            slug: current.slug,
            name: current.name,
            year: current.year,
            hostCountry: current.host_country,
            publisher: current.publisher,
            coverImageUrl: current.cover_image_url,
            status: parsed.data.status ?? normalizeStatus(current.status),
            estimatedPackPriceCents: current.estimated_pack_price_cents,
            collectorNotes,
            lastStickerCardsNumericCollectionId: numericId,
            lastStickerAlbumSlug: albumSlug,
          },
          stickers,
          { sourceTag: parsed.data.source_tag }
        )
      );

      if (parsed.data.run_cache_job) {
        void runCacheStickerImagesJob({ editionSlug: current.slug }).catch((err) => {
          req.log.error({ err, edition_slug: current.slug }, 'cache sticker images job failed');
        });
      }

      return reply.send({
        ...result,
        cache_job_started: parsed.data.run_cache_job,
        total_parsed: parsedStickers.length,
        total_imported: stickers.length,
        total_filtered: parsedStickers.length - filteredStickers.length,
        duplicates_skipped: duplicatesSkipped,
      });
    });

    app.post<{ Params: { id: string }; Body: unknown }>('/editions/:id/jobs/cache-sticker-images', async (req, reply) => {
      const parsed = cacheJobSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Payload do job invalido.' } });
      }

      const [current] = await db
        .select({ slug: editions.slug })
        .from(editions)
        .where(editionSlugOrIdWhere(req.params.id))
        .limit(1);

      if (!current) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edicao nao encontrada.' } });
      }

      void runCacheStickerImagesJob({
        editionSlug: current.slug,
        includeExtraSets: parsed.data.include_extra_sets,
      }).catch((err) => {
        req.log.error({ err, edition_slug: current.slug }, 'cache sticker images job failed');
      });

      return reply.code(202).send({
        edition_slug: current.slug,
        job: 'cache-sticker-images',
        status: 'started',
      });
    });

    app.get<{ Params: { id: string } }>('/editions/:id/pages', async (req, reply) => {
      const [edition] = await db.select({ id: editions.id }).from(editions).where(editionSlugOrIdWhere(req.params.id)).limit(1);
      if (!edition) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edicao nao encontrada.' } });

      const rows = await db
        .select({
          id: albumPages.id,
          page_number: albumPages.pageNumber,
          title: albumPages.title,
          preview_image_url: albumPages.previewImageUrl,
        })
        .from(albumPages)
        .where(eq(albumPages.editionId, edition.id))
        .orderBy(asc(albumPages.pageNumber));
      return reply.send({ edition_id: edition.id, items: rows });
    });

    app.patch<{ Params: { pageId: string }; Body: unknown }>('/pages/:pageId', async (req, reply) => {
      const parsed = pagePatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Dados da pagina invalidos.' } });
      }

      const patch: Partial<typeof albumPages.$inferInsert> = {};
      if (parsed.data.page_number !== undefined) patch.pageNumber = parsed.data.page_number;
      if (parsed.data.title !== undefined) patch.title = normalizeEmpty(parsed.data.title);
      if (parsed.data.preview_image_url !== undefined) {
        patch.previewImageUrl = normalizeEmpty(parsed.data.preview_image_url);
      }

      const updated = await db
        .update(albumPages)
        .set(patch)
        .where(eq(albumPages.id, req.params.pageId))
        .returning({
          id: albumPages.id,
          page_number: albumPages.pageNumber,
          title: albumPages.title,
          preview_image_url: albumPages.previewImageUrl,
        });
      if (!updated.length) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Pagina nao encontrada.' } });
      }
      return reply.send(updated[0]);
    });

    app.get<{ Params: { id: string }; Querystring: { limit?: string; offset?: string } }>(
      '/editions/:id/stickers',
      async (req, reply) => {
        const [edition] = await db.select({ id: editions.id }).from(editions).where(editionSlugOrIdWhere(req.params.id)).limit(1);
        if (!edition) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edicao nao encontrada.' } });

        const limit = Math.min(Number(req.query.limit) || 200, 1000);
        const offset = Math.max(Number(req.query.offset) || 0, 0);
        const [{ total: totalRaw }] = await db
          .select({ total: sql<number>`cast(count(*) as int)` })
          .from(stickerSlots)
          .where(eq(stickerSlots.editionId, edition.id));

        const rows = await db
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
            metadata: stickerSlots.metadata,
            page_number: albumPages.pageNumber,
          })
          .from(stickerSlots)
          .leftJoin(albumPages, eq(stickerSlots.pageId, albumPages.id))
          .where(eq(stickerSlots.editionId, edition.id))
          .orderBy(asc(stickerSlots.sortIndex))
          .limit(limit)
          .offset(offset);

        return reply.send({ edition_id: edition.id, total: Number(totalRaw ?? 0), limit, offset, items: rows });
      }
    );

    app.patch<{ Params: { stickerId: string }; Body: unknown }>('/stickers/:stickerId', async (req, reply) => {
      const parsed = stickerPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Dados da figurinha invalidos.' } });
      }

      const patch: Partial<typeof stickerSlots.$inferInsert> = { updatedAt: new Date() };
      const input = parsed.data;
      if (input.page_id !== undefined) patch.pageId = input.page_id;
      if (input.album_label !== undefined) patch.albumLabel = input.album_label;
      if (input.sort_index !== undefined) patch.sortIndex = input.sort_index;
      if (input.index_on_page !== undefined) patch.indexOnPage = input.index_on_page;
      if (input.category !== undefined) patch.category = input.category;
      if (input.is_special !== undefined) patch.isSpecial = input.is_special;
      if (input.display_name !== undefined) patch.displayName = input.display_name;
      if (input.team_code !== undefined) patch.teamCode = normalizeEmpty(input.team_code);
      if (input.team_name !== undefined) patch.teamName = normalizeEmpty(input.team_name);
      if (input.shirt_number !== undefined) patch.shirtNumber = input.shirt_number;
      if (input.position !== undefined) patch.position = normalizeEmpty(input.position);
      if (input.image_url !== undefined) patch.imageUrl = normalizeEmpty(input.image_url);
      if (input.metadata !== undefined) patch.metadata = input.metadata;

      const updated = await db
        .update(stickerSlots)
        .set(patch)
        .where(eq(stickerSlots.id, req.params.stickerId))
        .returning({
          id: stickerSlots.id,
          album_label: stickerSlots.albumLabel,
          display_name: stickerSlots.displayName,
          sort_index: stickerSlots.sortIndex,
          updated_at: stickerSlots.updatedAt,
        });

      if (!updated.length) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Figurinha nao encontrada.' } });
      }

      const [row] = await db.select({ editionId: stickerSlots.editionId }).from(stickerSlots).where(eq(stickerSlots.id, req.params.stickerId));
      if (row?.editionId) {
        await db
          .update(editions)
          .set({ stickerTotal: sql<number>`(select cast(count(*) as int) from sticker_slots where edition_id = ${row.editionId})`, updatedAt: new Date() })
          .where(eq(editions.id, row.editionId));
      }

      return reply.send(updated[0]);
    });
  };
};
