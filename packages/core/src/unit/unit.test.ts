import { describe, it, expect } from 'vitest';
import { Unit, type UnitJSON } from './unit.js';
import { UnitType, getUnitTypeDefinition } from './unit-type.js';

function makeScout(overrides: Partial<Parameters<typeof makeScoutArgs>[0]> = {}): Unit {
  return new Unit(makeScoutArgs(overrides));
}

function makeScoutArgs(overrides: {
  id?: string;
  faction?: string;
  x?: number;
  y?: number;
  type?: UnitType;
  movement?: number;
}): {
  id: string;
  faction: string;
  position: { x: number; y: number };
  type: UnitType;
  movement?: number;
} {
  const base = {
    id: overrides.id ?? 'u-1',
    faction: overrides.faction ?? 'otk',
    position: { x: overrides.x ?? 3, y: overrides.y ?? 4 },
    type: overrides.type ?? UnitType.Scout,
  };
  return overrides.movement !== undefined ? { ...base, movement: overrides.movement } : base;
}

describe('Unit construction', () => {
  it('defaults movement to the type baseMovement', () => {
    const u = makeScout();
    expect(u.movement).toBe(getUnitTypeDefinition(UnitType.Scout).baseMovement);
    expect(u.maxMovement).toBe(u.movement);
  });

  it('accepts an explicit movement value between 0 and baseMovement', () => {
    const u = makeScout({ movement: 1 });
    expect(u.movement).toBe(1);
  });

  it('stores id, faction, type, and position', () => {
    const u = new Unit({
      id: 'u-42',
      faction: 'phantom',
      position: { x: 10, y: 11 },
      type: UnitType.Settler,
    });
    expect(u.id).toBe('u-42');
    expect(u.faction).toBe('phantom');
    expect(u.type).toBe(UnitType.Settler);
    expect(u.position).toEqual({ x: 10, y: 11 });
  });

  it('copies the position so external mutation does not leak', () => {
    const pos = { x: 1, y: 2 };
    const u = new Unit({ id: 'u', faction: 'otk', position: pos, type: UnitType.Scout });
    (pos as { x: number }).x = 999;
    expect(u.position).toEqual({ x: 1, y: 2 });
  });

  it.each([
    ['empty id', { id: '' }, TypeError],
    ['empty faction', { faction: '' }, TypeError],
    ['non-integer x', { x: 1.5 }, TypeError],
    ['non-integer y', { y: Number.NaN }, TypeError],
    ['negative movement', { movement: -1 }, RangeError],
    ['fractional movement', { movement: 1.5 }, RangeError],
    ['movement above base', { movement: 99 }, RangeError],
  ])('rejects invalid init (%s)', (_label, overrides, ctor) => {
    expect(() => makeScout(overrides)).toThrow(ctor);
  });

  it('rejects an unknown UnitType', () => {
    expect(
      () =>
        new Unit({
          id: 'u',
          faction: 'otk',
          position: { x: 0, y: 0 },
          type: 'dragoon' as UnitType,
        }),
    ).toThrow(TypeError);
  });
});

describe('Unit movement', () => {
  it('resetMovement restores to maxMovement', () => {
    const u = makeScout({ movement: 0 });
    expect(u.movement).toBe(0);
    u.resetMovement();
    expect(u.movement).toBe(u.maxMovement);
  });

  it('spendMovement deducts from the remaining pool', () => {
    const u = makeScout();
    const before = u.movement;
    u.spendMovement(1);
    expect(u.movement).toBe(before - 1);
  });

  it('spendMovement 0 is a no-op', () => {
    const u = makeScout();
    const before = u.movement;
    u.spendMovement(0);
    expect(u.movement).toBe(before);
  });

  it('spendMovement throws when cost exceeds remaining', () => {
    const u = makeScout({ movement: 1 });
    expect(() => u.spendMovement(2)).toThrow(RangeError);
    expect(u.movement).toBe(1);
  });

  it('spendMovement rejects negative or fractional costs', () => {
    const u = makeScout();
    expect(() => u.spendMovement(-1)).toThrow(RangeError);
    expect(() => u.spendMovement(0.5)).toThrow(RangeError);
  });

  it('canMove reflects remaining movement', () => {
    const u = makeScout();
    expect(u.canMove).toBe(true);
    u.spendMovement(u.movement);
    expect(u.canMove).toBe(false);
  });

  it('unit-type baseMovement drives turn-start movement', () => {
    const scout = new Unit({
      id: 'a',
      faction: 'otk',
      position: { x: 0, y: 0 },
      type: UnitType.Scout,
    });
    const settler = new Unit({
      id: 'b',
      faction: 'otk',
      position: { x: 0, y: 0 },
      type: UnitType.Settler,
    });
    scout.spendMovement(scout.movement);
    settler.spendMovement(settler.movement);
    scout.resetMovement();
    settler.resetMovement();
    expect(scout.movement).toBe(getUnitTypeDefinition(UnitType.Scout).baseMovement);
    expect(settler.movement).toBe(getUnitTypeDefinition(UnitType.Settler).baseMovement);
    expect(scout.movement).toBeGreaterThan(settler.movement);
  });
});

