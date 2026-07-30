import type { LaudoInput } from '@/services/laudos';
import type { LaudoDraft } from '@/types/laudoDraft';

/** Converte o rascunho do wizard no payload que a API espera (preview e criação usam o mesmo shape). */
export function draftParaLaudoInput(draft: LaudoDraft): LaudoInput {
  if (!draft.produtor || !draft.propriedade || !draft.safra || !draft.agronomoId) {
    throw new Error('Dados obrigatórios do laudo incompletos.');
  }

  const itens = Object.values(draft.itens)
    .filter((item) => item.selecionado)
    .map((item) => ({
      atividadeId: item.atividade.id,
      unidade: item.unidade,
      areaHa: Number(item.areaHa || 0),
      produtividade: Number(item.produtividade || 0),
      precoUnitario: Number(item.precoUnitario || 0),
      custoPorHa: Number(item.custoPorHa || 0),
      rebanhoCabecas: item.atividade.pecuaria ? Number(item.rebanhoCabecas || 0) : undefined,
    }));

  return {
    produtorId: draft.produtor.id,
    propriedadeId: draft.propriedade.id,
    safraId: draft.safra.id,
    agronomoId: draft.agronomoId,
    cidadeEmissao: draft.cidadeEmissao || undefined,
    observacoes: draft.observacoes || undefined,
    itens,
  };
}
