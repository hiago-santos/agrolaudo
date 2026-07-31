import type { PrismaClient } from '@prisma/client';

import { PROJECT_DETAIL_INCLUDE } from '../lib/prismaIncludes.js';
import { ConflictError } from '../lib/errors.js';

import { getProject } from './projects.service.js';

export interface BankReviewInput {
  decision: 'APPROVED' | 'REJECTED';
  creditLimit?: number;
  notes?: string;
}

/**
 * POST /projects/:id/review — decisão de crédito do banco. Única escrita que o
 * papel BANK realiza no sistema; tudo mais é leitura (ver plano).
 */
export async function reviewProject(
  prisma: PrismaClient,
  id: string,
  reviewerId: string,
  input: BankReviewInput,
) {
  const project = await getProject(prisma, id);
  if (project.status !== 'UNDER_BANK_REVIEW') {
    throw new ConflictError('Só é possível decidir sobre projetos que estão em análise pelo banco.');
  }

  return prisma.project.update({
    where: { id },
    data: {
      status: input.decision,
      approvedCreditLimit: input.decision === 'APPROVED' ? input.creditLimit : null,
      bankNotes: input.notes,
      bankReviewedById: reviewerId,
      bankReviewedAt: new Date(),
    },
    include: PROJECT_DETAIL_INCLUDE,
  });
}
