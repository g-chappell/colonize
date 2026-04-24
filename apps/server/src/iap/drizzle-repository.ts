// Drizzle/Postgres-backed EntitlementRepository. Wired in production
// when DATABASE_URL is set (see apps/server/src/index.ts). Tests stay
// on the in-memory repo — Postgres end-to-end coverage lands once the
// docker compose Postgres service joins the CI matrix.

import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { entitlements } from '../db/schema.js';
import type { EntitlementRecord, EntitlementRepository } from './repository.js';

type Db = PostgresJsDatabase<{ entitlements: typeof entitlements }>;

export class DrizzleEntitlementRepository implements EntitlementRepository {
  constructor(private readonly db: Db) {}

  async grant(input: {
    userId: string;
    entitlement: string;
    productId: string;
    platform: string;
    now: Date;
  }): Promise<EntitlementRecord> {
    const [row] = await this.db
      .insert(entitlements)
      .values({
        userId: input.userId,
        entitlement: input.entitlement,
        productId: input.productId,
        platform: input.platform,
        validatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [entitlements.userId, entitlements.entitlement],
        set: {
          productId: input.productId,
          platform: input.platform,
          validatedAt: input.now,
        },
      })
      .returning();
    if (!row) throw new Error('grant: upsert returned no rows');
    return toRecord(row);
  }

  async listForUser(userId: string): Promise<readonly EntitlementRecord[]> {
    const rows = await this.db.select().from(entitlements).where(eq(entitlements.userId, userId));
    return rows.map(toRecord).sort((a, b) => a.entitlement.localeCompare(b.entitlement));
  }
}

function toRecord(row: typeof entitlements.$inferSelect): EntitlementRecord {
  return {
    userId: row.userId,
    entitlement: row.entitlement,
    productId: row.productId,
    platform: row.platform,
    validatedAt: row.validatedAt,
  };
}
