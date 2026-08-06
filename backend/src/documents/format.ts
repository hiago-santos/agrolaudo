/** Formatação pt-BR usada nos documentos (XLSX e PDF) — um só lugar. */

export function formatCurrency(value: string | number): string {
  const number = typeof value === 'string' ? Number(value) : value;
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value: string | number, decimals = 2): string {
  const number = typeof value === 'string' ? Number(value) : value;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(value: string | number): string {
  const number = typeof value === 'string' ? Number(value) : value;
  return `${formatNumber(number, 2)}%`;
}

export function formatLongDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' });
}
