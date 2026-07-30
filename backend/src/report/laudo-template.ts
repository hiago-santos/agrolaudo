import { UNIDADES, type CodigoUnidade } from '../core/unidades.js';

import { formatarDataExtenso, formatarDataHora, formatarMoeda, formatarNumero, formatarPercentual } from './format.js';
import type { LaudoDocumentoAssinatura, LaudoDocumentoDados } from './types.js';

export interface RenderLaudoHtmlOptions {
  qrCodeDataUrl?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  ASSINADO: 'Assinado',
  CANCELADO: 'Cancelado',
};

function esc(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "sc", "t", "@" — símbolo curto do catálogo core/unidades.ts, com o código bruto como fallback. */
function simboloUnidade(codigo: string): string {
  return UNIDADES[codigo as CodigoUnidade]?.simbolo ?? codigo;
}

function linhaItem(item: LaudoDocumentoDados['itens'][number]): string {
  const simbolo = simboloUnidade(item.unidade);
  return `
    <tr>
      <td>${esc(item.atividadeNome)}</td>
      <td class="num">${formatarNumero(item.areaHa)}</td>
      <td class="num">${formatarNumero(item.producaoTotal)} ${esc(simbolo)}</td>
      <td class="num">${formatarNumero(item.produtividade)} ${esc(simbolo)}/ha</td>
      <td class="num">${formatarMoeda(item.precoUnitario)}</td>
      <td class="num">${formatarMoeda(item.faturamentoBruto)}</td>
      <td class="num">${formatarMoeda(item.custoTotal)}</td>
      <td class="num destaque">${formatarMoeda(item.receitaLiquida)}</td>
    </tr>`;
}

function blocoAssinatura(
  titulo: string,
  assinatura: LaudoDocumentoAssinatura | undefined,
  nomeFallback: string,
  documentoFallback: string,
  rotuloDocumento: string,
): string {
  const corpo = assinatura?.imagemBase64
    ? `<img class="assinatura-imagem" src="${assinatura.imagemBase64}" alt="Assinatura de ${esc(assinatura.nomeSignatario)}" />`
    : `<div class="assinatura-linha"></div>`;

  const meta = assinatura?.assinadoEm
    ? `<p class="assinatura-meta">Assinado em ${formatarDataHora(assinatura.assinadoEm)}${
        assinatura.hash ? ` · Hash ${esc(assinatura.hash)}` : ''
      }</p>`
    : `<p class="assinatura-meta assinatura-pendente">Aguardando assinatura</p>`;

  return `
    <div class="assinatura-card">
      <p class="assinatura-titulo">${titulo}</p>
      ${corpo}
      <p class="assinatura-nome">${esc(assinatura?.nomeSignatario ?? nomeFallback)}</p>
      <p class="assinatura-doc">${rotuloDocumento}: ${esc(assinatura?.documento ?? documentoFallback)}</p>
      ${meta}
    </div>`;
}

/**
 * Gera o HTML autocontido (CSS inline, sem recursos externos) do laudo. É a única
 * fonte de layout do documento: o preview em tela usa este HTML num
 * `<iframe srcdoc>`, e o PDF é este MESMO HTML passado ao Puppeteer — não existem
 * dois templates para divergir entre si.
 */
export function renderLaudoHtml(laudo: LaudoDocumentoDados, options: RenderLaudoHtmlOptions = {}): string {
  const agronomoAssinatura = laudo.assinaturas.find((a) => a.tipo === 'AGRONOMO');
  const produtorAssinatura = laudo.assinaturas.find((a) => a.tipo === 'PRODUTOR');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light only" />
<title>Laudo ${esc(laudo.numero)}</title>
<style>
  /* Documento oficial: SEMPRE fundo branco/texto escuro, mesmo se o navegador ou o
     Chromium do Puppeteer estiver com preferência de dark mode — um laudo bancário
     não pode sair (ou pré-visualizar) com texto invisível por causa disso. */
  :root { color-scheme: light only; }
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  html, body {
    background: #ffffff;
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a2721;
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
  }
  .cabecalho {
    background: #1e4d2b;
    color: #fff;
    padding: 16px 20px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cabecalho h1 { font-size: 16px; margin: 0 0 2px; }
  .cabecalho .subtitulo { font-size: 10px; opacity: .85; }
  .cabecalho .numero { text-align: right; font-size: 11px; }
  .cabecalho .status {
    display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 999px;
    background: rgba(255,255,255,.18); font-size: 9px; text-transform: uppercase; letter-spacing: .04em;
  }

  .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
  .card { border: 1px solid #dbe5df; border-radius: 6px; padding: 10px 12px; }
  .card h2 { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #2e6f40; margin: 0 0 6px; }
  .card p { margin: 2px 0; }
  .card .label { color: #5b6b62; }

  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10px; }
  thead tr { background: #2e6f40; color: #fff; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e4ebe6; }
  td.num, th.num { text-align: right; }
  td.destaque { font-weight: 600; color: #1e4d2b; }
  tbody tr:nth-child(even) { background: #f6faf7; }

  .resumo { margin-top: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .resumo .item { border: 1px solid #dbe5df; border-radius: 6px; padding: 10px; text-align: center; }
  .resumo .item .valor { font-size: 14px; font-weight: 700; color: #1e4d2b; }
  .resumo .item .rotulo { font-size: 9px; color: #5b6b62; text-transform: uppercase; letter-spacing: .03em; margin-top: 2px; }

  .assinaturas { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  .assinatura-card { border-top: 1px solid #c9d6cd; padding-top: 8px; text-align: center; }
  .assinatura-titulo { font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #5b6b62; margin: 0 0 6px; }
  .assinatura-linha { height: 34px; border-bottom: 1px solid #1a2721; margin: 0 20px 6px; }
  .assinatura-imagem { max-height: 40px; margin-bottom: 4px; }
  .assinatura-nome { font-weight: 600; margin: 0; }
  .assinatura-doc, .assinatura-meta { margin: 1px 0; color: #5b6b62; font-size: 9px; }
  .assinatura-pendente { color: #b45309; font-weight: 600; }

  .rodape { margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #5b6b62; }
  .rodape .qrcode { text-align: center; }
  .rodape .qrcode img { width: 64px; height: 64px; }
</style>
</head>
<body>
  <header class="cabecalho">
    <div>
      <h1>Laudo Técnico de Capacidade Pagadora</h1>
      <div class="subtitulo">Safra ${esc(laudo.safra.rotulo)}</div>
    </div>
    <div class="numero">
      ${esc(laudo.numero)}
      <div class="status">${STATUS_LABEL[laudo.status] ?? esc(laudo.status)}</div>
    </div>
  </header>

  <section class="grid-info">
    <div class="card">
      <h2>Produtor</h2>
      <p>${esc(laudo.produtor.nome)}</p>
      <p class="label">CPF/CNPJ: ${esc(laudo.produtor.cpfCnpj)}</p>
      <p class="label">${esc(laudo.produtor.municipio)}-${esc(laudo.produtor.uf)}</p>
    </div>
    <div class="card">
      <h2>Propriedade</h2>
      <p>${esc(laudo.propriedade.nome)}</p>
      <p class="label">Matrícula: ${esc(laudo.propriedade.matricula)} · Área total: ${formatarNumero(laudo.propriedade.areaTotalHa)} ha</p>
      <p class="label">${esc(laudo.propriedade.municipio)}-${esc(laudo.propriedade.uf)}</p>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th>Atividade</th>
        <th class="num">Área (ha)</th>
        <th class="num">Produção</th>
        <th class="num">Produtividade</th>
        <th class="num">Preço Unit.</th>
        <th class="num">Faturamento</th>
        <th class="num">Custo</th>
        <th class="num">Receita Líquida</th>
      </tr>
    </thead>
    <tbody>${laudo.itens.map(linhaItem).join('')}</tbody>
  </table>

  <section class="resumo">
    <div class="item"><div class="valor">${formatarMoeda(laudo.totalFaturamento)}</div><div class="rotulo">Faturamento Bruto</div></div>
    <div class="item"><div class="valor">${formatarMoeda(laudo.totalCusto)}</div><div class="rotulo">Custo de Produção</div></div>
    <div class="item"><div class="valor">${formatarMoeda(laudo.totalReceita)}</div><div class="rotulo">Receita Líquida</div></div>
    <div class="item"><div class="valor">${formatarPercentual(laudo.margemPercentual)}</div><div class="rotulo">Margem Operacional</div></div>
  </section>

  <section class="assinaturas">
    ${blocoAssinatura('Engenheiro Agrônomo Responsável Técnico', agronomoAssinatura, laudo.agronomo.nome, laudo.agronomo.crea, 'CREA')}
    ${blocoAssinatura('Produtor Rural', produtorAssinatura, laudo.produtor.nome, laudo.produtor.cpfCnpj, 'CPF/CNPJ')}
  </section>

  <footer class="rodape">
    <div>
      <p>${esc(laudo.cidadeEmissao)}, ${formatarDataExtenso(laudo.dataEmissao)}</p>
      ${laudo.observacoes ? `<p>Obs.: ${esc(laudo.observacoes)}</p>` : ''}
    </div>
    ${
      options.qrCodeDataUrl
        ? `<div class="qrcode"><img src="${options.qrCodeDataUrl}" alt="QR Code de verificação" /><div>Verificar autenticidade</div></div>`
        : ''
    }
  </footer>
</body>
</html>`;
}
