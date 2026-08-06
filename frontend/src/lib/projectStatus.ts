import type { BadgeTone } from '@/components/ui/Badge';
import type { ProjectStatus } from '@/types/domain';

export const PROJECT_STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  BANK_INITIATED: 'warning',
  DRAFT: 'neutral',
  PENDING_SIGNATURES: 'warning',
  SIGNED: 'accent',
  UNDER_BANK_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'danger',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  BANK_INITIATED: 'Aguardando agrônomo',
  DRAFT: 'Rascunho',
  PENDING_SIGNATURES: 'Aguardando assinatura',
  SIGNED: 'Assinado',
  UNDER_BANK_REVIEW: 'Em análise no banco',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  CANCELLED: 'Cancelado',
};
