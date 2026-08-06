import { api } from '@/lib/api';
import type { Season } from '@/types/domain';

export interface SeasonInput {
  label: string;
  startDate: string;
  endDate: string;
  active?: boolean;
}

export const seasonsService = {
  list: () => api<Season[]>('/seasons'),
  get: (id: string) => api<Season>(`/seasons/${id}`),
  create: (data: SeasonInput) =>
    api<Season>('/seasons', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<SeasonInput>) =>
    api<Season>(`/seasons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
