export function formatCurrency(value: string | number | null | undefined): string {
  const number = Number(value ?? 0);
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Moeda enxuta pra telas estreitas: R$ 13M, R$ 45,2k, etc.
 * Valores menores que 10 mil ficam no formato completo.
 */
export function formatCurrencyCompact(value: string | number | null | undefined): string {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return formatCurrency(0);

  const sign = number < 0 ? '-' : '';
  const abs = Math.abs(number);

  if (abs >= 1_000_000_000) {
    return `${sign}R$ ${trimCompact(abs / 1_000_000_000)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}R$ ${trimCompact(abs / 1_000_000)}M`;
  }
  if (abs >= 10_000) {
    return `${sign}R$ ${trimCompact(abs / 1_000)}k`;
  }
  return formatCurrency(number);
}

function trimCompact(value: number): string {
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

export function formatNumber(value: string | number | null | undefined, decimals = 2): string {
  const number = Number(value ?? 0);
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(value: string | number | null | undefined): string {
  return `${formatNumber(value, 2)}%`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  const size = bytes ?? 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** Primeiro nome (ou primeiro token) — útil em listas compactas. */
export function shortPersonName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return '—';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/** Par lat/lng em graus decimais — 6 casas ≈ 0,1 m, precisão de sobra pra uma fazenda. */
export function formatCoordinates(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined,
): string {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return '—';
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '—';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Data curta pra mobile: 06/08/26 */
export function formatDateCompact(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Só dígitos — base pra máscara/formatação de telefone. */
export function phoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

/**
 * Máscara de telefone BR enquanto digita:
 * (11) 3456-7890 · (11) 98765-4321
 */
export function maskPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Exibe telefone já mascarado; mantém o valor original se não tiver 10/11 dígitos. */
export function formatPhone(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const digits = phoneDigits(value);
  if (digits.length === 10 || digits.length === 11) return maskPhone(digits);
  return value.trim();
}
