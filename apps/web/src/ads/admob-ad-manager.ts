// Mobile backend — @capacitor-community/admob wrapper. The plugin is
// only resolvable under a Capacitor native shell, so init() imports it
// lazily and tolerates a missing package so the web bundle can build
// cleanly without the plugin installed (it is declared in
// apps/mobile/package.json once the AdMob account is provisioned).
//
// `serve()` dispatches on `request.format`: interstitials go through
// `showInterstitial`; rewarded ads go through `showRewardVideo` and
// surface the plugin's `rewarded` flag on the outcome.

import { BaseAdManager, type AdOutcome, type AdShowRequest } from './ad-manager';

// Minimal structural type for the subset of the plugin API we use.
// Keeps this file plugin-optional — if the install lands later, the
// real types are a superset of this shape.
interface AdMobLike {
  initialize(options: { initializeForTesting?: boolean }): Promise<void>;
  showInterstitial(options: { adId: string }): Promise<void>;
  showRewardVideo(options: { adId: string }): Promise<{ rewarded?: boolean } | undefined>;
}

export class AdMobAdManager extends BaseAdManager {
  readonly backend = 'admob' as const;
  private admob: AdMobLike | null = null;

  protected async init(): Promise<void> {
    const admob = await loadAdMob();
    if (!admob) return;
    await admob.initialize({ initializeForTesting: true });
    this.admob = admob;
  }

  protected async serve(request: AdShowRequest): Promise<AdOutcome> {
    if (!this.admob) return { kind: 'skipped', reason: 'unavailable' };
    const adId = placementToAdId(request);
    if (request.format === 'interstitial') {
      await this.admob.showInterstitial({ adId });
      return { kind: 'shown', rewarded: false };
    }
    const result = await this.admob.showRewardVideo({ adId });
    return { kind: 'shown', rewarded: Boolean(result?.rewarded) };
  }
}

async function loadAdMob(): Promise<AdMobLike | null> {
  try {
    // The specifier is intentionally dynamic so Vite does not try to
    // resolve the plugin during a web build that does not have it
    // installed. Native builds (Capacitor) always have it on disk.
    const specifier = '@capacitor-community/admob';
    const mod: unknown = await import(/* @vite-ignore */ specifier);
    const candidate = (mod as { AdMob?: unknown }).AdMob;
    return isAdMobLike(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function isAdMobLike(value: unknown): value is AdMobLike {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.initialize === 'function' &&
    typeof v.showInterstitial === 'function' &&
    typeof v.showRewardVideo === 'function'
  );
}

function placementToAdId(_request: AdShowRequest): string {
  // Real AdMob ad-unit IDs land in packages/content once the account is
  // provisioned. Until then the manager initialises in test mode and
  // the plugin substitutes a Google test id — returning a stable
  // placeholder here keeps logs human-readable.
  return 'test-ad-unit';
}
