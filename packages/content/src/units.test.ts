import { describe, it, expect } from 'vitest';
import {
  OTK_LEGENDARY_SHIP_SLOTS,
  SHIP_CLASSES,
  getShipClass,
  isShipClassId,
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

  it('every slot is locked in the MVP', () => {
    for (const slot of OTK_LEGENDARY_SHIP_SLOTS) {
      expect(slot.unlocked).toBe(false);
    }
  });

  it('every slot has a unique id', () => {
    const ids = OTK_LEGENDARY_SHIP_SLOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('legendary slot ids do not collide with base ShipClass ids', () => {
    const baseIds = new Set(SHIP_CLASSES.map((s) => s.id));
    for (const slot of OTK_LEGENDARY_SHIP_SLOTS) {
      expect(baseIds.has(slot.id as ShipClassId)).toBe(false);
    }
  });

  it('every slot has a non-empty name and description', () => {
    for (const slot of OTK_LEGENDARY_SHIP_SLOTS) {
      expect(slot.name.length).toBeGreaterThan(0);
      expect(slot.description.length).toBeGreaterThan(0);
    }
  });
});
