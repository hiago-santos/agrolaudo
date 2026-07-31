import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { generateProjectXlsx } from './xlsx.generator.js';
import type { ProjectDocument } from './types.js';

const TEST_PROJECT: ProjectDocument = {
  number: 'PROJECT-2026-0001',
  status: 'SIGNED',
  issuingCity: 'Franca',
  issueDate: '2026-01-20T15:40:00.000Z',
  notes: null,
  producer: { name: 'MARCIO MENEZES RIBEIRO', taxId: '098.736.418-90', city: 'Ituverava', state: 'SP' },
  property: {
    name: 'FAZENDA SANTA TEREZINHA',
    registrationNumber: '20629',
    city: 'Ituverava',
    state: 'SP',
    totalAreaHectares: '1700.00',
  },
  season: { label: '2025/2026' },
  agronomist: { name: 'Pedro Henrique dos Santos', licenseNumber: 'CREA 5063910430', issuingCity: 'Franca' },
  items: [
    {
      activityName: 'Cana de Açúcar',
      unit: 'TON',
      areaHectares: '900.00',
      productivity: '100.00',
      unitPrice: '152.00',
      costPerHectare: '9000.00',
      totalProduction: '90000.00',
      grossRevenue: '13680000.00',
      totalCost: '8100000.00',
      netProfit: '5580000.00',
      productivityPerHectare: null,
      stockingRate: null,
    },
    {
      activityName: 'Soja',
      unit: 'BAG_60KG',
      areaHectares: '500.00',
      productivity: '70.00',
      unitPrice: '131.00',
      costPerHectare: '5461.94',
      totalProduction: '35000.00',
      grossRevenue: '4585000.00',
      totalCost: '2730970.00',
      netProfit: '1854030.00',
      productivityPerHectare: null,
      stockingRate: null,
    },
  ],
  totalRevenue: '18265000.00',
  totalCost: '10830970.00',
  totalProfit: '7434030.00',
  profitMarginPercentage: '40.70',
  approvedCreditLimit: null,
  bankNotes: null,
  signatures: [],
};

/**
 * Reproduz o bloco de 8 linhas por atividade da planilha original do cliente
 * (ver plano — offsets +0..+7) e as fórmulas nativas do Excel. Qualquer alteração
 * que quebre esse layout quebra a fidelidade com o que o cliente já usa.
 */
describe('generateProjectXlsx', () => {
  it('gera um .xlsx válido (assinatura de arquivo ZIP)', async () => {
    const buffer = await generateProjectXlsx(TEST_PROJECT);
    expect(buffer.subarray(0, 4).toString('hex')).toBe('504b0304');
  });

  it('reproduz o bloco de 8 linhas com fórmulas relativas, não valores fixos', async () => {
    const buffer = await generateProjectXlsx(TEST_PROJECT);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Planilha não gerada.');

    const rows: Array<{ a: string; b: string | number | null }> = [];
    sheet.eachRow((row) => {
      const a = row.getCell(1).value;
      const bCell = row.getCell(2);
      const b = bCell.formula ? `=${bCell.formula}` : (bCell.value as string | number | null);
      rows.push({ a: a ? String(a) : '', b });
    });

    // Cabeçalho do cooperado
    expect(rows.find((l) => l.a === 'Cooperado:')?.b).toBe('MARCIO MENEZES RIBEIRO');
    expect(rows.find((l) => l.a === 'Matrícula:')?.b).toBe('20629');

    // Rótulos por unidade vêm do catálogo core/units.ts — Soja usa "sacas", não
    // "toneladas" (o bug do arquivo original do cliente).
    expect(rows.some((l) => l.a === 'Média Sacas de 60kg/hectare')).toBe(true);
    expect(rows.some((l) => l.a === 'Produção Total (sacas de 60kg)')).toBe(true);
    expect(rows.some((l) => l.a === 'Valor da saca de 60kg Soja')).toBe(true);

    // As 4 fórmulas do bloco: Produção = Média*Área; Faturamento = Produção*Valor;
    // Custo = Custo/ha*Área; Receita = Faturamento-Custo.
    const formulas = rows.filter((l) => typeof l.b === 'string' && (l.b as string).startsWith('='));
    expect(formulas.some((l) => /^=B\d+\*B\d+$/.test(l.b as string))).toBe(true);
    expect(formulas.some((l) => /^=B\d+-B\d+$/.test(l.b as string))).toBe(true);

    // Total consolidado soma as duas linhas de Receita Bruto dos blocos.
    const totalRow = rows.find((l) => l.a.startsWith('Receita Total'));
    expect(totalRow?.b).toMatch(/^=SUM\(B\d+,B\d+\)$/);
  });

  it('aplica formato de moeda nas colunas de valor', async () => {
    const buffer = await generateProjectXlsx(TEST_PROJECT);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Planilha não gerada.');

    let anyCellWithCurrencyFormat = false;
    sheet.eachRow((row) => {
      if (row.getCell(2).numFmt?.includes('R$')) anyCellWithCurrencyFormat = true;
    });
    expect(anyCellWithCurrencyFormat).toBe(true);
  });
});
