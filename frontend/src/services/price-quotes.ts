import { api, apiDownload, apiUpload, downloadBlob } from '@/lib/api';
import type { PriceMatrixItem, PriceQuote } from '@/types/domain';

export interface PriceQuoteItemInput {
  activityId: string;
  unit: string;
  unitPrice: number;
  costPerHectare: number;
  region?: string;
}

export interface ImportResult {
  updated: number;
  skipped: string[];
}

export const priceQuotesService = {
  currentMatrix: () => api<PriceMatrixItem[]>('/price-quotes'),
  save: (items: PriceQuoteItemInput[]) =>
    api<PriceQuote[]>('/price-quotes', { method: 'PUT', body: JSON.stringify({ items }) }),
  history: (activityId: string) =>
    api<{ activity: PriceMatrixItem['activity']; history: PriceQuote[] }>(
      `/price-quotes/${activityId}/history`,
    ),
  export: async () => {
    const { blob, filename } = await apiDownload('/price-quotes/export.xlsx');
    downloadBlob(blob, filename);
  },
  import: (file: File) => apiUpload<ImportResult>('/price-quotes/import', file),
};
