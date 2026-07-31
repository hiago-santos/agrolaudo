import { z } from 'zod';

import { publicSignBodySchema, publicTokenQuerySchema } from './signatures.schemas.js';

export { publicSignBodySchema, publicTokenQuerySchema };

export const publicProjectParamsSchema = z.object({ id: z.string().min(1) });
export const publicHashParamsSchema = z.object({ hash: z.string().min(1) });
