import { describe, expect, it, vi } from 'vitest';

import { BaseIapManager, type IapBackendKind, type PurchaseOutcome } from './iap-manager';

class FakeBackend extends BaseIapManager {
  readonly backend: IapBackendKind = 'web';
  initCount = 0;
  buyCount = 0;
  buyImpl: () => Promise<PurchaseOutcome> = async () => ({
    kind: 'granted',
    entitlements: { hasRemoveAds: true },
  });

  protected async init(): Promise<void> {
    this.initCount++;
  }

  protected async buy(): Promise<PurchaseOutcome> {
    this.buyCount++;
    return this.buyImpl();
  }
}

describe('BaseIapManager', () => {
  it('initialize() is idempotent — second call does not re-run init', async () => {
    const mgr = new FakeBackend();
    await mgr.initialize();
    await mgr.initialize();
    expect(mgr.initCount).toBe(1);
    expect(mgr.isInitialized()).toBe(true);
  });

  it('purchase() before initialize() short-circuits to skipped/not-initialized', async () => {
    const mgr = new FakeBackend();
    const outcome = await mgr.purchase('com.colonize.remove_ads');
    expect(outcome).toEqual({ kind: 'skipped', reason: 'not-initialized' });
    expect(mgr.buyCount).toBe(0);
  });

  it('purchase() after initialize() dispatches to buy()', async () => {
    const mgr = new FakeBackend();
    await mgr.initialize();
    const outcome = await mgr.purchase('com.colonize.remove_ads');
    expect(outcome).toEqual({ kind: 'granted', entitlements: { hasRemoveAds: true } });
    expect(mgr.buyCount).toBe(1);
  });

  it('catches thrown backend errors and returns a kind=error outcome', async () => {
    const mgr = new FakeBackend();
    mgr.buyImpl = vi.fn(async () => {
      throw new Error('boom');
    });
    await mgr.initialize();
    const outcome = await mgr.purchase('com.colonize.remove_ads');
    expect(outcome).toEqual({ kind: 'error', message: 'boom' });
  });
});
