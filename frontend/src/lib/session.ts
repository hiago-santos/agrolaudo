import type { User } from '@/types/domain';

/** Resposta bruta de login/refresh (aceita alias legado `token`). */
export type SessionResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  rememberMe?: boolean;
  user?: User;
};

export type NormalizedSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  rememberMe: boolean;
  user?: User;
};

/** Normaliza login/refresh: backend novo (`accessToken`) ou legado (`token`). */
export function normalizeSession(raw: SessionResponse): NormalizedSession | null {
  const accessToken = raw.accessToken ?? raw.token;
  if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
    return null;
  }

  return {
    accessToken,
    refreshToken: raw.refreshToken ?? '',
    expiresIn: typeof raw.expiresIn === 'number' && raw.expiresIn > 0 ? raw.expiresIn : 60 * 60,
    rememberMe: Boolean(raw.rememberMe),
    user: raw.user,
  };
}
