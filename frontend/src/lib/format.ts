export function formatCurrency(value: string | number | null | undefined): string {
  const number = Number(value ?? 0);
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
