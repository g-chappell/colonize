import { describe, it, expect } from 'vitest';
import { Colony, type ColonyJSON } from './colony.js';

function makeColony(
  overrides: Partial<{
    id: string;
    faction: string;
    x: number;
    y: number;
    population: number;
  }> = {},
): Colony {
  return new Colony({
    id: overrides.id ?? 'col-1',
    faction: overrides.faction ?? 'otk',
    position: { x: overrides.x ?? 4, y: overrides.y ?? 7 },
    ...(overrides.population !== undefined ? { population: overrides.population } : {}),
  });
}

describe('Colony construction', () => {
  it('stores id, faction, position, and defaults population to 1', () => {
    const c = makeColony();
    expect(c.id).toBe('col-1');
    expect(c.faction).toBe('otk');
    expect(c.position).toEqual({ x: 4, y: 7 });
    expect(c.population).toBe(1);
  });

  it('accepts an explicit starting population', () => {
    const c = makeColony({ population: 3 });
    expect(c.population).toBe(3);
  });

  it('copies the position so external mutation does not leak', () => {
    const pos = { x: 1, y: 2 };
    const c = new Colony({ id: 'c', faction: 'otk', position: pos });
    (pos as { x: number }).x = 999;
    expect(c.position).toEqual({ x: 1, y: 2 });
  });

  it('seeds crew and buildings from init, deduplicating entries', () => {
    const c = new Colony({
      id: 'c',
      faction: 'otk',
      position: { x: 0, y: 0 },
      crew: ['crew-1', 'crew-2', 'crew-1'],
      buildings: ['dockyard', 'salt-pan'],
    });
    expect(c.crew).toEqual(['crew-1', 'crew-2']);
    expect(c.buildings).toEqual(['dockyard', 'salt-pan']);
  });

  it('seeds stocks via a CargoHold init object', () => {
    const c = new Colony({
      id: 'c',
      faction: 'otk',
      position: { x: 0, y: 0 },
      stocks: { resources: { salt: 5, rum: 2 }, artifacts: ['kraken-idol'] },
    });
    expect(c.stocks.getQuantity('salt')).toBe(5);
    expect(c.stocks.hasArtifact('kraken-idol')).toBe(true);
  });

  it.each([
    ['empty id', { id: '' }, TypeError],
    ['empty faction', { faction: '' }, TypeError],
    ['non-integer x', { x: 1.5 }, TypeError],
    ['non-integer y', { y: Number.NaN }, TypeError],
    ['negative population', { population: -1 }, RangeError],
    ['fractional population', { population: 1.5 }, RangeError],
  ])('rejects invalid init (%s)', (_label, overrides, ctor) => {
    expect(() => makeColony(overrides)).toThrow(ctor as ErrorConstructor);
  });

  it('rejects non-array crew or buildings', () => {
    expect(
      () =>
        new Colony({
          id: 'c',
          faction: 'otk',
          position: { x: 0, y: 0 },
          crew: 'crew-1' as unknown as readonly string[],
        }),
    ).toThrow(TypeError);
    expect(
      () =>
        new Colony({
          id: 'c',
          faction: 'otk',
          position: { x: 0, y: 0 },
          buildings: 'dockyard' as unknown as readonly string[],
        }),
    ).toThrow(TypeError);
  });
});

describe('Colony.adjustPopulation', () => {
  it('adds and subtracts integer deltas', () => {
    const c = makeColony({ population: 3 });
    c.adjustPopulation(2);
    expect(c.population).toBe(5);
    c.adjustPopulation(-1);
    expect(c.population).toBe(4);
  });

  it('throws when delta is not an integer', () => {
    const c = makeColony();
    expect(() => c.adjustPopulation(0.5)).toThrow(RangeError);
    expect(() => c.adjustPopulation(Number.NaN)).toThrow(RangeError);
  });

  it('throws when delta would drop population below zero and leaves state intact', () => {
    const c = makeColony({ population: 1 });
    expect(() => c.adjustPopulation(-2)).toThrow(RangeError);
    expect(c.population).toBe(1);
  });

  it('allows exact drain to zero', () => {
    const c = makeColony({ population: 2 });
    c.adjustPopulation(-2);
    expect(c.population).toBe(0);
  });
});

