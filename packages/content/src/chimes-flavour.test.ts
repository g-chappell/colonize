import { describe, it, expect } from 'vitest';
import {
  COUNCIL_THRESHOLD_FLAVOURS,
  LIBERTY_CHIMES_SUMMARY,
  getCouncilThresholdFlavour,
  isCouncilThresholdValue,
} from './chimes-flavour.js';

// Canonical MVP threshold ladder — mirrored from @colonize/core's
// LIBERTY_CHIMES_THRESHOLDS. Content cannot import core (dependency-
// direction rule), so the two copies are pinned by this test + its
// sibling in packages/core/src/chimes/chimes-registry.test.ts.
const CANONICAL_COUNCIL_THRESHOLDS: readonly number[] = [50, 150, 300, 500];

describe('COUNCIL_THRESHOLD_FLAVOURS', () => {
  it('covers the canonical threshold ladder exactly once per threshold', () => {
    const thresholds = COUNCIL_THRESHOLD_FLAVOURS.map((f) => f.threshold);
    expect(thresholds).toEqual([...CANONICAL_COUNCIL_THRESHOLDS]);
    expect(new Set(thresholds).size).toBe(thresholds.length);
  });

  it('is ascending by threshold', () => {
    for (let i = 1; i < COUNCIL_THRESHOLD_FLAVOURS.length; i++) {
      expect(COUNCIL_THRESHOLD_FLAVOURS[i]!.threshold).toBeGreaterThan(
        COUNCIL_THRESHOLD_FLAVOURS[i - 1]!.threshold,
      );
    }
  });

  it('every entry has non-empty heading, summary, preamble, and a valid register', () => {
    for (const entry of COUNCIL_THRESHOLD_FLAVOURS) {
      expect(entry.heading.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(20);
      expect(entry.preamble.length).toBeGreaterThan(40);
      expect(['salt-and-rum', 'eldritch', 'salvaged-futurism']).toContain(entry.register);
    }
  });

  it('the third threshold opens on an eldritch preamble (Kraken witnesses)', () => {
    const third = COUNCIL_THRESHOLD_FLAVOURS[2]!;
    expect(third.register).toBe('eldritch');
  });
});

describe('LIBERTY_CHIMES_SUMMARY', () => {
  it('names the Chapel-of-the-Kraken building and Archive & Study Hall as chime sources', () => {
    expect(LIBERTY_CHIMES_SUMMARY).toContain('Chapel of the Kraken');
    expect(LIBERTY_CHIMES_SUMMARY).toContain('Archive & Study Hall');
  });

  it('mentions Archive Charters (the terminal reward the chimes summon)', () => {
    expect(LIBERTY_CHIMES_SUMMARY).toContain('Archive Charter');
  });
});

describe('getCouncilThresholdFlavour', () => {
  it('returns the flavour for a known threshold', () => {
    expect(getCouncilThresholdFlavour(50).threshold).toBe(50);
    expect(getCouncilThresholdFlavour(500).register).toBe('salt-and-rum');
  });

  it('throws on an unknown threshold', () => {
    expect(() => getCouncilThresholdFlavour(99999)).toThrow(/Unknown Council threshold/);
  });
});

describe('isCouncilThresholdValue', () => {
  it('returns true for every known threshold', () => {
    for (const t of CANONICAL_COUNCIL_THRESHOLDS) {
      expect(isCouncilThresholdValue(t)).toBe(true);
    }
  });

  it('returns false for unknown numbers and non-number inputs', () => {
    expect(isCouncilThresholdValue(0)).toBe(false);
    expect(isCouncilThresholdValue(49)).toBe(false);
    expect(isCouncilThresholdValue(501)).toBe(false);
    expect(isCouncilThresholdValue('50')).toBe(false);
    expect(isCouncilThresholdValue(null)).toBe(false);
    expect(isCouncilThresholdValue(undefined)).toBe(false);
  });
});

describe('Council threshold drift guard (content side)', () => {
  // Mirror of packages/core/src/chimes/chimes-registry.test.ts. The two
  // ladders are declared separately because content ↔ core cannot
  // import each other; this test + its core-side sibling jointly pin
  // the canonical ladder.
  it('matches the canonical MVP ladder (50, 150, 300, 500)', () => {
    expect(COUNCIL_THRESHOLD_FLAVOURS.map((f) => f.threshold)).toEqual([
      ...CANONICAL_COUNCIL_THRESHOLDS,
    ]);
  });
});
