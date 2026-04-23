// In-memory SaveRepository — used by the Vitest suite and by the dev
// boot when DATABASE_URL is unset. Keeps one entry per (userId, slot)
// key. Mirrors the last-writer-wins semantics of the Drizzle impl so
// tests written against this backend stay representative.

import type { PutSaveResult, SaveRecord, SaveRepository } from './repository.js';

export class InMemorySaveRepository implements SaveRepository {
  private readonly records = new Map<string, SaveRecord>();

  async put(input: {
    userId: string;
    slot: string;
    version: number;
    payload: unknown;
    now: Date;
  }): Promise<PutSaveResult> {
    const key = this.keyFor(input.userId, input.slot);
    const existing = this.records.get(key);
    if (existing && input.version <= existing.version) {
      return { ok: false, reason: 'stale_version', current: existing };
    }
    const record: SaveRecord = {
      userId: input.userId,
      slot: input.slot,
      version: input.version,
      payload: input.payload,
      updatedAt: input.now,
    };
    this.records.set(key, record);
    return { ok: true, record };
  }

  async get(userId: string, slot: string): Promise<SaveRecord | null> {
    return this.records.get(this.keyFor(userId, slot)) ?? null;
  }

  private keyFor(userId: string, slot: string): string {
    return `${userId}::${slot}`;
  }
}
