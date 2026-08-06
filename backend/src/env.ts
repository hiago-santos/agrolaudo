import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório.'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET precisa ter pelo menos 8 caracteres.'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_APP_URL: z.string().default('http://localhost:5173'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('agrolaudo'),
  MINIO_REGION: z.string().default('us-east-1'),
});

export type Env = z.infer<typeof envSchema>;

/** Valida e carrega as variáveis de ambiente uma única vez, no boot do servidor. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    console.error('Variáveis de ambiente inválidas:', details);
    throw new Error('Configuração de ambiente inválida — confira o .env (veja .env.example).');
  }
  return parsed.data;
}
