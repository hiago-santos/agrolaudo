import ExcelJS from 'exceljs';

import { averagePerHectareLabel, totalProductionLabel, unitValueLabel } from '../core/units.js';
import type { UnitCode } from '../core/units.js';

import { formatLongDate } from './format.js';
import type { ProjectDocument } from './types.js';

const INSTITUTIONAL_GREEN = 'FF1E4D2B';
const LIGHT_GREEN = 'FF2E6F40';
const WHITE = 'FFFFFFFF';
const CURRENCY_FORMAT = '"R$" #,##0.00';
const NUMBER_FORMAT = '#,##0.00';

function applyTitleStyle(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 13, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INSTITUTIONAL_GREEN } };
    cell.alignment = { vertical: 'middle' };
  });
  row.height = 22;
}

function applySectionStyle(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREEN } };
  });
  row.height = 18;
}

/**
 * Reproduz o "Quadro de Produção" da planilha original do cliente — mesmo bloco de
 * 8 linhas por atividade (Área · Média/ha · Valor/unidade · Produção Total ·
 * Custo/ha · Faturamento · Custo Total · Receita), com as MESMAS fórmulas nativas
 * do Excel (não valores fixos), generalizado para N atividades em vez das 2 fixas
 * (Cana/Soja) do arquivo original. Os rótulos por unidade vêm do catálogo único em
 * core/units.ts — a mesma fonte usada no seed e no restante do sistema.
 */
export async function generateProjectXlsx(project: ProjectDocument): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AgroLaudo';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Projeto', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [{ key: 'a', width: 34 }, { key: 'b', width: 33 }, { key: 'c', width: 23 }];

  let rowNumber = 0;

  function nextRow(label: string, value?: ExcelJS.CellValue): ExcelJS.Row {
    rowNumber += 1;
    const row = sheet.getRow(rowNumber);
    row.getCell(1).value = label;
    if (value !== undefined) row.getCell(2).value = value;
    return row;
  }

  nextRow('Cooperado:', project.producer.name);
  nextRow('CPF/CNPJ:', project.producer.taxId);
  const propertyRow = nextRow('Propriedade:', project.property.name);
  sheet.mergeCells(propertyRow.number, 2, propertyRow.number, 3);
  nextRow('Matrícula:', project.property.registrationNumber);
  nextRow('Munícipio:', `${project.property.city}-${project.property.state}`);
  rowNumber += 1; // linha em branco — equivalente ao divisor "thickBot" do arquivo original

  const titleRow = nextRow('Quadro de Produção', `Ano Safra: ${project.season.label}`);
  applyTitleStyle(titleRow);

  const profitRowNumbers: number[] = [];

  for (const item of project.items) {
    const sectionRow = nextRow(item.activityName, 'Valores');
    applySectionStyle(sectionRow);

    const unit = item.unit as UnitCode;

    const areaRow = nextRow('Área em produção (há)', Number(item.areaHectares));
    const averageRow = nextRow(averagePerHectareLabel(unit), Number(item.productivity));
    const priceRow = nextRow(unitValueLabel(unit, item.activityName), Number(item.unitPrice));

    const productionRow = nextRow(totalProductionLabel(unit));
    productionRow.getCell(2).value = { formula: `B${averageRow.number}*B${areaRow.number}` };

    const costPerHectareRow = nextRow('Custo de Produção/há (aproximado)', Number(item.costPerHectare));

    const revenueRow = nextRow('Faturamento Bruto');
    revenueRow.getCell(2).value = { formula: `B${productionRow.number}*B${priceRow.number}` };

    const totalCostRow = nextRow('Custo Total');
    totalCostRow.getCell(2).value = { formula: `B${costPerHectareRow.number}*B${areaRow.number}` };

    const profitRow = nextRow('Receita Bruto');
    profitRow.getCell(2).value = { formula: `B${revenueRow.number}-B${totalCostRow.number}` };
    profitRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    profitRowNumbers.push(profitRow.number);

    for (const row of [areaRow, averageRow]) {
      row.getCell(2).numFmt = NUMBER_FORMAT;
    }
    for (const row of [priceRow, costPerHectareRow, productionRow, revenueRow, totalCostRow, profitRow]) {
      row.getCell(2).numFmt = row === productionRow ? NUMBER_FORMAT : CURRENCY_FORMAT;
    }
  }

  const totalRow = nextRow(`Receita Total (${project.items.map((i) => i.activityName).join(' + ')})`);
  totalRow.getCell(2).value = {
    formula: `SUM(${profitRowNumbers.map((number) => `B${number}`).join(',')})`,
  };
  totalRow.getCell(2).numFmt = CURRENCY_FORMAT;
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12 };
  });

  rowNumber += 1;
  nextRow(`${project.issuingCity}, ${formatLongDate(project.issueDate)}`);
  rowNumber += 1;
  nextRow('', 'Engenheiro Agrônomo');
  nextRow('', project.agronomist.name);
  nextRow('', project.agronomist.licenseNumber);
  rowNumber += 1;
  nextRow('', 'Produtor Rural');
  nextRow('', project.producer.name);
  nextRow('', project.producer.taxId);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
