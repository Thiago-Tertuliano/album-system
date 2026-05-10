/**
 * URLs públicas das thumbs LastSticker seguem /i/cards/{albumNumericId}/{album_label}.jpg
 * — não convém hotlink direto no browser (Cloudflare/CORP). Usamos proxy (ex.: images.weserv.nl).
 */

/** Fallback quando Microlink falha ou edição antiga sem notas — expandir conforme novos imports. */
export const LASTSTICKER_CARD_COLLECTION_FALLBACK: Record<string, number> = {
  panini_fifa_world_cup_2018: 3852,
};

export function parseLastStickerAlbumSlugFromCardUrl(cardUrl: string): string | null {
  const m = cardUrl.match(/laststicker\.com\/cards\/([^/]+)\//i);
  return m?.[1]?.trim() ?? null;
}

export async function fetchLastStickerCardsNumericIdViaMicrolink(sampleCardUrl: string): Promise<number | null> {
  try {
    const api = `https://api.microlink.io/?url=${encodeURIComponent(sampleCardUrl)}`;
    const res = await fetch(api, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { image?: { url?: string } };
    };
    const imgUrl = body?.data?.image?.url;
    if (typeof imgUrl !== 'string') return null;
    const m = imgUrl.match(/\/i\/cards\/(\d+)\//);
    return m?.[1] ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

export async function resolveLastStickerCardsNumericId(sampleCardUrl: string | undefined): Promise<{
  numericId: number | null;
  albumSlug: string | null;
}> {
  if (!sampleCardUrl?.includes('laststicker.com/cards/')) {
    return { numericId: null, albumSlug: null };
  }
  const albumSlug = parseLastStickerAlbumSlugFromCardUrl(sampleCardUrl);
  let numericId = await fetchLastStickerCardsNumericIdViaMicrolink(sampleCardUrl);

  if (numericId == null && albumSlug && LASTSTICKER_CARD_COLLECTION_FALLBACK[albumSlug]) {
    numericId = LASTSTICKER_CARD_COLLECTION_FALLBACK[albumSlug];
  }

  return { numericId, albumSlug };
}

export function inferLastStickerCardsNumericId(
  collectorNotes: unknown,
  stickerRows: Array<{ metadata: unknown }>
): number | undefined {
  const nidFromNotes = readNumericIdFromCollectorNotes(collectorNotes);
  if (nidFromNotes != null) return nidFromNotes;

  const slugNote =
    collectorNotes && typeof collectorNotes === 'object'
      ? (collectorNotes as Record<string, unknown>).laststicker_album_slug
      : undefined;
  if (typeof slugNote === 'string' && LASTSTICKER_CARD_COLLECTION_FALLBACK[slugNote]) {
    return LASTSTICKER_CARD_COLLECTION_FALLBACK[slugNote];
  }

  for (const row of stickerRows) {
    const meta = row.metadata as Record<string, unknown> | null;
    const src = meta?.source_url;
    if (typeof src !== 'string' || !src.includes('laststicker.com/cards/')) continue;
    const slug = parseLastStickerAlbumSlugFromCardUrl(src);
    if (slug && LASTSTICKER_CARD_COLLECTION_FALLBACK[slug]) {
      return LASTSTICKER_CARD_COLLECTION_FALLBACK[slug];
    }
  }
  return undefined;
}

function readNumericIdFromCollectorNotes(collectorNotes: unknown): number | undefined {
  if (!collectorNotes || typeof collectorNotes !== 'object') return undefined;
  const v = (collectorNotes as Record<string, unknown>).laststicker_cards_numeric_collection_id;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
