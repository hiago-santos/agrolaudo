import { z } from 'zod';

export const createAgronomistBodySchema = z.object({
  name: z.string().min(2),
  document: z.string().min(11),
  licenseNumber: z.string().min(3),
  region: z.string().optional(),
  issuingCity: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export const updateAgronomistBodySchema = z.object({
  name: z.string().min(2).optional(),
  licenseNumber: z.string().min(3).optional(),
  region: z.string().optional(),
  issuingCity: z.string().min(1).optional(),
  defaultSignatureBase64: z.string().optional(),
});

export const agronomistParamsSchema = z.object({ id: z.string().min(1) });
