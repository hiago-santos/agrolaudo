/** Formatação pt-BR usada nos 3 documentos (preview HTML, XLSX, PDF) — um só lugar. */

export function formatarMoeda(valor: string | number): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarNumero(valor: string | number, casas = 2): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarPercentual(valor: string | number): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return `${formatarNumero(numero, 2)}%`;
}

export function formatarDataExtenso(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function formatarDataHora(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' });
}
