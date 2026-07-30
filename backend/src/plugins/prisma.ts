import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * `fp` (fastify-plugin) faz a decoração `prisma` furar o encapsulamento e ficar
 * visível em todos os módulos de rota registrados depois, sem precisar redeclarar
 * o client em cada um.
 */
export default fp(async function prismaPlugin(app: FastifyInstance) {
  const prisma = new PrismaClient();
  await prisma.$connect();

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
