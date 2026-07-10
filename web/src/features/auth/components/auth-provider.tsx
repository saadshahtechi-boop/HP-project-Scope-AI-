'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  setAccessToken, setRefreshToken, getRefreshToken, clearTokens, setOnUnauthorized, api,
} from '../../../lib/api-client';
import { loginRequest, meRequest, logoutRequest, type AuthUser } from '../api/auth-api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On a hard refresh we only have the persisted refresh token. Exchange it for
  // an access token (via the client's refresh path) and hydrate the user.
  useEffect(() => {
    let active = true;
    (async () => {
      const refresh = getRefreshToken();
      if (!refresh) { setLoading(false); return; }
      try {
        const { data } = await api.post('/auth/refresh', { refreshToken: refresh });
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        const me = await meRequest();
        if (active) setUser(me);
      } catch {
        clearTokens();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // When a refresh ultimately fails mid-session, bounce to login.
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      router.push('/login');
    });
    return () => setOnUnauthorized(null);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password);
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setUser(res.user);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) { try { await logoutRequest(refresh); } catch { /* ignore */ } }
    clearTokens();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
