import { Decimal } from 'decimal.js';

/**
 * Regra de arredondamento do motor: half-up, sempre. Documentos bancários não podem
 * herdar o "round half to even" default do decimal.js — o cliente espera a mesma
 * matemática de calculadora/planilha que sempre usou.
 */
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Converte number | string | Decimal para Decimal, sem passar por float. */
export function toDecimal(value: number | string | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

/** Arredonda para 2 casas decimais (half-up) — a precisão de todo valor monetário do laudo. */
export function round2(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
