import { describe, it, expect } from 'vitest';
import { ALL_TILE_TYPES, TileType, isTileType } from './tile.js';

describe('TileType', () => {
  it('exposes all six canonical tile kinds', () => {
    expect(ALL_TILE_TYPES).toHaveLength(6);
    expect(new Set(ALL_TILE_TYPES)).toEqual(
      new Set([
        TileType.Ocean,
        TileType.RayonPassage,
        TileType.Island,
        TileType.FloatingCity,
        TileType.RedTide,
        TileType.FataMorgana,
      ]),
    );
  });

  it('has unique string values', () => {
    expect(new Set(ALL_TILE_TYPES).size).toBe(ALL_TILE_TYPES.length);
  });

  it('isTileType narrows valid strings', () => {
    expect(isTileType('ocean')).toBe(true);
    expect(isTileType('rayon-passage')).toBe(true);
    expect(isTileType('fata-morgana')).toBe(true);
  });

  it('isTileType rejects unknown values', () => {
    expect(isTileType('lava')).toBe(false);
    expect(isTileType(42)).toBe(false);
    expect(isTileType(undefined)).toBe(false);
    expect(isTileType(null)).toBe(false);
  });
});
