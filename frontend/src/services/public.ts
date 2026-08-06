import { api } from '@/lib/api';
import type { Project, ProjectMessage, ProjectStatus, SignatureType } from '@/types/domain';

export interface PublicProject {
  project: Project;
  type: SignatureType;
  alreadySigned: boolean;
}

export interface PublicVerification {
  valid: boolean;
  number: string;
  status: ProjectStatus;
  producer: string;
  property: string;
  season: string;
  agronomist: { name: string; licenseNumber: string };
  issueDate: string;
  approvedCreditLimit: string | null;
  signatures: Array<{ type: SignatureType; signatoryName: string; signedAt: string | null }>;
}

export interface PublicProjectView {
  project: {
    id: string;
    number: string;
    status: ProjectStatus;
    issueDate: string;
    producer: { name: string; taxId: string };
    property: { name: string; city: string; state: string };
    season: { label: string };
    agronomist: { name: string; licenseNumber: string };
    totalRevenue: string;
    totalCost: string;
    totalProfit: string;
    profitMarginPercentage: string;
    approvedCreditLimit: string | null;
    bankNotes: string | null;
    bankReviewedAt: string | null;
    items: Array<{ id: string; activityName: string; unit: string; netProfit: string }>;
  };
  messages: ProjectMessage[];
  signatures: Array<{ type: SignatureType; signatoryName: string; signedAt: string | null }>;
}

export const publicService = {
  getProject: (projectId: string, token: string) =>
    api<PublicProject>(`/public/projects/${projectId}?token=${encodeURIComponent(token)}`),

  sign: (projectId: string, token: string, imageBase64: string) =>
    api<unknown>(`/public/projects/${projectId}/sign`, {
      method: 'POST',
      body: JSON.stringify({ token, imageBase64 }),
    }),

  verify: (hash: string) => api<PublicVerification>(`/public/verify/${hash}`),

  getProjectView: (projectId: string, token: string) =>
    api<PublicProjectView>(
      `/public/projects/${projectId}/view?token=${encodeURIComponent(token)}`,
    ),
};
