import Fastify, { type FastifyInstance } from 'fastify';
import { HealthResponse } from '@colonize/shared';

export const SERVER_VERSION = '0.0.0';

const startedAt = Date.now();

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  app.get('/health', async () => {
    const body: HealthResponse = {
      ok: true,
      version: SERVER_VERSION,
      uptime: (Date.now() - startedAt) / 1000,
    };
    return HealthResponse.parse(body);
  });

  return app;
}
