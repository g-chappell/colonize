import { describe, it, expect } from 'vitest';
import {
  ALL_UNIT_TYPES,
  SHIP_UNIT_TYPES,
  UnitType,
  isShipUnitType,
  isUnitType,
  getUnitTypeDefinition,
} from './unit-type.js';

describe('UnitType registry', () => {
  it('exposes each canonical unit kind', () => {
    expect(new Set(ALL_UNIT_TYPES)).toEqual(
      new Set([
        UnitType.Scout,
        UnitType.Settler,
        UnitType.FoundingShip,
        UnitType.Sloop,
        UnitType.Brig,
        UnitType.Frigate,
        UnitType.ShipOfTheLine,
        UnitType.Privateer,
      ]),
    );
  });

  it('has unique string values', () => {
    expect(new Set(ALL_UNIT_TYPES).size).toBe(ALL_UNIT_TYPES.length);
  });

  it('isUnitType narrows valid strings', () => {
    expect(isUnitType('scout')).toBe(true);
    expect(isUnitType('settler')).toBe(true);
    expect(isUnitType('founding-ship')).toBe(true);
    expect(isUnitType('sloop')).toBe(true);
    expect(isUnitType('ship-of-the-line')).toBe(true);
  });

  it('isUnitType rejects unknown values', () => {
    expect(isUnitType('dragoon')).toBe(false);
    expect(isUnitType(0)).toBe(false);
    expect(isUnitType(undefined)).toBe(false);
    expect(isUnitType(null)).toBe(false);
  });
});

describe('SHIP_UNIT_TYPES', () => {
  it('lists exactly the five base ship classes', () => {
    expect(new Set(SHIP_UNIT_TYPES)).toEqual(
      new Set([
        UnitType.Sloop,
        UnitType.Brig,
        UnitType.Frigate,
        UnitType.ShipOfTheLine,
        UnitType.Privateer,
      ]),
    );
  });

  it('isShipUnitType is true for ships and false for land units', () => {
    expect(isShipUnitType(UnitType.Sloop)).toBe(true);
    expect(isShipUnitType(UnitType.Frigate)).toBe(true);
    expect(isShipUnitType(UnitType.Scout)).toBe(false);
    expect(isShipUnitType(UnitType.Settler)).toBe(false);
    expect(isShipUnitType(UnitType.FoundingShip)).toBe(false);
    expect(isShipUnitType('dragoon')).toBe(false);
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

  it('sloop and privateer outrun the ship-of-the-line', () => {
    const sloop = getUnitTypeDefinition(UnitType.Sloop);
    const priv = getUnitTypeDefinition(UnitType.Privateer);
    const sotl = getUnitTypeDefinition(UnitType.ShipOfTheLine);
    expect(sloop.baseMovement).toBeGreaterThan(sotl.baseMovement);
    expect(priv.baseMovement).toBeGreaterThan(sotl.baseMovement);
  });

  it('throws TypeError on unknown string', () => {
    expect(() => getUnitTypeDefinition('dragoon' as UnitType)).toThrow(TypeError);
  });
});
