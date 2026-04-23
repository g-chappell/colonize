import { describe, it, expect } from 'vitest';
import {
  CONCORD_TENSION_TIER_VALUES,
  TITHE_FLAVOURS,
  getTitheFlavour,
  isConcordTensionTier,
} from './concord-tithe-flavour.js';

// Mirror of `CONCORD_TENSION_THRESHOLDS` length in @colonize/core. Tier
// 0 is "no thresholds crossed yet"; tiers 1..4 map 1:1 with the four
// ladder values 25/50/75/100. Content cannot import core (dependency-
// direction rule), so the tier count is pinned here against the core
// ladder length expected by EPIC-10.
const CANONICAL_TIER_COUNT = 5; // tiers 0..4 inclusive

describe('TITHE_FLAVOURS', () => {
  it('covers tiers 0..4 exactly once', () => {
    expect(TITHE_FLAVOURS).toHaveLength(CANONICAL_TIER_COUNT);
    const tiers = TITHE_FLAVOURS.map((f) => f.tier);
    expect(tiers).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(tiers).size).toBe(tiers.length);
  });

  it('every entry has non-empty heading, summary, boycottFlavour, tierLabel, and a valid register', () => {
    for (const entry of TITHE_FLAVOURS) {
      expect(entry.heading.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(20);
      expect(entry.boycottFlavour.length).toBeGreaterThan(40);
      expect(entry.tierLabel.length).toBeGreaterThan(0);
      expect(['salt-and-rum', 'eldritch', 'salvaged-futurism']).toContain(entry.register);
    }
  });

  it('the ultimatum tier (4) opens on an eldritch register', () => {
    const ultimatum = TITHE_FLAVOURS[4]!;
    expect(ultimatum.register).toBe('eldritch');
  });

  it('tier 0 carries the baseline (quiet) tier label', () => {
    const baseline = TITHE_FLAVOURS[0]!;
    expect(baseline.tierLabel.toLowerCase()).not.toContain('ultimatum');
  });
});

describe('getTitheFlavour', () => {
  it('returns the entry for every known tier', () => {
    for (const tier of CONCORD_TENSION_TIER_VALUES) {
      expect(getTitheFlavour(tier).tier).toBe(tier);
    }
  });

  it('returns ultimatum copy at tier 4', () => {
    expect(getTitheFlavour(4).heading.toLowerCase()).toContain('ultimatum');
  });
});

describe('isConcordTensionTier', () => {
  it('returns true for every canonical tier', () => {
    for (const tier of CONCORD_TENSION_TIER_VALUES) {
      expect(isConcordTensionTier(tier)).toBe(true);
    }
  });

  it('returns false for out-of-range integers, non-integers, and non-numbers', () => {
    expect(isConcordTensionTier(-1)).toBe(false);
    expect(isConcordTensionTier(5)).toBe(false);
    expect(isConcordTensionTier(2.5)).toBe(false);
    expect(isConcordTensionTier('1')).toBe(false);
    expect(isConcordTensionTier(null)).toBe(false);
    expect(isConcordTensionTier(undefined)).toBe(false);
  });
});

describe('Concord tension-tier drift guard (content side)', () => {
  // Mirror of CONCORD_TENSION_THRESHOLDS in
  // packages/core/src/concord/concord-registry.ts. Content cannot import
  // core, so the canonical tier count is pinned here. If TASK-070 (or any
  // future Concord-difficulty work) extends the ladder, this test fails
  // until both copies update.
  it('exposes the canonical tier count (one entry per ladder rung + baseline)', () => {
    expect(TITHE_FLAVOURS).toHaveLength(CANONICAL_TIER_COUNT);
  });
});
