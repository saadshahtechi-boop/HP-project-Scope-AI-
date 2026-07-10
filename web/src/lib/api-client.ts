import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Single axios instance for the whole app.
 *
 * - Access token lives in memory (attached to every request).
 * - Refresh token persists in localStorage so a page reload keeps the session.
 * - A 401 triggers a single refresh-and-retry against /auth/refresh; if that
 *   fails, tokens are cleared and an onUnauthorized callback fires (the auth
 *   provider uses it to redirect to /login).
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

const REFRESH_KEY = 'techciko_refresh_token';

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(REFRESH_KEY, token);
  else window.localStorage.removeItem(REFRESH_KEY);
}
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}
export function clearTokens() {
  accessToken = null;
  setRefreshToken(null);
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Refresh-on-401, guarded so we only retry once per request.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken); // rotating refresh: store the new one
    return data.accessToken as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const isAuthCall = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh failed — clear and notify.
      clearTokens();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
