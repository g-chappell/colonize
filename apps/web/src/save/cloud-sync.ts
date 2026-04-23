// CloudSync — the client-side primitive for TASK-083 "Client syncs after
// each turn (debounced). Last-writer-wins with a version counter. Offline
// edits replayed on reconnect." Pure-TS, injection-based — no React, no
// Phaser, no window globals. The wiring task that mounts this into the
// running app supplies `snapshot`, `backend`, `storage`, and `timer`.
//
// Behaviour:
//   - `requestSync()` schedules a debounced flush (default 1000ms).
//   - A flush issues PUT /saves/:slot with `{version, payload}`. On
//     success it bumps `lastAcknowledgedVersion`; on 409 stale_version
//     it adopts the server's version + 1 and retries the payload; on
//     network errors it keeps the pending snapshot buffered.
//   - On `online`, any buffered pending snapshot is flushed.
//   - On startup, any persisted pending snapshot from a prior session
//     is restored and scheduled for flush.
//
// This primitive does NOT reach into the zustand store or the bus by
// itself — the wiring task passes a `snapshot` callback that reads
// whatever it needs from the store, and a `subscribeTurn` callback that
// registers a turn-advanced listener. Keeps CloudSync unit-testable
// without mounting the full web tree (jsdom stays quiet).

export interface PendingSnapshot {
  readonly version: number;
  readonly payload: unknown;
}

export type PutResult =
  | { readonly ok: true; readonly version: number }
  | {
      readonly ok: false;
      readonly reason: 'stale_version';
      readonly currentVersion: number;
    }
  | { readonly ok: false; readonly reason: 'network_error' | 'unauthenticated' | 'server_error' };

export interface CloudSaveBackend {
  put(input: PendingSnapshot): Promise<PutResult>;
}

export interface CloudSaveStorage {
  read(): PendingSnapshot | null;
  write(snapshot: PendingSnapshot | null): void;
}

export interface CloudSyncTimer {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}

export interface CloudSyncOptions {
  backend: CloudSaveBackend;
  storage: CloudSaveStorage;
  snapshot: () => unknown;
  timer: CloudSyncTimer;
  /** Register a turn-advanced listener; returns an unsubscribe. */
  subscribeTurn: (handler: () => void) => () => void;
  /** Register an "online" listener; returns an unsubscribe. Called on reconnect. */
  subscribeOnline: (handler: () => void) => () => void;
  /** Milliseconds to coalesce rapid turn-advance bursts before flushing. */
  debounceMs?: number;
  /** Optional logger for debugging; defaults to a no-op. */
  logger?: { warn(message: string, meta?: Record<string, unknown>): void };
}

export const DEFAULT_CLOUD_SYNC_DEBOUNCE_MS = 1000;

export class CloudSync {
  private readonly opts: Required<Omit<CloudSyncOptions, 'logger'>> & {
    logger: NonNullable<CloudSyncOptions['logger']>;
  };
  private readonly unsubscribes: Array<() => void> = [];
  private pending: PendingSnapshot | null;
  private lastAcknowledgedVersion: number;
  private timerHandle: number | null = null;
  private flushInFlight: Promise<void> | null = null;
  private disposed = false;

  constructor(options: CloudSyncOptions) {
    this.opts = {
      backend: options.backend,
      storage: options.storage,
      snapshot: options.snapshot,
      timer: options.timer,
      subscribeTurn: options.subscribeTurn,
      subscribeOnline: options.subscribeOnline,
      debounceMs: options.debounceMs ?? DEFAULT_CLOUD_SYNC_DEBOUNCE_MS,
      logger: options.logger ?? { warn: () => undefined },
    };
    const restored = this.opts.storage.read();
    this.pending = restored;
    this.lastAcknowledgedVersion = restored ? restored.version - 1 : 0;
  }

  start(): void {
    this.unsubscribes.push(this.opts.subscribeTurn(() => this.requestSync()));
    this.unsubscribes.push(this.opts.subscribeOnline(() => this.flushIfPending()));
    if (this.pending) {
      // A prior session crashed or went offline with an un-acked write.
      // Resume flushing it before any fresh `requestSync` overwrites it.
      this.flushIfPending();
    }
  }

  /**
   * Schedule a debounced flush. The current store snapshot is captured
   * once the timer fires so rapid turn-advance bursts coalesce into a
   * single PUT carrying the most recent state.
   */
  requestSync(): void {
    if (this.disposed) return;
    if (this.timerHandle !== null) {
      this.opts.timer.clearTimeout(this.timerHandle);
    }
    this.timerHandle = this.opts.timer.setTimeout(() => {
      this.timerHandle = null;
      this.capturePending();
      void this.flushIfPending();
    }, this.opts.debounceMs);
  }

  /** Returns the version the server last acknowledged (0 before the first success). */
  get acknowledgedVersion(): number {
    return this.lastAcknowledgedVersion;
  }

  /** Returns a buffered snapshot awaiting delivery, or null when in sync. */
  get pendingSnapshot(): PendingSnapshot | null {
    return this.pending;
  }

