import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp, DEFAULT_SESSION_COOKIE_NAME } from '../app.js';
import { InMemoryAuthRepository } from '../auth/in-memory-repository.js';
import { RecordingMagicLinkSender } from '../auth/sender.js';
import { InMemoryEntitlementRepository } from './in-memory-repository.js';

interface Harness {
  app: ReturnType<typeof buildApp>;
  authRepo: InMemoryAuthRepository;
  entitlementRepo: InMemoryEntitlementRepository;
  authenticate: () => Promise<string>;
}

function makeHarness(): Harness {
  const authRepo = new InMemoryAuthRepository();
  const entitlementRepo = new InMemoryEntitlementRepository();
  const sender = new RecordingMagicLinkSender();
  const now = new Date('2026-04-24T00:00:00.000Z');
  const userId = 'u-00000000-0000-4000-8000-000000000000';
  const sessionToken = 's0000000000000000000000000000000000000000000000000000000000000000';
  const magicToken = 'm1111111111111111111111111111111111111111111111111111111111111111';

  let tokenCursor = 0;
  const tokens = [magicToken, sessionToken];

  const app = buildApp({
    auth: {
      repository: authRepo,
      sender,
      magicLinkBaseUrl: 'https://colonize.example/auth/verify',
      sessionCookieSecure: false,
      sessionTtlMs: 60 * 60 * 1000,
      magicLinkTtlMs: 10 * 60 * 1000,
      now: () => now,
      newToken: () => tokens[tokenCursor++] ?? `extra-${tokenCursor}`,
      newUserId: () => userId,
    },
    iap: {
      entitlements: entitlementRepo,
      now: () => now,
    },
  });

  async function authenticate(): Promise<string> {
    await app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'captain@otk.example' },
    });
    const verify = await app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: { token: magicToken },
    });
    const setCookie = verify.headers['set-cookie'];
    const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!raw) throw new Error('test setup: verify did not set a cookie');
    const match = raw.match(new RegExp(`${DEFAULT_SESSION_COOKIE_NAME}=([^;]+)`));
    if (!match) throw new Error(`test setup: cookie unparseable: ${raw}`);
    return match[1]!;
  }

  return { app, authRepo, entitlementRepo, authenticate };
}

let harness: Harness;

beforeEach(() => {
  harness = makeHarness();
});

afterEach(async () => {
  await harness.app.close();
});

describe('POST /iap/verify-receipt', () => {
  it('grants the remove_ads entitlement for a known product', async () => {
    const sessionToken = await harness.authenticate();
    const res = await harness.app.inject({
      method: 'POST',
      url: '/iap/verify-receipt',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: {
        platform: 'ios',
        productId: 'com.colonize.remove_ads',
        receipt: 'base64-apple-receipt',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ entitlements: { hasRemoveAds: true } });

    const stored = await harness.entitlementRepo.listForUser(
      'u-00000000-0000-4000-8000-000000000000',
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      entitlement: 'remove_ads',
      productId: 'com.colonize.remove_ads',
      platform: 'ios',
    });
  });

  it('is idempotent — retrying the same receipt leaves exactly one row', async () => {
    const sessionToken = await harness.authenticate();
    const payload = {
      platform: 'ios' as const,
      productId: 'com.colonize.remove_ads' as const,
      receipt: 'base64-apple-receipt',
    };
    await harness.app.inject({
      method: 'POST',
      url: '/iap/verify-receipt',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload,
    });
    const retry = await harness.app.inject({
      method: 'POST',
      url: '/iap/verify-receipt',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload,
    });

    expect(retry.statusCode).toBe(200);
    expect(
      await harness.entitlementRepo.listForUser('u-00000000-0000-4000-8000-000000000000'),
    ).toHaveLength(1);
  });

  it('rejects an empty receipt payload', async () => {
    const sessionToken = await harness.authenticate();
    const res = await harness.app.inject({
      method: 'POST',
      url: '/iap/verify-receipt',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: {
        platform: 'ios',
        productId: 'com.colonize.remove_ads',
        receipt: '   ',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'empty_receipt' });
  });

  it('rejects a malformed request body at the schema layer', async () => {
    const sessionToken = await harness.authenticate();
    const res = await harness.app.inject({
      method: 'POST',
      url: '/iap/verify-receipt',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { platform: 'ios', productId: 'com.unknown.product', receipt: 'x' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'invalid_request' });
  });

  it('returns 401 without a session cookie', async () => {
    const res = await harness.app.inject({
      method: 'POST',
      url: '/iap/verify-receipt',
      payload: {
        platform: 'ios',
        productId: 'com.colonize.remove_ads',
        receipt: 'x',
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'unauthenticated' });
  });
});

describe('GET /me/entitlements', () => {
  it('returns hasRemoveAds=false for a user with no grants', async () => {
    const sessionToken = await harness.authenticate();
    const res = await harness.app.inject({
      method: 'GET',
      url: '/me/entitlements',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ entitlements: { hasRemoveAds: false } });
  });

  it('reflects a prior grant', async () => {
    const sessionToken = await harness.authenticate();
    await harness.app.inject({
      method: 'POST',
      url: '/iap/verify-receipt',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: {
        platform: 'ios',
        productId: 'com.colonize.remove_ads',
        receipt: 'base64-apple-receipt',
      },
    });

    const res = await harness.app.inject({
      method: 'GET',
      url: '/me/entitlements',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ entitlements: { hasRemoveAds: true } });
  });

  it('returns 401 without a session cookie', async () => {
    const res = await harness.app.inject({
      method: 'GET',
      url: '/me/entitlements',
    });
    expect(res.statusCode).toBe(401);
  });
});
