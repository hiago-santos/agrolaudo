import { api, apiDownload, downloadBlob } from '@/lib/api';
import type {
  GeoPolygon,
  Project,
  ProjectCalculationResult,
  ProjectStatus,
  ProjectSummary,
  Paginated,
} from '@/types/domain';

export interface ProjectItemInput {
  activityId: string;
  unit?: string;
  areaHectares: number;
  productivity: number;
  unitPrice: number;
  costPerHectare: number;
  herdHeadCount?: number;
}

export interface ProjectInput {
  producerId: string;
  propertyId: string;
  seasonId: string;
  agronomistId: string;
  issuingCity?: string;
  notes?: string;
  items: ProjectItemInput[];
}

export interface InitiateProjectInput {
  producerId: string;
  propertyId: string;
  seasonId: string;
  agronomistId: string;
  financedAreaBoundary: GeoPolygon;
  notes?: string;
}

export interface ListProjectsParams {
  search?: string;
  producerId?: string;
  seasonId?: string;
  agronomistId?: string;
  status?: ProjectStatus;
  page?: number;
  pageSize?: number;
}

function toQueryString(params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, string | number | undefined][]) {
    if (value !== undefined) query.set(key, String(value));
  }
  return query.toString();
}

export const projectsService = {
  calculate: (items: ProjectItemInput[]) =>
    api<ProjectCalculationResult>('/projects/calculate', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  list: (params: ListProjectsParams = {}) =>
    api<Paginated<ProjectSummary>>(`/projects?${toQueryString(params)}`),

  get: (id: string) => api<Project>(`/projects/${id}`),

  create: (data: ProjectInput) =>
    api<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  initiate: (data: InitiateProjectInput) =>
    api<Project>('/projects/initiate', { method: 'POST', body: JSON.stringify(data) }),

  update: (
    id: string,
    data: Partial<Omit<ProjectInput, 'producerId' | 'propertyId' | 'seasonId' | 'agronomistId'>> & {
      financedAreaBoundary?: GeoPolygon;
    },
  ) => api<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  cancel: (id: string) => api<Project>(`/projects/${id}/cancel`, { method: 'POST' }),

  remove: (id: string) => api<void>(`/projects/${id}`, { method: 'DELETE' }),

  submitForReview: (id: string) =>
    api<Project>(`/projects/${id}/submit-for-review`, { method: 'POST' }),

  duplicate: (id: string, seasonId: string) =>
    api<Project>(`/projects/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ seasonId }),
    }),

  downloadXlsx: async (id: string, number: string) => {
    const { blob } = await apiDownload(`/projects/${id}/xlsx`);
    downloadBlob(blob, `${number}.xlsx`);
  },

  downloadPdf: async (id: string, number: string) => {
    const { blob } = await apiDownload(`/projects/${id}/pdf`);
    downloadBlob(blob, `${number}.pdf`);
  },
};
