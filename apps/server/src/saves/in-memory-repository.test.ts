import { describe, it, expect } from 'vitest';
import { InMemorySaveRepository } from './in-memory-repository.js';

function at(iso: string): Date {
  return new Date(iso);
}

describe('InMemorySaveRepository', () => {
  it('accepts the first write for (user, slot)', async () => {
    const repo = new InMemorySaveRepository();
    const res = await repo.put({
      userId: 'u-1',
      slot: 'auto',
      version: 1,
      payload: { turn: 1 },
      now: at('2026-04-23T00:00:00Z'),
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.record.version).toBe(1);
      expect(res.record.payload).toEqual({ turn: 1 });
    }
  });

  it('accepts a strictly-greater version and overwrites the payload', async () => {
    const repo = new InMemorySaveRepository();
    await repo.put({
      userId: 'u-1',
      slot: 'auto',
      version: 1,
      payload: { turn: 1 },
      now: at('2026-04-23T00:00:00Z'),
    });
    const res = await repo.put({
      userId: 'u-1',
      slot: 'auto',
      version: 2,
      payload: { turn: 2 },
      now: at('2026-04-23T00:01:00Z'),
    });
    expect(res.ok).toBe(true);
    const read = await repo.get('u-1', 'auto');
    expect(read?.version).toBe(2);
    expect(read?.payload).toEqual({ turn: 2 });
  });

  it('rejects a stale write and surfaces the current record', async () => {
    const repo = new InMemorySaveRepository();
    await repo.put({
      userId: 'u-1',
      slot: 'auto',
      version: 5,
      payload: { turn: 5 },
      now: at('2026-04-23T00:00:00Z'),
    });
    const res = await repo.put({
      userId: 'u-1',
      slot: 'auto',
      version: 4,
      payload: { turn: 4 },
      now: at('2026-04-23T00:01:00Z'),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('stale_version');
      expect(res.current.version).toBe(5);
    }
  });

  it('rejects a write at the same version as the current record', async () => {
    const repo = new InMemorySaveRepository();
    await repo.put({
      userId: 'u-1',
      slot: 'auto',
      version: 3,
      payload: { turn: 3 },
      now: at('2026-04-23T00:00:00Z'),
    });
    const res = await repo.put({
      userId: 'u-1',
      slot: 'auto',
      version: 3,
      payload: { turn: 'clobber' },
      now: at('2026-04-23T00:01:00Z'),
    });
    expect(res.ok).toBe(false);
    const read = await repo.get('u-1', 'auto');
    expect(read?.payload).toEqual({ turn: 3 });
  });

  it('keeps (user, slot) pairs independent', async () => {
    const repo = new InMemorySaveRepository();
    await repo.put({
      userId: 'u-1',
      slot: 'auto',
      version: 1,
      payload: 'a',
      now: at('2026-04-23T00:00:00Z'),
    });
    await repo.put({
      userId: 'u-2',
      slot: 'auto',
      version: 1,
      payload: 'b',
      now: at('2026-04-23T00:00:00Z'),
    });
    await repo.put({
      userId: 'u-1',
      slot: 'quick',
      version: 1,
      payload: 'c',
      now: at('2026-04-23T00:00:00Z'),
    });
    expect((await repo.get('u-1', 'auto'))?.payload).toBe('a');
    expect((await repo.get('u-2', 'auto'))?.payload).toBe('b');
    expect((await repo.get('u-1', 'quick'))?.payload).toBe('c');
    expect(await repo.get('u-1', 'nonexistent')).toBeNull();
  });

  it('get returns null for missing (user, slot)', async () => {
    const repo = new InMemorySaveRepository();
    expect(await repo.get('u-missing', 'auto')).toBeNull();
  });
});
