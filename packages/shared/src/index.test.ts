import { describe, it, expect } from 'vitest';
import {
  ErrorResponse,
  HealthResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  MeResponse,
  SHARED_SCHEMA_VERSION,
  User,
  VerifyRequest,
  VerifyResponse,
} from './index.js';

describe('@colonize/shared', () => {
  it('exposes a schema version', () => {
    expect(SHARED_SCHEMA_VERSION).toBe(1);
  });

  it('round-trips a HealthResponse via Zod', () => {
    const sample = { ok: true, version: '0.0.0', uptime: 0 };
    const parsed = HealthResponse.parse(sample);
    expect(parsed).toEqual(sample);
  });
});

describe('@colonize/shared auth schemas', () => {
  const sampleUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'captain@otk.example',
    createdAt: '2026-04-23T00:00:00.000Z',
  };

  it('round-trips a User', () => {
    expect(User.parse(sampleUser)).toEqual(sampleUser);
  });

  it('rejects a User with an invalid email', () => {
    expect(() => User.parse({ ...sampleUser, email: 'not-an-email' })).toThrow();
  });

  it('rejects a User with a non-ISO createdAt', () => {
    expect(() => User.parse({ ...sampleUser, createdAt: 'yesterday' })).toThrow();
  });

  it('round-trips MagicLinkRequest / MagicLinkResponse', () => {
    expect(MagicLinkRequest.parse({ email: 'a@b.co' })).toEqual({ email: 'a@b.co' });
    expect(MagicLinkResponse.parse({ ok: true })).toEqual({ ok: true });
  });

  it('rejects MagicLinkResponse with ok=false', () => {
    expect(() => MagicLinkResponse.parse({ ok: false })).toThrow();
  });

  it('round-trips VerifyRequest / VerifyResponse', () => {
    expect(VerifyRequest.parse({ token: 'abc' })).toEqual({ token: 'abc' });
    expect(VerifyResponse.parse({ user: sampleUser })).toEqual({ user: sampleUser });
  });

  it('rejects VerifyRequest with an empty token', () => {
    expect(() => VerifyRequest.parse({ token: '' })).toThrow();
  });

  it('round-trips MeResponse', () => {
    expect(MeResponse.parse({ user: sampleUser })).toEqual({ user: sampleUser });
  });

  it('round-trips ErrorResponse', () => {
    const err = { error: 'invalid_token', message: 'token expired or already consumed' };
    expect(ErrorResponse.parse(err)).toEqual(err);
  });

  it('rejects ErrorResponse missing fields', () => {
    expect(() => ErrorResponse.parse({ error: '' })).toThrow();
  });
});
