import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { assetUrl, fetchEditions, type Edition } from '../api';

type CardTheme = {
  start: string;
  end: string;
  accent: string;
};

const DEFAULT_CARD_THEME: CardTheme = {
  start: '#1b2a46',
  end: '#0f172a',
  accent: 'rgba(52, 211, 153, 0.25)',
};

const CARD_THEME_BY_SLUG: Record<string, CardTheme> = {
  'fwc-2014': { start: '#1b5e3a', end: '#0a2d1f', accent: 'rgba(74, 222, 128, 0.28)' },
  'fwc-2018-int': { start: '#7f1d1d', end: '#2f1018', accent: 'rgba(248, 113, 113, 0.28)' },
  'fwc-2022': { start: '#6f1236', end: '#240f1c', accent: 'rgba(244, 63, 94, 0.28)' },
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
    '--card-start': t.start,
    '--card-end': t.end,
    '--card-accent': t.accent,
  } as CSSProperties;
}

export default function HomePage() {
  const [items, setItems] = useState<Edition[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEditions()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div>
        <h1 className="page-title">Edições</h1>
        <div className="error-box" role="alert">
          <strong>Não foi possível conectar à API.</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            Confirme que o backend está em <code>http://localhost:3333</code> e rode{' '}
            <code>npm run dev</code> nesta pasta (proxy <code>/v1</code>).
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', opacity: 0.9 }}>{err}</p>
        </div>
      </div>
    );
  }

  if (!items) {
    return <p className="loading">Carregando edições…</p>;
  }

  return (
    <div>
      <h1 className="page-title">Edições publicadas</h1>
      <p className="page-sub">Escolha um álbum para ver o checklist completo.</p>

      {items.length === 0 ? (
        <p className="page-sub">Nenhuma edição com status <code>published</code>. Importe ou publique no backend.</p>
      ) : (
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
                {e.host_country ? ` · ${e.host_country}` : ''} · {e.publisher}
              </p>
              <span className="badge">
                {e.sticker_total > 0 ? `${e.sticker_total} figurinhas` : 'Catálogo carregando'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
