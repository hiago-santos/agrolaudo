import { api } from '@/lib/api';
import type { User } from '@/types/domain';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  rememberMe: boolean;
  user: User;
}

export const authService = {
  login: (email: string, password: string, rememberMe: boolean) =>
    api<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
      // Login não depende de sessão prévia — evita refresh stale atrapalhar o fluxo.
      headers: { 'X-Skip-Auth-Refresh': '1' },
    }),

  refresh: (refreshToken: string) =>
    api<AuthSession>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      // Evita loop: o refresh não tenta se auto-renovar em 401.
      headers: { 'X-Skip-Auth-Refresh': '1' },
    }),

  logout: (refreshToken?: string | null) =>
    api<{ ok: true }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshToken ?? undefined }),
      headers: { 'X-Skip-Auth-Refresh': '1' },
    }),

  me: () => api<User>('/auth/me'),
};
