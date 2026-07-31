import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// Com prisma.config.ts presente, o Prisma CLI para de carregar o .env sozinho
// (comportamento antigo do package.json#prisma) — carregamos na mão.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
