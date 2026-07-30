import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import type { Env } from './env.js';

import agronomosRoutes from './modules/agronomos/agronomos.routes.js';
import atividadesRoutes from './modules/atividades/atividades.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import cotacoesRoutes from './modules/cotacoes/cotacoes.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import laudosRoutes from './modules/laudos/laudos.routes.js';
import produtoresRoutes from './modules/produtores/produtores.routes.js';
import propriedadesRoutes from './modules/propriedades/propriedades.routes.js';
import publicoRoutes from './modules/publico/publico.routes.js';
import safrasRoutes from './modules/safras/safras.routes.js';

import authPlugin from './plugins/auth.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import prismaPlugin from './plugins/prisma.js';

export function buildApp(env: Env) {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
          }
        : true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(errorHandlerPlugin);

  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  app.register(multipart);

  app.register(swagger, {
    openapi: {
      info: {
        title: 'AgroLaudo API',
        version: '0.1.0',
        description: 'Laudos de Capacidade Pagadora para produtores rurais.',
      },
    },
    transform: jsonSchemaTransform,
  });
  app.register(swaggerUi, { routePrefix: '/docs' });

  app.register(prismaPlugin);
  app.register(authPlugin, { env });

  app.get('/health', { schema: { tags: ['infra'] } }, async () => ({ status: 'ok' }));

  app.register(authRoutes, { prefix: '/auth' });
  app.register(produtoresRoutes, { prefix: '/produtores' });
  app.register(propriedadesRoutes, { prefix: '/propriedades' });
  app.register(agronomosRoutes, { prefix: '/agronomos' });
  app.register(safrasRoutes, { prefix: '/safras' });
  app.register(atividadesRoutes, { prefix: '/atividades' });
  app.register(cotacoesRoutes, { prefix: '/cotacoes' });
  app.register(laudosRoutes, { prefix: '/laudos', env });
  app.register(dashboardRoutes, { prefix: '/dashboard' });
  // Sem app.authenticate — protegido por token (link de assinatura) ou é
  // deliberadamente público (verificação do QR Code).
  app.register(publicoRoutes, { prefix: '/publico' });

  return app;
}
