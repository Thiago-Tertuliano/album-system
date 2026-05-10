import { Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditionPage from './pages/EditionPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminEditionsPage from './pages/AdminEditionsPage';
import AdminEditionNewPage from './pages/AdminEditionNewPage';
import AdminEditionEditPage from './pages/AdminEditionEditPage';

export default function App() {
  return (
    <div className="layout">
      <header className="header">
        <NavLink to="/" className="brand" end>
          <span className="brand-mark" aria-hidden>
            A
          </span>
          Album Studio
        </NavLink>
        <nav className="top-nav" aria-label="Navegação principal">
          <NavLink to="/" end>
            Catálogo
          </NavLink>
          <NavLink to="/admin/editions">Estúdio</NavLink>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/edition/:slug" element={<EditionPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/editions" element={<AdminEditionsPage />} />
          <Route path="/admin/editions/new" element={<AdminEditionNewPage />} />
          <Route path="/admin/editions/:id/edit" element={<AdminEditionEditPage />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>Catálogo digital de figurinhas · Axellion</p>
      </footer>
    </div>
  );
}
