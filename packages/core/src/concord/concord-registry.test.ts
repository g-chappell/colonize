import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TITHE_RATES,
  CONCORD_TENSION_THRESHOLDS,
  isConcordTensionThreshold,
} from './concord-registry.js';

describe('DEFAULT_TITHE_RATES', () => {
  it('keeps every scalar at a non-negative finite value', () => {
    expect(DEFAULT_TITHE_RATES.perCapita).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_TITHE_RATES.revenueFraction).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_TITHE_RATES.yearScale).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(DEFAULT_TITHE_RATES.yearAnchor)).toBe(true);
    expect(Number.isFinite(DEFAULT_TITHE_RATES.perCapita)).toBe(true);
    expect(Number.isFinite(DEFAULT_TITHE_RATES.revenueFraction)).toBe(true);
    expect(Number.isFinite(DEFAULT_TITHE_RATES.yearScale)).toBe(true);
  });
});

describe('CONCORD_TENSION_THRESHOLDS', () => {
  it('is non-empty and strictly ascending', () => {
    expect(CONCORD_TENSION_THRESHOLDS.length).toBeGreaterThan(0);
    for (let i = 1; i < CONCORD_TENSION_THRESHOLDS.length; i += 1) {
      expect(CONCORD_TENSION_THRESHOLDS[i]!).toBeGreaterThan(CONCORD_TENSION_THRESHOLDS[i - 1]!);
    }
  });

  it('contains only positive integers', () => {
    for (const t of CONCORD_TENSION_THRESHOLDS) {
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThan(0);
    }
  });

  it('includes the ultimatum tier that TASK-070 consumes', () => {
    // The final (largest) threshold is the ultimatum tier that trips a
    // Sovereignty cascade. The concrete value is tuned in TASK-073; the
    // ladder shape (final threshold = last entry) is the contract.
    const ultimatum = CONCORD_TENSION_THRESHOLDS[CONCORD_TENSION_THRESHOLDS.length - 1]!;
    expect(ultimatum).toBeGreaterThan(CONCORD_TENSION_THRESHOLDS[0]!);
  });
});

describe('isConcordTensionThreshold', () => {
  it('is true for values in the ladder', () => {
    for (const t of CONCORD_TENSION_THRESHOLDS) {
      expect(isConcordTensionThreshold(t)).toBe(true);
    }
  });

  it('is false for values outside the ladder', () => {
    expect(isConcordTensionThreshold(0)).toBe(false);
    expect(isConcordTensionThreshold(-1)).toBe(false);
    expect(isConcordTensionThreshold(12345)).toBe(false);
  });
});
