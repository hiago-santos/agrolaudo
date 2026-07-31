import { api } from '@/lib/api';
import type { DashboardSummary } from '@/types/domain';

export const dashboardService = {
  summary: () => api<DashboardSummary>('/dashboard/summary'),
};
