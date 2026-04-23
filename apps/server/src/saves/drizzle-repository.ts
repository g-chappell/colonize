// Drizzle/Postgres-backed SaveRepository. Wired in production when
// DATABASE_URL is set (see apps/server/src/index.ts). Tests stay on the
// in-memory repo — Postgres end-to-end coverage lands once the docker
// compose Postgres service joins the CI matrix.

import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { saves } from '../db/schema.js';
import type { PutSaveResult, SaveRecord, SaveRepository } from './repository.js';

type Db = PostgresJsDatabase<{ saves: typeof saves }>;

export class DrizzleSaveRepository implements SaveRepository {
  constructor(private readonly db: Db) {}

  async put(input: {
    userId: string;
    slot: string;
    version: number;
    payload: unknown;
    now: Date;
  }): Promise<PutSaveResult> {
    // Transactional read → conditional insert/update. Postgres
    // `SELECT ... FOR UPDATE` serialises concurrent PUTs on the same
    // (userId, slot) row so the stale-version check cannot race.
    return await this.db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(saves)
        .where(and(eq(saves.userId, input.userId), eq(saves.slot, input.slot)))
        .for('update')
        .limit(1);
      const existing = existingRows[0];

      if (existing && input.version <= existing.version) {
        return {
          ok: false as const,
          reason: 'stale_version' as const,
          current: toRecord(existing),
        };
      }

      if (existing) {
        const [updated] = await tx
          .update(saves)
          .set({
            version: input.version,
            payload: input.payload as object,
            updatedAt: input.now,
          })
          .where(and(eq(saves.userId, input.userId), eq(saves.slot, input.slot)))
          .returning();
        if (!updated) throw new Error('put: update returned no rows');
        return { ok: true as const, record: toRecord(updated) };
      }

      const [inserted] = await tx
        .insert(saves)
        .values({
          userId: input.userId,
          slot: input.slot,
          version: input.version,
          payload: input.payload as object,
          updatedAt: input.now,
        })
        .returning();
      if (!inserted) throw new Error('put: insert returned no rows');
      return { ok: true as const, record: toRecord(inserted) };
    });
  }

  async get(userId: string, slot: string): Promise<SaveRecord | null> {
    const rows = await this.db
      .select()
      .from(saves)
      .where(and(eq(saves.userId, userId), eq(saves.slot, slot)))
      .limit(1);
    const row = rows[0];
    return row ? toRecord(row) : null;
  }
}

function toRecord(row: typeof saves.$inferSelect): SaveRecord {
  return {
    userId: row.userId,
    slot: row.slot,
    version: row.version,
    payload: row.payload,
    updatedAt: row.updatedAt,
  };
}
