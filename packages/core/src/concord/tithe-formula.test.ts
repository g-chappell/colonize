import { describe, it, expect } from 'vitest';
import { calculateTithe, yearMultiplier } from './tithe-formula.js';
import { DEFAULT_TITHE_RATES } from './concord-registry.js';

describe('yearMultiplier', () => {
  it('returns 1 when gameYear equals the anchor', () => {
    expect(yearMultiplier(0, 0, 0.05)).toBe(1);
    expect(yearMultiplier(10, 10, 0.5)).toBe(1);
  });

  it('grows linearly past the anchor', () => {
    expect(yearMultiplier(1, 0, 0.05)).toBeCloseTo(1.05);
    expect(yearMultiplier(10, 0, 0.05)).toBeCloseTo(1.5);
    expect(yearMultiplier(20, 0, 0.05)).toBeCloseTo(2);
  });

  it('clamps to 1 for pre-anchor years — tithes never shrink below base', () => {
    expect(yearMultiplier(-5, 0, 0.05)).toBe(1);
    expect(yearMultiplier(3, 10, 0.1)).toBe(1);
  });

  it('returns 1 when yearScale is 0 regardless of year distance', () => {
    expect(yearMultiplier(100, 0, 0)).toBe(1);
  });
});

describe('calculateTithe', () => {
  it('returns 0 when population and revenue are both 0', () => {
    expect(calculateTithe({ population: 0, revenue: 0, gameYear: 0 })).toBe(0);
  });

  it('applies the default per-capita rate at the anchor year', () => {
    // default perCapita: 1, revenueFraction: 0.1, yearScale: 0.05, yearAnchor: 0
    // year 0 -> multiplier 1
    expect(calculateTithe({ population: 10, revenue: 0, gameYear: 0 })).toBe(10);
  });

  it('applies the default revenue fraction at the anchor year', () => {
    expect(calculateTithe({ population: 0, revenue: 100, gameYear: 0 })).toBe(10);
  });

  it('sums population and revenue contributions before year scaling', () => {
    // year 0: (1*10) + (0.1*100) = 20
    expect(calculateTithe({ population: 10, revenue: 100, gameYear: 0 })).toBe(20);
  });

  it('scales up over game years', () => {
    // year 10: (1*10 + 0.1*100) * (1 + 10*0.05) = 20 * 1.5 = 30
    expect(calculateTithe({ population: 10, revenue: 100, gameYear: 10 })).toBe(30);
    // year 20: 20 * 2 = 40
    expect(calculateTithe({ population: 10, revenue: 100, gameYear: 20 })).toBe(40);
  });

  it('floors non-integer intermediate totals', () => {
    // (0.1 * 15) * 1 = 1.5 -> floor to 1
    expect(calculateTithe({ population: 0, revenue: 15, gameYear: 0 })).toBe(1);
  });

  it('respects partial rate overrides', () => {
    // revenueFraction 0 isolates population contribution
    expect(
      calculateTithe({
        population: 50,
        revenue: 9999,
        gameYear: 0,
        rates: { revenueFraction: 0 },
      }),
    ).toBe(50);
    // perCapita 0 isolates revenue contribution (default revenueFraction 0.1)
    expect(
      calculateTithe({
        population: 9999,
        revenue: 100,
        gameYear: 0,
        rates: { perCapita: 0 },
      }),
    ).toBe(10);
  });

  it('respects a custom yearAnchor', () => {
    // anchor 5, year 5 -> multiplier 1 (no scaling yet)
    expect(
      calculateTithe({
        population: 10,
        revenue: 0,
        gameYear: 5,
        rates: { yearAnchor: 5 },
      }),
    ).toBe(10);
    // anchor 5, year 15 -> multiplier 1.5
    expect(
      calculateTithe({
        population: 10,
        revenue: 0,
        gameYear: 15,
        rates: { yearAnchor: 5 },
      }),
    ).toBe(15);
  });

  it('is monotonically non-decreasing as population or revenue grows (at fixed year)', () => {
    const year = 5;
    let prev = -1;
    for (const pop of [0, 1, 5, 25, 100]) {
      const t = calculateTithe({ population: pop, revenue: 0, gameYear: year });
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it('is monotonically non-decreasing as the game year grows (at fixed pop/revenue)', () => {
    let prev = -1;
    for (const year of [0, 5, 10, 25, 50]) {
      const t = calculateTithe({ population: 10, revenue: 100, gameYear: year });
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it('rejects negative, non-finite, or non-integer population', () => {
    expect(() =>
      calculateTithe({ population: -1, revenue: 0, gameYear: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateTithe({ population: Number.NaN, revenue: 0, gameYear: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateTithe({ population: 1.5, revenue: 0, gameYear: 0 }),
    ).toThrow(RangeError);
  });

  it('rejects negative or non-finite revenue', () => {
    expect(() =>
      calculateTithe({ population: 0, revenue: -1, gameYear: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateTithe({ population: 0, revenue: Number.POSITIVE_INFINITY, gameYear: 0 }),
    ).toThrow(RangeError);
  });

  it('rejects non-integer or non-finite gameYear', () => {
    expect(() =>
      calculateTithe({ population: 0, revenue: 0, gameYear: 1.5 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateTithe({ population: 0, revenue: 0, gameYear: Number.NaN }),
    ).toThrow(RangeError);
  });

  it('rejects a rate override that is negative or non-finite', () => {
    expect(() =>
      calculateTithe({
        population: 0,
        revenue: 0,
        gameYear: 0,
        rates: { perCapita: -1 },
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateTithe({
        population: 0,
        revenue: 0,
        gameYear: 0,
        rates: { revenueFraction: Number.NaN },
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateTithe({
        population: 0,
        revenue: 0,
        gameYear: 0,
        rates: { yearScale: Number.POSITIVE_INFINITY },
      }),
    ).toThrow(RangeError);
  });

  it('rejects a non-integer yearAnchor override', () => {
    expect(() =>
      calculateTithe({
        population: 0,
        revenue: 0,
        gameYear: 0,
        rates: { yearAnchor: 1.5 },
      }),
    ).toThrow(RangeError);
  });
});

describe('DEFAULT_TITHE_RATES', () => {
  it('uses non-negative finite values across every axis', () => {
    expect(DEFAULT_TITHE_RATES.perCapita).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_TITHE_RATES.revenueFraction).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_TITHE_RATES.yearScale).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(DEFAULT_TITHE_RATES.yearAnchor)).toBe(true);
  });
});
