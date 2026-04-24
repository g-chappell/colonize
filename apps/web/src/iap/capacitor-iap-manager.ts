// Mobile backend — Capacitor IAP plugin wrapper. The plugin is only
// resolvable under a Capacitor native shell, so init() imports it
// lazily and tolerates a missing package so the web bundle can build
// cleanly without the plugin installed (it is declared in
// apps/mobile/package.json once the store accounts are provisioned).
//
// `buy()` triggers the platform purchase sheet, then POSTs the
// returned receipt at /iap/verify-receipt so the server can validate
// it and persist the entitlement. The server's response body drives
// the purchase outcome surfaced to the caller.

import {
  Entitlements,
  VerifyReceiptResponse,
  type Entitlements as EntitlementsDto,
  type IapPlatform,
  type IapProductId,
} from '@colonize/shared';
import { BaseIapManager, type PurchaseOutcome } from './iap-manager';

// Minimal structural type for the subset of a Capacitor IAP plugin API
// we need. Keeps this file plugin-optional — when the real plugin
// lands (@capacitor-community/in-app-purchases or equivalent), its
// exported surface is a superset of this shape.
export interface IapPluginLike {
  initialize?(): Promise<void>;
  purchase(options: { productId: string }): Promise<{
    receipt?: string;
    cancelled?: boolean;
  }>;
  getPlatform?(): IapPlatform;
}

export interface CapacitorIapManagerOptions {
  /** Override the plugin loader for tests. Production omits this. */
  readonly loadPlugin?: () => Promise<IapPluginLike | null>;
  /** Override fetch for tests. Production uses globalThis.fetch. */
  readonly fetch?: typeof fetch;
  /**
   * Base URL for the server-side receipt-verification endpoint. Defaults
   * to the same origin the web client was loaded from; tests inject a
   * fake URL + fetch to assert the request shape.
   */
  readonly verifyReceiptUrl?: string;
  /**
   * Platform tag sent to /iap/verify-receipt. Defaults to the plugin's
   * own `getPlatform()` when available, otherwise falls back to 'ios'
   * (the Capacitor IAP plugin reports the platform it was loaded on).
   */
  readonly platform?: IapPlatform;
}

const DEFAULT_VERIFY_URL = '/iap/verify-receipt';

export class CapacitorIapManager extends BaseIapManager {
  readonly backend = 'capacitor' as const;
  private plugin: IapPluginLike | null = null;
  private readonly opts: CapacitorIapManagerOptions;

  constructor(opts: CapacitorIapManagerOptions = {}) {
    super();
    this.opts = opts;
  }

  protected async init(): Promise<void> {
    const loader = this.opts.loadPlugin ?? loadIapPlugin;
    const plugin = await loader();
    if (!plugin) return;
    if (plugin.initialize) await plugin.initialize();
    this.plugin = plugin;
  }

  protected async buy(productId: IapProductId): Promise<PurchaseOutcome> {
    if (!this.plugin) return { kind: 'skipped', reason: 'unavailable' };
    const result = await this.plugin.purchase({ productId });
    if (result.cancelled) return { kind: 'cancelled' };
    if (!result.receipt) return { kind: 'error', message: 'plugin returned no receipt' };

    const platform = this.opts.platform ?? this.plugin.getPlatform?.() ?? 'ios';
    const entitlements = await postReceiptForVerification({
      fetchFn: this.opts.fetch ?? globalThis.fetch.bind(globalThis),
      url: this.opts.verifyReceiptUrl ?? DEFAULT_VERIFY_URL,
      platform,
      productId,
      receipt: result.receipt,
    });
    if (!entitlements) {
      return { kind: 'error', message: 'server rejected the receipt' };
    }
    return { kind: 'granted', entitlements };
  }
}

export async function postReceiptForVerification(input: {
  readonly fetchFn: typeof fetch;
  readonly url: string;
  readonly platform: IapPlatform;
  readonly productId: IapProductId;
  readonly receipt: string;
}): Promise<EntitlementsDto | null> {
  const res = await input.fetchFn(input.url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      platform: input.platform,
      productId: input.productId,
      receipt: input.receipt,
    }),
  });
  if (!res.ok) return null;
  const body: unknown = await res.json();
  const parsed = VerifyReceiptResponse.safeParse(body);
  if (!parsed.success) return null;
  return Entitlements.parse(parsed.data.entitlements);
}

async function loadIapPlugin(): Promise<IapPluginLike | null> {
  try {
    // The specifier is intentionally dynamic so Vite does not try to
    // resolve the plugin during a web build that does not have it
    // installed. Native builds (Capacitor) will have it on disk once
    // the store accounts are provisioned.
    const specifier = '@capacitor-community/in-app-purchases';
    const mod: unknown = await import(/* @vite-ignore */ specifier);
    const candidate = (mod as { InAppPurchases?: unknown }).InAppPurchases;
    return isIapPluginLike(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function isIapPluginLike(value: unknown): value is IapPluginLike {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.purchase === 'function';
}
