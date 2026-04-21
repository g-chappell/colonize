import { describe, it, expect } from 'vitest';
import { ALL_UNIT_TYPES, UnitType, isUnitType, getUnitTypeDefinition } from './unit-type.js';

describe('UnitType registry', () => {
  it('exposes each canonical unit kind', () => {
    expect(new Set(ALL_UNIT_TYPES)).toEqual(new Set([UnitType.Scout, UnitType.Settler]));
  });

  it('has unique string values', () => {
    expect(new Set(ALL_UNIT_TYPES).size).toBe(ALL_UNIT_TYPES.length);
  });

  it('isUnitType narrows valid strings', () => {
    expect(isUnitType('scout')).toBe(true);
    expect(isUnitType('settler')).toBe(true);
  });

  it('isUnitType rejects unknown values', () => {
    expect(isUnitType('dragoon')).toBe(false);
    expect(isUnitType(0)).toBe(false);
    expect(isUnitType(undefined)).toBe(false);
    expect(isUnitType(null)).toBe(false);
  });
});

describe('getUnitTypeDefinition', () => {
  it('returns a definition for every listed UnitType', () => {
    for (const type of ALL_UNIT_TYPES) {
      const def = getUnitTypeDefinition(type);
      expect(def.id).toBe(type);
      expect(Number.isInteger(def.baseMovement)).toBe(true);
      expect(def.baseMovement).toBeGreaterThan(0);
    }
  });

  it('scout has a higher baseMovement than settler', () => {
    const scout = getUnitTypeDefinition(UnitType.Scout);
    const settler = getUnitTypeDefinition(UnitType.Settler);
    expect(scout.baseMovement).toBeGreaterThan(settler.baseMovement);
  });

  it('throws TypeError on unknown string', () => {
    expect(() => getUnitTypeDefinition('dragoon' as UnitType)).toThrow(TypeError);
  });
});
