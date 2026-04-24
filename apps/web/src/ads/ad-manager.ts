// AdManager — single interface, web + mobile backends implement it.
//
// Construct via `createAdManager()`; the factory picks the native
// backend when running inside a Capacitor shell, otherwise falls back
// to the web backend. The "no ads during war/narrative" rule is
// surfaced as a guard flag the orchestrator flips via `setGuarded`;
// when raised, `show()` short-circuits to a `skipped` outcome without
// touching the underlying SDK.
//
// The base class owns the guard + init bookkeeping so each backend
// only has to implement `init()` and `serve()`.

export type AdFormat = 'interstitial' | 'rewarded';

export type AdPlacement =
  | 'turn-end' // optional interstitial between turns
  | 'colony-found' // rewarded ad celebrating a new colony
  | 'revive'; // rewarded ad offered on defeat

export interface AdShowRequest {
  readonly format: AdFormat;
  readonly placement: AdPlacement;
}

export type AdSkipReason = 'guarded' | 'unavailable' | 'error';

export type AdOutcome =
  | { readonly kind: 'shown'; readonly rewarded: boolean }
  | { readonly kind: 'skipped'; readonly reason: AdSkipReason };

export type AdBackendKind = 'web' | 'admob';

export interface AdManager {
  readonly backend: AdBackendKind;
  initialize(): Promise<void>;
  show(request: AdShowRequest): Promise<AdOutcome>;
  setGuarded(guarded: boolean): void;
  isGuarded(): boolean;
  isInitialized(): boolean;
}

export abstract class BaseAdManager implements AdManager {
  abstract readonly backend: AdBackendKind;
  private guarded = false;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.init();
    this.initialized = true;
  }

  async show(request: AdShowRequest): Promise<AdOutcome> {
    if (this.guarded) return { kind: 'skipped', reason: 'guarded' };
    if (!this.initialized) return { kind: 'skipped', reason: 'unavailable' };
    try {
      return await this.serve(request);
    } catch {
      return { kind: 'skipped', reason: 'error' };
    }
  }

  setGuarded(guarded: boolean): void {
    this.guarded = guarded;
  }

  isGuarded(): boolean {
    return this.guarded;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  protected abstract init(): Promise<void>;
  protected abstract serve(request: AdShowRequest): Promise<AdOutcome>;
}

// Detect a Capacitor native shell without taking a hard dependency on
// @capacitor/core: the runtime injects `window.Capacitor` before the
// web bundle loads, so a duck-typed check is enough for the factory.
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
}

// Lazy async factory — keeps the admob module (and its Capacitor
// plugin imports) off the web-only code path. Callers `await` this at
// app startup and hold the resolved AdManager in module scope.
export async function createAdManager(): Promise<AdManager> {
  if (isNativePlatform()) {
    const mod = await import('./admob-ad-manager');
    return new mod.AdMobAdManager();
  }
  const mod = await import('./web-ad-manager');
  return new mod.WebAdManager();
}
