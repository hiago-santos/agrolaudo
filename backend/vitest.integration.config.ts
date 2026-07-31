import { defineConfig } from 'vitest/config';

// Precisa do Postgres migrado e seedado (DATABASE_URL do .env) — roda com
// `pnpm test:integration`, separado do `pnpm test` padrão (que não toca no banco).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['src/test/integration/setup.ts'],
    // O Postgres é remoto (Railway) — a cadeia mais longa (criar projeto com
    // transação + várias leituras) soma bastante round-trip de rede.
    testTimeout: 45000,
    hookTimeout: 45000,
  },
});
