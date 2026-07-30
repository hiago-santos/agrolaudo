import { Decimal, round2, toDecimal } from './decimal.js';

/**
 * Motor de cálculo do laudo. Reproduz as 4 fórmulas do bloco de 8 linhas da
 * planilha original (ver plano — offsets +0..+7):
 *
 *   Produção Total   = Área (ha) × Produtividade
 *   Faturamento Bruto = Produção Total × Preço Unitário
 *   Custo Total       = Área (ha) × Custo/ha
 *   Receita Líquida   = Faturamento Bruto − Custo Total
 *
 * A mesma fórmula vale para atividades agrícolas e para pecuária (confirmado pelo
 * "Teste nº 001" da conversa com o cliente: 300 ha × 15 @/ha × R$ 240,00). Pecuária
 * apenas ganha dois indicadores técnicos extras quando o rebanho é informado.
 *
 * Zero I/O. Roda idêntico no cálculo em tempo real (`/laudos/calcular`) e na
 * geração dos documentos (`/report`) — é a garantia de que tela, XLSX e PDF nunca
 * divergem.
 */

export class CalculoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculoInvalidoError';
  }
}

export interface ItemCalculoInput {
  areaHa: number | string;
  produtividade: number | string;
  precoUnitario: number | string;
  custoPorHa: number | string;
  /** Só para atividades de pecuária: habilita produtividade/ha e taxa de lotação. */
  rebanhoCabecas?: number | string | null;
}

export interface ItemCalculoResultado {
  areaHa: string;
  produtividade: string;
  precoUnitario: string;
  custoPorHa: string;
  producaoTotal: string;
  faturamentoBruto: string;
  custoTotal: string;
  receitaLiquida: string;
  /** Produção Total / Área — indicador técnico de pecuária, null fora desse caso. */
  produtividadePorHa: string | null;
  /** Cabeças / Área — indicador técnico de pecuária, null fora desse caso. */
  taxaLotacao: string | null;
}

export interface ConsolidadoResultado {
  totalFaturamento: string;
  totalCusto: string;
  totalReceita: string;
  margemPercentual: string;
}

function validarNaoNegativo(valor: Decimal, campo: string): void {
  if (valor.isNegative()) {
    throw new CalculoInvalidoError(`${campo} não pode ser negativo.`);
  }
  if (valor.isNaN()) {
    throw new CalculoInvalidoError(`${campo} não é um número válido.`);
  }
}

/** Divide `a / b`, retornando zero em vez de lançar quando `b` é zero. */
function dividirOuZero(a: Decimal, b: Decimal): Decimal {
  return b.isZero() ? new Decimal(0) : a.dividedBy(b);
}

export function calcularItem(input: ItemCalculoInput): ItemCalculoResultado {
  const area = toDecimal(input.areaHa);
  const produtividade = toDecimal(input.produtividade);
  const preco = toDecimal(input.precoUnitario);
  const custoHa = toDecimal(input.custoPorHa);

  validarNaoNegativo(area, 'Área (ha)');
  validarNaoNegativo(produtividade, 'Produtividade');
  validarNaoNegativo(preco, 'Preço unitário');
  validarNaoNegativo(custoHa, 'Custo por hectare');

  const producaoTotal = round2(area.times(produtividade));
  const faturamentoBruto = round2(producaoTotal.times(preco));
  const custoTotal = round2(area.times(custoHa));
  const receitaLiquida = faturamentoBruto.minus(custoTotal);

  let produtividadePorHa: Decimal | null = null;
  let taxaLotacao: Decimal | null = null;

  if (input.rebanhoCabecas !== undefined && input.rebanhoCabecas !== null) {
    const cabecas = toDecimal(input.rebanhoCabecas);
    validarNaoNegativo(cabecas, 'Rebanho (cabeças)');
    produtividadePorHa = round2(dividirOuZero(producaoTotal, area));
    taxaLotacao = round2(dividirOuZero(cabecas, area));
  }

  return {
    areaHa: area.toFixed(2),
    produtividade: produtividade.toFixed(2),
    precoUnitario: preco.toFixed(2),
    custoPorHa: custoHa.toFixed(2),
    producaoTotal: producaoTotal.toFixed(2),
    faturamentoBruto: faturamentoBruto.toFixed(2),
    custoTotal: custoTotal.toFixed(2),
    receitaLiquida: receitaLiquida.toFixed(2),
    produtividadePorHa: produtividadePorHa ? produtividadePorHa.toFixed(2) : null,
    taxaLotacao: taxaLotacao ? taxaLotacao.toFixed(2) : null,
  };
}

/** Soma os itens já calculados (e já arredondados por item) e a margem consolidada. */
export function consolidar(
  itens: Array<Pick<ItemCalculoResultado, 'faturamentoBruto' | 'custoTotal' | 'receitaLiquida'>>,
): ConsolidadoResultado {
  let totalFaturamento = new Decimal(0);
  let totalCusto = new Decimal(0);
  let totalReceita = new Decimal(0);

  for (const item of itens) {
    totalFaturamento = totalFaturamento.plus(item.faturamentoBruto);
    totalCusto = totalCusto.plus(item.custoTotal);
    totalReceita = totalReceita.plus(item.receitaLiquida);
  }

  const margemPercentual = totalFaturamento.isZero()
    ? new Decimal(0)
    : round2(dividirOuZero(totalReceita, totalFaturamento).times(100));

  return {
    totalFaturamento: totalFaturamento.toFixed(2),
    totalCusto: totalCusto.toFixed(2),
    totalReceita: totalReceita.toFixed(2),
    margemPercentual: margemPercentual.toFixed(2),
  };
}
