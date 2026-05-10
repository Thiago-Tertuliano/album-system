import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema.js';
import { albumPages, editions, stickerSlots } from '../db/schema.js';
import type { ParsedSticker } from './parseLastStickerMarkdown.js';

type Db = PostgresJsDatabase<typeof schema>;
export type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0];

function urlLooksLikeDirectImage(url: string | undefined): url is string {
  if (!url) return false;
  const pathOnly = url.split('?')[0]?.toLowerCase() ?? '';
  return /\.(png|jpe?g|webp|gif|avif|svg)(\b|$)/.test(pathOnly);
}

export interface EditionMetaInput {
  slug: string;
  name: string;
  year: number;
  hostCountry?: string | null;
  publisher?: string;
  coverImageUrl?: string | null;
  status?: 'draft' | 'published' | 'archived';
  estimatedPackPriceCents?: number | null;
  collectorNotes?: Record<string, unknown> | null;
  /** ID interno LastSticker em /i/cards/{id}/{rótulo}.jpg — obtido via Microlink ou mapa de fallback. */
  lastStickerCardsNumericCollectionId?: number | null;
  lastStickerAlbumSlug?: string | null;
}

/** Substitui o catálogo mantendo o ID da edição quando ela já existe. */
export async function replaceEditionCatalog(
  tx: DbTransaction,
  meta: EditionMetaInput,
  stickers: ParsedSticker[],
  opts: { sourceTag: string }
) {
  const existing = await tx.select({ id: editions.id }).from(editions).where(eq(editions.slug, meta.slug));
  const collectorNotes = {
    ...(meta.collectorNotes ?? {}),
    import_source: opts.sourceTag,
    imported_at: new Date().toISOString(),
    ...(meta.lastStickerCardsNumericCollectionId != null &&
    Number.isFinite(meta.lastStickerCardsNumericCollectionId)
      ? { laststicker_cards_numeric_collection_id: meta.lastStickerCardsNumericCollectionId }
      : {}),
    ...(meta.lastStickerAlbumSlug ? { laststicker_album_slug: meta.lastStickerAlbumSlug } : {}),
  };

  let editionId: string;
  if (existing[0]?.id) {
    editionId = existing[0].id;
    await tx.delete(stickerSlots).where(eq(stickerSlots.editionId, editionId));
    await tx.delete(albumPages).where(eq(albumPages.editionId, editionId));
    await tx
      .update(editions)
      .set({
        name: meta.name,
        year: meta.year,
        hostCountry: meta.hostCountry ?? null,
        publisher: meta.publisher ?? 'Panini',
        coverImageUrl: meta.coverImageUrl ?? null,
        status: meta.status ?? 'published',
        stickerTotal: 0,
        estimatedPackPriceCents: meta.estimatedPackPriceCents ?? null,
        collectorNotes,
        updatedAt: new Date(),
      })
      .where(eq(editions.id, editionId));
  } else {
    const [editionRow] = await tx
      .insert(editions)
      .values({
        slug: meta.slug,
        name: meta.name,
        year: meta.year,
        hostCountry: meta.hostCountry ?? null,
        publisher: meta.publisher ?? 'Panini',
        coverImageUrl: meta.coverImageUrl ?? null,
        status: meta.status ?? 'published',
        stickerTotal: 0,
        estimatedPackPriceCents: meta.estimatedPackPriceCents ?? null,
        collectorNotes,
      })
      .returning({ id: editions.id });
    editionId = editionRow.id;
  }

  const sectionOrder: string[] = [];
  const seen = new Set<string>();
  for (const s of stickers) {
    const key = s.section.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      sectionOrder.push(s.section);
    }
  }

  const sectionToPageId = new Map<string, string>();

  let pageNum = 1;
  for (const sectionTitle of sectionOrder) {
    const [row] = await tx
      .insert(albumPages)
      .values({
        editionId,
        pageNumber: pageNum++,
        title: sectionTitle,
        previewImageUrl: null,
      })
      .returning({ id: albumPages.id });
    sectionToPageId.set(sectionTitle.toLowerCase(), row.id);
  }

  const indexOnPageBySection = new Map<string, number>();

  for (const s of stickers) {
    const secKey = s.section.toLowerCase();
    const pageId = sectionToPageId.get(secKey);
    if (!pageId) {
      throw new Error(`Seção não mapeada: ${s.section}`);
    }
    const idx = (indexOnPageBySection.get(secKey) ?? 0) + 1;
    indexOnPageBySection.set(secKey, idx);

    await tx.insert(stickerSlots).values({
      editionId,
      pageId,
      albumLabel: s.albumLabel,
      sortIndex: s.sortIndex,
      indexOnPage: idx,
      category: s.category,
      isSpecial: s.isSpecial,
      displayName: s.displayName,
      teamCode: null,
      teamName: s.teamName,
      shirtNumber: null,
      position: null,
      imageUrl: urlLooksLikeDirectImage(s.sourceUrl) ? s.sourceUrl : null,
      metadata: {
        laststicker_section: s.section,
        sticker_type: s.stickerType,
        source_url: s.sourceUrl ?? null,
      },
    });
  }

  await tx
    .update(editions)
    .set({
      stickerTotal: stickers.length,
      updatedAt: new Date(),
    })
    .where(eq(editions.id, editionId));

  return { editionId, stickersInserted: stickers.length };
}
