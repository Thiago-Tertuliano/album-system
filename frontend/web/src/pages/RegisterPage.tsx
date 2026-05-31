import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await register(email, password, displayName.trim() || undefined);
      navigate('/', { replace: true });
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-panel">
      <h1 className="page-title">Criar conta</h1>
      <p className="page-sub">Comece a marcar seu álbum digital.</p>
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Nome (opcional)
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha (mín. 8)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {err ? <p className="error-box">{err}</p> : null}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Cadastrando…' : 'Cadastrar'}
        </button>
      </form>
      <p className="page-sub">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}
