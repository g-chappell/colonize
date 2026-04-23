import { describe, it, expect } from 'vitest';
import {
  AbyssalStance,
  ALL_ABYSSAL_STANCES,
  DEFAULT_ABYSSAL_STANCE,
  isAbyssalStance,
} from './stance.js';

describe('AbyssalStance', () => {
  it('exposes the four canonical stances', () => {
    expect(AbyssalStance.Venerate).toBe('venerate');
    expect(AbyssalStance.Tolerate).toBe('tolerate');
    expect(AbyssalStance.Plunder).toBe('plunder');
    expect(AbyssalStance.Guard).toBe('guard');
  });

  it('ALL_ABYSSAL_STANCES contains every stance with no duplicates', () => {
    expect(ALL_ABYSSAL_STANCES).toHaveLength(4);
    expect(new Set(ALL_ABYSSAL_STANCES).size).toBe(4);
    for (const id of Object.values(AbyssalStance)) {
      expect(ALL_ABYSSAL_STANCES.includes(id)).toBe(true);
    }
  });

  it('DEFAULT_ABYSSAL_STANCE is Tolerate (neutral starting posture)', () => {
    expect(DEFAULT_ABYSSAL_STANCE).toBe(AbyssalStance.Tolerate);
  });
});

describe('isAbyssalStance', () => {
  it('returns true for every canonical stance', () => {
    for (const id of ALL_ABYSSAL_STANCES) {
      expect(isAbyssalStance(id)).toBe(true);
    }
  });

  it('returns false for non-stance strings and non-strings', () => {
    expect(isAbyssalStance('worship')).toBe(false);
    expect(isAbyssalStance('VENERATE')).toBe(false);
    expect(isAbyssalStance('')).toBe(false);
    expect(isAbyssalStance(null)).toBe(false);
    expect(isAbyssalStance(undefined)).toBe(false);
    expect(isAbyssalStance(0)).toBe(false);
    expect(isAbyssalStance({})).toBe(false);
  });
});
