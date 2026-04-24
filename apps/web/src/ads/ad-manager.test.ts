import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BaseAdManager,
  createAdManager,
  isNativePlatform,
  type AdOutcome,
  type AdShowRequest,
} from './ad-manager';

class FakeBackend extends BaseAdManager {
  readonly backend = 'web' as const;
  initCalls = 0;
  serveCalls: AdShowRequest[] = [];
  initImpl: () => Promise<void> = async () => {};
  serveImpl: (request: AdShowRequest) => Promise<AdOutcome> = async () => ({
    kind: 'shown',
    rewarded: false,
  });

  protected async init(): Promise<void> {
    this.initCalls += 1;
    await this.initImpl();
  }

  protected async serve(request: AdShowRequest): Promise<AdOutcome> {
    this.serveCalls.push(request);
    return this.serveImpl(request);
  }
}

const INTERSTITIAL: AdShowRequest = { format: 'interstitial', placement: 'turn-end' };

describe('BaseAdManager / initialize', () => {
  it('calls the backend init exactly once across repeated calls', async () => {
    const mgr = new FakeBackend();
    await mgr.initialize();
    await mgr.initialize();
    expect(mgr.initCalls).toBe(1);
    expect(mgr.isInitialized()).toBe(true);
  });
});

describe('BaseAdManager / show', () => {
  it('skips with `unavailable` before initialize() has run', async () => {
    const mgr = new FakeBackend();
    const outcome = await mgr.show(INTERSTITIAL);
    expect(outcome).toEqual({ kind: 'skipped', reason: 'unavailable' });
    expect(mgr.serveCalls).toHaveLength(0);
  });

  it('skips with `guarded` while the guard flag is raised, leaving the SDK untouched', async () => {
    const mgr = new FakeBackend();
    await mgr.initialize();
    mgr.setGuarded(true);
    const outcome = await mgr.show(INTERSTITIAL);
    expect(outcome).toEqual({ kind: 'skipped', reason: 'guarded' });
    expect(mgr.serveCalls).toHaveLength(0);
    expect(mgr.isGuarded()).toBe(true);
  });

  it('delegates to the backend once initialised and un-guarded', async () => {
    const mgr = new FakeBackend();
    await mgr.initialize();
    const outcome = await mgr.show(INTERSTITIAL);
    expect(outcome).toEqual({ kind: 'shown', rewarded: false });
    expect(mgr.serveCalls).toEqual([INTERSTITIAL]);
  });

  it('lowering the guard re-enables ads', async () => {
    const mgr = new FakeBackend();
    await mgr.initialize();
    mgr.setGuarded(true);
    await mgr.show(INTERSTITIAL);
    mgr.setGuarded(false);
    const outcome = await mgr.show(INTERSTITIAL);
    expect(outcome).toEqual({ kind: 'shown', rewarded: false });
    expect(mgr.serveCalls).toHaveLength(1);
  });

  it('converts a backend throw into a `skipped`/`error` outcome', async () => {
    const mgr = new FakeBackend();
    mgr.serveImpl = async () => {
      throw new Error('boom');
    };
    await mgr.initialize();
    const outcome = await mgr.show(INTERSTITIAL);
    expect(outcome).toEqual({ kind: 'skipped', reason: 'error' });
  });
});

describe('isNativePlatform', () => {
  const originalCapacitor = (window as { Capacitor?: unknown }).Capacitor;

  afterEach(() => {
    if (originalCapacitor === undefined) {
      delete (window as { Capacitor?: unknown }).Capacitor;
    } else {
      (window as { Capacitor?: unknown }).Capacitor = originalCapacitor;
    }
  });

  it('is false when window.Capacitor is absent', () => {
    delete (window as { Capacitor?: unknown }).Capacitor;
    expect(isNativePlatform()).toBe(false);
  });

  it('is false when Capacitor reports web', () => {
    (window as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => false };
    expect(isNativePlatform()).toBe(false);
  });

  it('is true when Capacitor reports native', () => {
    (window as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    expect(isNativePlatform()).toBe(true);
  });
});

describe('createAdManager', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete (window as { Capacitor?: unknown }).Capacitor;
  });

  it('returns the web backend off-native', async () => {
    delete (window as { Capacitor?: unknown }).Capacitor;
    const mgr = await createAdManager();
    expect(mgr.backend).toBe('web');
  });

  it('returns the admob backend when Capacitor reports native', async () => {
    (window as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    const mgr = await createAdManager();
    expect(mgr.backend).toBe('admob');
  });
});
