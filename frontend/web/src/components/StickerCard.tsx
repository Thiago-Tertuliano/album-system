import { useState } from 'react';
import type { StickerSlot } from '../api';

type StickerCardProps = {
  sticker: StickerSlot;
  onToggleOwned: (sticker: StickerSlot) => void;
  onChangeDuplicates: (sticker: StickerSlot, delta: number) => void;
  isAuthenticated: boolean;
};

function StickerVisual({
  imageUrl,
  albumLabel,
}: {
  imageUrl: string | null;
  albumLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(imageUrl && !failed);
  return (
    <div className="sticker-visual">
      {showImg ? (
        <img src={imageUrl!} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="sticker-placeholder-label">{albumLabel}</span>
      )}
    </div>
  );
}

const CATEGORY_PT: Record<string, string> = {
  player: 'Jogador',
  team_photo: 'Foto equipe',
  logo: 'Escudo',
  stadium: 'Estádio',
  mascot: 'Mascote',
  legend: 'Lenda',
  foil: 'Especial / foil',
  trophy: 'Troféu',
  intro: 'Intro',
  poster: 'Pôster',
  other: 'Outro',
};

export default function StickerCard({
  sticker,
  onToggleOwned,
  onChangeDuplicates,
  isAuthenticated,
}: StickerCardProps) {
  return (
    <article
      className={`sticker ${sticker.is_special ? 'sticker-special' : ''} ${sticker.owned ? 'sticker-owned' : ''}`}
    >
      <div
        className="sticker-tap"
        role="button"
        tabIndex={0}
        aria-pressed={sticker.owned}
        onClick={() => onToggleOwned(sticker)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleOwned(sticker);
          }
        }}
      >
        <StickerVisual imageUrl={sticker.image_url} albumLabel={sticker.album_label} />
        <div className="sticker-body">
          <div className="sticker-title-row">
            <div className="sticker-label">{sticker.album_label}</div>
            {sticker.owned ? <span className="sticker-owned-badge">Tenho</span> : null}
          </div>
          <div className="sticker-name">{sticker.display_name}</div>
          <div className="sticker-meta">
            {CATEGORY_PT[sticker.category] ?? sticker.category}
            {sticker.team_name ? ` · ${sticker.team_name}` : ''}
          </div>
        </div>
      </div>
      {isAuthenticated ? (
        <div className="sticker-dup-row">
          <span>Repetidas</span>
          <button
            type="button"
            className="dup-btn"
            aria-label="Menos repetida"
            onClick={() => onChangeDuplicates(sticker, -1)}
          >
            −
          </button>
          <span className="dup-count">{sticker.duplicate_count}</span>
          <button
            type="button"
            className="dup-btn"
            aria-label="Mais repetida"
            onClick={() => onChangeDuplicates(sticker, 1)}
          >
            +
          </button>
        </div>
      ) : null}
    </article>
  );
}
