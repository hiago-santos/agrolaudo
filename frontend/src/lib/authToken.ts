/**
 * Tokens de sessão.
 * - access: memória + sessionStorage (sobrevive HMR do Vite na mesma aba)
 * - refresh: localStorage se "lembrar-me", senão sessionStorage
 */

const REFRESH_KEY = 'agrolaudo-refresh';
const REMEMBER_KEY = 'agrolaudo-remember';
const ACCESS_KEY = 'agrolaudo-access';
const ACCESS_EXPIRES_KEY = 'agrolaudo-access-expires';

let accessToken: string | null = null;
let accessExpiresAt = 0;
let accessLoaded = false;

function readPersistedAccess(): void {
  if (accessLoaded) return;
  accessLoaded = true;
  try {
    const stored = sessionStorage.getItem(ACCESS_KEY);
    const expiresRaw = sessionStorage.getItem(ACCESS_EXPIRES_KEY);
    const expires = expiresRaw ? Number(expiresRaw) : 0;
    if (stored && expires > Date.now()) {
      accessToken = stored;
      accessExpiresAt = expires;
    } else if (stored) {
      sessionStorage.removeItem(ACCESS_KEY);
      sessionStorage.removeItem(ACCESS_EXPIRES_KEY);
    }
  } catch {
    // sessionStorage indisponível
  }
}

export function getAccessToken(): string | null {
  readPersistedAccess();
  return accessToken;
}

export function setAccessToken(token: string | null, expiresInSeconds?: number): void {
  accessLoaded = true;
  accessToken = token;
  if (!token) {
    accessExpiresAt = 0;
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(ACCESS_EXPIRES_KEY);
    return;
  }
  // Renova ~60s antes do vencimento real.
  const ttlMs = Math.max(30, (expiresInSeconds ?? 60 * 60) - 60) * 1000;
  accessExpiresAt = Date.now() + ttlMs;
  sessionStorage.setItem(ACCESS_KEY, token);
  sessionStorage.setItem(ACCESS_EXPIRES_KEY, String(accessExpiresAt));
}

/** True quando o access token está ausente ou perto de expirar. */
export function accessTokenNeedsRefresh(): boolean {
  readPersistedAccess();
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
  accessLoaded = true;
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(ACCESS_EXPIRES_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}
