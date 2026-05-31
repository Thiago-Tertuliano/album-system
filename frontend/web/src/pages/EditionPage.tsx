import { Link, useLocation, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  assetUrl,
  fetchEdition,
  fetchEditionPages,
  fetchEditionSummary,
  fetchAllStickers,
  updateStickerCollection,
  type AlbumPageRow,
  type Edition,
  type EditionSummary,
  type StickerSlot,
} from '../api';
import { useAuth } from '../auth/AuthContext';

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

type OwnershipFilter = 'all' | 'owned' | 'missing';

function categoryLabel(c: string): string {
  return CATEGORY_PT[c] ?? c;
}

type EditionTheme = {
  accent: string;
  accentDim: string;
  gold: string;
  surface: string;
  surfaceHover: string;
  visualStart: string;
  visualEnd: string;
  heroStart: string;
  heroEnd: string;
};

const DEFAULT_THEME: EditionTheme = {
  accent: '#34d399',
  accentDim: 'rgba(52, 211, 153, 0.15)',
  gold: '#fbbf24',
  surface: '#141d2e',
  surfaceHover: '#1a2740',
  visualStart: '#1e293b',
  visualEnd: '#0f172a',
  heroStart: 'rgba(11, 18, 32, 0.86)',
  heroEnd: 'rgba(11, 18, 32, 0.92)',
};

const EDITION_THEMES: Record<string, EditionTheme> = {
  'fwc-2014': {
    accent: '#16a34a',
    accentDim: 'rgba(22, 163, 74, 0.18)',
    gold: '#facc15',
    surface: '#10261f',
    surfaceHover: '#143328',
    visualStart: '#1a5f3a',
    visualEnd: '#0c3322',
    heroStart: 'rgba(12, 51, 34, 0.74)',
    heroEnd: 'rgba(10, 22, 17, 0.92)',
  },
  'fwc-2018-int': {
    accent: '#ef4444',
    accentDim: 'rgba(239, 68, 68, 0.16)',
    gold: '#f59e0b',
    surface: '#2a0f16',
    surfaceHover: '#391420',
    visualStart: '#7f1d1d',
    visualEnd: '#3f0d12',
    heroStart: 'rgba(127, 29, 29, 0.68)',
    heroEnd: 'rgba(46, 15, 24, 0.9)',
  },
  'fwc-2022': {
    accent: '#e11d48',
    accentDim: 'rgba(225, 29, 72, 0.18)',
    gold: '#fbbf24',
    surface: '#2a1021',
    surfaceHover: '#3a1630',
    visualStart: '#6f1236',
    visualEnd: '#2e0f24',
    heroStart: 'rgba(111, 18, 54, 0.68)',
    heroEnd: 'rgba(31, 11, 25, 0.92)',
  },
};

const COVER_OVERRIDE_BY_SLUG: Record<string, string> = {
  'fwc-2014': '/static/covers/fwc-2014.jpg',
  'fwc-2018-int': '/static/covers/fwc-2018-int.png',
};

function resolveEditionTheme(slug: string | undefined, coverImageUrl?: string | null): CSSProperties {
  const t = (slug && EDITION_THEMES[slug]) || DEFAULT_THEME;
  const cover =
    (slug ? COVER_OVERRIDE_BY_SLUG[slug] : undefined) ||
    (typeof coverImageUrl === 'string' && coverImageUrl.trim().length > 0
      ? coverImageUrl
      : undefined);
  return {
    '--theme-accent': t.accent,
    '--theme-accent-dim': t.accentDim,
    '--theme-gold': t.gold,
    '--theme-surface': t.surface,
    '--theme-surface-hover': t.surfaceHover,
    '--theme-visual-start': t.visualStart,
    '--theme-visual-end': t.visualEnd,
    '--theme-hero-start': t.heroStart,
    '--theme-hero-end': t.heroEnd,
    '--theme-hero-image': cover ? `url("${assetUrl(cover)}")` : 'none',
  } as CSSProperties;
}

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

