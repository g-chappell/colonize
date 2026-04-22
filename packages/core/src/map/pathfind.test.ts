import { describe, it, expect } from 'vitest';
import { GameMap } from './map.js';
import { TileType } from './tile.js';
import { Direction } from './direction.js';
import { DirectionLayer } from './direction-layer.js';
import { findPath, tileCost, sailingStepCost, MIN_SAILING_STEP_COST } from './pathfind.js';

describe('tileCost', () => {
  it('returns 1 for navigable water tiles', () => {
    expect(tileCost(TileType.Ocean)).toBe(1);
    expect(tileCost(TileType.RayonPassage)).toBe(1);
    expect(tileCost(TileType.FataMorgana)).toBe(1);
    expect(tileCost(TileType.FloatingCity)).toBe(1);
  });

  it('returns Infinity for Island regardless of flags', () => {
    expect(tileCost(TileType.Island)).toBe(Infinity);
    expect(tileCost(TileType.Island, { redTideImmunity: true })).toBe(Infinity);
  });

  it('returns Infinity for Red Tide unless the unit has immunity', () => {
    expect(tileCost(TileType.RedTide)).toBe(Infinity);
    expect(tileCost(TileType.RedTide, { redTideImmunity: false })).toBe(Infinity);
    expect(tileCost(TileType.RedTide, { redTideImmunity: true })).toBe(1);
  });
});

