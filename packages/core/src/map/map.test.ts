import { describe, it, expect } from 'vitest';
import { GameMap, type MapJSON } from './map.js';
import { TileType } from './tile.js';

describe('GameMap construction', () => {
  it('fills with Ocean by default', () => {
    const map = new GameMap(3, 2);
    expect(map.width).toBe(3);
    expect(map.height).toBe(2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        expect(map.get(x, y)).toBe(TileType.Ocean);
      }
    }
  });

  it('fills with the requested type', () => {
    const map = new GameMap(2, 2, TileType.RedTide);
    expect(map.get(0, 0)).toBe(TileType.RedTide);
    expect(map.get(1, 1)).toBe(TileType.RedTide);
  });

  it.each([
    [0, 1],
    [1, 0],
    [-1, 1],
    [1, -1],
    [1.5, 1],
  ])('rejects invalid dimensions (%i x %i)', (w, h) => {
    expect(() => new GameMap(w, h)).toThrow(RangeError);
  });
});

describe('GameMap.get / set / inBounds', () => {
  it('inBounds reports cells inside and outside', () => {
    const map = new GameMap(4, 3);
    expect(map.inBounds(0, 0)).toBe(true);
    expect(map.inBounds(3, 2)).toBe(true);
    expect(map.inBounds(4, 0)).toBe(false);
    expect(map.inBounds(0, 3)).toBe(false);
    expect(map.inBounds(-1, 0)).toBe(false);
  });

  it('round-trips a set value', () => {
    const map = new GameMap(2, 2);
    map.set(1, 0, TileType.Island);
    expect(map.get(1, 0)).toBe(TileType.Island);
    expect(map.get(0, 0)).toBe(TileType.Ocean);
  });

  it('rejects out-of-bounds reads and writes', () => {
    const map = new GameMap(2, 2);
    expect(() => map.get(2, 0)).toThrow(RangeError);
    expect(() => map.set(0, -1, TileType.Island)).toThrow(RangeError);
  });

  it('indexes row-major (no x/y swap)', () => {
    const map = new GameMap(3, 2);
    map.set(2, 1, TileType.FloatingCity);
    map.set(1, 0, TileType.Island);
    expect(map.get(2, 1)).toBe(TileType.FloatingCity);
    expect(map.get(1, 0)).toBe(TileType.Island);
    expect(map.get(1, 1)).toBe(TileType.Ocean);
  });
});

describe('GameMap.neighbours', () => {
  it('returns all 8 neighbours for an interior cell', () => {
    const map = new GameMap(3, 3);
    const result = map.neighbours(1, 1);
    expect(result).toHaveLength(8);
    expect(new Set(result.map((c) => `${c.x},${c.y}`))).toEqual(
      new Set(['0,0', '1,0', '2,0', '0,1', '2,1', '0,2', '1,2', '2,2']),
    );
  });

  it('clips at the top-left corner', () => {
    const map = new GameMap(3, 3);
    const result = map.neighbours(0, 0);
    expect(new Set(result.map((c) => `${c.x},${c.y}`))).toEqual(new Set(['1,0', '0,1', '1,1']));
  });

  it('clips at the bottom-right corner', () => {
    const map = new GameMap(3, 3);
    const result = map.neighbours(2, 2);
    expect(new Set(result.map((c) => `${c.x},${c.y}`))).toEqual(new Set(['1,1', '2,1', '1,2']));
  });

  it('clips on a top edge', () => {
    const map = new GameMap(3, 3);
    const result = map.neighbours(1, 0);
    expect(new Set(result.map((c) => `${c.x},${c.y}`))).toEqual(
      new Set(['0,0', '2,0', '0,1', '1,1', '2,1']),
    );
  });

  it('throws for out-of-bounds origin', () => {
    const map = new GameMap(2, 2);
    expect(() => map.neighbours(2, 0)).toThrow(RangeError);
  });
});

describe('GameMap.toJSON / fromJSON', () => {
  it('round-trips a heterogeneous map', () => {
    const original = new GameMap(3, 2);
    original.set(0, 0, TileType.RayonPassage);
    original.set(1, 0, TileType.FloatingCity);
    original.set(2, 0, TileType.Island);
    original.set(0, 1, TileType.RedTide);
    original.set(1, 1, TileType.FataMorgana);

    const json = original.toJSON();
    const revived = GameMap.fromJSON(json);

    expect(revived.width).toBe(original.width);
    expect(revived.height).toBe(original.height);
    for (let y = 0; y < original.height; y++) {
      for (let x = 0; x < original.width; x++) {
        expect(revived.get(x, y)).toBe(original.get(x, y));
      }
    }
  });

  it('toJSON output is JSON-serialisable and lossless', () => {
    const map = new GameMap(2, 2);
    map.set(1, 1, TileType.Island);
    const text = JSON.stringify(map.toJSON());
    const revived = GameMap.fromJSON(JSON.parse(text) as MapJSON);
    expect(revived.get(1, 1)).toBe(TileType.Island);
    expect(revived.get(0, 0)).toBe(TileType.Ocean);
  });

  it('toJSON returns a defensive copy', () => {
    const map = new GameMap(2, 2);
    const json = map.toJSON();
    (json.tiles as TileType[])[0] = TileType.Island;
    expect(map.get(0, 0)).toBe(TileType.Ocean);
  });

  it('fromJSON rejects mismatched tile-array length', () => {
    expect(() =>
      GameMap.fromJSON({
        width: 2,
        height: 2,
        tiles: [TileType.Ocean, TileType.Ocean, TileType.Ocean],
      }),
    ).toThrow(RangeError);
  });

  it('fromJSON rejects unknown tile values', () => {
    expect(() =>
      GameMap.fromJSON({
        width: 1,
        height: 1,
        tiles: ['lava' as TileType],
      }),
    ).toThrow(TypeError);
  });

  it('fromJSON rejects non-positive dimensions', () => {
    expect(() => GameMap.fromJSON({ width: 0, height: 1, tiles: [] })).toThrow(RangeError);
  });
});
