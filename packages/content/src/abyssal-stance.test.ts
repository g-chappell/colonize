import { describe, it, expect } from 'vitest';
import { PALETTE_BY_REGISTER } from './palette.js';
import {
  ABYSSAL_STANCE_FLAVOURS,
  getAbyssalStanceFlavour,
  isAbyssalStanceId,
  type AbyssalStanceId,
} from './abyssal-stance.js';

const CANONICAL_IDS: readonly AbyssalStanceId[] = ['venerate', 'tolerate', 'plunder', 'guard'];

describe('ABYSSAL_STANCE_FLAVOURS', () => {
  it('has one entry per canonical stance id', () => {
    expect(ABYSSAL_STANCE_FLAVOURS).toHaveLength(CANONICAL_IDS.length);
    const ids = ABYSSAL_STANCE_FLAVOURS.map((e) => e.id);
    expect(new Set(ids).size).toBe(CANONICAL_IDS.length);
    for (const id of CANONICAL_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('every entry has non-empty copy fields', () => {
    for (const entry of ABYSSAL_STANCE_FLAVOURS) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.flavour.length).toBeGreaterThan(0);
    }
  });

  it('every entry uses a known tone register', () => {
    const knownRegisters = Object.keys(PALETTE_BY_REGISTER);
    for (const entry of ABYSSAL_STANCE_FLAVOURS) {
      expect(knownRegisters).toContain(entry.register);
    }
  });

  it('Venerate is tagged eldritch (Kraken-aligned)', () => {
    const entry = ABYSSAL_STANCE_FLAVOURS.find((e) => e.id === 'venerate');
    expect(entry?.register).toBe('eldritch');
  });
});

describe('getAbyssalStanceFlavour', () => {
  it('returns the matching entry for every canonical id', () => {
    for (const id of CANONICAL_IDS) {
      expect(getAbyssalStanceFlavour(id).id).toBe(id);
    }
  });

  it('throws for an unknown id', () => {
    expect(() => getAbyssalStanceFlavour('worship' as AbyssalStanceId)).toThrow();
  });
});

describe('isAbyssalStanceId', () => {
  it('returns true for canonical ids', () => {
    for (const id of CANONICAL_IDS) {
      expect(isAbyssalStanceId(id)).toBe(true);
    }
  });

  it('returns false for unknowns and non-strings', () => {
    expect(isAbyssalStanceId('worship')).toBe(false);
    expect(isAbyssalStanceId('VENERATE')).toBe(false);
    expect(isAbyssalStanceId(null)).toBe(false);
    expect(isAbyssalStanceId(undefined)).toBe(false);
    expect(isAbyssalStanceId(0)).toBe(false);
  });
});
