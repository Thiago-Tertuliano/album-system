import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAdminToken, deleteAdminEdition, fetchAdminEditions, type Edition } from '../api';

export default function AdminEditionsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Edition[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminEditions()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    clearAdminToken();
    navigate('/admin/login');
  }

  async function handleDelete(edition: Edition) {
    const ok = window.confirm(
      `Excluir "${edition.name}"?\n\nEssa ação remove a edição, páginas e figurinhas do catálogo.`
    );
    if (!ok) return;

    setDeletingId(edition.id);
    setErr(null);
    try {
      await deleteAdminEdition(edition.id);
      setItems((current) => current?.filter((item) => item.id !== edition.id) ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="admin-shell">
      <div className="admin-heading">
        <div>
          <h1 className="page-title">Estúdio de edições</h1>
          <p className="page-sub">Organize rascunhos, publicações e importações do catálogo.</p>
        </div>
        <div className="admin-actions">
          <Link className="button-primary" to="/admin/editions/new">
            Nova edição
          </Link>
          <button className="button-secondary" type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      {err ? <div className="error-box">{err}</div> : null}
      {!items && !err ? <p className="loading">Carregando edições...</p> : null}

      {items ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Ano</th>
                <th>Figurinhas</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((edition) => (
                <tr key={edition.id}>
                  <td>
                    <strong>{edition.name}</strong>
                    <span>{edition.slug}</span>
                  </td>
                  <td>
                    <span className={`status-pill status-${edition.status}`}>{edition.status}</span>
                  </td>
                  <td>{edition.year}</td>
                  <td>{edition.sticker_total}</td>
                  <td className="row-actions">
                    <Link className="table-action" to={`/admin/editions/${edition.id}/edit`}>
                      Editar
                    </Link>
                    <button
                      className="table-action table-action-danger"
                      type="button"
                      onClick={() => handleDelete(edition)}
                      disabled={deletingId === edition.id}
                    >
                      {deletingId === edition.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
