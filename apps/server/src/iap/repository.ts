// Repository abstraction over the `entitlements` Postgres table. Two
// implementations live beside this file: InMemoryEntitlementRepository
// (used by tests + dev-without-DATABASE_URL boots) and
// DrizzleEntitlementRepository (production Postgres). Routes only see
// this interface — the same "one repo, one wiring boundary" shape as
// AuthRepository / SaveRepository.
//
// Stays deliberately narrow: `grant` is the write path (idempotent
// upsert on (userId, entitlement)), `listForUser` is the read path
// used by /me/entitlements and by the post-purchase response.

export interface EntitlementRecord {
  userId: string;
  entitlement: string;
  productId: string;
  platform: string;
  validatedAt: Date;
}

export interface EntitlementRepository {
  /**
   * Idempotent grant: inserts a new row iff (userId, entitlement) is
   * absent, otherwise updates the existing row's productId / platform
   * / validatedAt to reflect the latest receipt. Returns the persisted
   * record. Re-granting an entitlement the user already owns is a
   * no-op the caller can rely on — /iap/verify-receipt must be safe to
   * retry.
   */
  grant(input: {
    userId: string;
    entitlement: string;
    productId: string;
    platform: string;
    now: Date;
  }): Promise<EntitlementRecord>;

  /** All entitlements currently granted to a user. Empty when none. */
  listForUser(userId: string): Promise<readonly EntitlementRecord[]>;
}
