// Repository abstraction over the `saves` Postgres table. Two
// implementations live beside this file: InMemorySaveRepository (used
// by tests and by dev-without-DATABASE_URL boots) and DrizzleSaveRepository
// (production Postgres). Routes see only this interface.
//
// Mirrors the same "one repo one wiring boundary" shape as
// AuthRepository — a consumer that needs saves never reaches into two
// types. Stays deliberately narrow: `put` is the write path (accepts or
// rejects with reason="stale_version"), `get` is the read path.

export interface SaveRecord {
  userId: string;
  slot: string;
  version: number;
  payload: unknown;
  updatedAt: Date;
}

export type PutSaveResult =
  | { readonly ok: true; readonly record: SaveRecord }
  | { readonly ok: false; readonly reason: 'stale_version'; readonly current: SaveRecord };

export interface SaveRepository {
  /**
   * Atomic last-writer-wins write. Accepts iff no prior record exists
   * for (userId, slot) OR the incoming `version` is strictly greater
   * than the stored record's version. Rejects with a `stale_version`
   * reason when the client's version is at or behind the server's —
   * the rejection carries the current server record so the client can
   * rebase and retry.
   */
  put(input: {
    userId: string;
    slot: string;
    version: number;
    payload: unknown;
    now: Date;
  }): Promise<PutSaveResult>;

  /** Returns the latest record for (userId, slot), or null when no save exists. */
  get(userId: string, slot: string): Promise<SaveRecord | null>;
}
