import { describe, it, expect, beforeEach } from 'vitest';
import {
  CloudSync,
  DEFAULT_CLOUD_SYNC_DEBOUNCE_MS,
  createLocalStorageBackedStorage,
  createFetchBackend,
  type CloudSaveBackend,
  type CloudSaveStorage,
  type CloudSyncTimer,
  type PendingSnapshot,
  type PutResult,
} from './cloud-sync';

interface FakeTimer extends CloudSyncTimer {
  tick(ms: number): void;
  now(): number;
}

function createFakeTimer(): FakeTimer {
  type Entry = { handle: number; fn: () => void; fireAt: number };
  const queue: Entry[] = [];
  let nextHandle = 1;
  let currentTime = 0;

  return {
    setTimeout(fn, ms): number {
      const handle = nextHandle++;
      queue.push({ handle, fn, fireAt: currentTime + ms });
      return handle;
    },
    clearTimeout(handle): void {
      const idx = queue.findIndex((e) => e.handle === handle);
      if (idx >= 0) queue.splice(idx, 1);
    },
    tick(ms): void {
      currentTime += ms;
      const due = queue.filter((e) => e.fireAt <= currentTime);
      for (const d of due) {
        const idx = queue.indexOf(d);
        if (idx >= 0) queue.splice(idx, 1);
        d.fn();
      }
    },
    now(): number {
      return currentTime;
    },
  };
}

interface FakeBackend extends CloudSaveBackend {
  calls: PendingSnapshot[];
  setNextResult(result: PutResult | ((input: PendingSnapshot) => PutResult)): void;
}

function createFakeBackend(): FakeBackend {
  const calls: PendingSnapshot[] = [];
  let nextResult: PutResult | ((input: PendingSnapshot) => PutResult) = {
    ok: true,
    version: 0,
  };
  return {
    calls,
    setNextResult(result): void {
      nextResult = result;
    },
    async put(input): Promise<PutResult> {
      calls.push(input);
      const result = typeof nextResult === 'function' ? nextResult(input) : nextResult;
      if (result.ok) return { ok: true, version: result.version || input.version };
      return result;
    },
  };
}

function createMemoryStorage(initial: PendingSnapshot | null = null): CloudSaveStorage & {
  readonly last: PendingSnapshot | null;
} {
  let current: PendingSnapshot | null = initial;
  return {
    read: () => current,
    write: (snapshot) => {
      current = snapshot;
    },
    get last() {
      return current;
    },
  };
}

function createSubscription(): {
  register: (handler: () => void) => () => void;
  emit: () => void;
  count: () => number;
} {
  const handlers = new Set<() => void>();
  return {
    register(handler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    emit(): void {
      for (const h of [...handlers]) h();
    },
    count: () => handlers.size,
  };
}

interface Harness {
  sync: CloudSync;
  backend: FakeBackend;
  storage: ReturnType<typeof createMemoryStorage>;
  timer: FakeTimer;
  turn: ReturnType<typeof createSubscription>;
  online: ReturnType<typeof createSubscription>;
  snapshot: { current: unknown };
}

function makeSync(initialStorage: PendingSnapshot | null = null): Harness {
  const backend = createFakeBackend();
  const storage = createMemoryStorage(initialStorage);
  const timer = createFakeTimer();
  const turn = createSubscription();
  const online = createSubscription();
  const snapshot = { current: { seq: 0 } as unknown };
  const sync = new CloudSync({
    backend,
    storage,
    snapshot: () => snapshot.current,
    timer,
    subscribeTurn: turn.register,
    subscribeOnline: online.register,
    debounceMs: DEFAULT_CLOUD_SYNC_DEBOUNCE_MS,
  });
  sync.start();
  return { sync, backend, storage, timer, turn, online, snapshot };
}

let harness: Harness;

beforeEach(() => {
  harness = makeSync();
});

describe('CloudSync debounced flush', () => {
  it('fires one PUT per debounce window regardless of burst count', async () => {
    harness.snapshot.current = { turn: 1 };
    harness.turn.emit();
    harness.turn.emit();
    harness.turn.emit();
    expect(harness.backend.calls).toHaveLength(0);

    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    await harness.sync.flush();

    expect(harness.backend.calls).toHaveLength(1);
    expect(harness.backend.calls[0]).toEqual({ version: 1, payload: { turn: 1 } });
    expect(harness.sync.acknowledgedVersion).toBe(1);
    expect(harness.sync.pendingSnapshot).toBeNull();
  });

  it('captures the snapshot at flush time, not at request time', async () => {
    harness.snapshot.current = { seq: 1 };
    harness.turn.emit();
    harness.snapshot.current = { seq: 2 };
    harness.turn.emit();
    harness.snapshot.current = { seq: 3 };

    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    await harness.sync.flush();

    expect(harness.backend.calls).toHaveLength(1);
    expect(harness.backend.calls[0]?.payload).toEqual({ seq: 3 });
  });

  it('bumps the version on each successful write', async () => {
    harness.snapshot.current = 'a';
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    await harness.sync.flush();

    harness.snapshot.current = 'b';
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    await harness.sync.flush();

    expect(harness.backend.calls.map((c) => c.version)).toEqual([1, 2]);
    expect(harness.sync.acknowledgedVersion).toBe(2);
  });

  it('persists the pending snapshot to storage until the server acks it', async () => {
    harness.snapshot.current = 'a';
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);

    expect(harness.storage.last).toEqual({ version: 1, payload: 'a' });
    await harness.sync.flush();
    expect(harness.storage.last).toBeNull();
  });
});

