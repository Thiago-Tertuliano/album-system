import { Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { assetUrl, fetchEditions, type Edition } from '../api';
import TopBar from '../components/TopBar';
import PullToRefresh from '../components/PullToRefresh';
import { SkeletonGrid } from '../components/Skeleton';

type CardTheme = { accent: string };

const DEFAULT_CARD_THEME: CardTheme = { accent: 'rgba(52, 211, 153, 0.25)' };

const CARD_THEME_BY_SLUG: Record<string, CardTheme> = {
  'fwc-2014': { accent: 'rgba(74, 222, 128, 0.28)' },
  'fwc-2018-int': { accent: 'rgba(248, 113, 113, 0.28)' },
  'fwc-2022': { accent: 'rgba(244, 63, 94, 0.28)' },
};

const COVER_OVERRIDE_BY_SLUG: Record<string, string> = {
  'fwc-2014': '/static/covers/fwc-2014.jpg',
  'fwc-2018-int': '/static/covers/fwc-2018-int.png',
};

function cardStyleForEdition(e: Edition): CSSProperties {
  const t = CARD_THEME_BY_SLUG[e.slug] ?? DEFAULT_CARD_THEME;
  const cover =
    COVER_OVERRIDE_BY_SLUG[e.slug] ||
    (typeof e.cover_image_url === 'string' && e.cover_image_url.trim().length > 0
      ? e.cover_image_url
      : undefined);
  return {
    '--card-cover-image': cover ? `url("${assetUrl(cover)}")` : 'none',
    '--card-accent': t.accent,
  } as CSSProperties;
}

export default function HomePage() {
  const [items, setItems] = useState<Edition[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const rows = await fetchEditions();
      setItems(rows);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    await load();
  }

  if (err) {
    return (
      <div className="page-transition">
        <TopBar title="Edições" />
        <div style={{ padding: '0.75rem' }}>
          <div className="error-box" role="alert">
            <strong>Não foi possível conectar à API.</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>{err}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="page-transition">
        <TopBar title="Álbum" />
        <div style={{ padding: '0.75rem' }}>
          <SkeletonGrid />
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition">
      <TopBar title="Álbum" />

      {items.length === 0 ? (
        <div style={{ padding: '0 0.75rem' }}>
          <p className="page-sub">Nenhuma edição disponível.</p>
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <div style={{ padding: '0 0.75rem 0.75rem' }}>
            <div className="grid-editions">
              {items.map((e) => (
                <Link
                  key={e.id}
                  to={`/edition/${e.slug}`}
                  className="card-edition"
                  style={cardStyleForEdition(e)}
                >
                  <h2>{e.name}</h2>
                  <p className="card-meta">
                    {e.year}
                    {e.host_country ? ` · ${e.host_country}` : ''}
                  </p>
                  <span className="badge">
                    {e.sticker_total > 0 ? `${e.sticker_total} figurinhas` : 'Carregando'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </PullToRefresh>
      )}
    </div>
  );
}
