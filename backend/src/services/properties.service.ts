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

interface LocationFields {
  boundary?: Prisma.InputJsonValue | typeof Prisma.DbNull;
  boundaryAreaHectares?: number | null;
  latitude?: number;
  longitude?: number;
}

/**
 * O centro do polígono é só o PADRÃO da referência de localização — o usuário pode
 * ajustar lat/lng à mão na tela (ex.: sede da fazenda não fica no centro geométrico
 * do perímetro). Por isso latitude/longitude explícitos sempre vencem; só caem pro
 * centróide quando o formulário não manda um valor próprio.
 *
 * `boundary`: `undefined` mantém a demarcação atual, `null` apaga (junto com a área
 * derivada), um polígono novo recalcula a área — mas NUNCA mexe em lat/lng sozinho.
 */
function locationFields(
  boundary: GeoJsonPolygon | null | undefined,
  latitude: number | undefined,
  longitude: number | undefined,
): LocationFields {
  const fields: LocationFields = {};

  if (boundary === null) {
    fields.boundary = Prisma.DbNull;
    fields.boundaryAreaHectares = null;
  } else if (boundary !== undefined) {
    fields.boundary = boundary;
    fields.boundaryAreaHectares = polygonAreaHectares(boundary);
  }

  if (latitude !== undefined && longitude !== undefined) {
    fields.latitude = latitude;
    fields.longitude = longitude;
  } else if (boundary) {
    const centroid = polygonCentroid(boundary);
    fields.latitude = centroid.latitude;
    fields.longitude = centroid.longitude;
  }

  return fields;
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

  const { boundary, latitude, longitude, ...rest } = data;
  return prisma.property.create({
    data: { ...rest, ...locationFields(boundary, latitude, longitude) },
  });
}

export async function updateProperty(prisma: PrismaClient, id: string, data: UpdatePropertyInput) {
  const property = await getProperty(prisma, id);

  if (data.registrationNumber) {
    await ensureUniqueRegistration(prisma, property.producerId, data.registrationNumber, id);
  }

  const { boundary, latitude, longitude, ...rest } = data;
  return prisma.property.update({
    where: { id },
    data: { ...rest, ...locationFields(boundary, latitude, longitude) },
  });
}

export async function deleteProperty(prisma: PrismaClient, id: string) {
  await getProperty(prisma, id);
  await prisma.property.delete({ where: { id } });
}
