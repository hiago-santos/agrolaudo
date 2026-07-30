import { describe, expect, it } from 'vitest';

import { CalculoInvalidoError, calcularItem, consolidar } from './calculadora.js';

/**
 * "Teste nº 001" da conversa com o cliente (conversagemini.md) — os únicos números
 * que o motor NÃO pode errar. Qualquer alteração no motor que quebre este teste é
 * uma regressão no cálculo que sai para os bancos.
 */
describe('Teste dourado — laudo Márcio Menezes Ribeiro / Fazenda Santa Terezinha', () => {
  const cana = calcularItem({
    areaHa: 900,
    produtividade: 100,
    precoUnitario: 152.0,
    custoPorHa: 9000.0,
  });

  const soja = calcularItem({
    areaHa: 500,
    produtividade: 70,
    precoUnitario: 131.0,
    custoPorHa: 5461.94,
  });

  const pecuaria = calcularItem({
    areaHa: 300,
    produtividade: 15,
    precoUnitario: 240.0,
    custoPorHa: 2000.0,
  });

  it('calcula a Cana-de-Açúcar (900ha × 100t/ha × R$152,00, custo R$9.000,00/ha)', () => {
    expect(cana.producaoTotal).toBe('90000.00');
    expect(cana.faturamentoBruto).toBe('13680000.00');
    expect(cana.custoTotal).toBe('8100000.00');
    expect(cana.receitaLiquida).toBe('5580000.00');
  });

  it('calcula a Soja (500ha × 70sc/ha × R$131,00, custo R$5.461,94/ha) sem drift de float', () => {
    expect(soja.producaoTotal).toBe('35000.00');
    expect(soja.faturamentoBruto).toBe('4585000.00');
    // 500 * 5461.94 em IEEE-754 dá 2730969.9999999998 — aqui tem que fechar exato.
    expect(soja.custoTotal).toBe('2730970.00');
    expect(soja.receitaLiquida).toBe('1854030.00');
  });

  it('calcula a Pecuária Engorda com a mesma fórmula (300ha × 15@/ha × R$240,00, custo R$2.000,00/ha)', () => {
    expect(pecuaria.producaoTotal).toBe('4500.00');
    expect(pecuaria.faturamentoBruto).toBe('1080000.00');
    expect(pecuaria.custoTotal).toBe('600000.00');
    expect(pecuaria.receitaLiquida).toBe('480000.00');
  });

  it('consolida os três itens no total de R$19.345.000,00 / R$11.430.970,00 / R$7.914.030,00 a 40,91%', () => {
    const total = consolidar([cana, soja, pecuaria]);
    expect(total.totalFaturamento).toBe('19345000.00');
    expect(total.totalCusto).toBe('11430970.00');
    expect(total.totalReceita).toBe('7914030.00');
    expect(total.margemPercentual).toBe('40.91');
  });
});

describe('Indicadores técnicos de pecuária', () => {
  it('calcula produtividade/ha e taxa de lotação quando o rebanho é informado', () => {
    const item = calcularItem({
      areaHa: 300,
      produtividade: 15,
      precoUnitario: 240,
      custoPorHa: 2000,
      rebanhoCabecas: 450,
    });

    // Produtividade/ha = Produção Total (4500) / Área (300)
    expect(item.produtividadePorHa).toBe('15.00');
    // Taxa de Lotação = Cabeças (450) / Área (300)
    expect(item.taxaLotacao).toBe('1.50');
  });

  it('não calcula os indicadores de pecuária quando o rebanho não é informado', () => {
    const item = calcularItem({ areaHa: 900, produtividade: 100, precoUnitario: 152, custoPorHa: 9000 });
    expect(item.produtividadePorHa).toBeNull();
    expect(item.taxaLotacao).toBeNull();
  });
});

describe('Casos de borda', () => {
  it('área zero zera produção, faturamento e custo sem lançar erro', () => {
    const item = calcularItem({ areaHa: 0, produtividade: 100, precoUnitario: 152, custoPorHa: 9000 });
    expect(item.producaoTotal).toBe('0.00');
    expect(item.faturamentoBruto).toBe('0.00');
    expect(item.custoTotal).toBe('0.00');
    expect(item.receitaLiquida).toBe('0.00');
  });

  it('taxa de lotação com área zero retorna zero em vez de dividir por zero', () => {
    const item = calcularItem({
      areaHa: 0,
      produtividade: 0,
      precoUnitario: 0,
      custoPorHa: 0,
      rebanhoCabecas: 10,
    });
    expect(item.taxaLotacao).toBe('0.00');
    expect(item.produtividadePorHa).toBe('0.00');
  });

  it('margem consolidada é zero (não NaN/Infinity) quando o faturamento total é zero', () => {
    const item = calcularItem({ areaHa: 0, produtividade: 0, precoUnitario: 0, custoPorHa: 0 });
    const total = consolidar([item]);
    expect(total.margemPercentual).toBe('0.00');
    expect(total.totalFaturamento).toBe('0.00');
  });

  it('receita líquida negativa é permitida (custo maior que faturamento é um resultado válido)', () => {
    const item = calcularItem({ areaHa: 100, produtividade: 1, precoUnitario: 10, custoPorHa: 500 });
    // Faturamento = 100*1*10 = 1.000,00 · Custo = 100*500 = 50.000,00
    expect(item.receitaLiquida).toBe('-49000.00');
  });

  it('rejeita área negativa', () => {
    expect(() => calcularItem({ areaHa: -1, produtividade: 1, precoUnitario: 1, custoPorHa: 1 })).toThrow(
      CalculoInvalidoError,
    );
  });

  it('rejeita preço unitário negativo', () => {
    expect(() => calcularItem({ areaHa: 1, produtividade: 1, precoUnitario: -1, custoPorHa: 1 })).toThrow(
      CalculoInvalidoError,
    );
  });

  it('rejeita entrada não numérica', () => {
    expect(() =>
      calcularItem({ areaHa: 'abc', produtividade: 1, precoUnitario: 1, custoPorHa: 1 }),
    ).toThrow();
  });

  it('consolida lista vazia como zero', () => {
    const total = consolidar([]);
    expect(total.totalFaturamento).toBe('0.00');
    expect(total.totalCusto).toBe('0.00');
    expect(total.totalReceita).toBe('0.00');
    expect(total.margemPercentual).toBe('0.00');
  });
});
