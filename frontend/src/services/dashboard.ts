import { api } from '@/lib/api';
import type { DashboardResumo } from '@/types/domain';

export const dashboardService = {
  resumo: () => api<DashboardResumo>('/dashboard/resumo'),
};
