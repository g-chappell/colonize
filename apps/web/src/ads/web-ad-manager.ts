// Web backend — placeholder for the eventual Google Ad Manager
// (gpt.js / DFP) integration. The MVP scaffold returns `unavailable`
// without firing any requests; the interface + guard are the
// deliverable. Replace `serve()` with a real googletag slot call when
// the ad-network account is provisioned.

import { BaseAdManager, type AdOutcome, type AdShowRequest } from './ad-manager';

export class WebAdManager extends BaseAdManager {
  readonly backend = 'web' as const;

  protected async init(): Promise<void> {
    // Intentional no-op until gpt.js is wired. Resolving immediately
    // lets callers treat initialize() as a stable hook.
  }

  protected async serve(_request: AdShowRequest): Promise<AdOutcome> {
    return { kind: 'skipped', reason: 'unavailable' };
  }
}
