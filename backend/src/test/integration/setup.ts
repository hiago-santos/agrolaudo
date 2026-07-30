import { existsSync } from 'node:fs';

// Node 20.6+ tem process.loadEnvFile nativo — sem precisar da dependência dotenv
// só para os testes de integração lerem o mesmo .env do `pnpm dev`.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
