import { randomUUID } from 'node:crypto';

import { Prisma, type ProjectAttachmentSide, type PrismaClient, type UserRole } from '@prisma/client';

import type { Env } from '../env.js';
import { buildAttachmentObjectKey, ensureMinioBucket, getMinioClient } from '../lib/minio.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';

import { getProject } from './projects.service.js';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ATTACHMENT_UPLOAD_ROLES: Record<ProjectAttachmentSide, UserRole[]> = {
  PRODUCER: ['ADMIN', 'AGRONOMIST'],
  BANK: ['ADMIN', 'BANK'],
};

const attachmentInclude = {
  uploadedBy: { select: { id: true, name: true, role: true } },
} as const;

function assertCanUpload(side: ProjectAttachmentSide, role: UserRole): void {
  if (!ATTACHMENT_UPLOAD_ROLES[side].includes(role)) {
    throw new ForbiddenError('Você não tem permissão para anexar arquivos neste lado do projeto.');
  }
}

function assertCanDelete(side: ProjectAttachmentSide, role: UserRole, uploadedById: string, userId: string): void {
  if (role === 'ADMIN' || uploadedById === userId) return;
  if (ATTACHMENT_UPLOAD_ROLES[side].includes(role)) return;
  throw new ForbiddenError('Você não tem permissão para remover este anexo.');
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() ?? 'arquivo';
  return base.length > 0 ? base.slice(0, 255) : 'arquivo';
}

export async function listProjectAttachments(
  prisma: PrismaClient,
  projectId: string,
  side?: ProjectAttachmentSide,
) {
  await getProject(prisma, projectId);
  return prisma.projectAttachment.findMany({
    where: { projectId, ...(side ? { side } : {}) },
    orderBy: { createdAt: 'desc' },
    include: attachmentInclude,
  });
}

export async function uploadProjectAttachment(
  prisma: PrismaClient,
  env: Env,
  projectId: string,
  side: ProjectAttachmentSide,
  userId: string,
  role: UserRole,
  fileName: string,
  contentType: string,
  buffer: Buffer,
) {
  assertCanUpload(side, role);
  await getProject(prisma, projectId);

  if (buffer.byteLength === 0) {
    throw new ValidationError('O arquivo enviado está vazio.');
  }
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError('O arquivo excede o limite de 20 MB.');
  }

  const bucketReady = await ensureMinioBucket(env);
  if (!bucketReady) {
    throw new ValidationError(
      'Armazenamento de arquivos indisponível. Verifique a conexão com o MinIO.',
    );
  }

  const safeName = sanitizeFileName(fileName);
  const attachmentId = randomUUID();
  const objectKey = buildAttachmentObjectKey(projectId, side, attachmentId, safeName);
  const minio = getMinioClient(env);

  try {
    await minio.putObject(env.MINIO_BUCKET, objectKey, buffer, buffer.byteLength, {
      'Content-Type': contentType || 'application/octet-stream',
    });
  } catch {
    throw new ValidationError('Não foi possível enviar o arquivo para o armazenamento.');
  }

  try {
    return await prisma.projectAttachment.create({
      data: {
        id: attachmentId,
        projectId,
        side,
        fileName: safeName,
        contentType: contentType || 'application/octet-stream',
        sizeBytes: buffer.byteLength,
        objectKey,
        uploadedById: userId,
      },
      include: attachmentInclude,
    });
  } catch (error) {
    await minio.removeObject(env.MINIO_BUCKET, objectKey).catch(() => undefined);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      throw error;
    }
    throw new ValidationError('Não foi possível registrar o anexo do projeto.');
  }
}

export async function downloadProjectAttachment(
  prisma: PrismaClient,
  env: Env,
  projectId: string,
  attachmentId: string,
) {
  await getProject(prisma, projectId);
  const attachment = await prisma.projectAttachment.findFirst({
    where: { id: attachmentId, projectId },
  });
  if (!attachment) {
    throw new NotFoundError('Anexo não encontrado.');
  }

  const bucketReady = await ensureMinioBucket(env);
  if (!bucketReady) {
    throw new ValidationError(
      'Armazenamento de arquivos indisponível. Verifique a conexão com o MinIO.',
    );
  }

  const minio = getMinioClient(env);
  const stream = await minio.getObject(env.MINIO_BUCKET, attachment.objectKey);

  return { attachment, stream };
}

export async function deleteProjectAttachment(
  prisma: PrismaClient,
  env: Env,
  projectId: string,
  attachmentId: string,
  userId: string,
  role: UserRole,
) {
  await getProject(prisma, projectId);
  const attachment = await prisma.projectAttachment.findFirst({
    where: { id: attachmentId, projectId },
  });
  if (!attachment) {
    throw new NotFoundError('Anexo não encontrado.');
  }

  assertCanDelete(attachment.side, role, attachment.uploadedById, userId);

  await prisma.projectAttachment.delete({ where: { id: attachment.id } });
  const minio = getMinioClient(env);
  await minio.removeObject(env.MINIO_BUCKET, attachment.objectKey).catch(() => undefined);

  return { ok: true };
}
