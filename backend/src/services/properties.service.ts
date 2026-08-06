import { Prisma, type PrismaClient } from '@prisma/client';

import { ConflictError, NotFoundError } from '../lib/errors.js';
import { polygonAreaHectares, polygonCentroid, type GeoJsonPolygon } from '../lib/geo.js';

import type {
  createPropertyBodySchema,
  updatePropertyBodySchema,
} from '../schemas/properties.schemas.js';
import type { z } from 'zod';

type CreatePropertyInput = z.infer<typeof createPropertyBodySchema>;
type UpdatePropertyInput = z.infer<typeof updatePropertyBodySchema>;

interface BoundaryFields {
  boundary?: Prisma.InputJsonValue | typeof Prisma.DbNull;
  boundaryAreaHectares?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Centro e área medida derivam do polígono — nunca são editados à mão. As três
 * situações são distintas de propósito: `undefined` mantém a demarcação que já
 * existe, `null` a apaga junto com os campos derivados, e um polígono recalcula tudo.
 */
function boundaryFields(boundary: GeoJsonPolygon | null | undefined): BoundaryFields {
  if (boundary === undefined) return {};
  if (boundary === null) {
    return {
      boundary: Prisma.DbNull,
      boundaryAreaHectares: null,
      latitude: null,
      longitude: null,
    };
  }
  const { latitude, longitude } = polygonCentroid(boundary);
  return {
    boundary,
    boundaryAreaHectares: polygonAreaHectares(boundary),
    latitude,
    longitude,
  };
}

export async function listProperties(
  prisma: PrismaClient,
  params: { producerId?: string; search?: string; page: number; pageSize: number },
) {
  const where: Prisma.PropertyWhereInput = {
    ...(params.producerId && { producerId: params.producerId }),
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: 'insensitive' } },
        { registrationNumber: { contains: params.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { producer: { select: { id: true, name: true, taxId: true } } },
    }),
    prisma.property.count({ where }),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function getProperty(prisma: PrismaClient, id: string) {
  const property = await prisma.property.findUnique({ where: { id }, include: { producer: true } });
  if (!property) throw new NotFoundError('Propriedade');
  return property;
}

async function ensureUniqueRegistration(
  prisma: PrismaClient,
  producerId: string,
  registrationNumber: string,
  ignoreId?: string,
) {
  const existing = await prisma.property.findUnique({
    where: { producerId_registrationNumber: { producerId, registrationNumber } },
  });
  if (existing && existing.id !== ignoreId) {
    throw new ConflictError(
      `Esse produtor já tem uma propriedade com a matrícula ${registrationNumber}.`,
    );
  }
}

export async function createProperty(prisma: PrismaClient, data: CreatePropertyInput) {
  const producer = await prisma.producer.findUnique({ where: { id: data.producerId } });
  if (!producer) throw new NotFoundError('Produtor');

  await ensureUniqueRegistration(prisma, data.producerId, data.registrationNumber);

  const { boundary, ...rest } = data;
  return prisma.property.create({ data: { ...rest, ...boundaryFields(boundary) } });
}

export async function updateProperty(prisma: PrismaClient, id: string, data: UpdatePropertyInput) {
  const property = await getProperty(prisma, id);

  if (data.registrationNumber) {
    await ensureUniqueRegistration(prisma, property.producerId, data.registrationNumber, id);
  }

  const { boundary, ...rest } = data;
  return prisma.property.update({ where: { id }, data: { ...rest, ...boundaryFields(boundary) } });
}

export async function deleteProperty(prisma: PrismaClient, id: string) {
  await getProperty(prisma, id);
  await prisma.property.delete({ where: { id } });
}