describe('Colony crew and building rosters', () => {
  it('assignCrew / releaseCrew add and remove entries', () => {
    const c = makeColony();
    c.assignCrew('crew-1');
    c.assignCrew('crew-2');
    expect(c.crew).toEqual(['crew-1', 'crew-2']);
    expect(c.hasCrew('crew-1')).toBe(true);
    c.releaseCrew('crew-1');
    expect(c.hasCrew('crew-1')).toBe(false);
    expect(c.crew).toEqual(['crew-2']);
  });

  it('assignCrew is idempotent (set semantics)', () => {
    const c = makeColony();
    c.assignCrew('crew-1');
    c.assignCrew('crew-1');
    expect(c.crew).toEqual(['crew-1']);
  });

  it('releaseCrew throws when the id is absent', () => {
    const c = makeColony();
    expect(() => c.releaseCrew('ghost')).toThrow(Error);
  });

  it('rejects empty crew / building ids', () => {
    const c = makeColony();
    expect(() => c.assignCrew('')).toThrow(TypeError);
    expect(() => c.addBuilding('')).toThrow(TypeError);
  });

  it('addBuilding / removeBuilding manage the building set', () => {
    const c = makeColony();
    c.addBuilding('dockyard');
    c.addBuilding('salt-pan');
    expect(c.buildings).toEqual(['dockyard', 'salt-pan']);
    expect(c.hasBuilding('dockyard')).toBe(true);
    c.removeBuilding('dockyard');
    expect(c.hasBuilding('dockyard')).toBe(false);
    expect(c.buildings).toEqual(['salt-pan']);
  });

  it('removeBuilding throws when the id is absent', () => {
    const c = makeColony();
    expect(() => c.removeBuilding('ghost')).toThrow(Error);
  });

  it('crew and buildings getters return sorted snapshots, not live refs', () => {
    const c = makeColony();
    c.assignCrew('b');
    c.assignCrew('a');
    const snap = c.crew;
    expect(snap).toEqual(['a', 'b']);
    c.assignCrew('c');
    expect(snap).toEqual(['a', 'b']);
  });
});

describe('Colony.toJSON / fromJSON', () => {
  it('round-trips a populated colony', () => {
    const original = makeColony({ population: 4 });
    original.assignCrew('crew-1');
    original.addBuilding('dockyard');
    original.stocks.addResource('salt', 3);
    original.stocks.addArtifact('shard');

    const json = original.toJSON();
    expect(json).toEqual({
      id: 'col-1',
      faction: 'otk',
      position: { x: 4, y: 7 },
      population: 4,
      crew: ['crew-1'],
      buildings: ['dockyard'],
      stocks: { resources: { salt: 3 }, artifacts: ['shard'] },
    });

    const revived = Colony.fromJSON(json);
    expect(revived.id).toBe('col-1');
    expect(revived.faction).toBe('otk');
    expect(revived.position).toEqual({ x: 4, y: 7 });
    expect(revived.population).toBe(4);
    expect(revived.crew).toEqual(['crew-1']);
    expect(revived.buildings).toEqual(['dockyard']);
    expect(revived.stocks.getQuantity('salt')).toBe(3);
    expect(revived.stocks.hasArtifact('shard')).toBe(true);
  });

  it('toJSON output is JSON-serialisable and lossless', () => {
    const c = makeColony({ population: 2 });
    c.addBuilding('salt-pan');
    const text = JSON.stringify(c.toJSON());
    const revived = Colony.fromJSON(JSON.parse(text) as ColonyJSON);
    expect(revived.toJSON()).toEqual(c.toJSON());
  });

  it('revived colony is independent of the source', () => {
    const a = makeColony();
    a.assignCrew('crew-1');
    const b = Colony.fromJSON(a.toJSON());
    a.assignCrew('crew-2');
    expect(b.crew).toEqual(['crew-1']);
  });

  it('fromJSON rejects non-array crew', () => {
    const bad = {
      id: 'c',
      faction: 'otk',
      position: { x: 0, y: 0 },
      population: 1,
      crew: 'crew-1',
      buildings: [],
      stocks: { resources: {}, artifacts: [] },
    } as unknown as ColonyJSON;
    expect(() => Colony.fromJSON(bad)).toThrow(TypeError);
  });

  it('fromJSON rejects missing stocks', () => {
    const bad = {
      id: 'c',
      faction: 'otk',
      position: { x: 0, y: 0 },
      population: 1,
      crew: [],
      buildings: [],
    } as unknown as ColonyJSON;
    expect(() => Colony.fromJSON(bad)).toThrow(TypeError);
  });
});
