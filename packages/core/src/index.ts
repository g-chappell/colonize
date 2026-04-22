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
export { findPath, tileCost, sailingStepCost, MIN_SAILING_STEP_COST } from './map/index.js';
export type { PathfindFlags, PathResult } from './map/index.js';
export { EMPTY_TILE_YIELD, getTileYield, scaleTileYield } from './map/index.js';
export type { TileYield } from './map/index.js';
export {
  Direction,
  ALL_DIRECTIONS,
  isDirection,
  oppositeDirection,
  stepDirection,
  directionAngleDelta,
  directionalCostOffset,
  DirectionLayer,
} from './map/index.js';
export type { DirectionLayerJSON, DirectionLayerEntryJSON } from './map/index.js';
export {
  Visibility,
  ALL_VISIBILITY_STATES,
  isVisibility,
  FactionVisibility,
  seedStartingCorridorKnowledge,
} from './visibility/index.js';
export type { VisibilityJSON } from './visibility/index.js';
export { TurnPhase, ALL_TURN_PHASES, isTurnPhase, TurnManager } from './turn/index.js';
export type { TurnHook, TurnHookContext, TurnHookEvent, TurnStateJSON } from './turn/index.js';
export { UnitType, ALL_UNIT_TYPES, isUnitType, getUnitTypeDefinition, Unit } from './unit/index.js';
export type { UnitTypeDefinition, UnitJSON, UnitInit, FactionId } from './unit/index.js';
export { CargoHold } from './cargo/index.js';
export type { CargoHoldJSON, CargoHoldInit, ResourceId, ArtifactId } from './cargo/index.js';
export {
  BuildingType,
  ALL_BUILDING_TYPES,
  isBuildingType,
  getBuildingDefinition,
} from './building/index.js';
export type { BuildingDefinition } from './building/index.js';
export { Colony, foundColony, canFoundColonyAt, FOUNDABLE_TILE_TYPES } from './colony/index.js';
export type {
  ColonyJSON,
  ColonyInit,
  CrewId,
  BuildingId,
  FoundColonyParams,
  FoundColonyResult,
} from './colony/index.js';
export { LegendaryFleet } from './fleet/index.js';
export type { LegendaryFleetJSON, LegendaryFleetInit, LegendaryShipId } from './fleet/index.js';
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
