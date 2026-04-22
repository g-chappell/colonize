import { describe, it, expect } from 'vitest';
import { ALL_TILE_TYPES, TileType } from './tile.js';
import { EMPTY_TILE_YIELD, getTileYield, scaleTileYield } from './tile-yield.js';

describe('getTileYield', () => {
  it('returns a yield vector for every TileType', () => {
    for (const type of ALL_TILE_TYPES) {
      const y = getTileYield(type);
      expect(y).toBeTypeOf('object');
      expect(y).not.toBeNull();
    }
  });

  it('every yield key is a non-empty kebab-case resource id with a positive-integer qty', () => {
    for (const type of ALL_TILE_TYPES) {
      for (const [resourceId, qty] of Object.entries(getTileYield(type))) {
        expect(resourceId).toMatch(/^[a-z]+(-[a-z]+)*$/);
        expect(Number.isInteger(qty)).toBe(true);
        expect(qty).toBeGreaterThan(0);
      }
    }
  });

  it('Ocean yields provisions (fishing waters)', () => {
    expect(getTileYield(TileType.Ocean).provisions).toBeGreaterThan(0);
  });

  it('Island yields timber and fibre (coastal grove + kelp)', () => {
    const y = getTileYield(TileType.Island);
    expect(y.timber).toBeGreaterThan(0);
    expect(y.fibre).toBeGreaterThan(0);
  });

  it('FloatingCity yields salvage (scavenged wreckage)', () => {
    expect(getTileYield(TileType.FloatingCity).salvage).toBeGreaterThan(0);
  });

  it('sterile / hazard tiles produce nothing', () => {
    expect(getTileYield(TileType.RayonPassage)).toEqual({});
    expect(getTileYield(TileType.RedTide)).toEqual({});
    expect(getTileYield(TileType.FataMorgana)).toEqual({});
  });

  it('EMPTY_TILE_YIELD is frozen so callers cannot mutate the shared constant', () => {
    expect(Object.isFrozen(EMPTY_TILE_YIELD)).toBe(true);
  });
});

describe('scaleTileYield', () => {
  it('multiplier of 1 yields the same resource set with the same quantities', () => {
    const base = getTileYield(TileType.Island);
    const scaled = scaleTileYield(base, 1);
    expect(scaled).toEqual({ fibre: 1, timber: 1 });
  });

  it('doubles entries at multiplier 2', () => {
    const scaled = scaleTileYield(getTileYield(TileType.FloatingCity), 2);
    expect(scaled).toEqual({ provisions: 2, salvage: 2 });
  });

  it('floors fractional results and drops entries that floor to zero', () => {
    const scaled = scaleTileYield({ provisions: 3, timber: 1 }, 0.5);
    expect(scaled).toEqual({ provisions: 1 });
  });

  it('emits keys in stable alphabetical order for determinism across runs', () => {
    const scaled = scaleTileYield({ timber: 1, fibre: 1, provisions: 1 }, 2);
    expect(Object.keys(scaled)).toEqual(['fibre', 'provisions', 'timber']);
  });

  it('returns an empty object when the input is empty', () => {
    expect(scaleTileYield(EMPTY_TILE_YIELD, 3)).toEqual({});
  });

  it('rejects non-positive multipliers', () => {
    expect(() => scaleTileYield({ timber: 1 }, 0)).toThrow(RangeError);
    expect(() => scaleTileYield({ timber: 1 }, -1)).toThrow(RangeError);
  });

  it('rejects non-finite multipliers', () => {
    expect(() => scaleTileYield({ timber: 1 }, Number.NaN)).toThrow(RangeError);
    expect(() => scaleTileYield({ timber: 1 }, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
