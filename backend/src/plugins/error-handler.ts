import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import type { FastifyError, FastifyInstance } from 'fastify';

import { CalculoInvalidoError } from '../core/calculadora.js';
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

    if (error instanceof CalculoInvalidoError) {
      const body: ErrorBody = { error: 'CALCULO_INVALIDO', message: error.message };
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
