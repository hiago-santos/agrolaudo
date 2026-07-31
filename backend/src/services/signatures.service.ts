import { createHash, randomBytes } from 'node:crypto';

import type { PrismaClient, SignatureType } from '@prisma/client';

import { notificationPort } from '../lib/notification.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../lib/errors.js';

import { getProject } from './projects.service.js';

const SIGNATURE_LINK_VALIDITY_DAYS = 7;

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

function shortHash(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

function generateToken(): string {
  return randomBytes(24).toString('hex');
}

function signatoryData(project: Awaited<ReturnType<typeof getProject>>, type: SignatureType) {
  return type === 'AGRONOMIST'
    ? { signatoryName: project.agronomist.name, signatoryDocument: project.agronomist.licenseNumber }
    : { signatoryName: project.producer.name, signatoryDocument: project.producer.taxId };
}

/** Se as duas partes já assinaram, fecha o projeto e grava o hash do documento final. */
async function finalizeIfComplete(prisma: PrismaClient, projectId: string): Promise<void> {
  const signatures = await prisma.signature.findMany({ where: { projectId } });
  const agronomistSigned = signatures.some((s) => s.type === 'AGRONOMIST' && s.signedAt);
  const producerSigned = signatures.some((s) => s.type === 'PRODUCER' && s.signedAt);

  if (agronomistSigned && producerSigned) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'SIGNED',
        documentHash: shortHash(projectId, 'DOCUMENT', new Date().toISOString()),
      },
    });
  } else {
    await prisma.project.updateMany({
      where: { id: projectId, status: 'DRAFT' },
      data: { status: 'PENDING_SIGNATURES' },
    });
  }
}

/** Assinatura coletada direto na tela (touch/mouse) — agrônomo e produtor lado a lado. */
export async function collectSignature(
  prisma: PrismaClient,
  projectId: string,
  type: SignatureType,
  imageBase64: string,
  context: RequestContext,
) {
  const project = await getProject(prisma, projectId);
  if (project.status === 'CANCELLED') {
    throw new ConflictError('Este projeto foi cancelado e não pode mais ser assinado.');
  }

  const existing = await prisma.signature.findFirst({ where: { projectId, type } });
  const { signatoryName, signatoryDocument } = signatoryData(project, type);
  const hash = shortHash(projectId, type, new Date().toISOString());

  const data = {
    signatoryName,
    signatoryDocument,
    imageBase64,
    hash,
    signedAt: new Date(),
    ip: context.ip,
    userAgent: context.userAgent,
  };

  const signature = existing
    ? await prisma.signature.update({ where: { id: existing.id }, data })
    : await prisma.signature.create({ data: { projectId, type, ...data } });

  await finalizeIfComplete(prisma, projectId);
  return signature;
}

/** Gera (ou renova) o link de assinatura remota e "envia" via NotificationPort. */
export async function generateSignatureLink(
  prisma: PrismaClient,
  projectId: string,
  type: SignatureType,
  publicAppUrl: string,
) {
  const project = await getProject(prisma, projectId);
  if (project.status === 'CANCELLED') {
    throw new ConflictError('Este projeto foi cancelado e não pode mais ser assinado.');
  }

  const existing = await prisma.signature.findFirst({ where: { projectId, type } });
  const { signatoryName, signatoryDocument } = signatoryData(project, type);
  const token = generateToken();
  const tokenExpiresAt = new Date(Date.now() + SIGNATURE_LINK_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const signature = existing
    ? await prisma.signature.update({ where: { id: existing.id }, data: { token, tokenExpiresAt } })
    : await prisma.signature.create({
        data: { projectId, type, signatoryName, signatoryDocument, token, tokenExpiresAt },
      });

  await prisma.project.updateMany({
    where: { id: projectId, status: 'DRAFT' },
    data: { status: 'PENDING_SIGNATURES' },
  });

  const link = `${publicAppUrl}/sign/${projectId}?token=${token}`;
  await notificationPort.sendSignatureLink({ signatoryName, projectNumber: project.number, link });

  return { link, token, signature };
}

async function findSignatureByToken(prisma: PrismaClient, projectId: string, token: string) {
  const signature = await prisma.signature.findFirst({ where: { projectId, token } });
  if (!signature) {
    throw new UnauthorizedError('Link de assinatura inválido.');
  }
  if (signature.tokenExpiresAt && signature.tokenExpiresAt < new Date()) {
    throw new UnauthorizedError('Este link de assinatura expirou. Peça para o agrônomo gerar um novo.');
  }
  return signature;
}

/** GET /public/projects/:id?token= — visualização sem login para o signatário conferir e assinar. */
export async function getForPublicSigning(prisma: PrismaClient, projectId: string, token: string) {
  const signature = await findSignatureByToken(prisma, projectId, token);
  const project = await getProject(prisma, projectId);
  return { project, type: signature.type, alreadySigned: !!signature.signedAt };
}

/** POST /public/projects/:id/sign — mesma coleta de assinatura, mas autenticada pelo token. */
export async function signPublic(
  prisma: PrismaClient,
  projectId: string,
  token: string,
  imageBase64: string,
  context: RequestContext,
) {
  const signature = await findSignatureByToken(prisma, projectId, token);
  return collectSignature(prisma, projectId, signature.type, imageBase64, context);
}

/** GET /public/verify/:hash — destino do QR Code impresso no documento. */
export async function verifyByHash(prisma: PrismaClient, hash: string) {
  const project = await prisma.project.findFirst({
    where: { documentHash: hash },
    include: { producer: true, property: true, agronomist: true, season: true, signatures: true },
  });
  if (!project) throw new NotFoundError('Documento');

  return {
    valid: true,
    number: project.number,
    status: project.status,
    producer: project.producer.name,
    property: project.property.name,
    season: project.season.label,
    agronomist: { name: project.agronomist.name, licenseNumber: project.agronomist.licenseNumber },
    issueDate: project.issueDate,
    approvedCreditLimit: project.approvedCreditLimit,
    signatures: project.signatures.map((s) => ({
      type: s.type,
      signatoryName: s.signatoryName,
      signedAt: s.signedAt,
    })),
  };
}
