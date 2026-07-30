import { defineConfig } from 'vitest/config';

// Precisa do Postgres migrado e seedado (DATABASE_URL do .env) — roda com
// `pnpm test:integration`, separado do `pnpm test` padrão (que não toca no banco).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['src/test/integration/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