  /**
   * Await any in-flight or buffered flush. Does NOT force a fresh
   * snapshot capture — the debounce timer (or `online` subscription,
   * or startup restore) is responsible for that. Returns the
   * acknowledged version when nothing is pending; null when the flush
   * is still buffered (network/unauthenticated error).
   */
  async flush(): Promise<number | null> {
    await this.flushIfPending();
    return this.pending === null ? this.lastAcknowledgedVersion : null;
  }

  dispose(): void {
    this.disposed = true;
    if (this.timerHandle !== null) {
      this.opts.timer.clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    for (const u of this.unsubscribes) u();
    this.unsubscribes.length = 0;
  }

  private capturePending(): void {
    // If a prior flush is still buffered (network error, stale version
    // retry pending), we overwrite its payload with the freshest snapshot
    // but keep its version — the next PUT will carry the latest state at
    // whatever version the server expects.
    const payload = this.opts.snapshot();
    const version = this.pending?.version ?? Math.max(this.lastAcknowledgedVersion, 0) + 1;
    const next: PendingSnapshot = { version, payload };
    this.pending = next;
    this.opts.storage.write(next);
  }

  private flushIfPending(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.flushInFlight) return this.flushInFlight;
    if (!this.pending) return Promise.resolve();

    const run = async (): Promise<void> => {
      while (this.pending && !this.disposed) {
        const attempt = this.pending;
        let result: PutResult;
        try {
          result = await this.opts.backend.put(attempt);
        } catch (err) {
          this.opts.logger.warn('cloud-sync: backend.put threw; will retry', {
            error: err instanceof Error ? err.message : String(err),
          });
          return;
        }

        if (result.ok) {
          this.lastAcknowledgedVersion = result.version;
          // Only clear if nothing newer arrived mid-flight. `capturePending`
          // during an in-flight request replaces the payload but keeps the
          // same version, so pointer-equality is enough to detect that.
          if (this.pending === attempt) {
            this.pending = null;
            this.opts.storage.write(null);
          } else {
            // A newer snapshot came in mid-flight. Bump the version so the
            // next loop iteration carries the fresher payload upward.
            const fresher = this.pending;
            this.pending = {
              version: result.version + 1,
              payload: fresher.payload,
            };
            this.opts.storage.write(this.pending);
          }
          continue;
        }

        if (result.reason === 'stale_version') {
          // Server has a newer version from another device. Rebase our
          // payload onto server-version + 1 and retry. last-writer-wins
          // — the player's in-flight state takes precedence over the
          // older remote save.
          this.lastAcknowledgedVersion = result.currentVersion;
          this.pending = {
            version: result.currentVersion + 1,
            payload: attempt.payload,
          };
          this.opts.storage.write(this.pending);
          continue;
        }

        // network_error | unauthenticated | server_error — keep
        // buffered and surface the reason. `online` or next
        // `requestSync` will retry. Break so we don't spin on a
        // persistent failure.
        this.opts.logger.warn(`cloud-sync: put failed (${result.reason}); will retry`, {
          version: attempt.version,
        });
        return;
      }
    };

    this.flushInFlight = run().finally(() => {
      this.flushInFlight = null;
    });
    return this.flushInFlight;
  }
}

export function createLocalStorageBackedStorage(storage: Storage, key: string): CloudSaveStorage {
  return {
    read(): PendingSnapshot | null {
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === 'object' &&
          'version' in parsed &&
          'payload' in parsed &&
          typeof (parsed as { version: unknown }).version === 'number' &&
          Number.isInteger((parsed as { version: number }).version) &&
          (parsed as { version: number }).version > 0
        ) {
          return {
            version: (parsed as { version: number }).version,
            payload: (parsed as { payload: unknown }).payload,
          };
        }
      } catch {
        // fall through → discard corrupt blob
      }
      storage.removeItem(key);
      return null;
    },
    write(snapshot: PendingSnapshot | null): void {
      if (snapshot === null) {
        storage.removeItem(key);
        return;
      }
      storage.setItem(key, JSON.stringify(snapshot));
    },
  };
}

export function createFetchBackend(config: {
  fetch: typeof fetch;
  baseUrl: string;
  slot: string;
}): CloudSaveBackend {
  return {
    async put(input: PendingSnapshot): Promise<PutResult> {
      const url = `${stripTrailingSlash(config.baseUrl)}/saves/${encodeURIComponent(config.slot)}`;
      let res: Response;
      try {
        res = await config.fetch(url, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: input.version, payload: input.payload }),
        });
      } catch {
        return { ok: false, reason: 'network_error' };
      }

      if (res.status === 200) {
        const body = (await safeJson(res)) as { version?: number } | null;
        if (body && typeof body.version === 'number') {
          return { ok: true, version: body.version };
        }
        return { ok: false, reason: 'server_error' };
      }
      if (res.status === 409) {
        const body = (await safeJson(res)) as { version?: number } | null;
        if (body && typeof body.version === 'number') {
          return { ok: false, reason: 'stale_version', currentVersion: body.version };
        }
        return { ok: false, reason: 'server_error' };
      }
      if (res.status === 401) {
        return { ok: false, reason: 'unauthenticated' };
      }
      return { ok: false, reason: 'server_error' };
    },
  };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
