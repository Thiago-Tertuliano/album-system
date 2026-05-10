/** URLs diretas das thumbs JPEG no LastSticker (antes do proxy). */
export const LASTSTICKER_CARDS_JPEG_BASE = 'https://www.laststicker.com/i/cards';

export function lastStickerCardThumbUrl(collectionNumericId: number, albumLabel: string): string {
  const labelPath = albumLabel.trim().toLowerCase();
  return `${LASTSTICKER_CARDS_JPEG_BASE}/${collectionNumericId}/${labelPath}.jpg`;
}

export function applyStickerImageProxy(proxyTemplate: string, originalUrl: string): string {
  return proxyTemplate.replaceAll('{url}', encodeURIComponent(originalUrl));
}
