import { describe, it, expect } from 'vitest';
import { GameMap } from '../map/map.js';
import { TileType } from '../map/tile.js';
import { generateMap } from '../map/generate.js';
import { FactionVisibility, Visibility } from './visibility.js';
import { seedStartingCorridorKnowledge } from './seed.js';

describe('seedStartingCorridorKnowledge', () => {
  it('marks every Rayon Passage tile seen', () => {
    const map = new GameMap(5, 3);
    map.set(0, 1, TileType.RayonPassage);
    map.set(1, 1, TileType.RayonPassage);
    map.set(2, 1, TileType.RayonPassage);
    map.set(3, 1, TileType.RayonPassage);
    map.set(4, 1, TileType.RayonPassage);
    const vis = new FactionVisibility(5, 3);

    seedStartingCorridorKnowledge(vis, map);

    for (let x = 0; x < 5; x++) {
      expect(vis.get(x, 1)).toBe(Visibility.Seen);
    }
  });

  it('marks every floating-city tile seen', () => {
    const map = new GameMap(5, 3);
    map.set(1, 1, TileType.FloatingCity);
    map.set(3, 1, TileType.FloatingCity);
    const vis = new FactionVisibility(5, 3);

    seedStartingCorridorKnowledge(vis, map);

    expect(vis.get(1, 1)).toBe(Visibility.Seen);
    expect(vis.get(3, 1)).toBe(Visibility.Seen);
  });

  it('leaves non-corridor tiles unseen', () => {
    const map = new GameMap(4, 3);
    map.set(0, 0, TileType.Island);
    map.set(1, 0, TileType.RedTide);
    map.set(2, 0, TileType.FataMorgana);
    map.set(3, 0, TileType.Ocean);
    map.set(0, 1, TileType.RayonPassage);
    map.set(1, 1, TileType.FloatingCity);
    const vis = new FactionVisibility(4, 3);

    seedStartingCorridorKnowledge(vis, map);

    expect(vis.get(0, 0)).toBe(Visibility.Unseen);
    expect(vis.get(1, 0)).toBe(Visibility.Unseen);
    expect(vis.get(2, 0)).toBe(Visibility.Unseen);
    expect(vis.get(3, 0)).toBe(Visibility.Unseen);
    expect(vis.get(0, 1)).toBe(Visibility.Seen);
    expect(vis.get(1, 1)).toBe(Visibility.Seen);
    expect(vis.get(2, 1)).toBe(Visibility.Unseen);
    expect(vis.get(3, 1)).toBe(Visibility.Unseen);
    for (let x = 0; x < 4; x++) {
      expect(vis.get(x, 2)).toBe(Visibility.Unseen);
    }
  });

  it('leaves no cell in the Visible state (seeding collapses to seen)', () => {
    const map = new GameMap(3, 3);
    map.set(0, 0, TileType.RayonPassage);
    map.set(1, 1, TileType.FloatingCity);
    const vis = new FactionVisibility(3, 3);

    seedStartingCorridorKnowledge(vis, map);

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(vis.get(x, y)).not.toBe(Visibility.Visible);
      }
    }
  });

  it('is idempotent when called twice', () => {
    const map = new GameMap(4, 2);
    map.set(0, 0, TileType.RayonPassage);
    map.set(1, 0, TileType.FloatingCity);
    const vis = new FactionVisibility(4, 2);

    seedStartingCorridorKnowledge(vis, map);
    seedStartingCorridorKnowledge(vis, map);

    expect(vis.get(0, 0)).toBe(Visibility.Seen);
    expect(vis.get(1, 0)).toBe(Visibility.Seen);
    expect(vis.get(2, 0)).toBe(Visibility.Unseen);
    expect(vis.get(3, 0)).toBe(Visibility.Unseen);
  });

  it('throws when visibility dimensions do not match map dimensions', () => {
    const map = new GameMap(4, 3);
    const vis = new FactionVisibility(3, 3);
    expect(() => seedStartingCorridorKnowledge(vis, map)).toThrow(RangeError);
  });

  it('works on a generated map: every RayonPassage/FloatingCity tile ends up seen', () => {
    const { map } = generateMap({ seed: 42, width: 20, height: 15, factionCount: 2 });
    const vis = new FactionVisibility(map.width, map.height);

    seedStartingCorridorKnowledge(vis, map);

    let corridorCells = 0;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = map.get(x, y);
        if (t === TileType.RayonPassage || t === TileType.FloatingCity) {
          corridorCells++;
          expect(vis.get(x, y)).toBe(Visibility.Seen);
        } else {
          expect(vis.get(x, y)).toBe(Visibility.Unseen);
        }
      }
    }
    expect(corridorCells).toBeGreaterThan(0);
  });
});
