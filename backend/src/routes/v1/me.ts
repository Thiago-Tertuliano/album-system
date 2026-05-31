import type { FastifyPluginAsync } from 'fastify';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { editions, stickerSlots, userStickerProgress } from '../../db/schema.js';
import { editionSlugOrIdWhere } from '../../lib/editionLookup.js';
import { requireCollector } from '../../auth/requireCollector.js';

const progressUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        slot_id: z.string().uuid(),
        owned: z.boolean().optional(),
        duplicate_count: z.coerce.number().int().min(0).optional(),
      })
    )
    .min(1)
    .max(500),
});

const singleUpdateSchema = z.object({
  slot_id: z.string().uuid(),
  owned: z.boolean().optional(),
  duplicate_count: z.coerce.number().int().min(0).optional(),
});

export type MeRoutesOpts = {
  jwtSecret: string;
};

async function resolveEditionId(db: Db, idOrSlug: string) {
  const rows = await db
    .select({ id: editions.id })
    .from(editions)
    .where(editionSlugOrIdWhere(idOrSlug))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function upsertProgress(
  db: Db,
  userId: string,
  editionId: string,
  updates: { slot_id: string; owned?: boolean; duplicate_count?: number }[]
) {
  const results: { slot_id: string; owned: boolean; duplicate_count: number }[] = [];

  for (const u of updates) {
    const [slot] = await db
      .select({ id: stickerSlots.id })
      .from(stickerSlots)
      .where(and(eq(stickerSlots.id, u.slot_id), eq(stickerSlots.editionId, editionId)))
      .limit(1);

    if (!slot) continue;

    const [existing] = await db
      .select({
        owned: userStickerProgress.owned,
        duplicate_count: userStickerProgress.duplicateCount,
      })
      .from(userStickerProgress)
      .where(
        and(
          eq(userStickerProgress.userId, userId),
          eq(userStickerProgress.stickerSlotId, u.slot_id)
        )
      )
      .limit(1);

    const owned = u.owned !== undefined ? u.owned : (existing?.owned ?? false);
    const duplicateCount =
      u.duplicate_count !== undefined ? u.duplicate_count : (existing?.duplicate_count ?? 0);

    const [row] = await db
      .insert(userStickerProgress)
      .values({
        userId,
        stickerSlotId: u.slot_id,
        owned,
        duplicateCount,
        updatedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [userStickerProgress.userId, userStickerProgress.stickerSlotId],
        set: {
          owned,
          duplicateCount,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        slot_id: userStickerProgress.stickerSlotId,
        owned: userStickerProgress.owned,
        duplicate_count: userStickerProgress.duplicateCount,
      });

    if (row) results.push(row);
  }

  return results;
}

export const meRoutes = (db: Db, opts: MeRoutesOpts): FastifyPluginAsync => {
  return async (app) => {
    app.get<{ Params: { id: string } }>('/me/editions/:id/summary', async (req, reply) => {
      const collector = await requireCollector(req, reply, opts.jwtSecret);
      if (!collector) return;

      const editionId = await resolveEditionId(db, req.params.id);
      if (!editionId) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edição não encontrada' } });
      }

      const [{ total: totalRaw }] = await db
        .select({ total: sql<number>`cast(count(*) as int)` })
        .from(stickerSlots)
        .where(eq(stickerSlots.editionId, editionId));

      const total = Number(totalRaw ?? 0);

      const [{ owned: ownedRaw }] = await db
        .select({ owned: sql<number>`cast(count(*) as int)` })
        .from(userStickerProgress)
        .innerJoin(stickerSlots, eq(userStickerProgress.stickerSlotId, stickerSlots.id))
        .where(
          and(
            eq(userStickerProgress.userId, collector.sub),
            eq(stickerSlots.editionId, editionId),
            eq(userStickerProgress.owned, true)
          )
        );

      const owned = Number(ownedRaw ?? 0);
      const missing = Math.max(total - owned, 0);
      const percent = total > 0 ? Math.round((owned / total) * 1000) / 10 : 0;

      return reply.send({
        edition_id: editionId,
        total,
        owned,
        missing,
        percent,
      });
    });

    app.get<{ Params: { id: string } }>('/me/editions/:id/progress', async (req, reply) => {
      const collector = await requireCollector(req, reply, opts.jwtSecret);
      if (!collector) return;

      const editionId = await resolveEditionId(db, req.params.id);
      if (!editionId) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edição não encontrada' } });
      }

      const rows = await db
        .select({
          slot_id: userStickerProgress.stickerSlotId,
          owned: userStickerProgress.owned,
          duplicate_count: userStickerProgress.duplicateCount,
        })
        .from(userStickerProgress)
        .innerJoin(stickerSlots, eq(userStickerProgress.stickerSlotId, stickerSlots.id))
        .where(
          and(eq(userStickerProgress.userId, collector.sub), eq(stickerSlots.editionId, editionId))
        );

      const by_slot: Record<string, { owned: boolean; duplicate_count: number }> = {};
      for (const r of rows) {
        by_slot[r.slot_id] = { owned: r.owned, duplicate_count: r.duplicate_count };
      }

      return reply.send({ edition_id: editionId, by_slot });
    });

    app.patch<{ Params: { id: string }; Body: unknown }>(
      '/me/editions/:id/progress',
      async (req, reply) => {
        const collector = await requireCollector(req, reply, opts.jwtSecret);
        if (!collector) return;

        const editionId = await resolveEditionId(db, req.params.id);
        if (!editionId) {
          return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Edição não encontrada' } });
        }

        const body = req.body as Record<string, unknown>;
        let updates: { slot_id: string; owned?: boolean; duplicate_count?: number }[];

        if (Array.isArray(body?.updates)) {
          const parsed = progressUpdateSchema.safeParse(body);
          if (!parsed.success) {
            return reply.code(400).send({
              error: { code: 'BAD_REQUEST', message: 'Payload de progresso inválido.' },
            });
          }
          updates = parsed.data.updates.map((u) => ({
            slot_id: u.slot_id,
            owned: u.owned,
            duplicate_count: u.duplicate_count,
          }));
        } else {
          const parsed = singleUpdateSchema.safeParse(body);
          if (!parsed.success) {
            return reply.code(400).send({
              error: { code: 'BAD_REQUEST', message: 'Informe updates[] ou slot_id.' },
            });
          }
          updates = [
            {
              slot_id: parsed.data.slot_id,
              owned: parsed.data.owned,
              duplicate_count: parsed.data.duplicate_count,
            },
          ];
        }

        const applied = await upsertProgress(db, collector.sub, editionId, updates);
        return reply.send({ edition_id: editionId, applied });
      }
    );
  };
};
