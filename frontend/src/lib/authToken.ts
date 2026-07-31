/**
 * Tokens de sessão em memória + refresh persistido.
 * - access: só memória (curto, renovado automaticamente)
 * - refresh: localStorage se "lembrar-me", senão sessionStorage
 */

const REFRESH_KEY = 'agrolaudo-refresh';
const REMEMBER_KEY = 'agrolaudo-remember';

let accessToken: string | null = null;
let accessExpiresAt = 0;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null, expiresInSeconds?: number): void {
  accessToken = token;
  if (!token) {
    accessExpiresAt = 0;
    return;
  }
  // Renova ~60s antes do vencimento real.
  const ttlMs = Math.max(30, (expiresInSeconds ?? 60 * 60) - 60) * 1000;
  accessExpiresAt = Date.now() + ttlMs;
}

/** True quando o access token está ausente ou perto de expirar. */
export function accessTokenNeedsRefresh(): boolean {
  if (!accessToken) return true;
  return Date.now() >= accessExpiresAt;
}

export function getRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1';
}

export function setRememberMe(remember: boolean): void {
  if (remember) localStorage.setItem(REMEMBER_KEY, '1');
  else localStorage.removeItem(REMEMBER_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string | null, remember: boolean): void {
  // Evita deixar o refresh nos dois storages ao mesmo tempo.
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  setRememberMe(remember);

  if (!token) return;

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(REFRESH_KEY, token);
}

export function clearAuthTokens(): void {
  accessToken = null;
  accessExpiresAt = 0;
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}