describe('CloudSync offline + reconnect', () => {
  it('buffers a network-error put and replays it when online fires', async () => {
    harness.snapshot.current = 'offline-payload';
    harness.backend.setNextResult({ ok: false, reason: 'network_error' });
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    await harness.sync.flush();

    expect(harness.backend.calls).toHaveLength(1);
    expect(harness.sync.pendingSnapshot).toEqual({ version: 1, payload: 'offline-payload' });
    expect(harness.storage.last).toEqual({ version: 1, payload: 'offline-payload' });

    harness.backend.setNextResult({ ok: true, version: 1 });
    harness.online.emit();
    await harness.sync.flush();

    expect(harness.backend.calls).toHaveLength(2);
    expect(harness.sync.pendingSnapshot).toBeNull();
    expect(harness.storage.last).toBeNull();
  });

  it('coalesces further turns-while-offline into the same pending slot', async () => {
    harness.snapshot.current = { seq: 1 };
    harness.backend.setNextResult({ ok: false, reason: 'network_error' });
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    await harness.sync.flush();
    expect(harness.backend.calls).toHaveLength(1);

    harness.snapshot.current = { seq: 2 };
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    // Still offline — same failing result.
    await harness.sync.flush();
    expect(harness.backend.calls).toHaveLength(2);
    // Both attempts used version 1 (never acknowledged) but the second
    // carried the fresher payload.
    expect(harness.backend.calls[1]).toEqual({ version: 1, payload: { seq: 2 } });

    harness.backend.setNextResult({ ok: true, version: 1 });
    harness.online.emit();
    await harness.sync.flush();
    expect(harness.backend.calls[2]?.payload).toEqual({ seq: 2 });
    expect(harness.sync.acknowledgedVersion).toBe(1);
  });

  it('restores a pending snapshot from storage at startup and flushes it', async () => {
    const resurrected = makeSync({ version: 3, payload: 'recovered' });
    expect(resurrected.sync.pendingSnapshot).toEqual({ version: 3, payload: 'recovered' });
    await resurrected.sync.flush();
    expect(resurrected.backend.calls[0]).toEqual({ version: 3, payload: 'recovered' });
    expect(resurrected.sync.acknowledgedVersion).toBe(3);
    expect(resurrected.sync.pendingSnapshot).toBeNull();
  });
});

describe('CloudSync stale-version handling', () => {
  it('rebases onto the server version + 1 and retries', async () => {
    harness.snapshot.current = 'local-payload';
    let callCount = 0;
    harness.backend.setNextResult(() => {
      callCount += 1;
      if (callCount === 1) return { ok: false, reason: 'stale_version', currentVersion: 7 };
      return { ok: true, version: 8 };
    });
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    await harness.sync.flush();

    expect(harness.backend.calls).toHaveLength(2);
    expect(harness.backend.calls[0]?.version).toBe(1);
    expect(harness.backend.calls[1]).toEqual({ version: 8, payload: 'local-payload' });
    expect(harness.sync.acknowledgedVersion).toBe(8);
    expect(harness.sync.pendingSnapshot).toBeNull();
  });

  it('stops retrying on unauthenticated and buffers for later', async () => {
    harness.snapshot.current = 'shh';
    harness.backend.setNextResult({ ok: false, reason: 'unauthenticated' });
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    await harness.sync.flush();

    expect(harness.backend.calls).toHaveLength(1);
    expect(harness.sync.pendingSnapshot).not.toBeNull();
  });
});

