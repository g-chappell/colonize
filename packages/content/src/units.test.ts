import { describe, it, expect } from 'vitest';
import {
  ALL_LEGENDARY_SHIP_IDS,
  GROUND_CLASSES,
  OTK_LEGENDARY_SHIP_SLOTS,
  SHIP_CLASSES,
  SPECIALIST_CLASSES,
  getGroundClass,
  getLegendaryShip,
  getShipClass,
  getSpecialistClass,
  isGroundClassId,
  isLegendaryShipId,
  isShipClassId,
  isSpecialistClassId,
  type GroundClassId,
  type LegendaryShipId,
  type ShipClassId,
  type SpecialistClassId,
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

describe('GROUND_CLASSES', () => {
  it('exposes the three ground classes', () => {
    expect(GROUND_CLASSES.map((g) => g.id)).toEqual(['marines', 'dragoons', 'pikemen']);
  });

  it('every class has positive integer stats and a non-empty name + description', () => {
    for (const g of GROUND_CLASSES) {
      expect(Number.isInteger(g.hp)).toBe(true);
      expect(g.hp).toBeGreaterThan(0);
      expect(Number.isInteger(g.attack)).toBe(true);
      expect(g.attack).toBeGreaterThan(0);
      expect(Number.isInteger(g.defense)).toBe(true);
      expect(g.defense).toBeGreaterThan(0);
      expect(Number.isInteger(g.baseMovement)).toBe(true);
      expect(g.baseMovement).toBeGreaterThan(0);
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
    }
  });

  it('forms a rock-paper-scissors cycle (marines → pikemen → dragoons → marines)', () => {
    const byId: Record<GroundClassId, GroundClassId> = {
      marines: getGroundClass('marines').beats,
      dragoons: getGroundClass('dragoons').beats,
      pikemen: getGroundClass('pikemen').beats,
    };
    expect(byId.marines).toBe('pikemen');
    expect(byId.pikemen).toBe('dragoons');
    expect(byId.dragoons).toBe('marines');
  });

  it('no ground class beats itself', () => {
    for (const g of GROUND_CLASSES) {
      expect(g.beats).not.toBe(g.id);
    }
  });

  it('pikemen are the sturdiest and dragoons the fastest', () => {
    const marines = getGroundClass('marines');
    const dragoons = getGroundClass('dragoons');
    const pikemen = getGroundClass('pikemen');
    expect(pikemen.hp).toBeGreaterThan(marines.hp);
    expect(pikemen.hp).toBeGreaterThan(dragoons.hp);
    expect(dragoons.baseMovement).toBeGreaterThan(marines.baseMovement);
    expect(dragoons.baseMovement).toBeGreaterThan(pikemen.baseMovement);
  });
});

describe('SPECIALIST_CLASSES', () => {
  it('exposes the two specialist exploration classes', () => {
    expect(SPECIALIST_CLASSES.map((s) => s.id)).toEqual(['cartographer', 'explorer']);
  });

  it('every specialist class has positive integer stats and non-empty copy', () => {
    for (const s of SPECIALIST_CLASSES) {
      expect(Number.isInteger(s.hull)).toBe(true);
      expect(s.hull).toBeGreaterThan(0);
      expect(Number.isInteger(s.guns)).toBe(true);
      expect(s.guns).toBeGreaterThan(0);
      expect(Number.isInteger(s.crewCapacity)).toBe(true);
      expect(s.crewCapacity).toBeGreaterThan(0);
      expect(Number.isInteger(s.baseMovement)).toBe(true);
      expect(s.baseMovement).toBeGreaterThan(0);
      expect(Number.isInteger(s.sightRadius)).toBe(true);
      expect(s.sightRadius).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  it('specialists carry fewer guns than every base ship class', () => {
    const minBaseShipGuns = Math.min(...SHIP_CLASSES.map((s) => s.guns));
    for (const s of SPECIALIST_CLASSES) {
      expect(s.guns).toBeLessThan(minBaseShipGuns);
    }
  });

  it('specialists outrun every base ship class', () => {
    const maxBaseShipMovement = Math.max(...SHIP_CLASSES.map((s) => s.baseMovement));
    for (const s of SPECIALIST_CLASSES) {
      expect(s.baseMovement).toBeGreaterThan(maxBaseShipMovement);
    }
  });

  it('specialists see twice as far as a standard sloop', () => {
    const sloop = getShipClass('sloop');
    // Sloop sight radius lives on the core registry; mirror the
    // canonical value here so the two-copy invariant stays local.
    const SLOOP_SIGHT_RADIUS = 2;
    for (const s of SPECIALIST_CLASSES) {
      expect(s.sightRadius).toBe(SLOOP_SIGHT_RADIUS * 2);
    }
    expect(sloop.baseMovement).toBeLessThan(SPECIALIST_CLASSES[0]!.baseMovement);
  });

  it('specialist ids do not collide with base or legendary ship ids', () => {
    const baseIds = new Set(SHIP_CLASSES.map((s) => s.id));
    const legendaryIds = new Set(OTK_LEGENDARY_SHIP_SLOTS.map((s) => s.id));
    for (const s of SPECIALIST_CLASSES) {
      expect(baseIds.has(s.id as unknown as ShipClassId)).toBe(false);
      expect(legendaryIds.has(s.id as unknown as LegendaryShipId)).toBe(false);
    }
  });
});

describe('isSpecialistClassId / getSpecialistClass', () => {
  it('isSpecialistClassId narrows known ids', () => {
    expect(isSpecialistClassId('cartographer')).toBe(true);
    expect(isSpecialistClassId('explorer')).toBe(true);
  });

  it('isSpecialistClassId rejects unknown values', () => {
    expect(isSpecialistClassId('sloop')).toBe(false);
    expect(isSpecialistClassId('pathfinder')).toBe(false);
    expect(isSpecialistClassId('')).toBe(false);
    expect(isSpecialistClassId(0)).toBe(false);
    expect(isSpecialistClassId(undefined)).toBe(false);
    expect(isSpecialistClassId(null)).toBe(false);
  });

  it('getSpecialistClass returns the matching entry', () => {
    const cartographer = getSpecialistClass('cartographer');
    expect(cartographer.id).toBe('cartographer');
    expect(cartographer.name).toBe('Cartographer');
  });

  it('getSpecialistClass throws TypeError on unknown id', () => {
    expect(() => getSpecialistClass('pathfinder' as SpecialistClassId)).toThrow(TypeError);
  });
});

describe('isGroundClassId / getGroundClass', () => {
  it('isGroundClassId narrows known ids', () => {
    expect(isGroundClassId('marines')).toBe(true);
    expect(isGroundClassId('dragoons')).toBe(true);
    expect(isGroundClassId('pikemen')).toBe(true);
  });

  it('isGroundClassId rejects unknown values', () => {
    expect(isGroundClassId('lancer')).toBe(false);
    expect(isGroundClassId('sloop')).toBe(false);
    expect(isGroundClassId('')).toBe(false);
    expect(isGroundClassId(0)).toBe(false);
    expect(isGroundClassId(undefined)).toBe(false);
    expect(isGroundClassId(null)).toBe(false);
  });

  it('getGroundClass returns the matching entry', () => {
    const dragoons = getGroundClass('dragoons');
    expect(dragoons.id).toBe('dragoons');
    expect(dragoons.name).toBe('Dragoons');
  });

  it('getGroundClass throws TypeError on unknown id', () => {
    expect(() => getGroundClass('lancer' as GroundClassId)).toThrow(TypeError);
  });
});
