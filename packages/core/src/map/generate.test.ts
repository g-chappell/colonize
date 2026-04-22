import { describe, it, expect } from 'vitest';
import { generateMap, MIN_MAP_WIDTH, MIN_MAP_HEIGHT, MAX_FACTION_COUNT } from './generate.js';
import { GameMap } from './map.js';
import { TileType } from './tile.js';
import { ALL_DIRECTIONS } from './direction.js';
import { DirectionLayer } from './direction-layer.js';
import { ALL_RUMOUR_KINDS, RumourTile } from '../rumour/rumour.js';

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

describe('generateMap — rumours', () => {
  const seeds = [1, 2, 3, 42, 777, 12345];

  it.each(seeds)('places 4–8 rumours (seed=%i)', (seed) => {
    const g = generateMap({ seed, width: 40, height: 25, factionCount: 4 });
    expect(g.rumours.length).toBeGreaterThanOrEqual(4);
    expect(g.rumours.length).toBeLessThanOrEqual(8);
  });

  it('every rumour lands on an Ocean tile', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    for (const r of g.rumours) {
      expect(g.map.get(r.position.x, r.position.y)).toBe(TileType.Ocean);
    }
  });

  it('every rumour is within map bounds', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    for (const r of g.rumours) {
      expect(g.map.inBounds(r.position.x, r.position.y)).toBe(true);
    }
  });

  it('no rumour shares a cell with a faction start', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    const startKeys = new Set(g.factionStarts.map((s) => `${s.x},${s.y}`));
    for (const r of g.rumours) {
      expect(startKeys.has(`${r.position.x},${r.position.y}`)).toBe(false);
    }
  });

  it('every rumour is at least 3 cells (Chebyshev) from any faction start', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    for (const r of g.rumours) {
      for (const s of g.factionStarts) {
        const d = Math.max(Math.abs(s.x - r.position.x), Math.abs(s.y - r.position.y));
        expect(d).toBeGreaterThan(3);
      }
    }
  });

  it('rumour positions are unique', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    const keys = g.rumours.map((r) => `${r.position.x},${r.position.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('rumour ids are unique', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    const ids = g.rumours.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every rumour kind is a known RumourKind', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    const valid = new Set(ALL_RUMOUR_KINDS);
    for (const r of g.rumours) {
      expect(valid.has(r.kind)).toBe(true);
    }
  });

  it('every rumour starts unresolved', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    for (const r of g.rumours) {
      expect(r.resolved).toBe(false);
    }
  });

  it('produces identical rumour positions and kinds for the same seed', () => {
    const a = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    const b = generateMap({ seed: 42, width: 40, height: 25, factionCount: 4 });
    expect(a.rumours.map((r) => r.toJSON())).toEqual(b.rumours.map((r) => r.toJSON()));
  });

  it('produces different rumour placements for different seeds', () => {
    const a = generateMap({ seed: 1, width: 40, height: 25, factionCount: 4 });
    const b = generateMap({ seed: 2, width: 40, height: 25, factionCount: 4 });
    const ka = a.rumours.map((r) => `${r.position.x},${r.position.y}`).join('|');
    const kb = b.rumours.map((r) => `${r.position.x},${r.position.y}`).join('|');
    expect(ka).not.toBe(kb);
  });

  it('still places rumours when factionCount is omitted', () => {
    const g = generateMap({ seed: 7, width: 40, height: 25 });
    expect(g.rumours.length).toBeGreaterThanOrEqual(4);
    for (const r of g.rumours) {
      expect(g.map.get(r.position.x, r.position.y)).toBe(TileType.Ocean);
    }
  });

  it('rumours survive JSON round-trip', () => {
    const g = generateMap({ seed: 99, width: 40, height: 25, factionCount: 4 });
    for (const r of g.rumours) {
      const revived = RumourTile.fromJSON(r.toJSON());
      expect(revived.toJSON()).toEqual(r.toJSON());
    }
  });
});

describe('generateMap — wind and current zones', () => {
  const seeds = [1, 2, 3, 42, 777, 12345];

  it.each(seeds)('returns non-empty wind + current layers (seed=%i)', (seed) => {
    const g = generateMap({ seed, width: 40, height: 25 });
    expect(g.wind.size).toBeGreaterThan(0);
    expect(g.current.size).toBeGreaterThan(0);
  });

  it('wind and current layers match the map dimensions', () => {
    const g = generateMap({ seed: 7, width: 30, height: 20 });
    expect(g.wind.width).toBe(30);
    expect(g.wind.height).toBe(20);
    expect(g.current.width).toBe(30);
    expect(g.current.height).toBe(20);
  });

  it('zones only occupy navigable water tiles', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25 });
    const navigable = new Set<TileType>([
      TileType.Ocean,
      TileType.RayonPassage,
      TileType.FloatingCity,
      TileType.FataMorgana,
    ]);
    for (let y = 0; y < g.map.height; y++) {
      for (let x = 0; x < g.map.width; x++) {
        if (g.wind.get(x, y) !== null) {
          expect(navigable.has(g.map.get(x, y))).toBe(true);
        }
        if (g.current.get(x, y) !== null) {
          expect(navigable.has(g.map.get(x, y))).toBe(true);
        }
      }
    }
  });

  it('stored directions are all known Direction values', () => {
    const g = generateMap({ seed: 42, width: 40, height: 25 });
    const valid = new Set(ALL_DIRECTIONS);
    for (const e of g.wind.toJSON().entries) expect(valid.has(e.dir)).toBe(true);
    for (const e of g.current.toJSON().entries) expect(valid.has(e.dir)).toBe(true);
  });

  it('produces identical wind and current placements for the same seed', () => {
    const a = generateMap({ seed: 42, width: 40, height: 25 });
    const b = generateMap({ seed: 42, width: 40, height: 25 });
    expect(a.wind.toJSON()).toEqual(b.wind.toJSON());
    expect(a.current.toJSON()).toEqual(b.current.toJSON());
  });

  it('produces different wind placements for different seeds', () => {
    const a = generateMap({ seed: 1, width: 40, height: 25 });
    const b = generateMap({ seed: 2, width: 40, height: 25 });
    expect(a.wind.toJSON()).not.toEqual(b.wind.toJSON());
  });

  it('layers survive JSON round-trip', () => {
    const g = generateMap({ seed: 99, width: 40, height: 25 });
    const revivedWind = DirectionLayer.fromJSON(g.wind.toJSON());
    const revivedCurrent = DirectionLayer.fromJSON(g.current.toJSON());
    expect(revivedWind.toJSON()).toEqual(g.wind.toJSON());
    expect(revivedCurrent.toJSON()).toEqual(g.current.toJSON());
  });
});
