import { describe, it, expect } from 'vitest';
import {
  PROFESSIONS,
  getProfession,
  isProfessionEntryId,
  type ProfessionEntryId,
} from './professions.js';

describe('PROFESSIONS registry', () => {
  it('exposes the seven STORY-25 professions', () => {
    expect(PROFESSIONS.length).toBe(7);
  });

  it('has unique kebab-case ids', () => {
    const ids = PROFESSIONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('every entry has non-empty name / summary / description', () => {
    for (const entry of PROFESSIONS) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(entry.summary.length);
    }
  });

  it('mirrors the core ProfessionType id set', () => {
    // Hard-coded mirror — content cannot import @colonize/core. If core's
    // ProfessionType changes, this list updates in lock-step (same PR) per
    // the BUILDINGS / TILE_YIELDS / RESOURCES precedent.
    const expected = new Set([
      'deckhand',
      'shipwright',
      'gunner',
      'cartographer',
      'scholar',
      'quartermaster',
      'loremaster',
    ]);
    const actual = new Set(PROFESSIONS.map((p) => p.id));
    expect(actual).toEqual(expected);
  });
});

describe('isProfessionEntryId', () => {
  it('accepts every registered id', () => {
    for (const p of PROFESSIONS) expect(isProfessionEntryId(p.id)).toBe(true);
  });

  it('rejects non-registered and non-string values', () => {
    expect(isProfessionEntryId('')).toBe(false);
    expect(isProfessionEntryId('captain')).toBe(false);
    expect(isProfessionEntryId(null)).toBe(false);
    expect(isProfessionEntryId(42)).toBe(false);
  });
});

describe('getProfession', () => {
  it('returns the matching entry for a known id', () => {
    expect(getProfession('quartermaster').name).toBe('Quartermaster');
  });

  it('throws a TypeError for an unknown id', () => {
    expect(() => getProfession('captain' as ProfessionEntryId)).toThrow(TypeError);
  });
});
