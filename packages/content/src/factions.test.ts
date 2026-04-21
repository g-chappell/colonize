import { describe, it, expect } from 'vitest';
import { FACTIONS, getFaction, type PlayableFactionId } from './factions.js';

describe('FACTIONS', () => {
  it('includes all four MVP playable factions', () => {
    const ids = FACTIONS.map((f) => f.id).sort();
    expect(ids).toEqual(['bloodborne', 'ironclad', 'otk', 'phantom']);
  });

  it('has unique ids and names', () => {
    expect(new Set(FACTIONS.map((f) => f.id)).size).toBe(FACTIONS.length);
    expect(new Set(FACTIONS.map((f) => f.name)).size).toBe(FACTIONS.length);
  });

  it('every faction has a non-empty lore blurb and bonus line', () => {
    for (const f of FACTIONS) {
      expect(f.lore.length).toBeGreaterThan(20);
      expect(f.bonus.length).toBeGreaterThan(10);
    }
  });

  it('every faction is tagged with a tonal register', () => {
    for (const f of FACTIONS) {
      expect(['salt-and-rum', 'eldritch', 'salvaged-futurism']).toContain(f.register);
    }
  });
});

describe('getFaction', () => {
  it('returns the entry for a known id', () => {
    expect(getFaction('otk').name).toBe('Order of the Kraken');
  });

  it('throws on an unknown id', () => {
    expect(() => getFaction('dominion' as PlayableFactionId)).toThrow(/Unknown faction/);
  });
});
