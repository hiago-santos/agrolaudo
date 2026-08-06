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

import activitiesRoutes from './routes/activities.routes.js';
import agronomistsRoutes from './routes/agronomists.routes.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import priceQuotesRoutes from './routes/price-quotes.routes.js';
import producersRoutes from './routes/producers.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import propertiesRoutes from './routes/properties.routes.js';
import publicRoutes from './routes/public.routes.js';
import reviewRoutes from './routes/review.routes.js';
import seasonsRoutes from './routes/seasons.routes.js';
import signaturesRoutes from './routes/signatures.routes.js';

import authPlugin from './plugins/auth.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import prismaPlugin from './plugins/prisma.js';

export function buildApp(env: Env) {
  const app = Fastify({
    // Railway/proxies encaminham X-Forwarded-*; necessário atrás de TLS terminator.
    trustProxy: true,
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

  // Aceita uma origem ou lista separada por vírgula (ex.: domínio custom + *.up.railway.app).
  const corsOrigins = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.register(cors, {
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Skip-Auth-Refresh'],
    exposedHeaders: ['Content-Disposition'],
  });
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
  app.register(producersRoutes, { prefix: '/producers' });
  app.register(propertiesRoutes, { prefix: '/properties' });
  app.register(agronomistsRoutes, { prefix: '/agronomists' });
  app.register(seasonsRoutes, { prefix: '/seasons' });
  app.register(activitiesRoutes, { prefix: '/activities' });
  app.register(priceQuotesRoutes, { prefix: '/price-quotes' });
  app.register(projectsRoutes, { prefix: '/projects', env });
  app.register(signaturesRoutes, { prefix: '/projects', env });
  app.register(reviewRoutes, { prefix: '/projects' });
  app.register(dashboardRoutes, { prefix: '/dashboard' });
  // Sem app.authenticate — protegido por token (link de assinatura) ou é
  // deliberadamente público (verificação do QR Code).
  app.register(publicRoutes, { prefix: '/public' });

  return app;
}
