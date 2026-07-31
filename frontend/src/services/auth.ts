import { api, refreshSession } from '@/lib/api';
import { getRememberMe, getRefreshToken, setRefreshToken } from '@/lib/authToken';
import { normalizeSession, type NormalizedSession } from '@/lib/session';
import type { User } from '@/types/domain';

export type AuthSession = NormalizedSession & { user: User };

export const authService = {
  login: async (email: string, password: string, rememberMe: boolean): Promise<AuthSession> => {
    const raw = await api<{
      accessToken?: string;
      token?: string;
      refreshToken?: string;
      expiresIn?: number;
      rememberMe?: boolean;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
      // Login não depende de sessão prévia — evita refresh stale atrapalhar o fluxo.
      headers: { 'X-Skip-Auth-Refresh': '1' },
    });

    const session = normalizeSession(raw);
    if (!session || !raw.user) {
      throw new Error('Resposta de login inválida: token ausente. Verifique o deploy da API.');
    }
    return { ...session, user: raw.user };
  },

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
