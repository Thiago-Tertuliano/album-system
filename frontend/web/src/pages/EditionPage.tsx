import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState, useCallback } from 'react';
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
import TopBar from '../components/TopBar';
import ProgressBar from '../components/ProgressBar';
import StickerGrid from '../components/StickerGrid';
import FilterSheet from '../components/FilterSheet';
import PullToRefresh from '../components/PullToRefresh';
import { SkeletonStickerGrid } from '../components/Skeleton';
import { lightHaptic } from '../lib/haptics';

type EditionTheme = {
  accent: string;
  accentDim: string;
  gold: string;
  surface: string;
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
    '--theme-visual-start': t.visualStart,
    '--theme-visual-end': t.visualEnd,
    '--theme-hero-start': t.heroStart,
    '--theme-hero-end': t.heroEnd,
    '--theme-hero-image': cover ? `url("${assetUrl(cover)}")` : 'none',
  } as CSSProperties;
}

type OwnershipFilter = 'all' | 'owned' | 'missing';

export default function EditionPage() {
  const { slug } = useParams<{ slug: string }>();
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
  const [filterOpen, setFilterOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!slug) return;
    setErr(null);
    const tasks: Promise<unknown>[] = [
      fetchEdition(slug),
      fetchEditionPages(slug),
      fetchAllStickers(slug),
    ];
    if (isAuthenticated) {
      tasks.push(fetchEditionSummary(slug));
    }

    const results = await Promise.all(tasks);
    const ed = results[0] as Edition;
    const pageRows = results[1] as AlbumPageRow[];
    const stickerResult = results[2] as { stickers: StickerSlot[]; total: number };
    setEdition(ed);
    setPages(pageRows);
    setStickers(stickerResult.stickers);
    setTotalApi(stickerResult.total);
    if (isAuthenticated && results[3]) {
      setSummary(results[3] as EditionSummary);
    }
  }, [slug, isAuthenticated]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    loadData()
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [loadData, slug]);

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
    void lightHaptic();
  }

  function changeDuplicates(sticker: StickerSlot, delta: number) {
    const next = Math.max(0, sticker.duplicate_count + delta);
    setStickers((prev) =>
      prev.map((s) => (s.id === sticker.id ? { ...s, duplicate_count: next } : s))
    );
    void patchSticker(sticker.id, { duplicate_count: next });
  }

  async function handleRefresh() {
    await loadData();
  }

  if (!slug) {
    return (
      <div className="page-transition">
        <TopBar title="Erro" backTo="/" />
        <div style={{ padding: '0.75rem' }}>
          <p className="error-box">Slug inválido.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-transition">
        <TopBar title="Carregando…" backTo="/" />
        <div style={{ padding: '0.75rem' }}>
          <SkeletonStickerGrid />
        </div>
      </div>
    );
  }

  if (err || !edition) {
    return (
      <div className="page-transition">
        <TopBar title="Erro" backTo="/" />
        <div style={{ padding: '0.75rem' }}>
          <div className="error-box">{err ?? 'Edição não encontrada.'}</div>
        </div>
      </div>
    );
  }

  const themeVars = resolveEditionTheme(edition.slug, edition.cover_image_url);
  const hasActiveFilters = ownership !== 'all' || category !== null;

  return (
    <div className="edition-themed page-transition" style={themeVars}>
      <TopBar title={edition.name} backTo="/" />

      <section className="edition-hero">
        <div className="edition-hero-inner">
          <p className="page-sub">
            {edition.year}
            {edition.host_country ? ` · ${edition.host_country}` : ''}
          </p>
          <ProgressBar owned={progress.owned} total={progress.total} percent={progress.percent} />
          {!isAuthenticated ? (
            <p className="progress-hint">
              Entre para salvar o que você tem neste álbum.
            </p>
          ) : null}
        </div>
      </section>

      <div className="toolbar" style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem' }}>
        <input
          className="search"
          type="search"
          placeholder="Buscar código, nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar figurinha"
        />
        <button
          type="button"
          className={`filter-toggle ${hasActiveFilters ? 'filter-toggle-active' : ''}`}
          onClick={() => setFilterOpen(true)}
          aria-label="Filtrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          {hasActiveFilters ? 'Filtros ativos' : 'Filtrar'}
        </button>
        <span className="stats">
          {filtered.length}/{stickers.length}
        </span>
      </div>

      {saveErr ? <p className="error-box" style={{ margin: '0 0.75rem 0.5rem' }}>{saveErr}</p> : null}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        selectedCategory={category}
        onSelectCategory={setCategory}
        ownership={ownership}
        onSelectOwnership={setOwnership}
      />

      <PullToRefresh onRefresh={handleRefresh}>
        <div style={{ padding: '0 0.75rem 0.75rem' }}>
          <div className="sticker-page-sections">
            {stickersByPage.map((section) => (
              <section key={section.key} className="sticker-page-section">
                <header className="sticker-page-header">
                  <div>
                    <h2>{section.title || 'Outros'}</h2>
                  </div>
                  <span>{section.stickers.length}</span>
                </header>

                <StickerGrid
                  stickers={section.stickers}
                  onToggleOwned={toggleOwned}
                  onChangeDuplicates={changeDuplicates}
                  isAuthenticated={isAuthenticated}
                />
              </section>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="page-sub" style={{ marginTop: '1rem' }}>
              Nenhuma figurinha com os filtros atuais.
            </p>
          ) : null}
        </div>
      </PullToRefresh>
    </div>
  );
}
