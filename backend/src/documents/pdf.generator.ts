import pdfMake from 'pdfmake';
import type { Content } from 'pdfmake';

import {
  formatCurrency,
  formatDateTime,
  formatLongDate,
  formatNumber,
  formatPercentage,
} from './format.js';
import type { ProjectDocument } from './types.js';

/**
 * Fontes padrão do PDF (as 14 "standard fonts" do próprio spec de PDF) — o pdfkit
 * (usado por baixo do pdfmake) já embute as métricas delas, então não precisamos
 * carregar/distribuir arquivos .ttf. Cobrem acentuação pt-BR (WinAnsiEncoding).
 */
const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

pdfMake.setFonts(FONTS);
// Todo conteúdo do docDefinition é montado por nós a partir de dados do banco —
// nunca aceitamos path/URL vindos de fora — mas negamos explicitamente por
// segurança em profundidade (nenhum destes recursos é usado neste gerador).
pdfMake.setUrlAccessPolicy(() => false);

const INSTITUTIONAL_GREEN = '#1E4D2B';
const LIGHT_GREEN = '#2E6F40';
const MUTED = '#6B7280';
const BORDER = '#D1D5DB';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_SIGNATURES: 'Aguardando assinatura',
  SIGNED: 'Assinado',
  UNDER_BANK_REVIEW: 'Em análise pelo banco',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  CANCELLED: 'Cancelado',
};

const SIGNATURE_TYPE_LABELS: Record<string, string> = {
  AGRONOMIST: 'Engenheiro Agrônomo',
  PRODUCER: 'Produtor Rural',
};

function infoRow(label: string, value: string): Content {
  return {
    columns: [
      { text: label, width: 110, fontSize: 9, color: MUTED },
      { text: value, fontSize: 10, bold: true },
    ],
    margin: [0, 1, 0, 1],
  };
}

function signatureBlock(project: ProjectDocument, type: 'AGRONOMIST' | 'PRODUCER') {
  const signature = project.signatures.find((s) => s.type === type);
  const title = SIGNATURE_TYPE_LABELS[type] ?? type;
  const name = type === 'AGRONOMIST' ? project.agronomist.name : project.producer.name;
  const document =
    type === 'AGRONOMIST' ? project.agronomist.licenseNumber : project.producer.taxId;

  const stack: Content[] = [];
  if (signature?.imageBase64) {
    stack.push({ image: signature.imageBase64, width: 140, height: 60, margin: [0, 0, 0, 4] });
  } else {
    stack.push({
      text: '(assinatura pendente)',
      italics: true,
      color: MUTED,
      margin: [0, 20, 0, 4],
    });
  }
  stack.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: BORDER }],
  });
  stack.push({ text: name, bold: true, fontSize: 10, margin: [0, 4, 0, 0] });
  stack.push({ text: document, fontSize: 9, color: MUTED });
  stack.push({ text: title, fontSize: 9, color: MUTED });
  if (signature?.signedAt) {
    stack.push({
      text: `Assinado em ${formatDateTime(signature.signedAt)}`,
      fontSize: 8,
      color: MUTED,
    });
  }

  return { stack, width: '*' };
}

/**
 * Documento "aproximado e otimizado pra PDF" (ver plano) — não replica pixel a
 * pixel a tela nem a planilha, mas carrega os mesmos números e é gerado
 * nativamente (pdfmake sobre pdfkit), sem abrir um navegador.
 */
