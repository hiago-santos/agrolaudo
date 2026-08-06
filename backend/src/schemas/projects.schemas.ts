import { z } from 'zod';

import { geoJsonPolygonSchema } from '../lib/geo.js';

export const projectItemInputSchema = z.object({
  activityId: z.string().min(1),
  unit: z.string().optional(),
  areaHectares: z.coerce.number().nonnegative(),
  productivity: z.coerce.number().nonnegative(),
  unitPrice: z.coerce.number().nonnegative(),
  costPerHectare: z.coerce.number().nonnegative(),
  herdHeadCount: z.coerce.number().nonnegative().optional(),
});

export const calculateProjectBodySchema = z.object({
  items: z.array(projectItemInputSchema).min(1, 'Adicione ao menos uma atividade.'),
});

export const createProjectBodySchema = z.object({
  producerId: z.string().min(1),
  propertyId: z.string().min(1),
  seasonId: z.string().min(1),
  agronomistId: z.string().min(1),
  issuingCity: z.string().min(1).optional(),
  notes: z.string().optional(),
  items: z.array(projectItemInputSchema).min(1, 'Adicione ao menos uma atividade.'),
});

export const updateProjectBodySchema = z.object({
  issuingCity: z.string().min(1).optional(),
  notes: z.string().optional(),
  items: z.array(projectItemInputSchema).min(1).optional(),
  financedAreaBoundary: geoJsonPolygonSchema.optional(),
});

/**
 * "Casca" de projeto aberta pelo papel BANK — produtor/propriedade/safra/agrônomo já
 * definidos e a área financiada já delimitada no mapa, mas sem atividades ainda (isso
 * fica pro agrônomo completar depois via updateProjectBodySchema). Ver projects.service.ts.
 */
export const initiateProjectBodySchema = z.object({
  producerId: z.string().min(1),
  propertyId: z.string().min(1),
  seasonId: z.string().min(1),
  agronomistId: z.string().min(1),
  financedAreaBoundary: geoJsonPolygonSchema,
  notes: z.string().optional(),
});

export const projectStatusSchema = z.enum([
  'BANK_INITIATED',
  'DRAFT',
  'PENDING_SIGNATURES',
  'SIGNED',
  'UNDER_BANK_REVIEW',
  'AWAITING_PRODUCER_INFO',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

export const listProjectsQuerySchema = z.object({
  search: z.string().optional(),
  producerId: z.string().optional(),
  seasonId: z.string().optional(),
  agronomistId: z.string().optional(),
  status: projectStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const projectParamsSchema = z.object({ id: z.string().min(1) });

export const duplicateProjectBodySchema = z.object({ seasonId: z.string().min(1) });
