import { describe, expect, it } from 'vitest';
import { GameMap, TileType, findPath } from '@colonize/core';

import { isSameTile, truncatePathResult, truncatePathToBudget } from './path-preview';

function oceanMap(width: number, height: number): GameMap {
  return new GameMap(width, height, TileType.Ocean);
}

describe('truncatePathToBudget', () => {
  it('returns the full path when the budget covers the entire cost', () => {
    const map = oceanMap(5, 1);
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    const result = truncatePathToBudget(path, map, {}, 10);
    expect(result.path).toEqual(path);
    expect(result.reachable).toBe(3);
    expect(result.cost).toBe(3);
  });

  it('stops at the last affordable step when budget runs out', () => {
    const map = oceanMap(5, 1);
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ];
    const result = truncatePathToBudget(path, map, {}, 2);
    expect(result.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(result.reachable).toBe(2);
    expect(result.cost).toBe(2);
  });

  it('keeps origin tile only when budget cannot afford the first step', () => {
    const map = oceanMap(3, 1);
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const result = truncatePathToBudget(path, map, {}, 0);
    expect(result.path).toEqual([{ x: 0, y: 0 }]);
    expect(result.reachable).toBe(0);
    expect(result.cost).toBe(0);
  });

  it('stops at an impassable step even with unlimited budget', () => {
    const map = oceanMap(4, 1);
    map.set(2, 0, TileType.RedTide);
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    const result = truncatePathToBudget(path, map, {}, Number.POSITIVE_INFINITY);
    expect(result.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(result.reachable).toBe(1);
    expect(result.cost).toBe(1);
  });

  it('treats RedTide as traversable when the unit has redTideImmunity', () => {
    const map = oceanMap(4, 1);
    map.set(2, 0, TileType.RedTide);
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    const result = truncatePathToBudget(path, map, { redTideImmunity: true }, 3);
    expect(result.path).toEqual(path);
    expect(result.reachable).toBe(3);
    expect(result.cost).toBe(3);
  });

  it('handles an empty path gracefully', () => {
    const map = oceanMap(2, 1);
    const result = truncatePathToBudget([], map, {}, 3);
    expect(result.path).toEqual([]);
    expect(result.reachable).toBe(-1);
    expect(result.cost).toBe(0);
  });

  it('handles a single-tile path (no movement needed)', () => {
    const map = oceanMap(2, 1);
    const result = truncatePathToBudget([{ x: 0, y: 0 }], map, {}, 3);
    expect(result.path).toEqual([{ x: 0, y: 0 }]);
    expect(result.reachable).toBe(0);
    expect(result.cost).toBe(0);
  });
});

describe('truncatePathResult', () => {
  it('wires pathfinder output through the truncator end-to-end', () => {
    const map = oceanMap(6, 1);
    const path = findPath(map, { x: 0, y: 0 }, { x: 5, y: 0 });
    expect(path).not.toBeNull();
    const truncated = truncatePathResult(path!, map, {}, 3);
    expect(truncated.path.length).toBe(4);
    expect(truncated.cost).toBe(3);
    expect(truncated.reachable).toBe(3);
    expect(truncated.path[truncated.reachable]).toEqual({ x: 3, y: 0 });
  });
});

describe('isSameTile', () => {
  it('compares two coords by value', () => {
    expect(isSameTile({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(true);
    expect(isSameTile({ x: 3, y: 4 }, { x: 4, y: 3 })).toBe(false);
  });
});
