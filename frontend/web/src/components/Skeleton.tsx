export function SkeletonGrid() {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-meta" />
      <div className="skeleton-line skeleton-badge" />
    </div>
  );
}

export function SkeletonStickerGrid() {
  return (
    <div className="grid-stickers">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="skeleton-sticker">
          <div className="skeleton-sticker-visual" />
          <div className="skeleton-sticker-body">
            <div className="skeleton-line skeleton-label" />
            <div className="skeleton-line skeleton-name" />
          </div>
        </div>
      ))}
    </div>
  );
}
