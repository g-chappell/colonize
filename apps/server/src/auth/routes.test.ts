import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp, DEFAULT_SESSION_COOKIE_NAME } from '../app.js';
import { InMemoryAuthRepository } from './in-memory-repository.js';
import { RecordingMagicLinkSender } from './sender.js';

interface Harness {
  app: ReturnType<typeof buildApp>;
  repo: InMemoryAuthRepository;
  sender: RecordingMagicLinkSender;
  setNow: (d: Date) => void;
  tokens: string[];
  ids: string[];
}

function makeHarness(): Harness {
  const repo = new InMemoryAuthRepository();
  const sender = new RecordingMagicLinkSender();
  let now = new Date('2026-04-23T00:00:00.000Z');
  const tokens = [
    't0000000000000000000000000000000000000000000000000000000000000000',
    't1111111111111111111111111111111111111111111111111111111111111111',
    't2222222222222222222222222222222222222222222222222222222222222222',
    't3333333333333333333333333333333333333333333333333333333333333333',
  ];
  const ids = [
    'u-00000000-0000-4000-8000-000000000000',
    'u-11111111-1111-4111-8111-111111111111',
    'u-22222222-2222-4222-8222-222222222222',
  ];
  let tokenCursor = 0;
  let idCursor = 0;
  const issuedTokens: string[] = [];
  const issuedIds: string[] = [];

  const app = buildApp({
    auth: {
      repository: repo,
      sender,
      magicLinkBaseUrl: 'https://colonize.example/auth/verify',
      sessionCookieSecure: false,
      sessionTtlMs: 60 * 60 * 1000, // 1h
      magicLinkTtlMs: 10 * 60 * 1000, // 10m
      now: () => now,
      newToken: () => {
        const t = tokens[tokenCursor++] ?? `extra-token-${tokenCursor}`;
        issuedTokens.push(t);
        return t;
      },
      newUserId: () => {
        const id = ids[idCursor++] ?? `extra-id-${idCursor}`;
        issuedIds.push(id);
        return id;
      },
    },
  });

  return {
    app,
    repo,
    sender,
    setNow: (d) => {
      now = d;
    },
    tokens: issuedTokens,
    ids: issuedIds,
  };
}

let harness: Harness;

beforeEach(() => {
  harness = makeHarness();
});

afterEach(async () => {
  await harness.app.close();
});

describe('POST /auth/magic-link', () => {
  it('creates the user on first request and dispatches the link', async () => {
    const res = await harness.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'captain@otk.example' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    expect(harness.sender.sent).toHaveLength(1);
    expect(harness.sender.sent[0]).toMatchObject({
      email: 'captain@otk.example',
      token: harness.tokens[0],
      link: `https://colonize.example/auth/verify?token=${harness.tokens[0]}`,
    });

    const user = await harness.repo.findUserByEmail('captain@otk.example');
    expect(user?.id).toBe(harness.ids[0]);
  });

  it('reuses an existing user on subsequent requests', async () => {
    await harness.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'a@b.co' },
    });
    await harness.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'A@B.CO' },
    });

    expect(harness.sender.sent).toHaveLength(2);
    expect(harness.ids).toHaveLength(1);
    expect(harness.tokens).toHaveLength(2);
    expect(harness.tokens[0]).not.toBe(harness.tokens[1]);
  });

  it('rejects an invalid email body with 400', async () => {
    const res = await harness.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'invalid_request' });
    expect(harness.sender.sent).toHaveLength(0);
  });

  it('rejects a missing body with 400', async () => {
    const res = await harness.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /auth/verify', () => {
  async function requestLink(email = 'a@b.co'): Promise<string> {
    await harness.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email },
    });
    const sent = harness.sender.sent.at(-1);
    if (!sent) throw new Error('test setup: no link was sent');
    return sent.token;
  }

  it('exchanges a valid magic-link token for a session cookie + user', async () => {
    const token = await requestLink();
    const res = await harness.app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({
      id: harness.ids[0],
      email: 'a@b.co',
    });

    const setCookie = res.headers['set-cookie'];
    const setCookieStr = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie ?? '');
    expect(setCookieStr).toContain(`${DEFAULT_SESSION_COOKIE_NAME}=`);
    expect(setCookieStr).toContain('HttpOnly');
    expect(setCookieStr).toContain('SameSite=Lax');
  });

  it('returns 400 when the token is unknown', async () => {
    const res = await harness.app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: { token: 'never-issued' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'invalid_token' });
  });

  it('rejects a second verify of the same token', async () => {
    const token = await requestLink();
    const ok = await harness.app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: { token },
    });
    expect(ok.statusCode).toBe(200);

    const replay = await harness.app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: { token },
    });
    expect(replay.statusCode).toBe(400);
    expect(replay.json()).toMatchObject({ error: 'invalid_token' });
  });

  it('rejects a magic-link token after expiry', async () => {
    const token = await requestLink();
    harness.setNow(new Date('2026-04-23T00:11:00Z')); // > 10m TTL
    const res = await harness.app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: { token },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'invalid_token' });
  });

  it('rejects a missing token with 400', async () => {
    const res = await harness.app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'invalid_request' });
  });
});

describe('GET /me', () => {
  async function authenticate(): Promise<string> {
    await harness.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'a@b.co' },
    });
    const sent = harness.sender.sent.at(-1);
    if (!sent) throw new Error('test setup: no link was sent');
    const verify = await harness.app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: { token: sent.token },
    });
    const setCookie = verify.headers['set-cookie'];
    const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!raw) throw new Error('test setup: verify did not set a cookie');
    const match = raw.match(new RegExp(`${DEFAULT_SESSION_COOKIE_NAME}=([^;]+)`));
    if (!match) throw new Error(`test setup: cookie not parseable: ${raw}`);
    return match[1]!;
  }

  it('returns 401 when no session cookie is sent', async () => {
    const res = await harness.app.inject({ method: 'GET', url: '/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'unauthenticated' });
  });

  it('returns 401 for an unknown session cookie', async () => {
    const res = await harness.app.inject({
      method: 'GET',
      url: '/me',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: 'never-issued' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns the user when the session cookie is valid', async () => {
    const sessionToken = await authenticate();
    const res = await harness.app.inject({
      method: 'GET',
      url: '/me',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ email: 'a@b.co', id: harness.ids[0] });
  });

  it('returns 401 once the session has expired', async () => {
    const sessionToken = await authenticate();
    harness.setNow(new Date('2026-04-23T01:00:01Z')); // > 1h TTL
    const res = await harness.app.inject({
      method: 'GET',
      url: '/me',
      cookies: { [DEFAULT_SESSION_COOKIE_NAME]: sessionToken },
    });
    expect(res.statusCode).toBe(401);
  });
});
