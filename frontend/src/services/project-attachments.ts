import { api, apiDownload, apiUpload, downloadBlob } from '@/lib/api';
import type { ProjectAttachment, ProjectAttachmentSide } from '@/types/domain';

export const projectAttachmentsService = {
  list: (projectId: string, side?: ProjectAttachmentSide) => {
    const query = side ? `?side=${side}` : '';
    return api<ProjectAttachment[]>(`/projects/${projectId}/attachments${query}`);
  },

  upload: (projectId: string, side: ProjectAttachmentSide, file: File) =>
    apiUpload<ProjectAttachment>(`/projects/${projectId}/attachments?side=${side}`, file),

  download: async (projectId: string, attachmentId: string, fallbackName: string) => {
    const { blob, filename } = await apiDownload(
      `/projects/${projectId}/attachments/${attachmentId}/download`,
    );
    downloadBlob(blob, filename || fallbackName);
  },

  remove: (projectId: string, attachmentId: string) =>
    api<void>(`/projects/${projectId}/attachments/${attachmentId}`, { method: 'DELETE' }),
};
