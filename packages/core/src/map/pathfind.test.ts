import { describe, it, expect } from 'vitest';
import { GameMap } from './map.js';
import { TileType } from './tile.js';
import { findPath, tileCost } from './pathfind.js';

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
