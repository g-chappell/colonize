import { describe, it, expect, afterEach } from 'vitest';
import { HealthResponse } from '@colonize/shared';
import { buildApp, SERVER_VERSION } from './app.js';

describe('@colonize/server /health', () => {
  const apps = new Set<ReturnType<typeof buildApp>>();

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.clear();
  });

  function freshApp() {
    const app = buildApp();
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
});
