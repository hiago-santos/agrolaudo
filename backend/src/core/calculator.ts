import { Decimal, round2, toDecimal } from './decimal.js';

/**
 * Motor de cálculo do projeto. Reproduz as 4 fórmulas do bloco de 8 linhas da
 * planilha original do cliente (offsets +0..+7):
 *
 *   Produção Total  = Área (ha) × Produtividade
 *   Faturamento Bruto = Produção Total × Preço Unitário
 *   Custo Total      = Área (ha) × Custo/ha
 *   Receita Líquida  = Faturamento Bruto − Custo Total
 *
 * A mesma fórmula vale para atividades agrícolas e para pecuária (confirmado pelo
 * "Teste nº 001" da conversa com o cliente: 300 ha × 15 @/ha × R$ 240,00). Pecuária
 * apenas ganha dois indicadores técnicos extras quando o rebanho é informado.
 *
 * Zero I/O. Roda idêntico no cálculo em tempo real (`/projects/calculate`) e na
 * geração dos documentos — é a garantia de que tela, XLSX e PDF nunca divergem.
 */

export class InvalidCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCalculationError';
  }
}

export interface CalculationItemInput {
  areaHectares: number | string;
  productivity: number | string;
  unitPrice: number | string;
  costPerHectare: number | string;
  /** Só para atividades de pecuária: habilita produtividade/ha e taxa de lotação. */
  herdHeadCount?: number | string | null;
}

export interface CalculationItemResult {
  areaHectares: string;
  productivity: string;
  unitPrice: string;
  costPerHectare: string;
  totalProduction: string;
  grossRevenue: string;
  totalCost: string;
  netProfit: string;
  /** Produção Total / Área — indicador técnico de pecuária, null fora desse caso. */
  productivityPerHectare: string | null;
  /** Cabeças / Área — indicador técnico de pecuária, null fora desse caso. */
  stockingRate: string | null;
}

export interface ConsolidatedResult {
  totalRevenue: string;
  totalCost: string;
  totalProfit: string;
  profitMarginPercentage: string;
}

function validateNonNegative(value: Decimal, field: string): void {
  if (value.isNegative()) {
    throw new InvalidCalculationError(`${field} não pode ser negativo.`);
  }
  if (value.isNaN()) {
    throw new InvalidCalculationError(`${field} não é um número válido.`);
  }
}

/** Divide `a / b`, retornando zero em vez de lançar quando `b` é zero. */
function divideOrZero(a: Decimal, b: Decimal): Decimal {
  return b.isZero() ? new Decimal(0) : a.dividedBy(b);
}

export function calculateItem(input: CalculationItemInput): CalculationItemResult {
  const area = toDecimal(input.areaHectares);
  const productivity = toDecimal(input.productivity);
  const price = toDecimal(input.unitPrice);
  const costPerHectare = toDecimal(input.costPerHectare);

  validateNonNegative(area, 'Área (ha)');
  validateNonNegative(productivity, 'Produtividade');
  validateNonNegative(price, 'Preço unitário');
  validateNonNegative(costPerHectare, 'Custo por hectare');

  const totalProduction = round2(area.times(productivity));
  const grossRevenue = round2(totalProduction.times(price));
  const totalCost = round2(area.times(costPerHectare));
  const netProfit = grossRevenue.minus(totalCost);

  let productivityPerHectare: Decimal | null = null;
  let stockingRate: Decimal | null = null;

  if (input.herdHeadCount !== undefined && input.herdHeadCount !== null) {
    const headCount = toDecimal(input.herdHeadCount);
    validateNonNegative(headCount, 'Rebanho (cabeças)');
    productivityPerHectare = round2(divideOrZero(totalProduction, area));
    stockingRate = round2(divideOrZero(headCount, area));
  }

  return {
    areaHectares: area.toFixed(2),
    productivity: productivity.toFixed(2),
    unitPrice: price.toFixed(2),
    costPerHectare: costPerHectare.toFixed(2),
    totalProduction: totalProduction.toFixed(2),
    grossRevenue: grossRevenue.toFixed(2),
    totalCost: totalCost.toFixed(2),
    netProfit: netProfit.toFixed(2),
    productivityPerHectare: productivityPerHectare ? productivityPerHectare.toFixed(2) : null,
    stockingRate: stockingRate ? stockingRate.toFixed(2) : null,
  };
}

/** Soma os itens já calculados (e já arredondados por item) e a margem consolidada. */
export function consolidate(
  items: Array<Pick<CalculationItemResult, 'grossRevenue' | 'totalCost' | 'netProfit'>>,
): ConsolidatedResult {
  let totalRevenue = new Decimal(0);
  let totalCost = new Decimal(0);
  let totalProfit = new Decimal(0);

  for (const item of items) {
    totalRevenue = totalRevenue.plus(item.grossRevenue);
    totalCost = totalCost.plus(item.totalCost);
    totalProfit = totalProfit.plus(item.netProfit);
  }

  const profitMarginPercentage = totalRevenue.isZero()
    ? new Decimal(0)
    : round2(divideOrZero(totalProfit, totalRevenue).times(100));

  return {
    totalRevenue: totalRevenue.toFixed(2),
    totalCost: totalCost.toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    profitMarginPercentage: profitMarginPercentage.toFixed(2),
  };
}
