/**
 * Tokens de sessão — access (JWT) e refresh sempre em localStorage.
 * O "lembrar-me" só altera o TTL do refresh no servidor, não o storage.
 */

const REFRESH_KEY = 'agrolaudo-refresh';
const REMEMBER_KEY = 'agrolaudo-remember';
const ACCESS_KEY = 'agrolaudo-access';
const ACCESS_EXPIRES_KEY = 'agrolaudo-access-expires';

function isUsableToken(token: string | null | undefined): token is string {
  return !!token && token !== 'undefined' && token !== 'null';
}

function readAccessFromStorage(): { token: string; expiresAt: number } | null {
  try {
    const token = localStorage.getItem(ACCESS_KEY);
    const expiresAt = Number(localStorage.getItem(ACCESS_EXPIRES_KEY) || 0);
    if (isUsableToken(token) && expiresAt > Date.now()) {
      return { token, expiresAt };
    }
    if (token) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(ACCESS_EXPIRES_KEY);
    }
  } catch {
    // localStorage indisponível
  }
  // Migra restos antigos do sessionStorage, se houver.
  try {
    const legacy = sessionStorage.getItem(ACCESS_KEY);
    const legacyExp = Number(sessionStorage.getItem(ACCESS_EXPIRES_KEY) || 0);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(ACCESS_EXPIRES_KEY);
    if (isUsableToken(legacy) && legacyExp > Date.now()) {
      localStorage.setItem(ACCESS_KEY, legacy);
      localStorage.setItem(ACCESS_EXPIRES_KEY, String(legacyExp));
      return { token: legacy, expiresAt: legacyExp };
    }
  } catch {
    // ignore
  }
  return null;
}

export function getAccessToken(): string | null {
  return readAccessFromStorage()?.token ?? null;
}

export function setAccessToken(token: string | null, expiresInSeconds?: number): void {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(ACCESS_EXPIRES_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(ACCESS_EXPIRES_KEY);
  } catch {
    // ignore
  }

  if (!isUsableToken(token)) return;

  // Renova ~60s antes do vencimento real.
  const ttlMs = Math.max(30, (expiresInSeconds ?? 60 * 60) - 60) * 1000;
  const expiresAt = Date.now() + ttlMs;
  try {
    localStorage.setItem(ACCESS_KEY, token);
    localStorage.setItem(ACCESS_EXPIRES_KEY, String(expiresAt));
  } catch {
    // ignore
  }
}

/** True quando o access token está ausente ou perto de expirar. */
export function accessTokenNeedsRefresh(): boolean {
  return !readAccessFromStorage();
}

export function getRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1';
}

export function setRememberMe(remember: boolean): void {
  if (remember) localStorage.setItem(REMEMBER_KEY, '1');
  else localStorage.removeItem(REMEMBER_KEY);
}

export function getRefreshToken(): string | null {
  const fromLocal = localStorage.getItem(REFRESH_KEY);
  if (fromLocal) return fromLocal;
  // Migra refresh antigo do sessionStorage.
  try {
    const legacy = sessionStorage.getItem(REFRESH_KEY);
    if (legacy) {
      sessionStorage.removeItem(REFRESH_KEY);
      localStorage.setItem(REFRESH_KEY, legacy);
      return legacy;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setRefreshToken(token: string | null, remember: boolean): void {
  try {
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
  setRememberMe(remember);

  if (!isUsableToken(token)) return;

  try {
    localStorage.setItem(REFRESH_KEY, token);
  } catch {
    // ignore
  }
}

/** Remove só o refresh — preserva access ainda válido. */
export function clearRefreshToken(): void {
  try {
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

export function clearAuthTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(ACCESS_EXPIRES_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(ACCESS_EXPIRES_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // ignore
  }
}
