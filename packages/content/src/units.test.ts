import { describe, it, expect } from 'vitest';
import {
  ALL_LEGENDARY_SHIP_IDS,
  OTK_LEGENDARY_SHIP_SLOTS,
  SHIP_CLASSES,
  getLegendaryShip,
  getShipClass,
  isLegendaryShipId,
  isShipClassId,
  type LegendaryShipId,
  type ShipClassId,
} from './units.js';

describe('SHIP_CLASSES', () => {
  it('exposes the five base ship classes', () => {
    expect(SHIP_CLASSES.map((s) => s.id)).toEqual([
      'sloop',
      'brig',
      'frigate',
      'ship-of-the-line',
      'privateer',
    ]);
  });

  it('every ship class has positive integer stats', () => {
    for (const ship of SHIP_CLASSES) {
      expect(Number.isInteger(ship.hull)).toBe(true);
      expect(ship.hull).toBeGreaterThan(0);
      expect(Number.isInteger(ship.guns)).toBe(true);
      expect(ship.guns).toBeGreaterThan(0);
      expect(Number.isInteger(ship.crewCapacity)).toBe(true);
      expect(ship.crewCapacity).toBeGreaterThan(0);
      expect(Number.isInteger(ship.baseMovement)).toBe(true);
      expect(ship.baseMovement).toBeGreaterThan(0);
    }
  });

  it('ship-of-the-line is the heaviest hull and slowest', () => {
    const sotl = getShipClass('ship-of-the-line');
    for (const other of SHIP_CLASSES) {
      if (other.id === 'ship-of-the-line') continue;
      expect(sotl.hull).toBeGreaterThan(other.hull);
      expect(sotl.guns).toBeGreaterThan(other.guns);
      expect(sotl.baseMovement).toBeLessThanOrEqual(other.baseMovement);
    }
  });

  it('sloop and privateer share the fastest baseMovement', () => {
    const sloop = getShipClass('sloop');
    const priv = getShipClass('privateer');
    expect(sloop.baseMovement).toBe(priv.baseMovement);
    expect(sloop.baseMovement).toBeGreaterThanOrEqual(
      Math.max(...SHIP_CLASSES.map((s) => s.baseMovement)),
    );
  });

  it('every entry has a non-empty name and description', () => {
    for (const ship of SHIP_CLASSES) {
      expect(ship.name.length).toBeGreaterThan(0);
      expect(ship.description.length).toBeGreaterThan(0);
    }
  });
});

describe('isShipClassId / getShipClass', () => {
  it('isShipClassId narrows known ids', () => {
    expect(isShipClassId('sloop')).toBe(true);
    expect(isShipClassId('ship-of-the-line')).toBe(true);
  });

  it('isShipClassId rejects unknown values', () => {
    expect(isShipClassId('galleon')).toBe(false);
    expect(isShipClassId('')).toBe(false);
    expect(isShipClassId(0)).toBe(false);
    expect(isShipClassId(undefined)).toBe(false);
    expect(isShipClassId(null)).toBe(false);
  });

  it('getShipClass returns the matching entry', () => {
    const brig = getShipClass('brig');
    expect(brig.id).toBe('brig');
    expect(brig.name).toBe('Brig');
  });

  it('getShipClass throws TypeError on unknown id', () => {
    expect(() => getShipClass('galleon' as ShipClassId)).toThrow(TypeError);
  });
});

describe('OTK_LEGENDARY_SHIP_SLOTS', () => {
  it('reserves the six lore-canonical ships from §9 of OTK.md', () => {
    expect(OTK_LEGENDARY_SHIP_SLOTS.map((s) => s.id)).toEqual([
      'queen-annes-revenge',
      'black-pearl',
      'flying-dutchman',
      'whydah',
      'ranger',
      'revenge',
    ]);
  });

  it('every slot has a unique id', () => {
    const ids = OTK_LEGENDARY_SHIP_SLOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('legendary slot ids do not collide with base ShipClass ids', () => {
    const baseIds = new Set(SHIP_CLASSES.map((s) => s.id));
    for (const slot of OTK_LEGENDARY_SHIP_SLOTS) {
      expect(baseIds.has(slot.id as unknown as ShipClassId)).toBe(false);
    }
  });

  it('every slot has a non-empty name and description', () => {
    for (const slot of OTK_LEGENDARY_SHIP_SLOTS) {
      expect(slot.name.length).toBeGreaterThan(0);
      expect(slot.description.length).toBeGreaterThan(0);
    }
  });

  it('every slot names a known base class', () => {
    for (const slot of OTK_LEGENDARY_SHIP_SLOTS) {
      expect(isShipClassId(slot.baseClass)).toBe(true);
    }
  });

  it('every slot has positive integer stats', () => {
    for (const slot of OTK_LEGENDARY_SHIP_SLOTS) {
      expect(Number.isInteger(slot.hull)).toBe(true);
      expect(slot.hull).toBeGreaterThan(0);
      expect(Number.isInteger(slot.guns)).toBe(true);
      expect(slot.guns).toBeGreaterThan(0);
      expect(Number.isInteger(slot.crewCapacity)).toBe(true);
      expect(slot.crewCapacity).toBeGreaterThan(0);
      expect(Number.isInteger(slot.baseMovement)).toBe(true);
      expect(slot.baseMovement).toBeGreaterThan(0);
    }
  });

  it('legendary stats dominate their base class (>= on every axis, > on at least one)', () => {
    for (const slot of OTK_LEGENDARY_SHIP_SLOTS) {
      const base = getShipClass(slot.baseClass);
      expect(slot.hull).toBeGreaterThanOrEqual(base.hull);
      expect(slot.guns).toBeGreaterThanOrEqual(base.guns);
      expect(slot.crewCapacity).toBeGreaterThanOrEqual(base.crewCapacity);
      expect(slot.baseMovement).toBeGreaterThanOrEqual(base.baseMovement);
      const dominatesOnAtLeastOne =
        slot.hull > base.hull ||
        slot.guns > base.guns ||
        slot.crewCapacity > base.crewCapacity ||
        slot.baseMovement > base.baseMovement;
      expect(dominatesOnAtLeastOne).toBe(true);
    }
  });
});

describe('isLegendaryShipId / getLegendaryShip / ALL_LEGENDARY_SHIP_IDS', () => {
  it('ALL_LEGENDARY_SHIP_IDS matches the slot order', () => {
    expect(ALL_LEGENDARY_SHIP_IDS).toEqual(OTK_LEGENDARY_SHIP_SLOTS.map((s) => s.id));
  });

  it('isLegendaryShipId narrows known ids', () => {
    expect(isLegendaryShipId('black-pearl')).toBe(true);
    expect(isLegendaryShipId('revenge')).toBe(true);
  });

  it('isLegendaryShipId rejects unknown values', () => {
    expect(isLegendaryShipId('santa-maria')).toBe(false);
    expect(isLegendaryShipId('sloop')).toBe(false);
    expect(isLegendaryShipId('')).toBe(false);
    expect(isLegendaryShipId(0)).toBe(false);
    expect(isLegendaryShipId(undefined)).toBe(false);
    expect(isLegendaryShipId(null)).toBe(false);
  });

  it('getLegendaryShip returns the matching entry', () => {
    const dutchman = getLegendaryShip('flying-dutchman');
    expect(dutchman.id).toBe('flying-dutchman');
    expect(dutchman.baseClass).toBe('frigate');
  });

  it('getLegendaryShip throws TypeError on unknown id', () => {
    expect(() => getLegendaryShip('santa-maria' as LegendaryShipId)).toThrow(TypeError);
  });
});
