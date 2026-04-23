import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HealthResponse } from '@colonize/shared';
import { registerAuthRoutes, type AuthRoutesOptions } from './auth/routes.js';
import { registerSaveRoutes, type SaveRoutesOptions } from './saves/routes.js';

export const SERVER_VERSION = '0.0.0';
export const DEFAULT_SESSION_COOKIE_NAME = 'colonize_session';
export const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const DEFAULT_MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

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
  /**
   * Absolute path to the repository's `roadmap/` directory. When set, the
   * server mounts its contents at `/roadmap/*` (so the HTML viewer at
   * `roadmap/viewer/index.html` can fetch its sibling `roadmap.yml` via the
   * viewer's existing `../roadmap.yml` request), and redirects the bare
   * `/roadmap` URL to `/roadmap/viewer/`.
   *
   * Omit in development and tests. When omitted and `NODE_ENV === 'production'`,
   * auto-resolves to `<image>/roadmap` relative to this file's compiled
   * location — matching the Docker runtime layout
   * (`/app/apps/server/dist/app.js` → `/app/roadmap`).
   */
  roadmapRoot?: string;
  /**
   * Auth wiring. When provided, /auth/magic-link, /auth/verify, and /me are
   * registered against the supplied repository + sender. Optional fields
   * fall back to the DEFAULT_* constants exported from this module. Omit
   * the whole `auth` block to skip auth-route registration entirely (the
   * static-only test suites + dev boots without a database rely on this).
   */
  auth?: Pick<AuthRoutesOptions, 'repository' | 'sender' | 'magicLinkBaseUrl'> &
    Partial<
      Pick<
        AuthRoutesOptions,
        | 'sessionCookieName'
        | 'sessionCookieSecure'
        | 'sessionTtlMs'
        | 'magicLinkTtlMs'
        | 'now'
        | 'newUserId'
        | 'newToken'
      >
    >;
  /**
   * Cloud-save wiring. When provided, PUT /saves/:slot and GET /saves/:slot
   * are registered against the supplied SaveRepository. Requires `auth`
   * to be supplied as well — save endpoints gate on the session cookie
   * issued by the auth plugin, and the SaveRepository shares the
   * AuthRepository's session-lookup path.
   */
  saves?: Pick<SaveRoutesOptions, 'saves'> & Partial<Pick<SaveRoutesOptions, 'now'>>;
}

function resolveDefaultStaticRoot(): string | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidate = resolve(here, '../../web/dist');
  return existsSync(candidate) ? candidate : null;
}

function resolveDefaultRoadmapRoot(): string | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidate = resolve(here, '../../../roadmap');
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

  if (options.auth) {
    const auth = options.auth;
    const sessionCookieName = auth.sessionCookieName ?? DEFAULT_SESSION_COOKIE_NAME;
    app.register(fastifyCookie);
    app.register(async (scope) => {
      const routeOpts: AuthRoutesOptions = {
        repository: auth.repository,
        sender: auth.sender,
        magicLinkBaseUrl: auth.magicLinkBaseUrl,
        sessionCookieName,
        sessionCookieSecure: auth.sessionCookieSecure ?? process.env.NODE_ENV === 'production',
        sessionTtlMs: auth.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS,
        magicLinkTtlMs: auth.magicLinkTtlMs ?? DEFAULT_MAGIC_LINK_TTL_MS,
        ...(auth.now !== undefined ? { now: auth.now } : {}),
        ...(auth.newUserId !== undefined ? { newUserId: auth.newUserId } : {}),
        ...(auth.newToken !== undefined ? { newToken: auth.newToken } : {}),
      };
      await registerAuthRoutes(scope, routeOpts);

      if (options.saves) {
        const saveOpts: SaveRoutesOptions = {
          saves: options.saves.saves,
          auth: auth.repository,
          sessionCookieName,
          ...(options.saves.now !== undefined ? { now: options.saves.now } : {}),
        };
        await registerSaveRoutes(scope, saveOpts);
      }
    });
  }

  const roadmapRoot = options.roadmapRoot ?? resolveDefaultRoadmapRoot();
  if (roadmapRoot) {
    app.register(fastifyStatic, {
      root: roadmapRoot,
      prefix: '/roadmap/',
      decorateReply: false,
    });

    // Bare `/roadmap` (and `/roadmap/`) land on the viewer. The viewer's own
    // `../roadmap.yml` fetch then resolves to `/roadmap/roadmap.yml`.
    app.get('/roadmap', (_req, reply) => reply.redirect('/roadmap/viewer/'));
    app.get('/roadmap/', (_req, reply) => reply.redirect('/roadmap/viewer/'));
  }

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
      // Missing assets under /roadmap/ must 404, not fall through to the SPA.
      if (req.url.startsWith('/roadmap/') || req.url === '/roadmap') {
        reply.status(404).send({ error: 'Not Found' });
        return;
      }
      reply.sendFile('index.html');
    });
  }

  return app;
}
