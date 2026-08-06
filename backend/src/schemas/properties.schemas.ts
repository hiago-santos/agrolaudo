import { z } from 'zod';

import { geoJsonPolygonSchema } from '../lib/geo.js';

export const createPropertyBodySchema = z.object({
  producerId: z.string().min(1),
  name: z.string().min(1),
  registrationNumber: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  totalAreaHectares: z.coerce.number().nonnegative(),
  stateRegistration: z.string().optional(),
  ruralEnvironmentalRegistry: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  /// Polígono desenhado no mapa — quando presente, `latitude`/`longitude` e
  /// `boundaryAreaHectares` são recalculados a partir dele. `null` apaga a
  /// demarcação; omitir mantém a atual (ver properties.service.ts).
  boundary: geoJsonPolygonSchema.nullish(),
});

export const updatePropertyBodySchema = createPropertyBodySchema.partial().omit({
  producerId: true,
});

export const listPropertiesQuerySchema = z.object({
  producerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const propertyParamsSchema = z.object({ id: z.string().min(1) });
