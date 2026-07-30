import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { gerarLaudoXlsx } from './laudo-xlsx.js';
import type { LaudoDocumentoDados } from './types.js';

const LAUDO_TESTE: LaudoDocumentoDados = {
  numero: 'LAUDO-2026-0001',
  status: 'ASSINADO',
  cidadeEmissao: 'Franca',
  dataEmissao: '2026-01-20T15:40:00.000Z',
  observacoes: null,
  produtor: { nome: 'MARCIO MENEZES RIBEIRO', cpfCnpj: '098.736.418-90', municipio: 'Ituverava', uf: 'SP' },
  propriedade: {
    nome: 'FAZENDA SANTA TEREZINHA',
    matricula: '20629',
    municipio: 'Ituverava',
    uf: 'SP',
    areaTotalHa: '1700.00',
  },
  safra: { rotulo: '2025/2026' },
  agronomo: { nome: 'Pedro Henrique dos Santos', crea: 'CREA 5063910430', cidadeEmissao: 'Franca' },
  itens: [
    {
      atividadeNome: 'Cana de Açúcar',
      unidade: 'TONELADA',
      areaHa: '900.00',
      produtividade: '100.00',
      precoUnitario: '152.00',
      custoPorHa: '9000.00',
      producaoTotal: '90000.00',
      faturamentoBruto: '13680000.00',
      custoTotal: '8100000.00',
      receitaLiquida: '5580000.00',
      produtividadePorHa: null,
      taxaLotacao: null,
    },
    {
      atividadeNome: 'Soja',
      unidade: 'SACA_60KG',
      areaHa: '500.00',
      produtividade: '70.00',
      precoUnitario: '131.00',
      custoPorHa: '5461.94',
      producaoTotal: '35000.00',
      faturamentoBruto: '4585000.00',
      custoTotal: '2730970.00',
      receitaLiquida: '1854030.00',
      produtividadePorHa: null,
      taxaLotacao: null,
    },
  ],
  totalFaturamento: '18265000.00',
  totalCusto: '10830970.00',
  totalReceita: '7434030.00',
  margemPercentual: '40.70',
  assinaturas: [],
};

/**
 * Reproduz o bloco de 8 linhas por atividade da planilha original do cliente
 * (ver plano — offsets +0..+7) e as fórmulas nativas do Excel. Qualquer alteração
 * que quebre esse layout quebra a fidelidade com o que o cliente já usa.
 */
describe('gerarLaudoXlsx', () => {
  it('gera um .xlsx válido (assinatura de arquivo ZIP)', async () => {
    const buffer = await gerarLaudoXlsx(LAUDO_TESTE);
    expect(buffer.subarray(0, 4).toString('hex')).toBe('504b0304');
  });

  it('reproduz o bloco de 8 linhas com fórmulas relativas, não valores fixos', async () => {
    const buffer = await gerarLaudoXlsx(LAUDO_TESTE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Planilha não gerada.');

    const linhas: Array<{ a: string; b: string | number | null }> = [];
    sheet.eachRow((row) => {
      const a = row.getCell(1).value;
      const bCell = row.getCell(2);
      const b = bCell.formula ? `=${bCell.formula}` : (bCell.value as string | number | null);
      linhas.push({ a: a ? String(a) : '', b });
    });

    // Cabeçalho do cooperado
    expect(linhas.find((l) => l.a === 'Cooperado:')?.b).toBe('MARCIO MENEZES RIBEIRO');
    expect(linhas.find((l) => l.a === 'Matrícula:')?.b).toBe('20629');

    // Rótulos por unidade vêm do catálogo core/unidades.ts — Soja usa "sacas", não
    // "toneladas" (o bug do arquivo original do cliente).
    expect(linhas.some((l) => l.a === 'Média Sacas de 60kg/hectare')).toBe(true);
    expect(linhas.some((l) => l.a === 'Produção Total (sacas de 60kg)')).toBe(true);
    expect(linhas.some((l) => l.a === 'Valor da saca de 60kg Soja')).toBe(true);

    // As 4 fórmulas do bloco: Produção = Média*Área; Faturamento = Produção*Valor;
    // Custo = Custo/ha*Área; Receita = Faturamento-Custo.
    const formulas = linhas.filter((l) => typeof l.b === 'string' && (l.b as string).startsWith('='));
    expect(formulas.some((l) => /^=B\d+\*B\d+$/.test(l.b as string))).toBe(true);
    expect(formulas.some((l) => /^=B\d+-B\d+$/.test(l.b as string))).toBe(true);

    // Total consolidado soma as duas linhas de Receita Bruto dos blocos.
    const totalRow = linhas.find((l) => l.a.startsWith('Receita Total'));
    expect(totalRow?.b).toMatch(/^=SUM\(B\d+,B\d+\)$/);
  });

  it('aplica formato de moeda nas colunas de valor', async () => {
    const buffer = await gerarLaudoXlsx(LAUDO_TESTE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Planilha não gerada.');

    let algumaCelulaComFormatoMoeda = false;
    sheet.eachRow((row) => {
      if (row.getCell(2).numFmt?.includes('R$')) algumaCelulaComFormatoMoeda = true;
    });
    expect(algumaCelulaComFormatoMoeda).toBe(true);
  });
});
