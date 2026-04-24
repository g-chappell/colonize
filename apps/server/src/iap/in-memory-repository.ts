// In-memory EntitlementRepository — used by the Vitest suite and by
// the dev boot when DATABASE_URL is unset. Keyed by (userId, entitlement);
// re-granting overwrites productId / platform / validatedAt so behaviour
// mirrors the Drizzle upsert.

import type { EntitlementRecord, EntitlementRepository } from './repository.js';

export class InMemoryEntitlementRepository implements EntitlementRepository {
  private readonly records = new Map<string, EntitlementRecord>();

  async grant(input: {
    userId: string;
    entitlement: string;
    productId: string;
    platform: string;
    now: Date;
  }): Promise<EntitlementRecord> {
    const record: EntitlementRecord = {
      userId: input.userId,
      entitlement: input.entitlement,
      productId: input.productId,
      platform: input.platform,
      validatedAt: input.now,
    };
    this.records.set(this.keyFor(input.userId, input.entitlement), record);
    return record;
  }

  async listForUser(userId: string): Promise<readonly EntitlementRecord[]> {
    const out: EntitlementRecord[] = [];
    for (const record of this.records.values()) {
      if (record.userId === userId) out.push(record);
    }
    // Sort alphabetically by entitlement id for stable callers +
    // deterministic test assertions.
    out.sort((a, b) => a.entitlement.localeCompare(b.entitlement));
    return out;
  }

  private keyFor(userId: string, entitlement: string): string {
    return `${userId}::${entitlement}`;
  }
}
