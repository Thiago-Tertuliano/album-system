type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  ownership: 'all' | 'owned' | 'missing';
  onSelectOwnership: (f: 'all' | 'owned' | 'missing') => void;
};

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

export default function FilterSheet({
  open,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  ownership,
  onSelectOwnership,
}: FilterSheetProps) {
  if (!open) return null;

  return (
    <div className="filter-overlay" onClick={onClose}>
      <div className="filter-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="filter-handle" />
        <div className="filter-header">
          <h2>Filtros</h2>
          <button type="button" className="filter-close" onClick={onClose} aria-label="Fechar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="filter-section">
          <h3>Coleção</h3>
          <div className="filter-chips">
            {(['all', 'owned', 'missing'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`filter-chip ${ownership === f ? 'filter-chip-active' : ''}`}
                onClick={() => onSelectOwnership(f)}
              >
                {f === 'all' ? 'Todas' : f === 'owned' ? 'Tenho' : 'Faltam'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3>Categoria</h3>
          <div className="filter-chips">
            <button
              type="button"
              className={`filter-chip ${selectedCategory === null ? 'filter-chip-active' : ''}`}
              onClick={() => onSelectCategory(null)}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`filter-chip ${selectedCategory === c ? 'filter-chip-active' : ''}`}
                onClick={() => onSelectCategory(c)}
              >
                {CATEGORY_PT[c] ?? c}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="filter-done" onClick={onClose}>
          Aplicar
        </button>
      </div>
    </div>
  );
}
