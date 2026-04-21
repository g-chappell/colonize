import { describe, it, expect } from 'vitest';
import {
  getRumourOutcomeFlavour,
  RUMOUR_OUTCOME_FLAVOURS,
  type RumourOutcomeCategoryId,
} from './rumour-outcomes.js';

describe('RUMOUR_OUTCOME_FLAVOURS', () => {
  it('covers all four outcome categories exactly once', () => {
    const ids = RUMOUR_OUTCOME_FLAVOURS.map((f) => f.category).sort();
    expect(ids).toEqual(['ArchiveCache', 'FataMorganaMirage', 'KrakenShrine', 'LegendaryWreck']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has non-empty title, flavour, reward label, and a valid tone register', () => {
    for (const entry of RUMOUR_OUTCOME_FLAVOURS) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.flavour.length).toBeGreaterThan(20);
      expect(entry.rewardLabel.length).toBeGreaterThan(0);
      expect(['salt-and-rum', 'eldritch', 'salvaged-futurism']).toContain(entry.register);
    }
  });

  it('only LegendaryWreck carries an OTK-specific flavour variant', () => {
    for (const entry of RUMOUR_OUTCOME_FLAVOURS) {
      if (entry.category === 'LegendaryWreck') {
        expect(entry.otkFlavour).toBeDefined();
        expect(entry.otkFlavour!.length).toBeGreaterThan(20);
      } else {
        expect(entry.otkFlavour).toBeUndefined();
      }
    }
  });
});

describe('getRumourOutcomeFlavour', () => {
  it('returns the entry for a known category', () => {
    expect(getRumourOutcomeFlavour('ArchiveCache').title).toBe('Archive Cache');
    expect(getRumourOutcomeFlavour('KrakenShrine').category).toBe('KrakenShrine');
  });

  it('throws on an unknown category', () => {
    expect(() => getRumourOutcomeFlavour('Nebula' as RumourOutcomeCategoryId)).toThrow(
      /Unknown rumour outcome category/,
    );
  });
});
