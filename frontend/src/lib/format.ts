export function formatarMoeda(valor: string | number | null | undefined): string {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarNumero(valor: string | number | null | undefined, casas = 2): string {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarPercentual(valor: string | number | null | undefined): string {
  return `${formatarNumero(valor, 2)}%`;
}

export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return '—';
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function formatarDataHora(data: string | Date | null | undefined): string {
  if (!data) return '—';
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
