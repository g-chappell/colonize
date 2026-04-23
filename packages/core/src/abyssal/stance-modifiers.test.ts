import { describe, it, expect } from 'vitest';
import {
  KRAKEN_STIR_STANCE_MULTIPLIER,
  PALE_WATCH_AGGRESSION_STANCE_MULTIPLIER,
  krakenStirMultiplier,
  paleWatchAggressionMultiplier,
} from './stance-modifiers.js';
import { ALL_ABYSSAL_STANCES, AbyssalStance } from './stance.js';

describe('KRAKEN_STIR_STANCE_MULTIPLIER', () => {
  it('covers every stance with a positive finite multiplier', () => {
    for (const stance of ALL_ABYSSAL_STANCES) {
      const m = KRAKEN_STIR_STANCE_MULTIPLIER[stance];
      expect(Number.isFinite(m)).toBe(true);
      expect(m).toBeGreaterThan(0);
    }
  });

  it('Tolerate is the baseline (1.0)', () => {
    expect(KRAKEN_STIR_STANCE_MULTIPLIER[AbyssalStance.Tolerate]).toBe(1.0);
  });

  it('orders Venerate < Tolerate < Guard < Plunder (Plunder maximally provokes)', () => {
    const m = KRAKEN_STIR_STANCE_MULTIPLIER;
    expect(m[AbyssalStance.Venerate]).toBeLessThan(m[AbyssalStance.Tolerate]);
    expect(m[AbyssalStance.Tolerate]).toBeLessThan(m[AbyssalStance.Guard]);
    expect(m[AbyssalStance.Guard]).toBeLessThan(m[AbyssalStance.Plunder]);
  });
});

describe('PALE_WATCH_AGGRESSION_STANCE_MULTIPLIER', () => {
  it('covers every stance with a positive finite multiplier', () => {
    for (const stance of ALL_ABYSSAL_STANCES) {
      const m = PALE_WATCH_AGGRESSION_STANCE_MULTIPLIER[stance];
      expect(Number.isFinite(m)).toBe(true);
      expect(m).toBeGreaterThan(0);
    }
  });

  it('Tolerate is the baseline (1.0)', () => {
    expect(PALE_WATCH_AGGRESSION_STANCE_MULTIPLIER[AbyssalStance.Tolerate]).toBe(1.0);
  });

  it('orders Venerate < Guard < Tolerate < Plunder (Pale Watch reads Guard as ally)', () => {
    const m = PALE_WATCH_AGGRESSION_STANCE_MULTIPLIER;
    expect(m[AbyssalStance.Venerate]).toBeLessThan(m[AbyssalStance.Guard]);
    expect(m[AbyssalStance.Guard]).toBeLessThan(m[AbyssalStance.Tolerate]);
    expect(m[AbyssalStance.Tolerate]).toBeLessThan(m[AbyssalStance.Plunder]);
  });
});

describe('multiplier helpers', () => {
  it('krakenStirMultiplier mirrors the table', () => {
    for (const stance of ALL_ABYSSAL_STANCES) {
      expect(krakenStirMultiplier(stance)).toBe(KRAKEN_STIR_STANCE_MULTIPLIER[stance]);
    }
  });

  it('paleWatchAggressionMultiplier mirrors the table', () => {
    for (const stance of ALL_ABYSSAL_STANCES) {
      expect(paleWatchAggressionMultiplier(stance)).toBe(
        PALE_WATCH_AGGRESSION_STANCE_MULTIPLIER[stance],
      );
    }
  });

  it('multiplied scalars round-trip cleanly through a base rate (consumer pattern)', () => {
    const baseStir = 0.1;
    expect(baseStir * krakenStirMultiplier(AbyssalStance.Plunder)).toBeCloseTo(0.2, 10);
    expect(baseStir * krakenStirMultiplier(AbyssalStance.Venerate)).toBeCloseTo(0.05, 10);
  });
});
