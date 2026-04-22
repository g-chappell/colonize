import { describe, it, expect } from 'vitest';
import { GameMap } from '../map/map.js';
import { TileType } from '../map/tile.js';
import { Unit } from '../unit/unit.js';
import { UnitType } from '../unit/unit-type.js';
import { Colony } from './colony.js';
import { canFoundColonyAt, foundColony, FOUNDABLE_TILE_TYPES } from './found-colony.js';

function makeMap(): GameMap {
  const m = new GameMap(5, 5, TileType.Ocean);
  m.set(1, 1, TileType.Island);
  m.set(2, 2, TileType.FloatingCity);
  m.set(3, 3, TileType.RayonPassage);
  m.set(0, 4, TileType.RedTide);
  m.set(4, 0, TileType.FataMorgana);
  return m;
}

function makeFounder(x: number, y: number, faction = 'otk'): Unit {
  return new Unit({
    id: 'u-founder',
    faction,
    position: { x, y },
    type: UnitType.FoundingShip,
  });
}

describe('FOUNDABLE_TILE_TYPES', () => {
  it('contains island and floating-city only', () => {
    expect(new Set(FOUNDABLE_TILE_TYPES)).toEqual(
      new Set([TileType.Island, TileType.FloatingCity]),
    );
  });
});

describe('canFoundColonyAt', () => {
  it('is true on island and floating-city tiles', () => {
    const map = makeMap();
    expect(canFoundColonyAt(map, { x: 1, y: 1 })).toBe(true);
    expect(canFoundColonyAt(map, { x: 2, y: 2 })).toBe(true);
  });

  it('is false on ocean, rayon-passage, red-tide, and fata-morgana', () => {
    const map = makeMap();
    expect(canFoundColonyAt(map, { x: 0, y: 0 })).toBe(false);
    expect(canFoundColonyAt(map, { x: 3, y: 3 })).toBe(false);
    expect(canFoundColonyAt(map, { x: 0, y: 4 })).toBe(false);
    expect(canFoundColonyAt(map, { x: 4, y: 0 })).toBe(false);
  });

  it('is false for out-of-bounds or non-integer coords', () => {
    const map = makeMap();
    expect(canFoundColonyAt(map, { x: -1, y: 0 })).toBe(false);
    expect(canFoundColonyAt(map, { x: 0, y: 99 })).toBe(false);
    expect(canFoundColonyAt(map, { x: 1.5, y: 1 })).toBe(false);
  });
});

describe('foundColony', () => {
  it('creates a colony at the founding-ship position on an island tile', () => {
    const map = makeMap();
    const unit = makeFounder(1, 1);
    const result = foundColony({ unit, map, colonyId: 'col-1' });
    expect(result.colony).toBeInstanceOf(Colony);
    expect(result.colony.id).toBe('col-1');
    expect(result.colony.faction).toBe('otk');
    expect(result.colony.position).toEqual({ x: 1, y: 1 });
    expect(result.colony.population).toBe(1);
    expect(result.consumedUnitId).toBe('u-founder');
  });

  it('grants +1 starting population on a floating-city tile', () => {
    const map = makeMap();
    const unit = makeFounder(2, 2);
    const { colony } = foundColony({ unit, map, colonyId: 'col-fc' });
    expect(colony.position).toEqual({ x: 2, y: 2 });
    expect(colony.population).toBe(2);
  });

  it('transfers the founding ship cargo into colony stocks', () => {
    const map = makeMap();
    const unit = makeFounder(1, 1);
    unit.cargo.addResource('salt', 4);
    unit.cargo.addResource('rum', 1);
    unit.cargo.addArtifact('kraken-idol');

    const { colony } = foundColony({ unit, map, colonyId: 'col-1' });
    expect(colony.stocks.getQuantity('salt')).toBe(4);
    expect(colony.stocks.getQuantity('rum')).toBe(1);
    expect(colony.stocks.hasArtifact('kraken-idol')).toBe(true);
    expect(unit.cargo.isEmpty).toBe(true);
  });

  it('rejects a non-FoundingShip unit', () => {
    const map = makeMap();
    const scout = new Unit({
      id: 'u-scout',
      faction: 'otk',
      position: { x: 1, y: 1 },
      type: UnitType.Scout,
    });
    expect(() => foundColony({ unit: scout, map, colonyId: 'col-1' })).toThrow(Error);
  });

  it('rejects an ocean / rayon-passage / red-tide / fata-morgana tile', () => {
    const map = makeMap();
    for (const [x, y] of [
      [0, 0],
      [3, 3],
      [0, 4],
      [4, 0],
    ] as const) {
      const unit = new Unit({
        id: `u-${x}-${y}`,
        faction: 'otk',
        position: { x, y },
        type: UnitType.FoundingShip,
      });
      expect(() => foundColony({ unit, map, colonyId: `col-${x}-${y}` })).toThrow(Error);
    }
  });

  it('rejects founding on a tile that already hosts a colony', () => {
    const map = makeMap();
    const unit = makeFounder(1, 1);
    expect(() =>
      foundColony({
        unit,
        map,
        colonyId: 'col-2',
        existingColonyPositions: [{ x: 1, y: 1 }],
      }),
    ).toThrow(/already exists/);
  });

  it('allows founding when existing colonies are elsewhere', () => {
    const map = makeMap();
    const unit = makeFounder(1, 1);
    const { colony } = foundColony({
      unit,
      map,
      colonyId: 'col-1',
      existingColonyPositions: [
        { x: 2, y: 2 },
        { x: 0, y: 0 },
      ],
    });
    expect(colony.position).toEqual({ x: 1, y: 1 });
  });

  it('rejects an empty colonyId', () => {
    const map = makeMap();
    const unit = makeFounder(1, 1);
    expect(() => foundColony({ unit, map, colonyId: '' })).toThrow(TypeError);
  });

  it('founded colony inherits the faction from the founding ship', () => {
    const map = makeMap();
    const unit = makeFounder(1, 1, 'phantom');
    const { colony } = foundColony({ unit, map, colonyId: 'col-p' });
    expect(colony.faction).toBe('phantom');
  });
});
