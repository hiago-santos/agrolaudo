import { setDefaultResultOrder } from 'node:dns';
import { existsSync } from 'node:fs';

// Node 20.6+ tem process.loadEnvFile nativo — sem precisar da dependência dotenv
// só para os testes de integração lerem o mesmo .env do `pnpm dev`.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

// Sem isso, a primeira conexão nova (ex.: transação interativa do Prisma) pode
// ficar ~10s tentando IPv6 antes de cair para IPv4 em redes onde a rota IPv6 é
// "blackholed" (sem RST, só timeout) — clássico em Windows/algumas redes domésticas.
setDefaultResultOrder('ipv4first');