export async function generateProjectPdf(
  project: ProjectDocument,
  qrCodeDataUrl: string | null,
): Promise<Buffer> {
  const itemRows = project.items.map((item) => [
    { text: item.activityName, fontSize: 8 },
    { text: item.unit, fontSize: 8 },
    { text: formatNumber(item.areaHectares), fontSize: 8, alignment: 'right' as const },
    { text: formatNumber(item.productivity), fontSize: 8, alignment: 'right' as const },
    { text: formatNumber(item.totalProduction), fontSize: 8, alignment: 'right' as const },
    { text: formatCurrency(item.grossRevenue), fontSize: 8, alignment: 'right' as const },
    { text: formatCurrency(item.totalCost), fontSize: 8, alignment: 'right' as const },
    { text: formatCurrency(item.netProfit), fontSize: 8, bold: true, alignment: 'right' as const },
  ]);

  const content: Content[] = [
    {
      columns: [
        { text: 'AgroLaudo', fontSize: 20, bold: true, color: '#FFFFFF' },
        {
          text: `Nº ${project.number}`,
          fontSize: 12,
          color: '#FFFFFF',
          alignment: 'right',
          margin: [0, 4, 0, 0],
        },
      ],
      fillColor: INSTITUTIONAL_GREEN,
      margin: [0, 0, 0, 0],
    },
    {
      text: `Laudo de Capacidade Pagadora · ${STATUS_LABELS[project.status] ?? project.status}`,
      fontSize: 10,
      color: '#FFFFFF',
      fillColor: INSTITUTIONAL_GREEN,
      margin: [0, 0, 0, 8],
    },
    { text: '', margin: [0, 10, 0, 0] },
    {
      columns: [
        {
          width: '*',
          stack: [
            {
              text: 'Produtor',
              fontSize: 11,
              bold: true,
              color: LIGHT_GREEN,
              margin: [0, 0, 0, 4],
            },
            infoRow('Nome', project.producer.name),
            infoRow('CPF/CNPJ', project.producer.taxId),
            infoRow('Município', `${project.producer.city}-${project.producer.state}`),
          ],
        },
        {
          width: '*',
          stack: [
            {
              text: 'Propriedade',
              fontSize: 11,
              bold: true,
              color: LIGHT_GREEN,
              margin: [0, 0, 0, 4],
            },
            infoRow('Nome', project.property.name),
            infoRow('Matrícula', project.property.registrationNumber),
            infoRow('Área total', `${formatNumber(project.property.totalAreaHectares)} ha`),
          ],
        },
      ],
      columnGap: 20,
      margin: [0, 0, 0, 12],
    },
    {
      columns: [
        {
          width: '*',
          stack: [
            {
              text: 'Agrônomo responsável',
              fontSize: 11,
              bold: true,
              color: LIGHT_GREEN,
              margin: [0, 0, 0, 4],
            },
            infoRow('Nome', project.agronomist.name),
            infoRow('CREA', project.agronomist.licenseNumber),
          ],
        },
        {
          width: '*',
          stack: [
            {
              text: 'Safra e emissão',
              fontSize: 11,
              bold: true,
              color: LIGHT_GREEN,
              margin: [0, 0, 0, 4],
            },
            infoRow('Safra', project.season.label),
            infoRow('Emitido em', `${project.issuingCity}, ${formatLongDate(project.issueDate)}`),
          ],
        },
      ],
      columnGap: 20,
      margin: [0, 0, 0, 16],
    },
    {
      text: 'Quadro de Produção',
      fontSize: 12,
      bold: true,
      color: LIGHT_GREEN,
      margin: [0, 0, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 55, 45, 55, 60, 65, 60, 65],
        body: [
          [
            { text: 'Atividade', fontSize: 8, bold: true, color: '#FFFFFF' },
            { text: 'Unidade', fontSize: 8, bold: true, color: '#FFFFFF' },
            { text: 'Área (ha)', fontSize: 8, bold: true, color: '#FFFFFF', alignment: 'right' },
            { text: 'Produtiv.', fontSize: 8, bold: true, color: '#FFFFFF', alignment: 'right' },
            { text: 'Produção', fontSize: 8, bold: true, color: '#FFFFFF', alignment: 'right' },
            { text: 'Faturamento', fontSize: 8, bold: true, color: '#FFFFFF', alignment: 'right' },
            { text: 'Custo', fontSize: 8, bold: true, color: '#FFFFFF', alignment: 'right' },
            { text: 'Receita', fontSize: 8, bold: true, color: '#FFFFFF', alignment: 'right' },
          ],
          ...itemRows,
        ],
      },
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex === 0 ? LIGHT_GREEN : rowIndex % 2 === 0 ? '#F3F4F6' : null,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => BORDER,
      },
      margin: [0, 0, 0, 16],
    },
    {
      columns: [
        { text: '', width: '*' },
        {
          width: 220,
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'Faturamento total', fontSize: 9 },
                { text: formatCurrency(project.totalRevenue), fontSize: 9, alignment: 'right' },
              ],
              [
                { text: 'Custo total', fontSize: 9 },
                { text: formatCurrency(project.totalCost), fontSize: 9, alignment: 'right' },
              ],
              [
                { text: 'Receita líquida', fontSize: 10, bold: true },
                {
                  text: formatCurrency(project.totalProfit),
                  fontSize: 10,
                  bold: true,
                  alignment: 'right',
                },
              ],
              [
                { text: 'Margem', fontSize: 9 },
                {
                  text: formatPercentage(project.profitMarginPercentage),
                  fontSize: 9,
                  alignment: 'right',
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
      ],
      margin: [0, 0, 0, 16],
    },
  ];

  if (project.approvedCreditLimit || project.bankNotes || project.status === 'UNDER_BANK_REVIEW') {
    content.push(
      {
        text: 'Análise do Banco',
        fontSize: 12,
        bold: true,
        color: LIGHT_GREEN,
        margin: [0, 0, 0, 6],
      },
      infoRow('Status', STATUS_LABELS[project.status] ?? project.status),
    );
    if (project.approvedCreditLimit) {
      content.push(
        infoRow('Limite de crédito aprovado', formatCurrency(project.approvedCreditLimit)),
      );
    }
    if (project.bankNotes) {
      content.push({ text: project.bankNotes, fontSize: 9, italics: true, margin: [0, 4, 0, 0] });
    }
    content.push({ text: '', margin: [0, 8, 0, 0] });
  }

  content.push(
    { text: 'Assinaturas', fontSize: 12, bold: true, color: LIGHT_GREEN, margin: [0, 8, 0, 10] },
    {
      columns: [signatureBlock(project, 'AGRONOMIST'), signatureBlock(project, 'PRODUCER')],
      columnGap: 30,
    },
  );

  if (qrCodeDataUrl) {
    content.push({
      columns: [
        { text: '', width: '*' },
        {
          width: 90,
          stack: [
            { image: qrCodeDataUrl, width: 70, height: 70, alignment: 'center' },
            {
              text: 'Verificar autenticidade',
              fontSize: 7,
              color: MUTED,
              alignment: 'center',
              margin: [0, 2, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 20, 0, 0],
    });
  }

  const pdfDoc = pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [40, 0, 40, 40],
    defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#111827' },
    content,
    footer: (currentPage: number, pageCount: number) => ({
      text: `AgroLaudo · Página ${currentPage} de ${pageCount}`,
      fontSize: 7,
      color: MUTED,
      alignment: 'center',
      margin: [0, 0, 0, 10],
    }),
  });
  return pdfDoc.getBuffer();
}
