// Web backend — placeholder until the browser-payment flow is wired
// (future: web-checkout against a Stripe subscription, or a WebView
// hand-off to the store). The MVP scaffold returns `unavailable`
// without firing any requests; the interface + guard are the
// deliverable. Replace `buy()` with a real payment + receipt-post
// against `/iap/verify-receipt` when the web payment backend ships.

import type { IapProductId } from '@colonize/shared';
import { BaseIapManager, type PurchaseOutcome } from './iap-manager';

export class WebIapManager extends BaseIapManager {
  readonly backend = 'web' as const;

  protected async init(): Promise<void> {
    // Intentional no-op until a web payment backend is wired. Resolving
    // immediately lets callers treat initialize() as a stable hook.
  }

  protected async buy(_productId: IapProductId): Promise<PurchaseOutcome> {
    return { kind: 'skipped', reason: 'unavailable' };
  }
}
