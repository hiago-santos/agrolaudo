import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  createPropertyBodySchema,
  listPropertiesQuerySchema,
  propertyParamsSchema,
  updatePropertyBodySchema,
} from '../schemas/properties.schemas.js';
import * as propertiesService from '../services/properties.service.js';

const propertiesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    { schema: { querystring: listPropertiesQuerySchema, tags: ['properties'] } },
    async (request) => propertiesService.listProperties(app.prisma, request.query),
  );

  app.get(
    '/:id',
    { schema: { params: propertyParamsSchema, tags: ['properties'] } },
    async (request) => propertiesService.getProperty(app.prisma, request.params.id),
  );

  app.post(
    '/',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: { body: createPropertyBodySchema, tags: ['properties'] },
    },
    async (request, reply) => {
      const property = await propertiesService.createProperty(app.prisma, request.body);
      reply.status(201);
      return property;
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN', 'AGRONOMIST')],
      schema: {
        params: propertyParamsSchema,
        body: updatePropertyBodySchema,
        tags: ['properties'],
      },
    },
    async (request) =>
      propertiesService.updateProperty(app.prisma, request.params.id, request.body),
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.requireRole('ADMIN')],
      schema: { params: propertyParamsSchema, tags: ['properties'] },
    },
    async (request, reply) => {
      await propertiesService.deleteProperty(app.prisma, request.params.id);
      reply.status(204);
    },
  );
};

export default propertiesRoutes;
