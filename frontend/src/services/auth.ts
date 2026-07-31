import { api, refreshSession } from '@/lib/api';
import { getRememberMe, getRefreshToken, setRefreshToken } from '@/lib/authToken';
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

  /** Usa o single-flight do api.ts (evita POSTs paralelos em /auth/refresh). */
  refresh: async (refreshToken: string): Promise<AuthSession> => {
    if (refreshToken !== getRefreshToken()) {
      setRefreshToken(refreshToken, getRememberMe());
    }

    const session = await refreshSession();
    if (!session) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    return session as AuthSession;
  },

  logout: (refreshToken?: string | null) =>
    api<{ ok: true }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshToken ?? undefined }),
      headers: { 'X-Skip-Auth-Refresh': '1' },
    }),

  me: () => api<User>('/auth/me'),
};