describe('CloudSync lifecycle', () => {
  it('unsubscribes turn + online listeners on dispose', () => {
    expect(harness.turn.count()).toBe(1);
    expect(harness.online.count()).toBe(1);
    harness.sync.dispose();
    expect(harness.turn.count()).toBe(0);
    expect(harness.online.count()).toBe(0);
  });

  it('ignores turn events after dispose', () => {
    harness.sync.dispose();
    harness.turn.emit();
    harness.timer.tick(DEFAULT_CLOUD_SYNC_DEBOUNCE_MS);
    expect(harness.backend.calls).toHaveLength(0);
  });
});

describe('createLocalStorageBackedStorage', () => {
  it('round-trips a PendingSnapshot via Storage', () => {
    const store = new Map<string, string>();
    const storage: Storage = {
      get length(): number {
        return store.size;
      },
      clear: (): void => {
        store.clear();
      },
      getItem: (k): string | null => store.get(k) ?? null,
      key: (i): string | null => Array.from(store.keys())[i] ?? null,
      removeItem: (k): void => {
        store.delete(k);
      },
      setItem: (k, v): void => {
        store.set(k, v);
      },
    };
    const backed = createLocalStorageBackedStorage(storage, 'save/auto');
    expect(backed.read()).toBeNull();
    backed.write({ version: 4, payload: { turn: 4 } });
    expect(backed.read()).toEqual({ version: 4, payload: { turn: 4 } });
    backed.write(null);
    expect(backed.read()).toBeNull();
  });

  it('discards corrupt or malformed payloads', () => {
    const store = new Map<string, string>([['save/auto', 'not-json']]);
    const storage: Storage = {
      get length(): number {
        return store.size;
      },
      clear: (): void => {
        store.clear();
      },
      getItem: (k): string | null => store.get(k) ?? null,
      key: (i): string | null => Array.from(store.keys())[i] ?? null,
      removeItem: (k): void => {
        store.delete(k);
      },
      setItem: (k, v): void => {
        store.set(k, v);
      },
    };
    const backed = createLocalStorageBackedStorage(storage, 'save/auto');
    expect(backed.read()).toBeNull();
    // The corrupt key is cleared so it doesn't leak into the next read.
    expect(store.has('save/auto')).toBe(false);
  });
});

describe('createFetchBackend', () => {
  function fakeFetch(res: Response | Error): typeof fetch {
    return (async () => {
      if (res instanceof Error) throw res;
      return res;
    }) as typeof fetch;
  }

  it('maps 200 with {version} to ok', async () => {
    const backend = createFetchBackend({
      fetch: fakeFetch(
        new Response(
          JSON.stringify({ slot: 'auto', version: 1, updatedAt: '2026-04-23T00:00:00Z' }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
      baseUrl: 'https://colonize.example',
      slot: 'auto',
    });
    const result = await backend.put({ version: 1, payload: {} });
    expect(result).toEqual({ ok: true, version: 1 });
  });

  it('maps 409 to stale_version + currentVersion', async () => {
    const backend = createFetchBackend({
      fetch: fakeFetch(
        new Response(
          JSON.stringify({
            slot: 'auto',
            version: 5,
            updatedAt: '2026-04-23T00:00:00Z',
            payload: {},
          }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        ),
      ),
      baseUrl: 'https://colonize.example/',
      slot: 'auto',
    });
    const result = await backend.put({ version: 3, payload: {} });
    expect(result).toEqual({ ok: false, reason: 'stale_version', currentVersion: 5 });
  });

  it('maps 401 to unauthenticated', async () => {
    const backend = createFetchBackend({
      fetch: fakeFetch(new Response('', { status: 401 })),
      baseUrl: 'https://colonize.example',
      slot: 'auto',
    });
    expect(await backend.put({ version: 1, payload: {} })).toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
  });

  it('maps a thrown fetch to network_error', async () => {
    const backend = createFetchBackend({
      fetch: fakeFetch(new TypeError('fetch failed')),
      baseUrl: 'https://colonize.example',
      slot: 'auto',
    });
    expect(await backend.put({ version: 1, payload: {} })).toEqual({
      ok: false,
      reason: 'network_error',
    });
  });
});
