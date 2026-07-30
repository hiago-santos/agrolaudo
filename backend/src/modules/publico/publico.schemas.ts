import { z } from 'zod';

import { assinarPublicoBodySchema, publicoQuerySchema } from '../laudos/assinaturas.schemas.js';

export { assinarPublicoBodySchema, publicoQuerySchema };

export const laudoParamsSchema = z.object({ id: z.string().min(1) });
export const hashParamsSchema = z.object({ hash: z.string().min(1) });
