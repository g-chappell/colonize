// IapManager — single interface, web + mobile backends implement it.
// Symmetrical to `AdManager` in apps/web/src/ads/ad-manager.ts: the
// base class owns bookkeeping + error-swallowing so each backend only
// has to implement `init()` and `buy()`.
//
// Construct via `createIapManager()`; the factory picks the Capacitor
// backend when running inside a native shell, otherwise falls back to
// the web backend. Both the web + Capacitor backends submit the
// platform receipt to /iap/verify-receipt — the server is the single
// authority that decides which entitlements the user has.

import type { Entitlements, IapProductId } from '@colonize/shared';

export type IapBackendKind = 'web' | 'capacitor';

export type IapSkipReason =
  | 'unavailable' // backend is not wired for this platform / missing plugin
  | 'not-initialized'; // caller skipped `initialize()`

export type PurchaseOutcome =
  | { readonly kind: 'granted'; readonly entitlements: Entitlements }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'skipped'; readonly reason: IapSkipReason }
  | { readonly kind: 'error'; readonly message: string };

export interface IapManager {
  readonly backend: IapBackendKind;
  initialize(): Promise<void>;
  purchase(productId: IapProductId): Promise<PurchaseOutcome>;
  isInitialized(): boolean;
}

export abstract class BaseIapManager implements IapManager {
  abstract readonly backend: IapBackendKind;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.init();
    this.initialized = true;
  }

  async purchase(productId: IapProductId): Promise<PurchaseOutcome> {
    if (!this.initialized) return { kind: 'skipped', reason: 'not-initialized' };
    try {
      return await this.buy(productId);
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  protected abstract init(): Promise<void>;
  protected abstract buy(productId: IapProductId): Promise<PurchaseOutcome>;
}

// Re-export the platform detector from the ad-manager module rather
// than duplicating it — the two factories answer the same question
// ("is this a Capacitor shell?") and drift between the two would be a
// bug waiting to happen.
export { isNativePlatform } from '../ads/ad-manager';

// Lazy async factory — keeps the Capacitor backend (and its plugin
// imports) off the web-only code path. Callers `await` this at app
// startup and hold the resolved IapManager in module scope.
export async function createIapManager(): Promise<IapManager> {
  const { isNativePlatform } = await import('../ads/ad-manager');
  if (isNativePlatform()) {
    const mod = await import('./capacitor-iap-manager');
    return new mod.CapacitorIapManager();
  }
  const mod = await import('./web-iap-manager');
  return new mod.WebIapManager();
}
