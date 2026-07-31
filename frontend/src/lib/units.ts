/**
 * Rótulos de exibição para os códigos de unidade — espelha
 * backend/src/core/units.ts (fonte de verdade dos códigos). Aqui é só o texto
 * amigável mostrado nos selects; o valor enviado pra API continua sendo o código.
 */
export const UNIT_LABEL: Record<string, string> = {
  TON: 'Tonelada (t)',
  BAG_56KG: 'Saca de 56kg',
  BAG_60KG: 'Saca de 60kg',
  BAG_20KG: 'Saca de 20kg',
  BOX_40_8KG: 'Caixa de 40,8kg',
  BOX_27KG: 'Caixa de 27kg',
  BOX_20KG: 'Caixa de 20kg',
  BOX_218KG: 'Caixa de 218kg',
  BOX: 'Caixa',
  CUBIC_METER: 'Metro cúbico (m³)',
  STEREO: 'Stereo',
  ARROBA: 'Arroba (@)',
  HEAD: 'Cabeça',
  AU: 'Unidade Animal (UA)',
};

export function unitLabel(code: string): string {
  return UNIT_LABEL[code] ?? code;
}
