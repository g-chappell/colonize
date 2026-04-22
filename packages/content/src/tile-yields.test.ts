import { describe, it, expect } from 'vitest';
import {
  TILE_YIELDS,
  getTileYieldEntry,
  isTileYieldEntryId,
  type TileYieldEntryId,
} from './tile-yields.js';

describe('TILE_YIELDS', () => {
  it('covers every canonical TileType id (6 entries: ocean, rayon-passage, island, floating-city, red-tide, fata-morgana)', () => {
    const ids = TILE_YIELDS.map((t) => t.id).sort();
    expect(ids).toEqual(
      ['fata-morgana', 'floating-city', 'island', 'ocean', 'rayon-passage', 'red-tide'].sort(),
    );
  });

  it('has unique ids', () => {
    const ids = TILE_YIELDS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every id is a non-empty kebab-case string', () => {
    for (const t of TILE_YIELDS) {
      expect(t.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('every entry has non-empty name, summary, and description', () => {
    for (const t of TILE_YIELDS) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.summary.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('every yield entry is a positive integer keyed by a non-empty kebab-case resource id', () => {
    for (const t of TILE_YIELDS) {
      for (const [resourceId, qty] of Object.entries(t.yields)) {
        expect(resourceId).toMatch(/^[a-z]+(-[a-z]+)*$/);
        expect(Number.isInteger(qty)).toBe(true);
        expect(qty).toBeGreaterThan(0);
      }
    }
  });

  it('productive tiles (ocean, island, floating-city) have at least one yield entry', () => {
    for (const id of ['ocean', 'island', 'floating-city'] as const) {
      expect(Object.keys(getTileYieldEntry(id).yields).length).toBeGreaterThan(0);
    }
  });

  it('sterile / hazard tiles (rayon-passage, red-tide, fata-morgana) have empty yields', () => {
    for (const id of ['rayon-passage', 'red-tide', 'fata-morgana'] as const) {
      expect(getTileYieldEntry(id).yields).toEqual({});
    }
  });

  it('ocean yields provisions (mirrors core getTileYield(Ocean))', () => {
    expect(getTileYieldEntry('ocean').yields.provisions).toBe(1);
  });

  it('island yields both timber and fibre (mirrors core getTileYield(Island))', () => {
    const y = getTileYieldEntry('island').yields;
    expect(y.timber).toBe(1);
    expect(y.fibre).toBe(1);
  });

  it('floating-city yields salvage + provisions (mirrors core getTileYield(FloatingCity))', () => {
    const y = getTileYieldEntry('floating-city').yields;
    expect(y.salvage).toBe(1);
    expect(y.provisions).toBe(1);
  });
});

describe('isTileYieldEntryId / getTileYieldEntry', () => {
  it('isTileYieldEntryId narrows known ids', () => {
    expect(isTileYieldEntryId('ocean')).toBe(true);
    expect(isTileYieldEntryId('floating-city')).toBe(true);
  });

  it('isTileYieldEntryId rejects unknown values', () => {
    expect(isTileYieldEntryId('mystery-tile')).toBe(false);
    expect(isTileYieldEntryId('')).toBe(false);
    expect(isTileYieldEntryId(0)).toBe(false);
    expect(isTileYieldEntryId(undefined)).toBe(false);
    expect(isTileYieldEntryId(null)).toBe(false);
  });

  it('getTileYieldEntry returns the matching entry', () => {
    const island = getTileYieldEntry('island');
    expect(island.id).toBe('island');
    expect(island.name).toBe('Island Shore');
  });

  it('getTileYieldEntry throws TypeError on unknown id', () => {
    expect(() => getTileYieldEntry('mystery-tile' as TileYieldEntryId)).toThrow(TypeError);
  });
});
