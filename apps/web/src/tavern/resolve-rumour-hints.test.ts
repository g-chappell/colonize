import { describe, expect, it } from 'vitest';
import { resolveTavernHints } from './resolve-rumour-hints';

describe('resolveTavernHints', () => {
  it('emits one hint per rumour that carries hint metadata, preserving input order', () => {
    const hints = resolveTavernHints({ x: 7, y: 3 }, [
      'rumour-archive-cache-east',
      'rumour-singing-buoy',
      'rumour-derelict-leeward',
    ]);
    expect(hints).toHaveLength(2);
    expect(hints[0]).toEqual({
      origin: { x: 7, y: 3 },
      direction: 'e',
      category: 'archive-cache',
      sourceRumourId: 'rumour-archive-cache-east',
    });
    expect(hints[1]).toEqual({
      origin: { x: 7, y: 3 },
      direction: 'w',
      category: 'wreck',
      sourceRumourId: 'rumour-derelict-leeward',
    });
  });

  it('returns an empty array when no supplied rumour carries a hint', () => {
    expect(resolveTavernHints({ x: 0, y: 0 }, ['rumour-singing-buoy'])).toEqual([]);
  });

  it('returns an empty array for an empty rumour-id list', () => {
    expect(resolveTavernHints({ x: 1, y: 1 }, [])).toEqual([]);
  });

  it('copies origin so a later caller mutation does not leak into emitted hints', () => {
    const origin = { x: 2, y: 2 };
    const hints = resolveTavernHints(origin, ['rumour-archive-cache-east']);
    (origin as { x: number }).x = 999;
    expect(hints[0]!.origin).toEqual({ x: 2, y: 2 });
  });
});
