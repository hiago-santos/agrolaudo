import {
  accessTokenNeedsRefresh,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearAuthTokens,
} from '@/lib/authToken';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  code?: string;
  issues?: unknown;

  constructor(status: number, message: string, code?: string, issues?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

interface ErrorBody {
  message?: string;
  error?: string;
  issues?: unknown;
}

type RefreshListener = (session: { accessToken: string; refreshToken: string; expiresIn: number; rememberMe: boolean } | null) => void;

let refreshPromise: Promise<boolean> | null = null;
let onSessionRefreshed: RefreshListener | null = null;

/** O store de auth registra um listener para sincronizar user/tokens após o refresh. */
export function setAuthRefreshListener(listener: RefreshListener | null): void {
  onSessionRefreshed = listener;
}

async function parseErrorBody(res: Response): Promise<ErrorBody> {
  try {
    return (await res.json()) as ErrorBody;
  } catch {
    return { message: res.statusText };
  }
}

function buildHeaders(init?: HeadersInit, jsonBody = false): Headers {
  const headers = new Headers(init);
  // Fastify rejeita Content-Type: application/json sem body (ex.: POST de ação).
  if (jsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

function hasRequestBody(body: BodyInit | null | undefined): boolean {
  if (body == null) return false;
  if (typeof body === 'string') return body.length > 0;
  return true;
}

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const currentRefresh = getRefreshToken();
    if (!currentRefresh) {
      clearAuthTokens();
      onSessionRefreshed?.(null);
      return false;
    }

    /** Só limpa sessão se o refresh que falhou ainda for o atual (não um login novo). */
    const clearIfStillCurrent = () => {
      if (getRefreshToken() !== currentRefresh) return false;
      clearAuthTokens();
      onSessionRefreshed?.(null);
      return false;
    };

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Skip-Auth-Refresh': '1' },
        body: JSON.stringify({ refreshToken: currentRefresh }),
      });

      if (!res.ok) {
        return clearIfStillCurrent();
      }

      // Login paralelo pode ter substituído o refresh enquanto este request voava.
      if (getRefreshToken() !== currentRefresh) {
        return true;
      }

      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        rememberMe: boolean;
      };

      setAccessToken(data.accessToken, data.expiresIn);
      setRefreshToken(data.refreshToken, data.rememberMe);
      onSessionRefreshed?.(data);
      return true;
    } catch {
      return clearIfStillCurrent();
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function ensureFreshAccessToken(skipRefresh: boolean): Promise<void> {
  if (skipRefresh) return;
  if (!getRefreshToken()) return;
  if (!accessTokenNeedsRefresh()) return;
  await refreshSession();
}

async function request(path: string, options: RequestInit = {}, asJson = true): Promise<Response> {
  const { headers: optionHeaders, ...rest } = options;
  const jsonBody = asJson && hasRequestBody(rest.body);
  const headers = buildHeaders(optionHeaders, jsonBody);
  const skipRefresh = headers.get('X-Skip-Auth-Refresh') === '1';
  headers.delete('X-Skip-Auth-Refresh');

  await ensureFreshAccessToken(skipRefresh);

  // Reaplica o Bearer após um possível refresh.
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
  });

  if (res.status === 401 && !skipRefresh && getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retryHeaders = buildHeaders(optionHeaders, jsonBody);
      retryHeaders.delete('X-Skip-Auth-Refresh');
      const retryToken = getAccessToken();
      if (retryToken) retryHeaders.set('Authorization', `Bearer ${retryToken}`);
      res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers: retryHeaders,
      });
    }
  }

  return res;
}

/** Wrapper de fetch para JSON — Bearer automático + refresh em 401. */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await request(path, options, true);

  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new ApiError(res.status, body.message ?? res.statusText, body.error, body.issues);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

/** Downloads binários (XLSX/PDF) — devolve o Blob e o nome sugerido pelo servidor. */
export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string }> {
  const res = await request(path, {}, false);
  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? 'arquivo';
  const blob = await res.blob();
  return { blob, filename };
}

/** Dispara o download de um Blob já em mãos (usado depois de `apiDownload`). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Upload de arquivo único via multipart (ex.: importar planilha de cotações). */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request(path, { method: 'POST', body: formData }, false);
  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }
  return (await res.json()) as T;
}
