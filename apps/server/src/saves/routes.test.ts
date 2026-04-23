import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp, DEFAULT_SESSION_COOKIE_NAME } from '../app.js';
import { InMemoryAuthRepository } from '../auth/in-memory-repository.js';
import { RecordingMagicLinkSender } from '../auth/sender.js';
import { InMemorySaveRepository } from './in-memory-repository.js';

interface Harness {
  app: ReturnType<typeof buildApp>;
  authRepo: InMemoryAuthRepository;
  saveRepo: InMemorySaveRepository;
  authenticate: () => Promise<string>;
}

function makeHarness(): Harness {
  const authRepo = new InMemoryAuthRepository();
  const saveRepo = new InMemorySaveRepository();
  const sender = new RecordingMagicLinkSender();
  const now = new Date('2026-04-23T00:00:00.000Z');
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
    saves: {
      saves: saveRepo,
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

  return { app, authRepo, saveRepo, authenticate };
}

let harness: Harness;

beforeEach(() => {
  harness = makeHarness();
});

afterEach(async () => {
  await harness.app.close();
});

describe('PUT /saves/:slot', () => {
  it('writes a new save for an authenticated user', async () => {
    const sessionToken = await harness.authenticate();
    const res = await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 1, payload: { turn: 1 } },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      slot: 'auto',
      version: 1,
      updatedAt: '2026-04-23T00:00:00.000Z',
    });
  });

  it('overwrites with a strictly-greater version', async () => {
    const sessionToken = await harness.authenticate();
    await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 1, payload: { turn: 1 } },
    });
    const res = await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 2, payload: { turn: 2 } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ version: 2 });

    const read = await harness.app.inject({
      method: 'GET',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
    });
    expect(read.json().payload).toEqual({ turn: 2 });
  });

  it('returns 409 with the current record when the version is stale', async () => {
    const sessionToken = await harness.authenticate();
    await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 5, payload: { turn: 5 } },
    });
    const res = await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 3, payload: { turn: 'stale' } },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({
      slot: 'auto',
      version: 5,
      payload: { turn: 5 },
    });
  });

  it('returns 401 without a session cookie', async () => {
    const res = await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      payload: { version: 1, payload: {} },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for a malformed slot id', async () => {
    const sessionToken = await harness.authenticate();
    const res = await harness.app.inject({
      method: 'PUT',
      url: '/saves/BAD%20SLOT',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 1, payload: {} },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'invalid_slot' });
  });

  it('returns 400 for a malformed body', async () => {
    const sessionToken = await harness.authenticate();
    const res = await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 0, payload: {} },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'invalid_request' });
  });
});

describe('GET /saves/:slot', () => {
  it('returns 404 when no save exists for (user, slot)', async () => {
    const sessionToken = await harness.authenticate();
    const res = await harness.app.inject({
      method: 'GET',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'not_found' });
  });

  it('returns the latest record with version + payload', async () => {
    const sessionToken = await harness.authenticate();
    await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 7, payload: { turn: 42 } },
    });
    const res = await harness.app.inject({
      method: 'GET',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      slot: 'auto',
      version: 7,
      payload: { turn: 42 },
    });
  });

  it('returns 401 without a session cookie', async () => {
    const res = await harness.app.inject({ method: 'GET', url: '/saves/auto' });
    expect(res.statusCode).toBe(401);
  });

  it('isolates saves between users', async () => {
    const sessionToken = await harness.authenticate();
    await harness.app.inject({
      method: 'PUT',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
      payload: { version: 1, payload: 'user-one' },
    });
    // Forge a session for a different user — belt-and-suspenders check
    // that the route gates on the cookie's userId, not the repository's
    // single-user state.
    await harness.authRepo.createUser({
      id: 'u-99',
      email: 'two@example.com',
      createdAt: new Date('2026-04-23T00:00:00Z'),
    });
    await harness.authRepo.createSession({
      token: 'other-session-token',
      userId: 'u-99',
      expiresAt: new Date('2026-04-23T02:00:00Z'),
    });
    const res = await harness.app.inject({
      method: 'GET',
      url: '/saves/auto',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: 'other-session-token' },
    });
    expect(res.statusCode).toBe(404);
  });
});
