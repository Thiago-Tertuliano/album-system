import { lastStickerCardThumbUrl, applyStickerImageProxy } from './stickerThumbUrls.js';

/**
 * Ordem:
 * 1) URL gravada no banco (use `npm run job:cache-sticker-images` para persistir arquivos locais + URL)
 * 2) LastSticker via proxy (quando há ID da coleção)
 * 3) STICKER_IMAGE_URL_TEMPLATE
 */
export function resolveStickerImageUrl(params: {
  storedUrl: string | null | undefined;
  albumLabel: string;
  editionSlug: string;
  template: string | undefined;
  lastStickerCardsNumericId: number | undefined;
  imageProxyTemplate: string | undefined;
}): string | null {
  const storedRaw = params.storedUrl?.trim();
  if (storedRaw) return storedRaw;

  const nid = params.lastStickerCardsNumericId;
  if (nid != null && Number.isFinite(nid)) {
    const direct = lastStickerCardThumbUrl(nid, params.albumLabel);
    const proxyTpl = params.imageProxyTemplate?.trim();
    if (proxyTpl) {
      return applyStickerImageProxy(proxyTpl, direct);
    }
    return direct;
  }

  const tpl = params.template?.trim();
  if (tpl) {
    const labelSeg = encodeURIComponent(params.albumLabel);
    const slugSeg = encodeURIComponent(params.editionSlug);
    return tpl.replaceAll('{editionSlug}', slugSeg).replaceAll('{albumLabel}', labelSeg);
  }

  return null;
}
