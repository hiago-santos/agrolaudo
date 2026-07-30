/**
 * Rótulos de exibição para os códigos de unidade — espelha
 * backend/src/core/unidades.ts (fonte de verdade dos códigos). Aqui é só o texto
 * amigável mostrado nos selects; o valor enviado pra API continua sendo o código.
 */
export const UNIDADE_LABEL: Record<string, string> = {
  TONELADA: 'Tonelada (t)',
  SACA_56KG: 'Saca de 56kg',
  SACA_60KG: 'Saca de 60kg',
  SACA_20KG: 'Saca de 20kg',
  CAIXA_40_8KG: 'Caixa de 40,8kg',
  CAIXA_27KG: 'Caixa de 27kg',
  CAIXA_20KG: 'Caixa de 20kg',
  CAIXA_218KG: 'Caixa de 218kg',
  CAIXA: 'Caixa',
  METRO_CUBICO: 'Metro cúbico (m³)',
  STEREO: 'Stereo',
  ARROBA: 'Arroba (@)',
  CABECA: 'Cabeça',
  UA: 'Unidade Animal (UA)',
};

export function rotuloUnidade(codigo: string): string {
  return UNIDADE_LABEL[codigo] ?? codigo;
}
