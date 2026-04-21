export const TileType = {
  Ocean: 'ocean',
  RayonPassage: 'rayon-passage',
  Island: 'island',
  FloatingCity: 'floating-city',
  RedTide: 'red-tide',
  FataMorgana: 'fata-morgana',
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export const ALL_TILE_TYPES: readonly TileType[] = Object.values(TileType);

export function isTileType(value: unknown): value is TileType {
  return typeof value === 'string' && (ALL_TILE_TYPES as readonly string[]).includes(value);
}
