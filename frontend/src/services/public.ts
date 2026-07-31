import { api } from '@/lib/api';
import type { Project, ProjectStatus, SignatureType } from '@/types/domain';

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

export const publicService = {
  getProject: (projectId: string, token: string) =>
    api<PublicProject>(`/public/projects/${projectId}?token=${encodeURIComponent(token)}`),

  sign: (projectId: string, token: string, imageBase64: string) =>
    api<unknown>(`/public/projects/${projectId}/sign`, {
      method: 'POST',
      body: JSON.stringify({ token, imageBase64 }),
    }),

  verify: (hash: string) => api<PublicVerification>(`/public/verify/${hash}`),
};
