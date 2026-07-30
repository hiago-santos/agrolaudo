import ExcelJS from 'exceljs';

import { rotuloMediaPorHectare, rotuloProducaoTotal, rotuloValorUnidade } from '../core/unidades.js';
import type { CodigoUnidade } from '../core/unidades.js';

import { formatarDataExtenso } from './format.js';
import type { LaudoDocumentoDados } from './types.js';

const VERDE_INSTITUCIONAL = 'FF1E4D2B';
const VERDE_CLARO = 'FF2E6F40';
const BRANCO = 'FFFFFFFF';
const FORMATO_MOEDA = '"R$" #,##0.00';
const FORMATO_NUMERO = '#,##0.00';

function aplicarEstiloTitulo(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 13, color: { argb: BRANCO } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_INSTITUCIONAL } };
    cell.alignment = { vertical: 'middle' };
  });
  row.height = 22;
}

function aplicarEstiloSecao(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: BRANCO } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_CLARO } };
  });
  row.height = 18;
}

/**
 * Reproduz o "Quadro de Produção" da planilha original do cliente — mesmo bloco de
 * 8 linhas por atividade (Área · Média/ha · Valor/unidade · Produção Total ·
 * Custo/ha · Faturamento · Custo Total · Receita), com as MESMAS fórmulas nativas
 * do Excel (não valores fixos), generalizado para N atividades em vez das 2 fixas
 * (Cana/Soja) do arquivo original. Os rótulos por unidade vêm do catálogo único em
 * core/unidades.ts — a mesma fonte usada no seed e no restante do sistema.
 */
export async function gerarLaudoXlsx(laudo: LaudoDocumentoDados): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AgroLaudo';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laudo', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [{ key: 'a', width: 34 }, { key: 'b', width: 33 }, { key: 'c', width: 23 }];

  let numeroLinha = 0;

  function proximaLinha(rotulo: string, valor?: ExcelJS.CellValue): ExcelJS.Row {
    numeroLinha += 1;
    const row = sheet.getRow(numeroLinha);
    row.getCell(1).value = rotulo;
    if (valor !== undefined) row.getCell(2).value = valor;
    return row;
  }

  proximaLinha('Cooperado:', laudo.produtor.nome);
  proximaLinha('CPF/CNPJ:', laudo.produtor.cpfCnpj);
  const propriedadeRow = proximaLinha('Propriedade:', laudo.propriedade.nome);
  sheet.mergeCells(propriedadeRow.number, 2, propriedadeRow.number, 3);
  proximaLinha('Matrícula:', laudo.propriedade.matricula);
  proximaLinha('Munícipio:', `${laudo.propriedade.municipio}-${laudo.propriedade.uf}`);
  numeroLinha += 1; // linha em branco — equivalente ao divisor "thickBot" do arquivo original

  const tituloRow = proximaLinha('Quadro de Produção', `Ano Safra: ${laudo.safra.rotulo}`);
  aplicarEstiloTitulo(tituloRow);

  const linhasReceitaPorBloco: number[] = [];

  for (const item of laudo.itens) {
    const secaoRow = proximaLinha(item.atividadeNome, 'Valores');
    aplicarEstiloSecao(secaoRow);

    const unidade = item.unidade as CodigoUnidade;

    const areaRow = proximaLinha('Área em produção (há)', Number(item.areaHa));
    const mediaRow = proximaLinha(rotuloMediaPorHectare(unidade), Number(item.produtividade));
    const valorRow = proximaLinha(rotuloValorUnidade(unidade, item.atividadeNome), Number(item.precoUnitario));

    const producaoRow = proximaLinha(rotuloProducaoTotal(unidade));
    producaoRow.getCell(2).value = { formula: `B${mediaRow.number}*B${areaRow.number}` };

    const custoHaRow = proximaLinha('Custo de Produção/há (aproximado)', Number(item.custoPorHa));

    const faturamentoRow = proximaLinha('Faturamento Bruto');
    faturamentoRow.getCell(2).value = { formula: `B${producaoRow.number}*B${valorRow.number}` };

    const custoTotalRow = proximaLinha('Custo Total');
    custoTotalRow.getCell(2).value = { formula: `B${custoHaRow.number}*B${areaRow.number}` };

    const receitaRow = proximaLinha('Receita Bruto');
    receitaRow.getCell(2).value = { formula: `B${faturamentoRow.number}-B${custoTotalRow.number}` };
    receitaRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    linhasReceitaPorBloco.push(receitaRow.number);

    for (const row of [areaRow, mediaRow]) {
      row.getCell(2).numFmt = FORMATO_NUMERO;
    }
    for (const row of [valorRow, custoHaRow, producaoRow, faturamentoRow, custoTotalRow, receitaRow]) {
      row.getCell(2).numFmt = row === producaoRow ? FORMATO_NUMERO : FORMATO_MOEDA;
    }
  }

  const totalRow = proximaLinha(`Receita Total (${laudo.itens.map((i) => i.atividadeNome).join(' + ')})`);
  totalRow.getCell(2).value = {
    formula: `SUM(${linhasReceitaPorBloco.map((numero) => `B${numero}`).join(',')})`,
  };
  totalRow.getCell(2).numFmt = FORMATO_MOEDA;
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12 };
  });

  numeroLinha += 1;
  proximaLinha(`${laudo.cidadeEmissao}, ${formatarDataExtenso(laudo.dataEmissao)}`);
  numeroLinha += 1;
  proximaLinha('', 'Engenheiro Agrônomo');
  proximaLinha('', laudo.agronomo.nome);
  proximaLinha('', laudo.agronomo.crea);
  numeroLinha += 1;
  proximaLinha('', 'Produtor Rural');
  proximaLinha('', laudo.produtor.nome);
  proximaLinha('', laudo.produtor.cpfCnpj);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