describe('findPath', () => {
  it('returns a single-tile path with zero cost when start == goal', () => {
    const map = new GameMap(3, 3);
    const result = findPath(map, { x: 1, y: 1 }, { x: 1, y: 1 });
    expect(result).not.toBeNull();
    expect(result!.path).toEqual([{ x: 1, y: 1 }]);
    expect(result!.cost).toBe(0);
  });

  it('finds a straight path across open ocean', () => {
    const map = new GameMap(5, 1);
    const result = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(result).not.toBeNull();
    expect(result!.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
    expect(result!.cost).toBe(4);
  });

  it('uses diagonal moves on a 2D grid (8-connected)', () => {
    const map = new GameMap(4, 4);
    const result = findPath(map, { x: 0, y: 0 }, { x: 3, y: 3 });
    expect(result).not.toBeNull();
    expect(result!.cost).toBe(3);
    expect(result!.path).toHaveLength(4);
    expect(result!.path[0]).toEqual({ x: 0, y: 0 });
    expect(result!.path[result!.path.length - 1]).toEqual({ x: 3, y: 3 });
  });

  it('routes around Red Tide for units without immunity', () => {
    const map = new GameMap(5, 3);
    // wall of Red Tide across column x=2 except at y=0
    map.set(2, 1, TileType.RedTide);
    map.set(2, 2, TileType.RedTide);

    const noImmunity = findPath(map, { x: 0, y: 2 }, { x: 4, y: 2 });
    expect(noImmunity).not.toBeNull();
    for (const step of noImmunity!.path) {
      expect(map.get(step.x, step.y)).not.toBe(TileType.RedTide);
    }
  });

  it('cuts through Red Tide when the unit has the immunity flag', () => {
    const map = new GameMap(5, 3);
    map.set(2, 0, TileType.RedTide);
    map.set(2, 1, TileType.RedTide);
    map.set(2, 2, TileType.RedTide);

    const blocked = findPath(map, { x: 0, y: 1 }, { x: 4, y: 1 });
    const open = findPath(map, { x: 0, y: 1 }, { x: 4, y: 1 }, { redTideImmunity: true });

    expect(blocked).toBeNull();
    expect(open).not.toBeNull();
    expect(open!.cost).toBe(4);
    expect(open!.path.some((c) => c.x === 2 && map.get(c.x, c.y) === TileType.RedTide)).toBe(true);
  });

  it('returns null when the goal is unreachable', () => {
    const map = new GameMap(3, 3);
    for (let y = 0; y < 3; y++) map.set(1, y, TileType.Island);

    const result = findPath(map, { x: 0, y: 1 }, { x: 2, y: 1 });
    expect(result).toBeNull();
  });

  it('returns null when the goal tile itself is impassable', () => {
    const map = new GameMap(3, 3);
    map.set(2, 1, TileType.Island);

    const result = findPath(map, { x: 0, y: 1 }, { x: 2, y: 1 });
    expect(result).toBeNull();
  });

  it('throws when start or goal are out of bounds', () => {
    const map = new GameMap(3, 3);
    expect(() => findPath(map, { x: -1, y: 0 }, { x: 0, y: 0 })).toThrow(RangeError);
    expect(() => findPath(map, { x: 0, y: 0 }, { x: 3, y: 0 })).toThrow(RangeError);
  });

  it('prefers the cheaper route when an obstacle forces a detour', () => {
    const map = new GameMap(5, 5);
    // island wall at x=2, y=1..3 — force path around
    map.set(2, 1, TileType.Island);
    map.set(2, 2, TileType.Island);
    map.set(2, 3, TileType.Island);

    const result = findPath(map, { x: 0, y: 2 }, { x: 4, y: 2 });
    expect(result).not.toBeNull();
    for (const step of result!.path) {
      expect(map.get(step.x, step.y)).not.toBe(TileType.Island);
    }
    expect(result!.path[0]).toEqual({ x: 0, y: 2 });
    expect(result!.path[result!.path.length - 1]).toEqual({ x: 4, y: 2 });
  });
});

describe('sailingStepCost', () => {
  it('returns the base tile cost when no wind/current is set', () => {
    const map = new GameMap(3, 3);
    expect(sailingStepCost(map, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1);
  });

  it('reduces cost below 1 when travelling with the wind', () => {
    const map = new GameMap(3, 3);
    const wind = new DirectionLayer(3, 3);
    wind.set(1, 1, Direction.E);
    const cost = sailingStepCost(map, { x: 0, y: 1 }, { x: 1, y: 1 }, { wind });
    expect(cost).toBe(0.5);
  });

  it('increases cost above 1 when fighting a headwind', () => {
    const map = new GameMap(3, 3);
    const wind = new DirectionLayer(3, 3);
    wind.set(0, 1, Direction.E);
    const cost = sailingStepCost(map, { x: 1, y: 1 }, { x: 0, y: 1 }, { wind });
    expect(cost).toBe(1.5);
  });

  it('leaves cost unchanged for perpendicular travel', () => {
    const map = new GameMap(3, 3);
    const wind = new DirectionLayer(3, 3);
    wind.set(1, 0, Direction.E);
    expect(sailingStepCost(map, { x: 1, y: 1 }, { x: 1, y: 0 }, { wind })).toBe(1);
  });

  it('stacks wind and current offsets additively', () => {
    const map = new GameMap(3, 3);
    const wind = new DirectionLayer(3, 3);
    const current = new DirectionLayer(3, 3);
    wind.set(1, 1, Direction.E);
    current.set(1, 1, Direction.E);
    const cost = sailingStepCost(map, { x: 0, y: 1 }, { x: 1, y: 1 }, { wind, current });
    expect(cost).toBe(MIN_SAILING_STEP_COST);
  });

  it('respects the lower bound when wind + current both push against travel', () => {
    const map = new GameMap(3, 3);
    const wind = new DirectionLayer(3, 3);
    const current = new DirectionLayer(3, 3);
    wind.set(1, 1, Direction.W);
    current.set(1, 1, Direction.W);
    const cost = sailingStepCost(map, { x: 0, y: 1 }, { x: 1, y: 1 }, { wind, current });
    expect(cost).toBe(2);
  });

  it('leaves Red Tide impassable even when wind is favourable', () => {
    const map = new GameMap(3, 3);
    map.set(1, 1, TileType.RedTide);
    const wind = new DirectionLayer(3, 3);
    wind.set(1, 1, Direction.E);
    expect(sailingStepCost(map, { x: 0, y: 1 }, { x: 1, y: 1 }, { wind })).toBe(Infinity);
  });

  it('respects Red Tide immunity and then applies wind', () => {
    const map = new GameMap(3, 3);
    map.set(1, 1, TileType.RedTide);
    const wind = new DirectionLayer(3, 3);
    wind.set(1, 1, Direction.E);
    const cost = sailingStepCost(
      map,
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { wind, redTideImmunity: true },
    );
    expect(cost).toBe(0.5);
  });
});

describe('findPath — wind and current', () => {
  it('picks the cheaper of two routes when one is with the wind', () => {
    const map = new GameMap(3, 3);
    const wind = new DirectionLayer(3, 3);
    // Favour the top-row route west→east; penalise the bottom-row route.
    wind.set(1, 0, Direction.E);
    wind.set(2, 0, Direction.E);
    wind.set(1, 2, Direction.W);
    wind.set(2, 2, Direction.W);

    const result = findPath(map, { x: 0, y: 1 }, { x: 2, y: 1 }, { wind });
    expect(result).not.toBeNull();
    // With an E-wind push, the cheapest path hugs y=0.
    expect(result!.path.some((c) => c.y === 0)).toBe(true);
  });

  it('matches the no-wind cost when no zones intersect the path', () => {
    const map = new GameMap(4, 1);
    const wind = new DirectionLayer(4, 1);
    // Wind on an unreachable cell has no effect.
    const baseline = findPath(map, { x: 0, y: 0 }, { x: 3, y: 0 });
    const withEmptyWind = findPath(map, { x: 0, y: 0 }, { x: 3, y: 0 }, { wind });
    expect(withEmptyWind!.cost).toBe(baseline!.cost);
  });

  it('reports lower total cost under a persistent tailwind', () => {
    const map = new GameMap(5, 1);
    const wind = new DirectionLayer(5, 1);
    for (let x = 1; x < 5; x++) wind.set(x, 0, Direction.E);
    const baseline = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 });
    const withWind = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 }, { wind });
    expect(withWind!.cost).toBeLessThan(baseline!.cost);
    expect(withWind!.cost).toBeCloseTo(4 * 0.5);
  });

  it('reports higher total cost when the whole path fights a headwind', () => {
    const map = new GameMap(5, 1);
    const wind = new DirectionLayer(5, 1);
    for (let x = 1; x < 5; x++) wind.set(x, 0, Direction.W);
    const result = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 }, { wind });
    expect(result!.cost).toBeCloseTo(4 * 1.5);
  });

  it('stacks wind and current on the same path', () => {
    const map = new GameMap(5, 1);
    const wind = new DirectionLayer(5, 1);
    const current = new DirectionLayer(5, 1);
    for (let x = 1; x < 5; x++) {
      wind.set(x, 0, Direction.E);
      current.set(x, 0, Direction.E);
    }
    const result = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 }, { wind, current });
    expect(result!.cost).toBeCloseTo(4 * MIN_SAILING_STEP_COST);
  });
});
