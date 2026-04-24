import { describe, it, expect } from 'vitest';
import { REGISTERS, isToneRegister } from './register.js';

describe('REGISTERS', () => {
  it('lists the three canonical OTK tone registers', () => {
    expect(REGISTERS).toEqual(['salt-and-rum', 'eldritch', 'salvaged-futurism']);
  });

  it('has unique entries', () => {
    expect(new Set(REGISTERS).size).toBe(REGISTERS.length);
  });
});

describe('isToneRegister', () => {
  it('returns true for every canonical register', () => {
    for (const r of REGISTERS) {
      expect(isToneRegister(r)).toBe(true);
    }
  });

  it('returns false for unknown strings, numbers, null, undefined', () => {
    expect(isToneRegister('cyberpunk')).toBe(false);
    expect(isToneRegister('')).toBe(false);
    expect(isToneRegister('Salt-And-Rum')).toBe(false);
    expect(isToneRegister(0)).toBe(false);
    expect(isToneRegister(null)).toBe(false);
    expect(isToneRegister(undefined)).toBe(false);
  });
});
