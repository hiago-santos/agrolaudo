import { describe, expect, it } from 'vitest';

import { InvalidCalculationError, calculateItem, consolidate } from './calculator.js';

/**
 * "Teste nº 001" da conversa com o cliente — os únicos números que o motor NÃO
 * pode errar. Qualquer alteração que quebre este teste é uma regressão no cálculo
 * que sai para os bancos. Os NOMES mudaram no refactor (inglês); os NÚMEROS não.
 */
describe('Teste dourado — projeto Márcio Menezes Ribeiro / Fazenda Santa Terezinha', () => {
  const sugarcane = calculateItem({
    areaHectares: 900,
    productivity: 100,
    unitPrice: 152.0,
    costPerHectare: 9000.0,
  });

  const soybean = calculateItem({
    areaHectares: 500,
    productivity: 70,
    unitPrice: 131.0,
    costPerHectare: 5461.94,
  });

  const cattle = calculateItem({
    areaHectares: 300,
    productivity: 15,
    unitPrice: 240.0,
    costPerHectare: 2000.0,
  });

  it('calcula a Cana-de-Açúcar (900ha × 100t/ha × R$152,00, custo R$9.000,00/ha)', () => {
    expect(sugarcane.totalProduction).toBe('90000.00');
    expect(sugarcane.grossRevenue).toBe('13680000.00');
    expect(sugarcane.totalCost).toBe('8100000.00');
    expect(sugarcane.netProfit).toBe('5580000.00');
  });

  it('calcula a Soja (500ha × 70sc/ha × R$131,00, custo R$5.461,94/ha) sem drift de float', () => {
    expect(soybean.totalProduction).toBe('35000.00');
    expect(soybean.grossRevenue).toBe('4585000.00');
    // 500 * 5461.94 em IEEE-754 dá 2730969.9999999998 — aqui tem que fechar exato.
    expect(soybean.totalCost).toBe('2730970.00');
    expect(soybean.netProfit).toBe('1854030.00');
  });

  it('calcula a Pecuária Engorda com a mesma fórmula (300ha × 15@/ha × R$240,00, custo R$2.000,00/ha)', () => {
    expect(cattle.totalProduction).toBe('4500.00');
    expect(cattle.grossRevenue).toBe('1080000.00');
    expect(cattle.totalCost).toBe('600000.00');
    expect(cattle.netProfit).toBe('480000.00');
  });

  it('consolida os três itens no total de R$19.345.000,00 / R$11.430.970,00 / R$7.914.030,00 a 40,91%', () => {
    const total = consolidate([sugarcane, soybean, cattle]);
    expect(total.totalRevenue).toBe('19345000.00');
    expect(total.totalCost).toBe('11430970.00');
    expect(total.totalProfit).toBe('7914030.00');
    expect(total.profitMarginPercentage).toBe('40.91');
  });
});

describe('Indicadores técnicos de pecuária', () => {
  it('calcula produtividade/ha e taxa de lotação quando o rebanho é informado', () => {
    const item = calculateItem({
      areaHectares: 300,
      productivity: 15,
      unitPrice: 240,
      costPerHectare: 2000,
      herdHeadCount: 450,
    });

    // Produtividade/ha = Produção Total (4500) / Área (300)
    expect(item.productivityPerHectare).toBe('15.00');
    // Taxa de Lotação = Cabeças (450) / Área (300)
    expect(item.stockingRate).toBe('1.50');
  });

  it('não calcula os indicadores de pecuária quando o rebanho não é informado', () => {
    const item = calculateItem({ areaHectares: 900, productivity: 100, unitPrice: 152, costPerHectare: 9000 });
    expect(item.productivityPerHectare).toBeNull();
    expect(item.stockingRate).toBeNull();
  });
});

describe('Casos de borda', () => {
  it('área zero zera produção, faturamento e custo sem lançar erro', () => {
    const item = calculateItem({ areaHectares: 0, productivity: 100, unitPrice: 152, costPerHectare: 9000 });
    expect(item.totalProduction).toBe('0.00');
    expect(item.grossRevenue).toBe('0.00');
    expect(item.totalCost).toBe('0.00');
    expect(item.netProfit).toBe('0.00');
  });

  it('taxa de lotação com área zero retorna zero em vez de dividir por zero', () => {
    const item = calculateItem({
      areaHectares: 0,
      productivity: 0,
      unitPrice: 0,
      costPerHectare: 0,
      herdHeadCount: 10,
    });
    expect(item.stockingRate).toBe('0.00');
    expect(item.productivityPerHectare).toBe('0.00');
  });

  it('margem consolidada é zero (não NaN/Infinity) quando o faturamento total é zero', () => {
    const item = calculateItem({ areaHectares: 0, productivity: 0, unitPrice: 0, costPerHectare: 0 });
    const total = consolidate([item]);
    expect(total.profitMarginPercentage).toBe('0.00');
    expect(total.totalRevenue).toBe('0.00');
  });

  it('receita líquida negativa é permitida (custo maior que faturamento é um resultado válido)', () => {
    const item = calculateItem({ areaHectares: 100, productivity: 1, unitPrice: 10, costPerHectare: 500 });
    // Faturamento = 100*1*10 = 1.000,00 · Custo = 100*500 = 50.000,00
    expect(item.netProfit).toBe('-49000.00');
  });

  it('rejeita área negativa', () => {
    expect(() =>
      calculateItem({ areaHectares: -1, productivity: 1, unitPrice: 1, costPerHectare: 1 }),
    ).toThrow(InvalidCalculationError);
  });

  it('rejeita preço unitário negativo', () => {
    expect(() =>
      calculateItem({ areaHectares: 1, productivity: 1, unitPrice: -1, costPerHectare: 1 }),
    ).toThrow(InvalidCalculationError);
  });

  it('rejeita entrada não numérica', () => {
    expect(() =>
      calculateItem({ areaHectares: 'abc', productivity: 1, unitPrice: 1, costPerHectare: 1 }),
    ).toThrow();
  });

  it('consolida lista vazia como zero', () => {
    const total = consolidate([]);
    expect(total.totalRevenue).toBe('0.00');
    expect(total.totalCost).toBe('0.00');
    expect(total.totalProfit).toBe('0.00');
    expect(total.profitMarginPercentage).toBe('0.00');
  });
});
