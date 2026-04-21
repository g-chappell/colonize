import { describe, it, expect } from 'vitest';
import { generateMap, MIN_MAP_WIDTH, MIN_MAP_HEIGHT, MAX_FACTION_COUNT } from './generate.js';
import { GameMap } from './map.js';
import { TileType } from './tile.js';

function countTiles(map: GameMap, type: TileType): number {
  let n = 0;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.get(x, y) === type) n++;
    }
  }
  return n;
}

describe('generateMap — validation', () => {
  it('rejects a non-integer seed', () => {
    expect(() => generateMap({ seed: 1.5, width: 30, height: 20 })).toThrow(TypeError);
  });

  it.each([
    [MIN_MAP_WIDTH - 1, 20],
    [0, 20],
    [-5, 20],
    [19.5, 20],
  ])('rejects width < MIN_MAP_WIDTH (%i x %i)', (w, h) => {
    expect(() => generateMap({ seed: 1, width: w, height: h })).toThrow(RangeError);
  });

  it.each([
    [30, MIN_MAP_HEIGHT - 1],
    [30, 0],
    [30, -5],
    [30, 14.5],
  ])('rejects height < MIN_MAP_HEIGHT (%i x %i)', (w, h) => {
    expect(() => generateMap({ seed: 1, width: w, height: h })).toThrow(RangeError);
  });

  it.each([-1, MAX_FACTION_COUNT + 1, 1.5])('rejects invalid factionCount (%s)', (fc) => {
    expect(() => generateMap({ seed: 1, width: 30, height: 20, factionCount: fc })).toThrow(
      RangeError,
    );
  });
});

describe('generateMap — determinism', () => {
  it('produces identical tiles for the same seed + dimensions', () => {
    const a = generateMap({ seed: 42, width: 40, height: 25 });
    const b = generateMap({ seed: 42, width: 40, height: 25 });
    expect(a.map.toJSON()).toEqual(b.map.toJSON());
  });

  it('produces identical faction-start coordinates for the same seed', () => {
    const a = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    const b = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    expect(a.factionStarts).toEqual(b.factionStarts);
  });

  it('produces different maps for different seeds', () => {
    const a = generateMap({ seed: 1, width: 40, height: 25 });
    const b = generateMap({ seed: 2, width: 40, height: 25 });
    expect(a.map.toJSON()).not.toEqual(b.map.toJSON());
  });

  it('works with negative seeds (mulberry32 is 32-bit)', () => {
    const a = generateMap({ seed: -1, width: 40, height: 25 });
    const b = generateMap({ seed: -1, width: 40, height: 25 });
    expect(a.map.toJSON()).toEqual(b.map.toJSON());
  });
});

describe('generateMap — dimensions and tile validity', () => {
  it('returns a map of the requested size', () => {
    const g = generateMap({ seed: 7, width: 30, height: 20 });
    expect(g.map.width).toBe(30);
    expect(g.map.height).toBe(20);
  });

  it('every cell holds a known TileType', () => {
    const valid = new Set<TileType>(Object.values(TileType));
    const g = generateMap({ seed: 7, width: 30, height: 20 });
    for (let y = 0; y < g.map.height; y++) {
      for (let x = 0; x < g.map.width; x++) {
        expect(valid.has(g.map.get(x, y))).toBe(true);
      }
    }
  });
});

describe('generateMap — Rayon Passage corridor', () => {
  it('every column contains at least one corridor tile', () => {
    const g = generateMap({ seed: 11, width: 30, height: 20 });
    for (let x = 0; x < g.map.width; x++) {
      let hasCorridor = false;
      for (let y = 0; y < g.map.height; y++) {
        const t = g.map.get(x, y);
        if (t === TileType.RayonPassage || t === TileType.FloatingCity) {
          hasCorridor = true;
          break;
        }
      }
      expect(hasCorridor).toBe(true);
    }
  });

  it('corridor drifts stay clear of the top and bottom edges', () => {
    const g = generateMap({ seed: 11, width: 30, height: 20 });
    for (let x = 0; x < g.map.width; x++) {
      expect(g.map.get(x, 0)).not.toBe(TileType.RayonPassage);
      expect(g.map.get(x, 0)).not.toBe(TileType.FloatingCity);
      expect(g.map.get(x, g.map.height - 1)).not.toBe(TileType.RayonPassage);
      expect(g.map.get(x, g.map.height - 1)).not.toBe(TileType.FloatingCity);
    }
  });
});

describe('generateMap — feature counts', () => {
  const seeds = [1, 2, 3, 42, 777, 12345];

  it.each(seeds)('places 5–8 floating cities (seed=%i)', (seed) => {
    const g = generateMap({ seed, width: 40, height: 25 });
    const cities = countTiles(g.map, TileType.FloatingCity);
    expect(cities).toBeGreaterThanOrEqual(5);
    expect(cities).toBeLessThanOrEqual(8);
  });

  it.each(seeds)('places at least 8 island tiles (seed=%i)', (seed) => {
    const g = generateMap({ seed, width: 40, height: 25 });
    expect(countTiles(g.map, TileType.Island)).toBeGreaterThanOrEqual(8);
  });

  it.each(seeds)('places at least one Red Tide tile (seed=%i)', (seed) => {
    const g = generateMap({ seed, width: 40, height: 25 });
    expect(countTiles(g.map, TileType.RedTide)).toBeGreaterThanOrEqual(1);
  });

  it.each(seeds)('places at least 3 Fata Morgana tiles (seed=%i)', (seed) => {
    const g = generateMap({ seed, width: 40, height: 25 });
    expect(countTiles(g.map, TileType.FataMorgana)).toBeGreaterThanOrEqual(3);
  });
});

describe('generateMap — faction starts', () => {
  it('returns an empty array when factionCount is omitted', () => {
    const g = generateMap({ seed: 1, width: 40, height: 25 });
    expect(g.factionStarts).toEqual([]);
  });

  it('returns exactly factionCount starts', () => {
    for (const n of [1, 2, 3, 4]) {
      const g = generateMap({ seed: 1, width: 40, height: 25, factionCount: n });
      expect(g.factionStarts).toHaveLength(n);
    }
  });

  it('places every start on an Ocean tile', () => {
    const g = generateMap({ seed: 1, width: 40, height: 25, factionCount: 4 });
    for (const s of g.factionStarts) {
      expect(g.map.get(s.x, s.y)).toBe(TileType.Ocean);
    }
  });

  it('returns distinct coordinates', () => {
    const g = generateMap({ seed: 1, width: 40, height: 25, factionCount: 4 });
    const keys = g.factionStarts.map((c) => `${c.x},${c.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('places every start within bounds', () => {
    const g = generateMap({ seed: 1, width: 40, height: 25, factionCount: 4 });
    for (const s of g.factionStarts) {
      expect(g.map.inBounds(s.x, s.y)).toBe(true);
    }
  });

  it('spreads 4 starts across different halves of the map', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    const midX = g.map.width / 2;
    const midY = g.map.height / 2;
    const quadrants = new Set<string>();
    for (const s of g.factionStarts) {
      quadrants.add(`${s.x < midX ? 'L' : 'R'}${s.y < midY ? 'T' : 'B'}`);
    }
    expect(quadrants.size).toBe(4);
  });
});

describe('generateMap — JSON round-trip', () => {
  it('produced map survives toJSON/fromJSON lossless', () => {
    const g = generateMap({ seed: 99, width: 30, height: 20 });
    const revived = GameMap.fromJSON(g.map.toJSON());
    expect(revived.toJSON()).toEqual(g.map.toJSON());
  });
});