export default function EditionPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [pages, setPages] = useState<AlbumPageRow[]>([]);
  const [stickers, setStickers] = useState<StickerSlot[]>([]);
  const [summary, setSummary] = useState<EditionSummary | null>(null);
  const [totalApi, setTotalApi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<OwnershipFilter>('all');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);

    const tasks: Promise<unknown>[] = [
      fetchEdition(slug),
      fetchEditionPages(slug),
      fetchAllStickers(slug),
    ];
    if (isAuthenticated) {
      tasks.push(fetchEditionSummary(slug));
    }

    Promise.all(tasks)
      .then((results) => {
        if (cancelled) return;
        const ed = results[0] as Edition;
        const pageRows = results[1] as AlbumPageRow[];
        const stickerResult = results[2] as { stickers: StickerSlot[]; total: number };
        setEdition(ed);
        setPages(pageRows);
        setStickers(stickerResult.stickers);
        setTotalApi(stickerResult.total);
        if (isAuthenticated && results[3]) {
          setSummary(results[3] as EditionSummary);
        } else {
          setSummary(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, isAuthenticated]);

  const localSummary = useMemo(() => {
    const owned = stickers.filter((s) => s.owned).length;
    const total = stickers.length;
    const missing = Math.max(total - owned, 0);
    const percent = total > 0 ? Math.round((owned / total) * 1000) / 10 : 0;
    return { owned, total, missing, percent };
  }, [stickers]);

  const progress = summary ?? {
    edition_id: edition?.id ?? '',
    owned: localSummary.owned,
    total: totalApi || localSummary.total,
    missing: (totalApi || localSummary.total) - localSummary.owned,
    percent:
      (totalApi || localSummary.total) > 0
        ? Math.round((localSummary.owned / (totalApi || localSummary.total)) * 1000) / 10
        : 0,
  };

  const categories = useMemo(() => {
    const set = new Set(stickers.map((s) => s.category));
    return Array.from(set).sort();
  }, [stickers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stickers.filter((s) => {
      if (ownership === 'owned' && !s.owned) return false;
      if (ownership === 'missing' && s.owned) return false;
      if (category && s.category !== category) return false;
      if (!q) return true;
      return (
        s.album_label.toLowerCase().includes(q) ||
        s.display_name.toLowerCase().includes(q) ||
        (s.team_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [stickers, query, category, ownership]);

  const stickersByPage = useMemo(() => {
    const pageTitleByNumber = new Map(
      pages
        .filter((page) => page.page_number != null)
        .map((page) => [page.page_number, page.title?.trim() || null] as const)
    );
    const grouped = new Map<
      string,
      { key: string; pageNumber: number | null; title: string | null; stickers: StickerSlot[] }
    >();

    for (const sticker of filtered) {
      const pageNumber = sticker.page_number ?? null;
      const key = pageNumber == null ? 'without-page' : String(pageNumber);
      const existing = grouped.get(key);

      if (existing) {
        existing.stickers.push(sticker);
        continue;
      }

      grouped.set(key, {
        key,
        pageNumber,
        title: pageNumber == null ? null : pageTitleByNumber.get(pageNumber) ?? null,
        stickers: [sticker],
      });
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.pageNumber == null) return 1;
      if (b.pageNumber == null) return -1;
      return a.pageNumber - b.pageNumber;
    });
  }, [filtered, pages]);

  async function patchSticker(
    stickerId: string,
    patch: { owned?: boolean; duplicate_count?: number }
  ) {
    if (!slug) return;
    if (!isAuthenticated) {
      setSaveErr('Faça login para marcar figurinhas.');
      return;
    }
    setSaveErr(null);
    try {
      const updated = await updateStickerCollection(slug, stickerId, patch);
      setStickers((prev) =>
        prev.map((s) =>
          s.id === stickerId
            ? { ...s, owned: updated.owned, duplicate_count: updated.duplicate_count }
            : s
        )
      );
      setSummary((prev) => {
        const total = prev?.total ?? totalApi;
        const wasOwned = stickers.find((s) => s.id === stickerId)?.owned ?? false;
        let owned = prev?.owned ?? localSummary.owned;
        if (patch.owned !== undefined && patch.owned !== wasOwned) {
          owned += patch.owned ? 1 : -1;
        }
        const missing = Math.max(total - owned, 0);
        const percent = total > 0 ? Math.round((owned / total) * 1000) / 10 : 0;
        return { edition_id: prev?.edition_id ?? '', total, owned, missing, percent };
      });
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Falha ao salvar coleção');
    }
  }

  function handleOwnedChange(stickerId: string, owned: boolean) {
    setStickers((prev) => prev.map((s) => (s.id === stickerId ? { ...s, owned } : s)));
    void patchSticker(stickerId, { owned });
  }

  function toggleOwned(sticker: StickerSlot) {
    if (!isAuthenticated) {
      setSaveErr('Faça login para marcar figurinhas.');
      return;
    }
    handleOwnedChange(sticker.id, !sticker.owned);
  }

  function changeDuplicates(sticker: StickerSlot, delta: number) {
    const next = Math.max(0, sticker.duplicate_count + delta);
    setStickers((prev) =>
      prev.map((s) => (s.id === sticker.id ? { ...s, duplicate_count: next } : s))
    );
    void patchSticker(sticker.id, { duplicate_count: next });
  }

  if (!slug) {
    return <p className="error-box">Slug inválido.</p>;
  }

  if (loading) {
    return <p className="loading">Carregando álbum…</p>;
  }

  if (err || !edition) {
    return (
      <div>
        <div className="back-row">
          <Link to="/">← Voltar</Link>
        </div>
        <div className="error-box">{err ?? 'Edição não encontrada.'}</div>
      </div>
    );
  }

  const themeVars = resolveEditionTheme(edition.slug, edition.cover_image_url);
  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`;

  return (
    <div className="edition-themed" style={themeVars}>
      <section className="edition-hero">
        <div className="edition-hero-inner">
          <h1 className="page-title">{edition.name}</h1>
          <p className="page-sub">
            {edition.year}
            {edition.host_country ? ` · ${edition.host_country}` : ''} · {edition.publisher}
          </p>
          <div className="progress-block">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="progress-stats">
              <strong>{progress.owned}</strong> de <strong>{progress.total}</strong> ·{' '}
              <strong>{progress.percent}%</strong> completo · faltam <strong>{progress.missing}</strong>
            </p>
          </div>
          {!isAuthenticated ? (
            <p className="progress-hint">
              <Link to={loginHref}>Entre</Link> para salvar o que você tem neste álbum.
            </p>
          ) : null}
        </div>
      </section>

      <div className="back-row">
        <Link to="/">← Todas as edições</Link>
      </div>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Buscar por código, nome ou seleção…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar figurinha"
        />
        <span className="stats">
          Mostrando <strong>{filtered.length}</strong> de {stickers.length}
        </span>
      </div>
      {saveErr ? <p className="error-box">{saveErr}</p> : null}

      <div className="chips" role="group" aria-label="Filtrar por coleção">
        {(['all', 'owned', 'missing'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`chip ${ownership === f ? 'chip-active' : ''}`}
            onClick={() => setOwnership(f)}
          >
            {f === 'all' ? 'Todas' : f === 'owned' ? 'Tenho' : 'Faltam'}
          </button>
        ))}
      </div>

      <div className="chips" role="group" aria-label="Filtrar por categoria">
        <button
          type="button"
          className={`chip ${category === null ? 'chip-active' : ''}`}
          onClick={() => setCategory(null)}
        >
          Categorias: todas
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${category === c ? 'chip-active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      <div className="sticker-page-sections">
        {stickersByPage.map((section) => (
          <section key={section.key} className="sticker-page-section">
            <header className="sticker-page-header">
              <div>
                <h2>{section.title || 'Outros'}</h2>
              </div>
              <span>{section.stickers.length} figurinhas</span>
            </header>

            <div className="grid-stickers">
              {section.stickers.map((s) => (
                <article
                  key={s.id}
                  className={`sticker ${s.is_special ? 'sticker-special' : ''} ${s.owned ? 'sticker-owned' : ''}`}
                >
                  <div
                    className="sticker-tap"
                    role="button"
                    tabIndex={0}
                    aria-pressed={s.owned}
                    onClick={() => toggleOwned(s)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleOwned(s);
                      }
                    }}
                  >
                    <StickerVisual imageUrl={s.image_url} albumLabel={s.album_label} />
                    <div className="sticker-body">
                      <div className="sticker-title-row">
                        <div className="sticker-label">{s.album_label}</div>
                        {s.owned ? <span className="sticker-owned-badge">Tenho</span> : null}
                      </div>
                      <div className="sticker-name">{s.display_name}</div>
                      <div className="sticker-meta">
                        {categoryLabel(s.category)}
                        {s.team_name ? ` · ${s.team_name}` : ''}
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
                        onClick={() => changeDuplicates(s, -1)}
                      >
                        −
                      </button>
                      <span className="dup-count">{s.duplicate_count}</span>
                      <button
                        type="button"
                        className="dup-btn"
                        aria-label="Mais repetida"
                        onClick={() => changeDuplicates(s, 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="page-sub" style={{ marginTop: '1.5rem' }}>
          Nenhuma figurinha com os filtros atuais.
        </p>
      ) : null}
    </div>
  );
}
