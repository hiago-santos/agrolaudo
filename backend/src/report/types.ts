/**
 * Shape agnóstico de Prisma consumido pelos 3 geradores (preview HTML, XLSX, PDF).
 * `mapper.ts` converte um laudo já persistido para isso; o preview pré-persistência
 * (`POST /laudos/preview`) monta o mesmo shape na hora, sem precisar de linhas reais
 * no banco — por isso o template nunca depende de `id`/`createdAt` do Prisma.
 */
export interface LaudoDocumentoItem {
  atividadeNome: string;
  unidade: string;
  areaHa: string;
  produtividade: string;
  precoUnitario: string;
  custoPorHa: string;
  producaoTotal: string;
  faturamentoBruto: string;
  custoTotal: string;
  receitaLiquida: string;
  produtividadePorHa: string | null;
  taxaLotacao: string | null;
}

export type TipoAssinaturaDocumento = 'AGRONOMO' | 'PRODUTOR';

export interface LaudoDocumentoAssinatura {
  tipo: TipoAssinaturaDocumento;
  nomeSignatario: string;
  documento: string;
  imagemBase64: string | null;
  hash: string | null;
  assinadoEm: string | null;
}

export interface LaudoDocumentoDados {
  numero: string;
  status: string;
  cidadeEmissao: string;
  dataEmissao: string;
  observacoes: string | null;
  produtor: { nome: string; cpfCnpj: string; municipio: string; uf: string };
  propriedade: { nome: string; matricula: string; municipio: string; uf: string; areaTotalHa: string };
  safra: { rotulo: string };
  agronomo: { nome: string; crea: string; cidadeEmissao: string };
  itens: LaudoDocumentoItem[];
  totalFaturamento: string;
  totalCusto: string;
  totalReceita: string;
  margemPercentual: string;
  assinaturas: LaudoDocumentoAssinatura[];
}