describe('Unit.moveTo', () => {
  it('updates position and spends the given cost', () => {
    const u = makeScout({ x: 0, y: 0 });
    u.moveTo({ x: 1, y: 0 }, 1);
    expect(u.position).toEqual({ x: 1, y: 0 });
    expect(u.movement).toBe(u.maxMovement - 1);
  });

  it('leaves position unchanged if spendMovement throws', () => {
    const u = makeScout({ movement: 0, x: 0, y: 0 });
    expect(() => u.moveTo({ x: 1, y: 0 }, 1)).toThrow(RangeError);
    expect(u.position).toEqual({ x: 0, y: 0 });
  });

  it('rejects an invalid destination', () => {
    const u = makeScout();
    expect(() => u.moveTo({ x: 1.5, y: 0 }, 1)).toThrow(TypeError);
  });
});

describe('Unit.toJSON / fromJSON', () => {
  it('round-trips a typical unit', () => {
    const original = new Unit({
      id: 'u-9',
      faction: 'ironclad',
      position: { x: 5, y: 7 },
      type: UnitType.Settler,
    });
    original.spendMovement(1);
    const json = original.toJSON();
    expect(json).toEqual({
      id: 'u-9',
      faction: 'ironclad',
      position: { x: 5, y: 7 },
      type: 'settler',
      movement: 0,
      cargo: { resources: {}, artifacts: [] },
    });
    const revived = Unit.fromJSON(json);
    expect(revived.id).toBe('u-9');
    expect(revived.faction).toBe('ironclad');
    expect(revived.type).toBe(UnitType.Settler);
    expect(revived.position).toEqual({ x: 5, y: 7 });
    expect(revived.movement).toBe(0);
  });

  it('toJSON output is JSON-serialisable and lossless', () => {
    const u = new Unit({
      id: 'u-10',
      faction: 'otk',
      position: { x: 2, y: 3 },
      type: UnitType.Scout,
    });
    const text = JSON.stringify(u.toJSON());
    const revived = Unit.fromJSON(JSON.parse(text) as UnitJSON);
    expect(revived.toJSON()).toEqual(u.toJSON());
  });

  it('fromJSON rejects an unknown type', () => {
    const bad: UnitJSON = {
      id: 'u',
      faction: 'otk',
      position: { x: 0, y: 0 },
      type: 'dragoon' as UnitType,
      movement: 0,
      cargo: { resources: {}, artifacts: [] },
    };
    expect(() => Unit.fromJSON(bad)).toThrow(TypeError);
  });

  it('fromJSON rejects movement above baseMovement', () => {
    const bad: UnitJSON = {
      id: 'u',
      faction: 'otk',
      position: { x: 0, y: 0 },
      type: UnitType.Settler,
      movement: 99,
      cargo: { resources: {}, artifacts: [] },
    };
    expect(() => Unit.fromJSON(bad)).toThrow(RangeError);
  });

  it('revived unit is independent of the source', () => {
    const a = makeScout();
    const b = Unit.fromJSON(a.toJSON());
    a.spendMovement(1);
    expect(b.movement).toBe(a.maxMovement);
  });
});

describe('Unit cargo', () => {
  it('defaults to an empty cargo hold', () => {
    const u = makeScout();
    expect(u.cargo.isEmpty).toBe(true);
  });

  it('accepts seed cargo and exposes it via unit.cargo', () => {
    const u = new Unit({
      id: 'u',
      faction: 'otk',
      position: { x: 0, y: 0 },
      type: UnitType.Settler,
      cargo: { resources: { provisions: 3 }, artifacts: ['kraken-talisman'] },
    });
    expect(u.cargo.getQuantity('provisions')).toBe(3);
    expect(u.cargo.hasArtifact('kraken-talisman')).toBe(true);
  });

  it('round-trips cargo through toJSON / fromJSON', () => {
    const u = new Unit({
      id: 'u',
      faction: 'otk',
      position: { x: 1, y: 2 },
      type: UnitType.Settler,
    });
    u.cargo.addResource('timber', 2);
    u.cargo.addArtifact('shard');
    const revived = Unit.fromJSON(u.toJSON());
    expect(revived.cargo.getQuantity('timber')).toBe(2);
    expect(revived.cargo.hasArtifact('shard')).toBe(true);
  });

  it('revived unit has an independent cargo hold', () => {
    const a = new Unit({
      id: 'a',
      faction: 'otk',
      position: { x: 0, y: 0 },
      type: UnitType.Settler,
    });
    a.cargo.addResource('timber', 1);
    const b = Unit.fromJSON(a.toJSON());
    a.cargo.addResource('timber', 5);
    expect(b.cargo.getQuantity('timber')).toBe(1);
  });

  it('fromJSON rejects missing cargo', () => {
    const bad = {
      id: 'u',
      faction: 'otk',
      position: { x: 0, y: 0 },
      type: UnitType.Settler,
      movement: 0,
    } as unknown as UnitJSON;
    expect(() => Unit.fromJSON(bad)).toThrow(TypeError);
  });
});
