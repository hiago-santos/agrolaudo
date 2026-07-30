import { describe, expect, it } from 'vitest';

import { renderLaudoHtml } from './laudo-template.js';
import type { LaudoDocumentoDados } from './types.js';

/**
 * Dados sintéticos do "Teste nº 001" (Cana + Soja + Pecuária), usados só para travar
 * a fidelidade do template — não dependem de banco de dados.
 */
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
    {
      atividadeNome: 'Pecuária (Cria, Recria e Engorda)',
      unidade: 'ARROBA',
      areaHa: '300.00',
      produtividade: '15.00',
      precoUnitario: '240.00',
      custoPorHa: '2000.00',
      producaoTotal: '4500.00',
      faturamentoBruto: '1080000.00',
      custoTotal: '600000.00',
      receitaLiquida: '480000.00',
      produtividadePorHa: '15.00',
      taxaLotacao: '1.50',
    },
  ],
  totalFaturamento: '19345000.00',
  totalCusto: '11430970.00',
  totalReceita: '7914030.00',
  margemPercentual: '40.91',
  assinaturas: [
    {
      tipo: 'AGRONOMO',
      nomeSignatario: 'Pedro Henrique dos Santos',
      documento: 'CREA 5063910430',
      imagemBase64: null,
      hash: 'abdf9ddb23b9804a',
      assinadoEm: '2026-01-20T15:41:00.000Z',
    },
    {
      tipo: 'PRODUTOR',
      nomeSignatario: 'MARCIO MENEZES RIBEIRO',
      documento: '098.736.418-90',
      imagemBase64: null,
      hash: '1fdad57cdff8773b',
      assinadoEm: '2026-01-20T15:41:48.000Z',
    },
  ],
};

describe('renderLaudoHtml', () => {
  const html = renderLaudoHtml(LAUDO_TESTE);

  it('força color-scheme claro — regressão do bug de texto invisível em dark mode', () => {
    // Achado no QA visual: sem isso, Chromium/Puppeteer com preferência de dark
    // mode renderiza o fundo escuro por trás de texto escuro, tornando o laudo
    // ilegível tanto no preview quanto no PDF real (mesmo HTML nos dois).
    expect(html).toContain('color-scheme: light only');
    expect(html).toContain('name="color-scheme" content="light only"');
  });

  it('mostra os totais do teste dourado formatados em pt-BR', () => {
    // toLocaleString('pt-BR', {style:'currency'}) usa U+00A0 (espaço não-quebrável)
    // depois do "R$" — visualmente idêntico a um espaço normal, mas byte diferente.
    const NBSP = ' ';
    expect(html).toContain(`R$${NBSP}19.345.000,00`);
    expect(html).toContain(`R$${NBSP}11.430.970,00`);
    expect(html).toContain(`R$${NBSP}7.914.030,00`);
    expect(html).toContain('40,91%');
  });

  it('usa símbolo de unidade, não o código bruto — regressão do bug "SACA_60KG" cru', () => {
    expect(html).not.toContain('SACA_60KG');
    expect(html).not.toContain('TONELADA<');
    expect(html).not.toContain('ARROBA<');
    expect(html).toContain('sc/ha');
    expect(html).toContain('t/ha');
    expect(html).toContain('@/ha');
  });

  it('escapa HTML nos campos de texto do usuário', () => {
    const malicioso: LaudoDocumentoDados = {
      ...LAUDO_TESTE,
      produtor: { ...LAUDO_TESTE.produtor, nome: '<script>alert(1)</script>' },
    };
    const htmlEscapado = renderLaudoHtml(malicioso);
    expect(htmlEscapado).not.toContain('<script>alert(1)</script>');
    expect(htmlEscapado).toContain('&lt;script&gt;');
  });

  it('mostra "Aguardando assinatura" quando não há QR (documento ainda não assinado)', () => {
    const semAssinatura: LaudoDocumentoDados = { ...LAUDO_TESTE, assinaturas: [] };
    const htmlSemAssinatura = renderLaudoHtml(semAssinatura);
    expect(htmlSemAssinatura).toContain('Aguardando assinatura');
  });

  it('inclui o QR Code quando a opção é passada', () => {
    const comQr = renderLaudoHtml(LAUDO_TESTE, { qrCodeDataUrl: 'data:image/png;base64,ABC123' });
    expect(comQr).toContain('data:image/png;base64,ABC123');
    expect(comQr).toContain('Verificar autenticidade');
  });
});
