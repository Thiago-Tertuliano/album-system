import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import 'dotenv/config';
import { createDb } from '../db/client.js';
import { albumPages, editions, stickerSlots } from '../db/schema.js';

const editionPart = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int(),
  hostCountry: z.string().optional(),
  publisher: z.string().default('Panini'),
  coverImageUrl: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  estimatedPackPriceCents: z.number().int().nullable().optional(),
  collectorNotes: z.record(z.unknown()).nullable().optional(),
});

const pagePart = z.object({
  pageNumber: z.number().int().positive(),
  title: z.string().optional(),
  previewImageUrl: z.string().nullable().optional(),
});

const stickerPart = z.object({
  albumLabel: z.string().min(1),
  sortIndex: z.number().int().positive(),
  pageNumber: z.number().int().positive(),
  indexOnPage: z.number().int().nullable().optional(),
  category: z.string().min(1),
  isSpecial: z.boolean().default(false),
  displayName: z.string().min(1),
  teamCode: z.string().nullable().optional(),
  teamName: z.string().nullable().optional(),
  shirtNumber: z.number().int().nullable().optional(),
  position: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

const rootSchema = z.object({
  edition: editionPart,
  pages: z.array(pagePart),
  stickers: z.array(stickerPart),
});

async function main() {
  const fileArg = process.argv[2] ?? path.join(process.cwd(), 'data', 'example-edition.json');
  const raw = await fs.readFile(fileArg, 'utf8');
  const parsed = rootSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    process.exit(1);
  }

  const data = parsed.data;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL obrigatório');
    process.exit(1);
  }

  const force = process.env.FORCE_SEED === '1';
  const db = createDb(databaseUrl);

  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: editions.id }).from(editions).where(eq(editions.slug, data.edition.slug));

    let editionId: string | undefined = existing[0]?.id;

    if (editionId && !force) {
      console.log('Edição já existe; use FORCE_SEED=1 para recriar páginas e figurinhas.');
      return;
    }

    if (editionId && force) {
      await tx.delete(stickerSlots).where(eq(stickerSlots.editionId, editionId));
      await tx.delete(albumPages).where(eq(albumPages.editionId, editionId));
      await tx.delete(editions).where(eq(editions.id, editionId));
      editionId = undefined;
    }

    if (!editionId) {
      const inserted = await tx
        .insert(editions)
        .values({
          slug: data.edition.slug,
          name: data.edition.name,
          year: data.edition.year,
          hostCountry: data.edition.hostCountry,
          publisher: data.edition.publisher,
          coverImageUrl: data.edition.coverImageUrl ?? null,
          status: data.edition.status,
          stickerTotal: 0,
          estimatedPackPriceCents: data.edition.estimatedPackPriceCents ?? null,
          collectorNotes: data.edition.collectorNotes ?? null,
        })
        .returning({ id: editions.id });

      editionId = inserted[0].id;
    }

    if (!editionId) {
      throw new Error('Falha ao determinar editionId');
    }

    const pageMap = new Map<number, string>();

    for (const p of data.pages) {
      const [row] = await tx
        .insert(albumPages)
        .values({
          editionId,
          pageNumber: p.pageNumber,
          title: p.title ?? null,
          previewImageUrl: p.previewImageUrl ?? null,
        })
        .returning({ id: albumPages.id });
      pageMap.set(p.pageNumber, row.id);
    }

    for (const s of data.stickers) {
      const pageId = pageMap.get(s.pageNumber);
      if (!pageId) {
        throw new Error(`Figurinha albumLabel=${s.albumLabel} referencia pageNumber=${s.pageNumber} inexistente`);
      }

      await tx.insert(stickerSlots).values({
        editionId,
        pageId,
        albumLabel: s.albumLabel,
        sortIndex: s.sortIndex,
        indexOnPage: s.indexOnPage ?? null,
        category: s.category,
        isSpecial: s.isSpecial,
        displayName: s.displayName,
        teamCode: s.teamCode ?? null,
        teamName: s.teamName ?? null,
        shirtNumber: s.shirtNumber ?? null,
        position: s.position ?? null,
        imageUrl: s.imageUrl ?? null,
        metadata: s.metadata ?? null,
      });
    }

    const countRows = await tx
      .select({ id: stickerSlots.id })
      .from(stickerSlots)
      .where(eq(stickerSlots.editionId, editionId));

    await tx
      .update(editions)
      .set({
        stickerTotal: countRows.length,
        updatedAt: new Date(),
      })
      .where(eq(editions.id, editionId));

    console.log(`Seed OK — edition ${data.edition.slug}, figurinhas: ${countRows.length}`);
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
