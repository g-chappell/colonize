import { describe, it, expect, afterEach } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HealthResponse } from '@colonize/shared';
import { buildApp, SERVER_VERSION } from './app.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE_WEB_DIST = resolve(here, './__fixtures__/web-dist');

describe('@colonize/server /health', () => {
  const apps = new Set<ReturnType<typeof buildApp>>();

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.clear();
  });

  function freshApp(...args: Parameters<typeof buildApp>) {
    const app = buildApp(...args);
    apps.add(app);
    return app;
  }

  it('returns 200 with a HealthResponse-shaped body', async () => {
    const app = freshApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    const parsed = HealthResponse.parse(body);
    expect(parsed.ok).toBe(true);
    expect(parsed.version).toBe(SERVER_VERSION);
    expect(parsed.uptime).toBeGreaterThanOrEqual(0);
  });

  it('reports increasing uptime across requests', async () => {
    const app = freshApp();

    const first = HealthResponse.parse(
      (await app.inject({ method: 'GET', url: '/health' })).json(),
    );
    await new Promise((r) => setTimeout(r, 10));
    const second = HealthResponse.parse(
      (await app.inject({ method: 'GET', url: '/health' })).json(),
    );

    expect(second.uptime).toBeGreaterThanOrEqual(first.uptime);
  });

  it('returns 404 for unknown routes when no staticRoot is configured', async () => {
    const app = freshApp();
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(res.statusCode).toBe(404);
  });
});

describe('@colonize/server static web serving', () => {
  const apps = new Set<ReturnType<typeof buildApp>>();

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.clear();
  });

  function freshApp(...args: Parameters<typeof buildApp>) {
    const app = buildApp(...args);
    apps.add(app);
    return app;
  }

  it('serves index.html at the root when staticRoot is configured', async () => {
    const app = freshApp({ staticRoot: FIXTURE_WEB_DIST });
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('colonize-static-test-marker');
  });

  it('serves non-index static assets directly', async () => {
    const app = freshApp({ staticRoot: FIXTURE_WEB_DIST });
    const res = await app.inject({ method: 'GET', url: '/assets/app.css' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('#0b1a2b');
  });

  it('falls back unknown GET routes to index.html (SPA routing)', async () => {
    const app = freshApp({ staticRoot: FIXTURE_WEB_DIST });
    const res = await app.inject({
      method: 'GET',
      url: '/game/campaign/turn/42',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('colonize-static-test-marker');
  });

  it('does not SPA-fallback for non-GET requests', async () => {
    const app = freshApp({ staticRoot: FIXTURE_WEB_DIST });
    const res = await app.inject({
      method: 'POST',
      url: '/does-not-exist',
    });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('colonize-static-test-marker');
  });

  it('leaves /health working when static serving is enabled', async () => {
    const app = freshApp({ staticRoot: FIXTURE_WEB_DIST });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const parsed = HealthResponse.parse(res.json());
    expect(parsed.ok).toBe(true);
  });
});
