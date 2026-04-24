import { describe, expect, it } from 'vitest';
import { validateReceipt } from './validator.js';

describe('validateReceipt', () => {
  it('grants remove_ads for com.colonize.remove_ads with any non-empty receipt', () => {
    const result = validateReceipt({
      platform: 'ios',
      productId: 'com.colonize.remove_ads',
      receipt: 'base64-receipt-payload',
    });
    expect(result).toEqual({
      ok: true,
      productId: 'com.colonize.remove_ads',
      entitlement: 'remove_ads',
    });
  });

  it('rejects an empty receipt payload', () => {
    const result = validateReceipt({
      platform: 'android',
      productId: 'com.colonize.remove_ads',
      receipt: '   ',
    });
    expect(result).toEqual({ ok: false, reason: 'empty_receipt' });
  });
});
