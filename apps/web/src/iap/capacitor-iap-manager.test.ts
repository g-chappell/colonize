import { describe, expect, it, vi } from 'vitest';

import {
  CapacitorIapManager,
  type IapPluginLike,
  postReceiptForVerification,
} from './capacitor-iap-manager';

function fakePlugin(overrides: Partial<IapPluginLike> = {}): IapPluginLike {
  return {
    initialize: vi.fn(async () => undefined),
    purchase: vi.fn(async () => ({ receipt: 'apple-receipt-payload' })),
    getPlatform: () => 'ios',
    ...overrides,
  };
}

function okFetch(body: { entitlements: { hasRemoveAds: boolean } }): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  ) as unknown as typeof fetch;
}

describe('CapacitorIapManager', () => {
  it('skips with reason=unavailable when the plugin fails to load', async () => {
    const mgr = new CapacitorIapManager({ loadPlugin: async () => null });
    await mgr.initialize();
    const outcome = await mgr.purchase('com.colonize.remove_ads');
    expect(outcome).toEqual({ kind: 'skipped', reason: 'unavailable' });
  });

  it('granted → fetches /iap/verify-receipt and returns the server entitlements', async () => {
    const plugin = fakePlugin();
    const fetchFn = okFetch({ entitlements: { hasRemoveAds: true } });
    const mgr = new CapacitorIapManager({
      loadPlugin: async () => plugin,
      fetch: fetchFn,
      verifyReceiptUrl: '/iap/verify-receipt',
    });

    await mgr.initialize();
    const outcome = await mgr.purchase('com.colonize.remove_ads');

    expect(outcome).toEqual({
      kind: 'granted',
      entitlements: { hasRemoveAds: true },
    });
    expect(plugin.purchase).toHaveBeenCalledWith({ productId: 'com.colonize.remove_ads' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock
      .calls[0]!;
    expect(url).toBe('/iap/verify-receipt');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual({
      platform: 'ios',
      productId: 'com.colonize.remove_ads',
      receipt: 'apple-receipt-payload',
    });
  });

  it('cancelled plugin response returns kind=cancelled without touching fetch', async () => {
    const plugin = fakePlugin({
      purchase: vi.fn(async () => ({ cancelled: true })),
    });
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const mgr = new CapacitorIapManager({
      loadPlugin: async () => plugin,
      fetch: fetchFn,
    });

    await mgr.initialize();
    const outcome = await mgr.purchase('com.colonize.remove_ads');
    expect(outcome).toEqual({ kind: 'cancelled' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns kind=error when the server rejects the receipt', async () => {
    const plugin = fakePlugin();
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ error: 'empty_receipt' }), { status: 400 }),
    ) as unknown as typeof fetch;
    const mgr = new CapacitorIapManager({
      loadPlugin: async () => plugin,
      fetch: fetchFn,
    });

    await mgr.initialize();
    const outcome = await mgr.purchase('com.colonize.remove_ads');
    expect(outcome).toEqual({ kind: 'error', message: 'server rejected the receipt' });
  });
});

describe('postReceiptForVerification', () => {
  it('returns the server entitlements on a 200 response', async () => {
    const fetchFn = okFetch({ entitlements: { hasRemoveAds: true } });
    const result = await postReceiptForVerification({
      fetchFn,
      url: '/iap/verify-receipt',
      platform: 'ios',
      productId: 'com.colonize.remove_ads',
      receipt: 'x',
    });
    expect(result).toEqual({ hasRemoveAds: true });
  });

  it('returns null on a non-OK response', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 401 })) as unknown as typeof fetch;
    const result = await postReceiptForVerification({
      fetchFn,
      url: '/iap/verify-receipt',
      platform: 'ios',
      productId: 'com.colonize.remove_ads',
      receipt: 'x',
    });
    expect(result).toBeNull();
  });

  it('returns null when the server returns a shape that does not match the schema', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ unexpected: 'shape' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
    const result = await postReceiptForVerification({
      fetchFn,
      url: '/iap/verify-receipt',
      platform: 'ios',
      productId: 'com.colonize.remove_ads',
      receipt: 'x',
    });
    expect(result).toBeNull();
  });
});
