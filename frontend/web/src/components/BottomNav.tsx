import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function BottomNav() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <NavLink to="/" end className="bottom-nav-item">
        <svg className="bottom-nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span className="bottom-nav-label">Catálogo</span>
      </NavLink>

      {isAuthenticated ? (
        <>
          <div className="bottom-nav-item bottom-nav-user">
            <svg className="bottom-nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="bottom-nav-label">{user?.display_name || user?.email?.split('@')[0] || 'Perfil'}</span>
          </div>
          <button type="button" className="bottom-nav-item bottom-nav-btn" onClick={logout}>
            <svg className="bottom-nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="bottom-nav-label">Sair</span>
          </button>
        </>
      ) : (
        <Link to="/login" className="bottom-nav-item">
          <svg className="bottom-nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span className="bottom-nav-label">Entrar</span>
        </Link>
      )}
    </nav>
  );
}
