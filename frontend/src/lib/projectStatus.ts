import type { BadgeTone } from '@/components/ui/Badge';
import type { ProjectStatus } from '@/types/domain';

export const PROJECT_STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  BANK_INITIATED: 'warning',
  DRAFT: 'neutral',
  PENDING_SIGNATURES: 'warning',
  SIGNED: 'accent',
  UNDER_BANK_REVIEW: 'warning',
  AWAITING_PRODUCER_INFO: 'warning',
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
  AWAITING_PRODUCER_INFO: 'Em ajuste',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  CANCELLED: 'Cancelado',
};

/** Rótulos curtos pra badges em telas estreitas. */
export const PROJECT_STATUS_SHORT: Record<ProjectStatus, string> = {
  BANK_INITIATED: 'Agrônomo',
  DRAFT: 'Rascunho',
  PENDING_SIGNATURES: 'Assinatura',
  SIGNED: 'Assinado',
  UNDER_BANK_REVIEW: 'Análise',
  AWAITING_PRODUCER_INFO: 'Ajuste',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  CANCELLED: 'Cancelado',
};
