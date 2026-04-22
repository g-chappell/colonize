import { describe, it, expect } from 'vitest';
import { RESOURCES, getResource, isResourceEntryId } from './resources.js';

describe('RESOURCES registry', () => {
  it('has unique kebab-case ids', () => {
    const ids = RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('every entry has non-empty name / summary / description', () => {
    for (const entry of RESOURCES) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(entry.summary.length);
    }
  });

  it('mirrors the core ResourceType id set', () => {
    // Hard-coded mirror — content cannot import @colonize/core. If core's
    // ResourceType changes, this list updates in lock-step (same PR) per
    // the BUILDINGS / TILE_YIELDS precedent.
    const expected = new Set(['timber', 'fibre', 'provisions', 'salvage', 'planks', 'forgework']);
    const actual = new Set(RESOURCES.map((r) => r.id));
    expect(actual).toEqual(expected);
  });
});

describe('isResourceEntryId', () => {
  it('accepts every registered id', () => {
    for (const r of RESOURCES) expect(isResourceEntryId(r.id)).toBe(true);
  });

  it('rejects non-registered and non-string values', () => {
    expect(isResourceEntryId('')).toBe(false);
    expect(isResourceEntryId('unknown')).toBe(false);
    expect(isResourceEntryId(null)).toBe(false);
    expect(isResourceEntryId(42)).toBe(false);
  });
});

describe('getResource', () => {
  it('returns the matching entry for a known id', () => {
    const entry = getResource('timber');
    expect(entry.name).toBe('Timber');
  });

  it('throws a TypeError for an unknown id', () => {
    expect(() => getResource('unknown' as 'timber')).toThrow(TypeError);
  });
});
