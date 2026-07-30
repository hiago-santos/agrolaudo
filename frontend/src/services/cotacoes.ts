import { api, apiDownload, apiUpload, baixarBlob } from '@/lib/api';
import type { CotacaoRef, MatrizItem } from '@/types/domain';

export interface ItemCotacaoInput {
  atividadeId: string;
  unidade: string;
  precoUnitario: number;
  custoPorHa: number;
  regiao?: string;
}

export interface ResultadoImportacao {
  atualizados: number;
  ignorados: string[];
}

export const cotacoesService = {
  matrizAtual: () => api<MatrizItem[]>('/cotacoes'),
  salvar: (itens: ItemCotacaoInput[]) =>
    api<CotacaoRef[]>('/cotacoes', { method: 'PUT', body: JSON.stringify({ itens }) }),
  historico: (atividadeId: string) =>
    api<{ atividade: MatrizItem['atividade']; historico: CotacaoRef[] }>(
      `/cotacoes/${atividadeId}/historico`,
    ),
  exportar: async () => {
    const { blob, filename } = await apiDownload('/cotacoes/export.xlsx');
    baixarBlob(blob, filename);
  },
  importar: (file: File) => apiUpload<ResultadoImportacao>('/cotacoes/import', file),
};
