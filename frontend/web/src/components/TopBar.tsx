import { Link, useNavigate } from 'react-router-dom';

type TopBarProps = {
  title: string;
  backTo?: string;
  right?: React.ReactNode;
};

export default function TopBar({ title, backTo, right }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-left">
        {backTo ? (
          <button type="button" className="topbar-back" onClick={() => navigate(backTo)} aria-label="Voltar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : (
          <Link to="/" className="topbar-brand" aria-label="Início">
            <span className="topbar-brand-mark">A</span>
          </Link>
        )}
      </div>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  );
}
