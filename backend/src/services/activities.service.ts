import type { Prisma, PrismaClient } from '@prisma/client';

import { NotFoundError } from '../lib/errors.js';

export async function listActivities(
  prisma: PrismaClient,
  filters: { active?: boolean; isLivestock?: boolean },
) {
  const where: Prisma.ActivityWhereInput = {
    ...(filters.active !== undefined && { active: filters.active }),
    ...(filters.isLivestock !== undefined && { isLivestock: filters.isLivestock }),
  };
  return prisma.activity.findMany({ where, orderBy: { order: 'asc' } });
}

export async function getActivity(prisma: PrismaClient, id: string) {
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) throw new NotFoundError('Atividade');
  return activity;
}
