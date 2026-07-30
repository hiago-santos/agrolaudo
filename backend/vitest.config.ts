import { defineConfig } from 'vitest/config';

// Unitários — sem I/O, não precisam de banco. Testes de integração (que batem a
// API real contra o Postgres seedado) ficam em vitest.integration.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/*.integration.test.ts', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
    },
  },
});
