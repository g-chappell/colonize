import { TileType } from '@colonize/core';

// Source tile size in the placeholder atlas. If/when the art epic
// reships with a different native resolution, change this one value.
export const TILE_SIZE = 16;

// Effective on-screen size is TILE_SIZE * TILE_RENDER_SCALE. Scale is
// baked into GameScene rather than the atlas so the same source art
// can be re-used at different zoom levels later.
export const TILE_RENDER_SCALE = 2;

// Static frame name per terrain TileType in the placeholder atlas.
// Ocean is the one animated tile; its *static* frame is the first
// frame of the ocean animation (so non-animated callers still render
// a sensible tile).
export const TILE_FRAMES: Readonly<Record<TileType, string>> = {
  [TileType.Ocean]: 'tile_ocean',
  [TileType.RayonPassage]: 'tile_rayon_passage',
  [TileType.Island]: 'tile_island',
  [TileType.FloatingCity]: 'tile_floating_city',
  [TileType.RedTide]: 'tile_red_tide',
  [TileType.FataMorgana]: 'tile_fata_morgana',
};

// Ocean animation frames, cycled by GameScene to produce a lazy wave
// shimmer. Tests assert the frames resolve to real atlas entries.
export const OCEAN_ANIMATION_KEY = 'anim-ocean';
export const OCEAN_ANIMATION_FRAMERATE = 3;
export const OCEAN_ANIMATION_FRAMES: readonly string[] = [
  'tile_ocean',
  'tile_ocean_01',
  'tile_ocean_02',
];

export function frameForTile(type: TileType): string {
  return TILE_FRAMES[type];
}

// Rendered tile size in world pixels — the unit the camera + map
// layout math should use.
export function renderedTileSize(): number {
  return TILE_SIZE * TILE_RENDER_SCALE;
}

// World-space centre of a map tile. Pulled out of GameScene so layout
// arithmetic is unit-testable without mounting Phaser.
export function tileCenterInWorld(tileX: number, tileY: number): { x: number; y: number } {
  const size = renderedTileSize();
  return { x: tileX * size + size / 2, y: tileY * size + size / 2 };
}

// World-space bounds for an entire map of the given tile dimensions.
export function mapWorldBounds(
  mapWidth: number,
  mapHeight: number,
): { width: number; height: number } {
  const size = renderedTileSize();
  return { width: mapWidth * size, height: mapHeight * size };
}
