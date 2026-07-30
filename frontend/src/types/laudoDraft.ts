import type { Atividade, Produtor, Propriedade, Safra } from '@/types/domain';

export interface ItemDraft {
  selecionado: boolean;
  atividade: Atividade;
  unidade: string;
  areaHa: string;
  produtividade: string;
  precoUnitario: string;
  custoPorHa: string;
  rebanhoCabecas: string;
}

export interface LaudoDraft {
  produtor: Produtor | null;
  propriedade: Propriedade | null;
  safra: Safra | null;
  agronomoId: string | null;
  cidadeEmissao: string;
  observacoes: string;
  itens: Record<string, ItemDraft>;
}

export function draftVazio(): LaudoDraft {
  return {
    produtor: null,
    propriedade: null,
    safra: null,
    agronomoId: null,
    cidadeEmissao: '',
    observacoes: '',
    itens: {},
  };
}
