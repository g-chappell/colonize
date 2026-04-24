import { describe, it, expect } from 'vitest';
import {
  ErrorResponse,
  GetSaveResponse,
  HealthResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  MeResponse,
  PutSaveRequest,
  PutSaveResponse,
  SaveSlotId,
  SHARED_SCHEMA_VERSION,
  User,
  VerifyRequest,
  VerifyResponse,
  Entitlements,
  EntitlementsResponse,
  IapPlatform,
  IapProductId,
  VerifyReceiptRequest,
  VerifyReceiptResponse,
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

describe('@colonize/shared save schemas', () => {
  it('accepts a well-formed slot id', () => {
    expect(SaveSlotId.parse('auto')).toBe('auto');
    expect(SaveSlotId.parse('slot-1')).toBe('slot-1');
    expect(SaveSlotId.parse('quick_save_2')).toBe('quick_save_2');
  });

  it('rejects a slot id with invalid characters or length', () => {
    expect(() => SaveSlotId.parse('Auto')).toThrow();
    expect(() => SaveSlotId.parse('slot 1')).toThrow();
    expect(() => SaveSlotId.parse('')).toThrow();
    expect(() => SaveSlotId.parse('x'.repeat(33))).toThrow();
  });

  it('round-trips a PutSaveRequest with an opaque payload', () => {
    const req = { version: 1, payload: { turn: 5, factions: ['otk'] } };
    expect(PutSaveRequest.parse(req)).toEqual(req);
  });

  it('rejects a PutSaveRequest with non-positive or non-integer version', () => {
    expect(() => PutSaveRequest.parse({ version: 0, payload: {} })).toThrow();
    expect(() => PutSaveRequest.parse({ version: -1, payload: {} })).toThrow();
    expect(() => PutSaveRequest.parse({ version: 1.5, payload: {} })).toThrow();
  });

  it('round-trips a PutSaveResponse', () => {
    const res = {
      slot: 'auto',
      version: 3,
      updatedAt: '2026-04-23T05:00:00.000Z',
    };
    expect(PutSaveResponse.parse(res)).toEqual(res);
  });

  it('round-trips a GetSaveResponse', () => {
    const res = {
      slot: 'auto',
      version: 7,
      updatedAt: '2026-04-23T05:00:00.000Z',
      payload: { anything: 'goes' },
    };
    expect(GetSaveResponse.parse(res)).toEqual(res);
  });
});

describe('@colonize/shared IAP schemas', () => {
  it('accepts known IapPlatform values and rejects unknowns', () => {
    expect(IapPlatform.parse('ios')).toBe('ios');
    expect(IapPlatform.parse('android')).toBe('android');
    expect(IapPlatform.parse('web')).toBe('web');
    expect(() => IapPlatform.parse('windows')).toThrow();
  });

  it('accepts known IapProductId values and rejects unknowns', () => {
    expect(IapProductId.parse('com.colonize.remove_ads')).toBe('com.colonize.remove_ads');
    expect(() => IapProductId.parse('com.colonize.premium')).toThrow();
  });

  it('round-trips a VerifyReceiptRequest', () => {
    const req = {
      platform: 'ios' as const,
      productId: 'com.colonize.remove_ads' as const,
      receipt: 'base64-receipt-payload',
    };
    expect(VerifyReceiptRequest.parse(req)).toEqual(req);
  });

  it('rejects a VerifyReceiptRequest with an empty receipt', () => {
    expect(() =>
      VerifyReceiptRequest.parse({
        platform: 'ios',
        productId: 'com.colonize.remove_ads',
        receipt: '',
      }),
    ).toThrow();
  });

  it('round-trips a VerifyReceiptResponse + EntitlementsResponse', () => {
    const body = { entitlements: { hasRemoveAds: true } };
    expect(VerifyReceiptResponse.parse(body)).toEqual(body);
    expect(EntitlementsResponse.parse(body)).toEqual(body);
  });

  it('rejects Entitlements with a non-boolean flag', () => {
    expect(() => Entitlements.parse({ hasRemoveAds: 'yes' })).toThrow();
  });
});
