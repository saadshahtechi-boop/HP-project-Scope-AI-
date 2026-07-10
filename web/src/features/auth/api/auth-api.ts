import { api } from '../../../lib/api-client';

export interface AuthUser { id: string; email: string; role: string; }
export interface LoginResponse { accessToken: string; refreshToken: string; user: AuthUser; }

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function meRequest(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}
