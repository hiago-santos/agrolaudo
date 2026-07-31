import type { PrismaClient } from '@prisma/client';

import { AGRONOMIST_WITH_USER_INCLUDE } from '../lib/prismaIncludes.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';
import { hashPassword } from '../lib/hash.js';

import type { createAgronomistBodySchema, updateAgronomistBodySchema } from '../schemas/agronomists.schemas.js';
import type { z } from 'zod';

type CreateAgronomistInput = z.infer<typeof createAgronomistBodySchema>;
type UpdateAgronomistInput = z.infer<typeof updateAgronomistBodySchema>;

export async function listAgronomists(prisma: PrismaClient) {
  return prisma.agronomist.findMany({ orderBy: { name: 'asc' }, include: AGRONOMIST_WITH_USER_INCLUDE });
}

export async function getAgronomist(prisma: PrismaClient, id: string) {
  const agronomist = await prisma.agronomist.findUnique({
    where: { id },
    include: AGRONOMIST_WITH_USER_INCLUDE,
  });
  if (!agronomist) throw new NotFoundError('Agrônomo');
  return agronomist;
}

export async function createAgronomist(prisma: PrismaClient, data: CreateAgronomistInput) {
  const [emailTaken, documentTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.agronomist.findUnique({ where: { document: data.document } }),
  ]);
  if (emailTaken) throw new ConflictError(`Já existe um usuário com o e-mail ${data.email}.`);
  if (documentTaken) throw new ConflictError(`Já existe um agrônomo cadastrado com o CPF ${data.document}.`);

  const passwordHash = await hashPassword(data.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: data.name, email: data.email, passwordHash, role: 'AGRONOMIST' },
    });
    return tx.agronomist.create({
      data: {
        userId: user.id,
        name: data.name,
        document: data.document,
        licenseNumber: data.licenseNumber,
        region: data.region,
        issuingCity: data.issuingCity,
      },
      include: AGRONOMIST_WITH_USER_INCLUDE,
    });
  });
}

export async function updateAgronomist(prisma: PrismaClient, id: string, data: UpdateAgronomistInput) {
  await getAgronomist(prisma, id);
  return prisma.agronomist.update({ where: { id }, data, include: AGRONOMIST_WITH_USER_INCLUDE });
}
