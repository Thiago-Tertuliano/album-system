import { Routes, Route, NavLink, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditionPage from './pages/EditionPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminEditionsPage from './pages/AdminEditionsPage';
import AdminEditionNewPage from './pages/AdminEditionNewPage';
import AdminEditionEditPage from './pages/AdminEditionEditPage';
import { useAuth } from './auth/AuthContext';

const isCollectorApp = import.meta.env.VITE_APP_MODE === 'collector';

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <NavLink to="/" className="brand" end>
          <span className="brand-mark" aria-hidden>
            A
          </span>
          Album
        </NavLink>
        <nav className="top-nav" aria-label="Navegação principal">
          <NavLink to="/" end>
            Catálogo
          </NavLink>
          {!isCollectorApp ? (
            <NavLink to="/admin/editions">Estúdio</NavLink>
          ) : null}
          {isAuthenticated ? (
            <>
              <span className="nav-user">{user?.display_name || user?.email}</span>
              <button type="button" className="nav-link-btn" onClick={logout}>
                Sair
              </button>
            </>
          ) : (
            <Link to="/login">Entrar</Link>
          )}
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/edition/:slug" element={<EditionPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {!isCollectorApp ? (
            <>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/editions" element={<AdminEditionsPage />} />
              <Route path="/admin/editions/new" element={<AdminEditionNewPage />} />
              <Route path="/admin/editions/:id/edit" element={<AdminEditionEditPage />} />
            </>
          ) : null}
        </Routes>
      </main>

      <footer className="footer">
        <p>Catálogo digital de figurinhas · Axellion</p>
      </footer>
    </div>
  );
}
