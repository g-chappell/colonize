import { describe, expect, it } from 'vitest';
import { UnitType, type UnitJSON } from '@colonize/core';

import { renderedTileSize } from './tile-atlas';
import { findUnitById, isTileInBounds, pickUnitIdAtTile, worldToTile } from './unit-input';

const TILE = renderedTileSize();

const EMPTY_CARGO = { resources: {}, artifacts: [] } as const;
const roster: readonly UnitJSON[] = [
  {
    id: 'u1',
    faction: 'otk',
    position: { x: 3, y: 4 },
    type: UnitType.Sloop,
    movement: 4,
    cargo: EMPTY_CARGO,
  },
  {
    id: 'u2',
    faction: 'otk',
    position: { x: 5, y: 6 },
    type: UnitType.Settler,
    movement: 1,
    cargo: EMPTY_CARGO,
  },
  {
    id: 'u3',
    faction: 'phantom',
    position: { x: 3, y: 4 },
    type: UnitType.Privateer,
    movement: 4,
    cargo: EMPTY_CARGO,
  },
];

describe('worldToTile', () => {
  it('floors world pixels into integer tile coords', () => {
    expect(worldToTile(0, 0)).toEqual({ x: 0, y: 0 });
    expect(worldToTile(TILE - 1, TILE - 1)).toEqual({ x: 0, y: 0 });
    expect(worldToTile(TILE, TILE)).toEqual({ x: 1, y: 1 });
    expect(worldToTile(TILE * 3 + 4, TILE * 4 + 7)).toEqual({ x: 3, y: 4 });
  });

  it('handles negative world coordinates outside the map', () => {
    const tile = worldToTile(-1, -TILE);
    expect(tile.x).toBe(-1);
    expect(tile.y).toBe(-1);
  });
});

describe('isTileInBounds', () => {
  it('passes tiles inside the map', () => {
    expect(isTileInBounds({ x: 0, y: 0 }, 10, 10)).toBe(true);
    expect(isTileInBounds({ x: 9, y: 9 }, 10, 10)).toBe(true);
  });

  it('rejects tiles on or past the right / bottom edge', () => {
    expect(isTileInBounds({ x: 10, y: 0 }, 10, 10)).toBe(false);
    expect(isTileInBounds({ x: 0, y: 10 }, 10, 10)).toBe(false);
  });

  it('rejects negative tile coords', () => {
    expect(isTileInBounds({ x: -1, y: 0 }, 10, 10)).toBe(false);
    expect(isTileInBounds({ x: 0, y: -1 }, 10, 10)).toBe(false);
  });
});

describe('pickUnitIdAtTile', () => {
  it('returns the id of the unit at the tile', () => {
    expect(pickUnitIdAtTile({ x: 5, y: 6 }, roster)).toBe('u2');
  });

  it('returns the first unit when multiple share a tile', () => {
    expect(pickUnitIdAtTile({ x: 3, y: 4 }, roster)).toBe('u1');
  });

  it('returns null when no unit is at the tile', () => {
    expect(pickUnitIdAtTile({ x: 0, y: 0 }, roster)).toBeNull();
  });

  it('returns null for an empty roster', () => {
    expect(pickUnitIdAtTile({ x: 3, y: 4 }, [])).toBeNull();
  });
});

describe('findUnitById', () => {
  it('returns the matching unit', () => {
    expect(findUnitById('u2', roster)?.type).toBe(UnitType.Settler);
  });

  it('returns null for unknown id', () => {
    expect(findUnitById('missing', roster)).toBeNull();
  });

  it('returns null when id is null', () => {
    expect(findUnitById(null, roster)).toBeNull();
  });
});
