/**
 * Catálogo de unidades de medida de produção/comercialização usadas pelas 15
 * atividades do projeto. Fonte única dos rótulos que aparecem no formulário, no
 * XLSX e no PDF — inclusive corrige o bug da planilha original do cliente, que
 * rotulava o bloco da Soja como "toneladas" com valores lançados em sacas.
 */
export type UnitCode =
  | 'TON'
  | 'BAG_56KG'
  | 'BAG_60KG'
  | 'BAG_20KG'
  | 'BOX_40_8KG'
  | 'BOX_27KG'
  | 'BOX_20KG'
  | 'BOX_218KG'
  | 'BOX'
  | 'CUBIC_METER'
  | 'STEREO'
  | 'ARROBA'
  | 'HEAD'
  | 'AU';

export interface UnitConfig {
  code: UnitCode;
  /** "Saca de 60kg" — rótulo em português, exibido na interface/documentos. */
  singular: string;
  /** "Sacas de 60kg" */
  plural: string;
  /** Símbolo curto para tabelas: "sc", "t", "@", "cx" */
  symbol: string;
  /** Artigo definido de concordância em português: "a saca", "o metro cúbico" */
  article: 'a' | 'o';
}

export const UNITS: Record<UnitCode, UnitConfig> = {
  TON: { code: 'TON', singular: 'Tonelada', plural: 'Toneladas', symbol: 't', article: 'a' },
  BAG_56KG: {
    code: 'BAG_56KG',
    singular: 'Saca de 56kg',
    plural: 'Sacas de 56kg',
    symbol: 'sc',
    article: 'a',
  },
  BAG_60KG: {
    code: 'BAG_60KG',
    singular: 'Saca de 60kg',
    plural: 'Sacas de 60kg',
    symbol: 'sc',
    article: 'a',
  },
  BAG_20KG: {
    code: 'BAG_20KG',
    singular: 'Saca de 20kg',
    plural: 'Sacas de 20kg',
    symbol: 'sc',
    article: 'a',
  },
  BOX_40_8KG: {
    code: 'BOX_40_8KG',
    singular: 'Caixa de 40,8kg',
    plural: 'Caixas de 40,8kg',
    symbol: 'cx',
    article: 'a',
  },
  BOX_27KG: {
    code: 'BOX_27KG',
    singular: 'Caixa de 27kg',
    plural: 'Caixas de 27kg',
    symbol: 'cx',
    article: 'a',
  },
  BOX_20KG: {
    code: 'BOX_20KG',
    singular: 'Caixa de 20kg',
    plural: 'Caixas de 20kg',
    symbol: 'cx',
    article: 'a',
  },
  BOX_218KG: {
    code: 'BOX_218KG',
    singular: 'Caixa de 218kg',
    plural: 'Caixas de 218kg',
    symbol: 'cx',
    article: 'a',
  },
  BOX: { code: 'BOX', singular: 'Caixa', plural: 'Caixas', symbol: 'cx', article: 'a' },
  CUBIC_METER: {
    code: 'CUBIC_METER',
    singular: 'Metro cúbico',
    plural: 'Metros cúbicos',
    symbol: 'm³',
    article: 'o',
  },
  STEREO: { code: 'STEREO', singular: 'Stereo', plural: 'Stereos', symbol: 'st', article: 'o' },
  ARROBA: { code: 'ARROBA', singular: 'Arroba', plural: 'Arrobas', symbol: '@', article: 'a' },
  HEAD: { code: 'HEAD', singular: 'Cabeça', plural: 'Cabeças', symbol: 'cab', article: 'a' },
  AU: { code: 'AU', singular: 'Unidade Animal', plural: 'Unidades Animal', symbol: 'UA', article: 'a' },
};

/** "Média Sacas/hectare" — rótulo da linha de produtividade no XLSX/PDF. */
export function averagePerHectareLabel(code: UnitCode): string {
  return `Média ${UNITS[code].plural}/hectare`;
}

/** "Produção Total (sacas)" — rótulo da linha de produção total no XLSX/PDF. */
export function totalProductionLabel(code: UnitCode): string {
  return `Produção Total (${UNITS[code].plural.toLowerCase()})`;
}

/** "Valor da saca Soja" — rótulo da linha de preço unitário no XLSX/PDF. */
export function unitValueLabel(code: UnitCode, activityName: string): string {
  const { article, singular } = UNITS[code];
  return `Valor d${article} ${singular.toLowerCase()} ${activityName}`;
}
