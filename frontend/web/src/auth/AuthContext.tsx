import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearCollectorToken,
  getCollectorToken,
  getCollectorUser,
  hydrateCollectorTokenFromPreferences,
  setCollectorToken,
  setCollectorUser,
  type CollectorUser,
} from './collectorToken';
import { collectorLogin, collectorRegister } from '../api';

type AuthContextValue = {
  token: string | null;
  user: CollectorUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getCollectorToken());
  const [user, setUser] = useState<CollectorUser | null>(() => getCollectorUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void hydrateCollectorTokenFromPreferences().then(() => {
      setToken(getCollectorToken());
      setUser(getCollectorUser());
      setReady(true);
    });
  }, []);

  const applySession = useCallback((nextToken: string, nextUser: CollectorUser) => {
    setCollectorToken(nextToken);
    setCollectorUser(nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await collectorLogin(email, password);
      applySession(session.token, session.user);
    },
    [applySession]
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const session = await collectorRegister(email, password, displayName);
      applySession(session.token, session.user);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearCollectorToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [token, user, login, register, logout]
  );

  if (!ready) {
    return <p className="loading">Carregando…</p>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
