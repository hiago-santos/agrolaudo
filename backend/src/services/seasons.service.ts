import type { PrismaClient } from '@prisma/client';

import { ConflictError, NotFoundError } from '../lib/errors.js';

import type { createSeasonBodySchema, updateSeasonBodySchema } from '../schemas/seasons.schemas.js';
import type { z } from 'zod';

type CreateSeasonInput = z.infer<typeof createSeasonBodySchema>;
type UpdateSeasonInput = z.infer<typeof updateSeasonBodySchema>;

export async function listSeasons(prisma: PrismaClient) {
  return prisma.season.findMany({ orderBy: { startDate: 'desc' } });
}

export async function getSeason(prisma: PrismaClient, id: string) {
  const season = await prisma.season.findUnique({ where: { id } });
  if (!season) throw new NotFoundError('Safra');
  return season;
}

export async function createSeason(prisma: PrismaClient, data: CreateSeasonInput) {
  const existing = await prisma.season.findUnique({ where: { label: data.label } });
  if (existing) throw new ConflictError(`Já existe uma safra "${data.label}".`);
  return prisma.season.create({ data });
}

export async function updateSeason(prisma: PrismaClient, id: string, data: UpdateSeasonInput) {
  await getSeason(prisma, id);
  return prisma.season.update({ where: { id }, data });
}
