// Receipt validator — pure function that decides whether a submitted
// receipt grants an entitlement. The MVP ships a catalog stub:
// platform-specific verification (Apple's verifyReceipt / Google's
// Play Developer API) lands when the store accounts are provisioned.
// Until then the validator accepts any non-empty receipt for a known
// product id and maps it to the product's declared entitlement.
//
// Keeping the validator as a pure function means the routes file never
// has to reach into platform-specific SDKs, and tests can drive the
// decision without HTTP fixtures.

import type { IapEntitlementId, IapPlatform, IapProductId } from '@colonize/shared';

export interface ReceiptValidationInput {
  readonly platform: IapPlatform;
  readonly productId: IapProductId;
  readonly receipt: string;
}

export type ReceiptValidationResult =
  | {
      readonly ok: true;
      readonly productId: IapProductId;
      readonly entitlement: IapEntitlementId;
    }
  | {
      readonly ok: false;
      readonly reason: 'empty_receipt' | 'unknown_product';
    };

// Catalog — which product grants which entitlement. Mirrors the set
// declared in @colonize/shared IapProductId / IapEntitlementId; kept
// here (rather than importing from content) because the server owns
// the mapping authoritatively and must not depend on client content.
const PRODUCT_CATALOG: Record<IapProductId, IapEntitlementId> = {
  'com.colonize.remove_ads': 'remove_ads',
};

export function validateReceipt(input: ReceiptValidationInput): ReceiptValidationResult {
  if (input.receipt.trim().length === 0) {
    return { ok: false, reason: 'empty_receipt' };
  }
  const entitlement = PRODUCT_CATALOG[input.productId];
  if (!entitlement) {
    return { ok: false, reason: 'unknown_product' };
  }
  // Platform-specific verification goes here when the store accounts
  // are provisioned. For iOS: POST the receipt to Apple's
  // verifyReceipt endpoint and confirm the transaction/product id.
  // For Android: call androidpublisher.purchases.products.get and
  // confirm purchaseState === 0. The web platform is reserved and
  // currently treated the same way as the mobile stubs.
  return { ok: true, productId: input.productId, entitlement };
}
