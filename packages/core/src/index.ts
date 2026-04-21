export const CORE_VERSION = '0.0.0';

export type GameVersion = string;

export {
  TileType,
  ALL_TILE_TYPES,
  isTileType,
  GameMap,
  generateMap,
  MIN_MAP_WIDTH,
  MIN_MAP_HEIGHT,
  MAX_FACTION_COUNT,
} from './map/index.js';
export type { Coord, MapJSON, GenerateMapOptions, GeneratedMap } from './map/index.js';
export {
  Visibility,
  ALL_VISIBILITY_STATES,
  isVisibility,
  FactionVisibility,
} from './visibility/index.js';
export type { VisibilityJSON } from './visibility/index.js';
