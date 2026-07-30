import { api, apiDownload, baixarBlob } from '@/lib/api';
import type {
  Assinatura,
  CalculoLaudoResultado,
  Laudo,
  LaudoResumo,
  Paginado,
  StatusLaudo,
  TipoAssinatura,
} from '@/types/domain';

export interface ItemLaudoInput {
  atividadeId: string;
  unidade?: string;
  areaHa: number;
  produtividade: number;
  precoUnitario: number;
  custoPorHa: number;
  rebanhoCabecas?: number;
}

export interface LaudoInput {
  produtorId: string;
  propriedadeId: string;
  safraId: string;
  agronomoId: string;
  cidadeEmissao?: string;
  observacoes?: string;
  itens: ItemLaudoInput[];
}

export interface ListarLaudosParams {
  busca?: string;
  produtorId?: string;
  safraId?: string;
  agronomoId?: string;
  status?: StatusLaudo;
  page?: number;
  pageSize?: number;
}

function paraQueryString(params: object): string {
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params) as [string, string | number | undefined][]) {
    if (valor !== undefined) query.set(chave, String(valor));
  }
  return query.toString();
}

export const laudosService = {
  calcular: (itens: ItemLaudoInput[]) =>
    api<CalculoLaudoResultado>('/laudos/calcular', { method: 'POST', body: JSON.stringify({ itens }) }),

  listar: (params: ListarLaudosParams = {}) =>
    api<Paginado<LaudoResumo>>(`/laudos?${paraQueryString(params)}`),

  obter: (id: string) => api<Laudo>(`/laudos/${id}`),

  criar: (data: LaudoInput) => api<Laudo>('/laudos', { method: 'POST', body: JSON.stringify(data) }),

  atualizar: (id: string, data: Partial<Omit<LaudoInput, 'produtorId' | 'propriedadeId' | 'safraId' | 'agronomoId'>>) =>
    api<Laudo>(`/laudos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  cancelar: (id: string) => api<Laudo>(`/laudos/${id}/cancelar`, { method: 'POST' }),

  duplicar: (id: string, safraId: string) =>
    api<Laudo>(`/laudos/${id}/duplicar`, { method: 'POST', body: JSON.stringify({ safraId }) }),

  previewNovo: (data: LaudoInput) =>
    api<string>('/laudos/preview', { method: 'POST', body: JSON.stringify(data) }),

  previewExistente: (id: string) => api<string>(`/laudos/${id}/preview`),

  baixarXlsx: async (id: string, numero: string) => {
    const { blob } = await apiDownload(`/laudos/${id}/xlsx`);
    baixarBlob(blob, `${numero}.xlsx`);
  },

  baixarPdf: async (id: string, numero: string) => {
    const { blob } = await apiDownload(`/laudos/${id}/pdf`);
    baixarBlob(blob, `${numero}.pdf`);
  },

  assinar: (id: string, tipo: TipoAssinatura, imagemBase64: string) =>
    api<Assinatura>(`/laudos/${id}/assinaturas`, { method: 'POST', body: JSON.stringify({ tipo, imagemBase64 }) }),

  gerarLinkAssinatura: (id: string, tipo: TipoAssinatura) =>
    api<{ link: string; token: string; assinatura: Assinatura }>(`/laudos/${id}/assinaturas/link`, {
      method: 'POST',
      body: JSON.stringify({ tipo }),
    }),
};
