import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALL_TILE_TYPES, TileType } from '@colonize/core';

import {
  OCEAN_ANIMATION_FRAMERATE,
  OCEAN_ANIMATION_FRAMES,
  OCEAN_ANIMATION_KEY,
  TILE_FRAMES,
  TILE_RENDER_SCALE,
  TILE_SIZE,
  frameForTile,
} from './tile-atlas';

// The packed placeholder atlas is the ground truth for which frames
// actually exist on disk. Load it once and assert every frame we
// reference in tile-atlas.ts is present.
const spritesheetPath = resolve(
  __dirname,
  '..',
  '..',
  'public',
  'atlas',
  'core',
  'spritesheet.json',
);
const spritesheet = JSON.parse(readFileSync(spritesheetPath, 'utf8')) as {
  frames: Record<string, unknown>;
};
const packedFrames = new Set(Object.keys(spritesheet.frames));

describe('tile atlas mapping', () => {
  it('covers every TileType with a frame name', () => {
    for (const type of ALL_TILE_TYPES) {
      expect(TILE_FRAMES[type], `missing frame for ${type}`).toBeTruthy();
    }
  });

  it('exposes frameForTile as a single lookup', () => {
    expect(frameForTile(TileType.Ocean)).toBe('tile_ocean');
    expect(frameForTile(TileType.Island)).toBe('tile_island');
    expect(frameForTile(TileType.FloatingCity)).toBe('tile_floating_city');
  });

  it('every tile frame resolves to an entry in the packed atlas', () => {
    for (const type of ALL_TILE_TYPES) {
      const frame = TILE_FRAMES[type];
      expect(packedFrames.has(frame), `atlas missing frame ${frame} for ${type}`).toBe(true);
    }
  });

  it('ocean animation references at least two frames, all present in the atlas', () => {
    expect(OCEAN_ANIMATION_FRAMES.length).toBeGreaterThanOrEqual(2);
    for (const f of OCEAN_ANIMATION_FRAMES) {
      expect(packedFrames.has(f), `atlas missing ocean animation frame ${f}`).toBe(true);
    }
  });

  it('exports stable tile sizing + animation constants', () => {
    expect(TILE_SIZE).toBe(16);
    expect(TILE_RENDER_SCALE).toBeGreaterThanOrEqual(1);
    expect(OCEAN_ANIMATION_KEY).toBe('anim-ocean');
    expect(OCEAN_ANIMATION_FRAMERATE).toBeGreaterThan(0);
  });
});

describe('tile layout helpers', () => {
  it('tileCenterInWorld places the origin tile at one half-tile offset', async () => {
    const { renderedTileSize, tileCenterInWorld } = await import('./tile-atlas');
    const size = renderedTileSize();
    expect(tileCenterInWorld(0, 0)).toEqual({ x: size / 2, y: size / 2 });
  });

  it('tileCenterInWorld shifts by one rendered tile per coord step', async () => {
    const { renderedTileSize, tileCenterInWorld } = await import('./tile-atlas');
    const size = renderedTileSize();
    const a = tileCenterInWorld(3, 4);
    const b = tileCenterInWorld(4, 4);
    const c = tileCenterInWorld(3, 5);
    expect(b.x - a.x).toBe(size);
    expect(c.y - a.y).toBe(size);
  });

  it('mapWorldBounds equals tile count * rendered tile size', async () => {
    const { renderedTileSize, mapWorldBounds } = await import('./tile-atlas');
    const size = renderedTileSize();
    expect(mapWorldBounds(20, 15)).toEqual({ width: 20 * size, height: 15 * size });
  });
});
