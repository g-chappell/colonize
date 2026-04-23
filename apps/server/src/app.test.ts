import { describe, it, expect, afterEach } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HealthResponse } from '@colonize/shared';
import { buildApp, SERVER_VERSION } from './app.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE_WEB_DIST = resolve(here, './__fixtures__/web-dist');
const REPO_ROADMAP = resolve(here, '../../../roadmap');

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

describe('@colonize/server roadmap serving', () => {
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

  it('redirects /roadmap to /roadmap/viewer/', async () => {
    const app = freshApp({ roadmapRoot: REPO_ROADMAP });
    const res = await app.inject({ method: 'GET', url: '/roadmap' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/roadmap/viewer/');
  });

  it('redirects /roadmap/ (with trailing slash) to /roadmap/viewer/', async () => {
    const app = freshApp({ roadmapRoot: REPO_ROADMAP });
    const res = await app.inject({ method: 'GET', url: '/roadmap/' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/roadmap/viewer/');
  });

  it('serves the viewer HTML at /roadmap/viewer/index.html', async () => {
    const app = freshApp({ roadmapRoot: REPO_ROADMAP });
    const res = await app.inject({
      method: 'GET',
      url: '/roadmap/viewer/index.html',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<title>Roadmap</title>');
  });

  it('serves roadmap.yml at /roadmap/roadmap.yml (viewers ../roadmap.yml fetch)', async () => {
    const app = freshApp({ roadmapRoot: REPO_ROADMAP });
    const res = await app.inject({ method: 'GET', url: '/roadmap/roadmap.yml' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('epics:');
  });

  it('serves yaml-lite.mjs at /roadmap/yaml-lite.mjs (viewer module import)', async () => {
    const app = freshApp({ roadmapRoot: REPO_ROADMAP });
    const res = await app.inject({ method: 'GET', url: '/roadmap/yaml-lite.mjs' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('export');
  });

  it('returns 404 (not SPA fallback) for missing /roadmap/* assets when SPA is also configured', async () => {
    const app = freshApp({
      roadmapRoot: REPO_ROADMAP,
      staticRoot: FIXTURE_WEB_DIST,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/roadmap/does-not-exist.yml',
    });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('colonize-static-test-marker');
  });

  it('leaves the main SPA fallback working for non-/roadmap paths', async () => {
    const app = freshApp({
      roadmapRoot: REPO_ROADMAP,
      staticRoot: FIXTURE_WEB_DIST,
    });
    const res = await app.inject({ method: 'GET', url: '/game/turn/7' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('colonize-static-test-marker');
  });

  it('does not register /roadmap routes when roadmapRoot is omitted', async () => {
    const app = freshApp();
    const res = await app.inject({ method: 'GET', url: '/roadmap' });
    expect(res.statusCode).toBe(404);
  });
});
