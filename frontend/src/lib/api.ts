/** Em dev, default `/api` (proxy do Vite). Em build, exige VITE_API_URL absoluto. */
export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '/api' : '');

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

async function parseErrorBody(res: Response): Promise<ErrorBody> {
  try {
    return (await res.json()) as ErrorBody;
  } catch {
    return { message: res.statusText };
  }
}

function mergeHeaders(init?: HeadersInit, json = true): Headers {
  const headers = new Headers(init);
  if (json && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

/** Wrapper de fetch para JSON — `credentials: 'include'` manda o cookie httpOnly de sessão. */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: optionHeaders, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: mergeHeaders(optionHeaders, true),
  });

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
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include' });
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
export function baixarBlob(blob: Blob, filename: string): void {
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
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const body = await parseErrorBody(res);
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }
  return (await res.json()) as T;
}

