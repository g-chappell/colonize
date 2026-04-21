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
export { findPath, tileCost } from './map/index.js';
export type { PathfindFlags, PathResult } from './map/index.js';
export {
  Visibility,
  ALL_VISIBILITY_STATES,
  isVisibility,
  FactionVisibility,
} from './visibility/index.js';
export type { VisibilityJSON } from './visibility/index.js';
export { TurnPhase, ALL_TURN_PHASES, isTurnPhase, TurnManager } from './turn/index.js';
export type { TurnHook, TurnHookContext, TurnHookEvent, TurnStateJSON } from './turn/index.js';
export { UnitType, ALL_UNIT_TYPES, isUnitType, getUnitTypeDefinition, Unit } from './unit/index.js';
export type { UnitTypeDefinition, UnitJSON, UnitInit, FactionId } from './unit/index.js';
export {
  RumourKind,
  ALL_RUMOUR_KINDS,
  isRumourKind,
  RumourOutcomeCategory,
  ALL_RUMOUR_OUTCOME_CATEGORIES,
  isRumourOutcomeCategory,
  outcomeCategoryForKind,
  LEGENDARY_WRECK_BLUEPRINT_FACTION,
  RumourTile,
} from './rumour/index.js';
export type {
  RumourOutcome,
  RumourTileJSON,
  RumourTileInit,
  ResolveOptions,
  MirageVariant,
} from './rumour/index.js';
