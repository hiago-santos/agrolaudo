import fp from 'fastify-plugin';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { FastifyError, FastifyInstance } from 'fastify';

import { InvalidCalculationError } from '../core/calculator.js';
import { DomainError } from '../lib/errors.js';

interface ErrorBody {
  error: string;
  message: string;
  issues?: unknown;
}

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof DomainError) {
      const body: ErrorBody = { error: error.code, message: error.message };
      return reply.status(error.statusCode).send(body);
    }

    if (error instanceof InvalidCalculationError) {
      const body: ErrorBody = { error: 'INVALID_CALCULATION', message: error.message };
      return reply.status(400).send(body);
    }

    if (error instanceof ZodError) {
      const body: ErrorBody = {
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        issues: error.flatten(),
      };
      return reply.status(400).send(body);
    }

    // Erro de validação de schema do próprio Fastify (body/params/querystring).
    if (error.validation) {
      const body: ErrorBody = { error: 'VALIDATION_ERROR', message: error.message };
      return reply.status(400).send(body);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      request.log.error(error);
      const body: ErrorBody = {
        error: 'SCHEMA_OUTDATED',
        message: 'Banco de dados desatualizado. Execute as migrations pendentes.',
      };
      return reply.status(503).send(body);
    }

    const statusCode =
      typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      request.log.error(error);
    }

    const body: ErrorBody = {
      error: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: statusCode >= 500 ? 'Erro interno. Tente novamente em instantes.' : error.message,
    };
    return reply.status(statusCode).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    reply
      .status(404)
      .send({ error: 'NOT_FOUND', message: `Rota ${request.method} ${request.url} não existe.` });
  });
});
