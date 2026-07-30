/**
 * Catálogo de unidades de medida de produção/comercialização usadas pelas 15
 * atividades do laudo. Fonte única dos rótulos que aparecem no formulário, no XLSX
 * e no PDF — inclusive corrige o bug da planilha original do cliente, que rotulava
 * o bloco da Soja como "toneladas" com valores lançados em sacas.
 */
export type CodigoUnidade =
  | 'TONELADA'
  | 'SACA_56KG'
  | 'SACA_60KG'
  | 'SACA_20KG'
  | 'CAIXA_40_8KG'
  | 'CAIXA_27KG'
  | 'CAIXA_20KG'
  | 'CAIXA_218KG'
  | 'CAIXA'
  | 'METRO_CUBICO'
  | 'STEREO'
  | 'ARROBA'
  | 'CABECA'
  | 'UA';

export interface UnidadeConfig {
  codigo: CodigoUnidade;
  /** "Saca de 60kg" */
  singular: string;
  /** "Sacas de 60kg" */
  plural: string;
  /** Símbolo curto para tabelas: "sc", "t", "@", "cx" */
  simbolo: string;
  /** Artigo definido de concordância: "a saca", "o metro cúbico" */
  artigo: 'a' | 'o';
}

export const UNIDADES: Record<CodigoUnidade, UnidadeConfig> = {
  TONELADA: { codigo: 'TONELADA', singular: 'Tonelada', plural: 'Toneladas', simbolo: 't', artigo: 'a' },
  SACA_56KG: {
    codigo: 'SACA_56KG',
    singular: 'Saca de 56kg',
    plural: 'Sacas de 56kg',
    simbolo: 'sc',
    artigo: 'a',
  },
  SACA_60KG: {
    codigo: 'SACA_60KG',
    singular: 'Saca de 60kg',
    plural: 'Sacas de 60kg',
    simbolo: 'sc',
    artigo: 'a',
  },
  SACA_20KG: {
    codigo: 'SACA_20KG',
    singular: 'Saca de 20kg',
    plural: 'Sacas de 20kg',
    simbolo: 'sc',
    artigo: 'a',
  },
  CAIXA_40_8KG: {
    codigo: 'CAIXA_40_8KG',
    singular: 'Caixa de 40,8kg',
    plural: 'Caixas de 40,8kg',
    simbolo: 'cx',
    artigo: 'a',
  },
  CAIXA_27KG: {
    codigo: 'CAIXA_27KG',
    singular: 'Caixa de 27kg',
    plural: 'Caixas de 27kg',
    simbolo: 'cx',
    artigo: 'a',
  },
  CAIXA_20KG: {
    codigo: 'CAIXA_20KG',
    singular: 'Caixa de 20kg',
    plural: 'Caixas de 20kg',
    simbolo: 'cx',
    artigo: 'a',
  },
  CAIXA_218KG: {
    codigo: 'CAIXA_218KG',
    singular: 'Caixa de 218kg',
    plural: 'Caixas de 218kg',
    simbolo: 'cx',
    artigo: 'a',
  },
  CAIXA: { codigo: 'CAIXA', singular: 'Caixa', plural: 'Caixas', simbolo: 'cx', artigo: 'a' },
  METRO_CUBICO: {
    codigo: 'METRO_CUBICO',
    singular: 'Metro cúbico',
    plural: 'Metros cúbicos',
    simbolo: 'm³',
    artigo: 'o',
  },
  STEREO: { codigo: 'STEREO', singular: 'Stereo', plural: 'Stereos', simbolo: 'st', artigo: 'o' },
  ARROBA: { codigo: 'ARROBA', singular: 'Arroba', plural: 'Arrobas', simbolo: '@', artigo: 'a' },
  CABECA: { codigo: 'CABECA', singular: 'Cabeça', plural: 'Cabeças', simbolo: 'cab', artigo: 'a' },
  UA: { codigo: 'UA', singular: 'Unidade Animal', plural: 'Unidades Animal', simbolo: 'UA', artigo: 'a' },
};

/** "Média Sacas/hectare" — rótulo da linha de produtividade no XLSX/PDF. */
export function rotuloMediaPorHectare(codigo: CodigoUnidade): string {
  return `Média ${UNIDADES[codigo].plural}/hectare`;
}

/** "Produção Total (sacas)" — rótulo da linha de produção total no XLSX/PDF. */
export function rotuloProducaoTotal(codigo: CodigoUnidade): string {
  return `Produção Total (${UNIDADES[codigo].plural.toLowerCase()})`;
}

/** "Valor da saca Soja" — rótulo da linha de preço unitário no XLSX/PDF. */
export function rotuloValorUnidade(codigo: CodigoUnidade, nomeAtividade: string): string {
  const { artigo, singular } = UNIDADES[codigo];
  return `Valor d${artigo} ${singular.toLowerCase()} ${nomeAtividade}`;
}
