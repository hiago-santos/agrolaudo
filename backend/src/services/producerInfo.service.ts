import { randomBytes } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import { PROJECT_DETAIL_INCLUDE } from '../lib/prismaIncludes.js';
import { ConflictError, UnauthorizedError } from '../lib/errors.js';

import { getProject } from './projects.service.js';

function generateToken(): string {
  return randomBytes(24).toString('hex');
}

function publicViewLink(publicAppUrl: string, projectId: string, token: string): string {
  return `${publicAppUrl}/project/${projectId}?token=${token}`;
}

function assertPublicViewToken(
  project: Awaited<ReturnType<typeof getProject>>,
  token: string,
): void {
  if (!project.producerAccessToken || project.producerAccessToken !== token) {
    throw new UnauthorizedError('Link do projeto inválido.');
  }
  if (
    project.producerAccessTokenExpiresAt &&
    project.producerAccessTokenExpiresAt < new Date()
  ) {
    throw new UnauthorizedError('Este link expirou. Peça um novo link ao responsável pelo projeto.');
  }
}

/** Gera (ou renova) o link público de visualização — sem expiração por padrão. */
export async function ensurePublicViewLink(
  prisma: PrismaClient,
  projectId: string,
  publicAppUrl: string,
) {
  const project = await getProject(prisma, projectId);
  const token = project.producerAccessToken ?? generateToken();

  if (!project.producerAccessToken) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        producerAccessToken: token,
        producerAccessTokenExpiresAt: null,
      },
    });
  }

  return { link: publicViewLink(publicAppUrl, projectId, token), token };
}

/** POST /projects/:id/request-adjustment — banco devolve o projeto para ajustes. */
export async function requestAdjustment(
  prisma: PrismaClient,
  projectId: string,
  authorUserId: string,
  authorName: string,
  message: string,
) {
  const project = await getProject(prisma, projectId);
  if (project.status !== 'UNDER_BANK_REVIEW') {
    throw new ConflictError(
      'Só é possível solicitar ajustes em projetos em análise pelo banco.',
    );
  }

  const [createdMessage] = await prisma.$transaction([
    prisma.projectMessage.create({
      data: {
        projectId,
        kind: 'BANK_REQUEST',
        body: message,
        authorName,
        authorUserId,
      },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: { status: 'AWAITING_PRODUCER_INFO' },
    }),
  ]);

  return createdMessage;
}

/** POST /projects/:id/resubmit-review — agrônomo/banco reenvia após ajustes. */
export async function resubmitAfterAdjustment(
  prisma: PrismaClient,
  projectId: string,
  authorUserId: string,
  authorName: string,
  note?: string,
) {
  const project = await getProject(prisma, projectId);
  if (project.status !== 'AWAITING_PRODUCER_INFO') {
    throw new ConflictError('Só é possível reenviar projetos que estão em ajuste.');
  }

  if (note?.trim()) {
    return prisma.$transaction(async (tx) => {
      await tx.projectMessage.create({
        data: {
          projectId,
          kind: 'PRODUCER_REPLY',
          body: note.trim(),
          authorName,
          authorUserId,
        },
      });
      return tx.project.update({
        where: { id: projectId },
        data: { status: 'UNDER_BANK_REVIEW' },
        include: PROJECT_DETAIL_INCLUDE,
      });
    });
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { status: 'UNDER_BANK_REVIEW' },
    include: PROJECT_DETAIL_INCLUDE,
  });
}

/** GET /public/projects/:id/view?token= — produtor visualiza o projeto (resultado). */
export async function getPublicProjectView(
  prisma: PrismaClient,
  projectId: string,
  token: string,
) {
  const project = await getProject(prisma, projectId);
  assertPublicViewToken(project, token);

  const messages = await prisma.projectMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      kind: true,
      body: true,
      authorName: true,
      createdAt: true,
    },
  });

  return {
    project: {
      id: project.id,
      number: project.number,
      status: project.status,
      issueDate: project.issueDate,
      producer: { name: project.producer.name, taxId: project.producer.taxId },
      property: {
        name: project.property.name,
        city: project.property.city,
        state: project.property.state,
      },
      season: { label: project.season.label },
      agronomist: {
        name: project.agronomist.name,
        licenseNumber: project.agronomist.licenseNumber,
      },
      totalRevenue: project.totalRevenue,
      totalCost: project.totalCost,
      totalProfit: project.totalProfit,
      profitMarginPercentage: project.profitMarginPercentage,
      approvedCreditLimit: project.approvedCreditLimit,
      bankNotes: project.bankNotes,
      bankReviewedAt: project.bankReviewedAt,
      items: project.items.map((item) => ({
        id: item.id,
        activityName: item.activityName,
        unit: item.unit,
        netProfit: item.netProfit,
      })),
    },
    messages,
    signatures: project.signatures.map((signature) => ({
      type: signature.type,
      signatoryName: signature.signatoryName,
      signedAt: signature.signedAt,
    })),
  };
}
