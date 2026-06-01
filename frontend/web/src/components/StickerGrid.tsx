import type { StickerSlot } from '../api';
import StickerCard from './StickerCard';

type StickerGridProps = {
  stickers: StickerSlot[];
  onToggleOwned: (sticker: StickerSlot) => void;
  onChangeDuplicates: (sticker: StickerSlot, delta: number) => void;
  isAuthenticated: boolean;
};

export default function StickerGrid({
  stickers,
  onToggleOwned,
  onChangeDuplicates,
  isAuthenticated,
}: StickerGridProps) {
  return (
    <div className="grid-stickers">
      {stickers.map((s) => (
        <StickerCard
          key={s.id}
          sticker={s}
          onToggleOwned={onToggleOwned}
          onChangeDuplicates={onChangeDuplicates}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}
