import { describe, expect, it } from 'vitest';
import type { TavernContext, TavernRumourEntry } from '@colonize/content';
import { selectRumours } from './select-rumours';

const CONTEXT: TavernContext = { town: 'colony-1', year: 5, faction: 'otk' };

function r(
  id: string,
  weight: number | undefined = undefined,
  faction: 'otk' | 'phantom' | undefined = undefined,
): TavernRumourEntry {
  return {
    id: `rumour-${id}` as TavernRumourEntry['id'],
    headline: `H-${id}`,
    body: `B-${id}`,
    register: 'salt-and-rum',
    trigger: {
      ...(weight !== undefined ? { weight } : {}),
      ...(faction !== undefined ? { faction } : {}),
    },
  };
}

// Deterministic rng helper: cycles through the supplied uniform-[0,1) values.
function seededRng(values: readonly number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length]!;
    i += 1;
    return v;
  };
}

describe('selectRumours', () => {
  it('returns an empty array when count is not a positive integer', () => {
    expect(selectRumours({ context: CONTEXT, count: 0 })).toEqual([]);
    expect(selectRumours({ context: CONTEXT, count: -1 })).toEqual([]);
    expect(selectRumours({ context: CONTEXT, count: 2.5 })).toEqual([]);
  });

  it('returns all eligible rumours when fewer exist than count', () => {
    const pool = [r('a'), r('b')];
    const picked = selectRumours({ context: CONTEXT, count: 3, rumours: pool });
    expect(picked).toHaveLength(2);
    expect(picked.map((p) => p.id).sort()).toEqual(['rumour-a', 'rumour-b']);
  });

  it('picks `count` rumours without replacement', () => {
    const pool = [r('a'), r('b'), r('c'), r('d'), r('e')];
    const picked = selectRumours({
      context: CONTEXT,
      count: 3,
      rumours: pool,
      rng: seededRng([0.1, 0.5, 0.9]),
    });
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((p) => p.id)).size).toBe(3);
  });

  it('respects faction trigger filter — drops mismatched rumours from the eligible set', () => {
    const pool = [r('a-otk', undefined, 'otk'), r('b-phantom', undefined, 'phantom'), r('c')];
    const picked = selectRumours({ context: CONTEXT, count: 3, rumours: pool });
    expect(picked.map((p) => p.id).sort()).toEqual(['rumour-a-otk', 'rumour-c']);
  });

  it('higher-weight rumours are picked first when the rng rolls deterministic low', () => {
    // With rng=0 the weighted scan picks the first non-zero-weight entry.
    // After picking the first entry, the second iteration also picks the
    // first remaining non-zero entry — so a heavy rumour at index 0 wins
    // round one, then index 1 (formerly 2) wins round two.
    const pool = [r('heavy', 5), r('light-1', 1), r('light-2', 1)];
    const picked = selectRumours({
      context: CONTEXT,
      count: 2,
      rumours: pool,
      rng: seededRng([0]),
    });
    expect(picked[0]!.id).toBe('rumour-heavy');
    expect(picked[1]!.id).toBe('rumour-light-1');
  });

  it('skips rumours with weight === 0 even when filters would otherwise admit them', () => {
    const pool = [r('a', 0), r('b'), r('c')];
    const picked = selectRumours({ context: CONTEXT, count: 3, rumours: pool });
    expect(picked.map((p) => p.id).sort()).toEqual(['rumour-b', 'rumour-c']);
  });

  it('returns 3 rumours from the default content pool given a default rng', () => {
    const picked = selectRumours({ context: CONTEXT, count: 3 });
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((p) => p.id)).size).toBe(3);
  });
});
