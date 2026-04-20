import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HealthResponse } from '@colonize/shared';

export const SERVER_VERSION = '0.0.0';

const startedAt = Date.now();

export interface BuildAppOptions {
  /**
   * Absolute path to the built web client (apps/web/dist). When set, the
   * server registers @fastify/static to serve this directory at `/` and
   * falls back unknown GET routes to `index.html` for SPA client routing.
   *
   * Omit in development and tests (Vite handles the web dev server). When
   * omitted and `NODE_ENV === 'production'`, auto-resolves to `apps/web/dist`
   * relative to this file's compiled location — matching the Docker runtime
   * layout (`/app/apps/server/dist/app.js` → `/app/apps/web/dist`).
   */
  staticRoot?: string;
}

function resolveDefaultStaticRoot(): string | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidate = resolve(here, '../../web/dist');
  return existsSync(candidate) ? candidate : null;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
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

  const staticRoot = options.staticRoot ?? resolveDefaultStaticRoot();
  if (staticRoot) {
    app.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/',
      index: ['index.html'],
    });

    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET') {
        reply.status(404).send({ error: 'Not Found' });
        return;
      }
      reply.sendFile('index.html');
    });
  }

  return app;
}
