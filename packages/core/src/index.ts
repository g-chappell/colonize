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
export {
  UnitType,
  ALL_UNIT_TYPES,
  SHIP_UNIT_TYPES,
  GROUND_UNIT_TYPES,
  isUnitType,
  isShipUnitType,
  isGroundUnitType,
  getUnitTypeDefinition,
  Unit,
  DISEMBARKABLE_TILE_TYPES,
  DISEMBARK_MOVEMENT_COST,
  EMBARK_MOVEMENT_COST,
  canDisembark,
  canEmbark,
} from './unit/index.js';
export type {
  UnitTypeDefinition,
  UnitJSON,
  UnitInit,
  FactionId,
  CarrierShip,
  DisembarkParams,
  EmbarkCheck,
  EmbarkParams,
  EmbarkableUnit,
} from './unit/index.js';
export { CargoHold } from './cargo/index.js';
export type { CargoHoldJSON, CargoHoldInit, ResourceId, ArtifactId } from './cargo/index.js';
export {
  BuildingType,
  ALL_BUILDING_TYPES,
  isBuildingType,
  getBuildingDefinition,
} from './building/index.js';
export type { BuildingDefinition } from './building/index.js';
export {
  ResourceType,
  ALL_RESOURCE_TYPES,
  isResourceType,
  RecipeId,
  ALL_RECIPE_IDS,
  ALL_RECIPE_DEFINITIONS,
  isRecipeId,
  getRecipeDefinition,
  tickRecipe,
} from './resource/index.js';
export type {
  RecipeDefinition,
  RecipeIngredient,
  RecipeTickOutcome,
  RecipeProducedOutcome,
  RecipeMissingBuildingOutcome,
  RecipeInsufficientInputsOutcome,
  RecipeConsumedIngredient,
  RecipeMissingIngredient,
} from './resource/index.js';
export {
  ProfessionType,
  ALL_PROFESSION_TYPES,
  isProfessionType,
  getProfessionYieldMultiplier,
  getProfessionBuildingMultiplier,
  applyProfessionBonusToYield,
} from './profession/index.js';
export {
  TrainingOrder,
  isTrainingBuilding,
  canTrainAt,
  getTrainingDuration,
  listTrainingOfferings,
} from './training/index.js';
export type { TrainingOrderInit, TrainingOrderJSON } from './training/index.js';
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
  HomePort,
  PRICE_SPREAD,
  MIN_MID_PRICE,
  MAX_MID_PRICE,
  PRICE_VOLUME_STEP,
  PRICE_DRIFT_STEP,
} from './homeport/index.js';
export type { HomePortJSON, HomePortInit } from './homeport/index.js';
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
export {
  CombatActionType,
  ALL_COMBAT_ACTION_TYPES,
  isCombatActionType,
  CombatResult,
  ALL_COMBAT_RESULTS,
  isCombatResult,
  assertValidCombatant,
  resolveCombat,
  GroundCombatActionType,
  ALL_GROUND_COMBAT_ACTION_TYPES,
  isGroundCombatActionType,
  assertValidGroundCombatant,
  resolveGroundCombat,
  getTerrainDefenderModifier,
} from './combat/index.js';
export type {
  Combatant,
  CombatContext,
  CombatOutcome,
  CombatEvent,
  CombatSide,
  GroundCombatant,
  GroundCombatContext,
  GroundCombatOutcome,
  GroundCombatEvent,
} from './combat/index.js';
export {
  DiplomacyAction,
  ALL_DIPLOMACY_ACTIONS,
  isDiplomacyAction,
  getDiplomacyActionEffect,
  aiShouldAccept,
  RelationsMatrix,
  MIN_RELATIONS_SCORE,
  MAX_RELATIONS_SCORE,
  NEUTRAL_RELATIONS_SCORE,
  attemptDiplomacyAction,
} from './diplomacy/index.js';
export type {
  DiplomacyActionEffect,
  RelationsMatrixJSON,
  RelationsMatrixInit,
  RelationsEntryJSON,
  DiplomacyAttemptOutcome,
  DiplomacyAttemptSuccess,
  DiplomacyAttemptBlocked,
  DiplomacyAttemptInvalid,
  DiplomacyAttemptStatus,
  DiplomacyAttemptParams,
} from './diplomacy/index.js';
export {
  ALL_PLAYABLE_FACTION_IDS,
  FACTION_BONUSES,
  isPlayableFactionId,
  getFactionBonus,
  factionPathfindFlags,
  factionColonyProductionMultiplier,
  factionBuildingCostMultiplier,
  factionCombatDamageMultiplier,
  factionRaidLootMultiplier,
  factionHasOpenOceanStealth,
  factionCanRedeemLegendaryBlueprint,
  factionGrantsFreeSoldierPerColonyPerTurn,
} from './faction/index.js';
export type { PlayableFactionId, FactionBonus } from './faction/index.js';
export {
  CHIME_PRODUCING_BUILDINGS,
  LIBERTY_CHIMES_THRESHOLDS,
  buildingChimeRate,
  chimesFromBuildings,
  isChimeProducingBuilding,
  isCouncilThreshold,
  ChimesLedger,
} from './chimes/index.js';
export type { ChimesLedgerInit, ChimesLedgerJSON, CouncilEvent } from './chimes/index.js';
export {
  CharterBonusAxis,
  ALL_CHARTER_BONUS_AXES,
  isCharterBonusAxis,
  ArchiveCharterId,
  ARCHIVE_CHARTERS,
  ALL_ARCHIVE_CHARTER_IDS,
  isArchiveCharterId,
  getArchiveCharter,
  aggregateCharterEffects,
  FactionCharters,
} from './charter/index.js';
export type {
  ArchiveCharter,
  CharterEffect,
  FactionChartersInit,
  FactionChartersJSON,
  CharterHand,
} from './charter/index.js';
export {
  DEFAULT_TITHE_RATES,
  CONCORD_TENSION_THRESHOLDS,
  isConcordTensionThreshold,
  calculateTithe,
  yearMultiplier,
  ConcordTensionMeter,
  DEFAULT_SOVEREIGNTY_TRIGGER_THRESHOLDS,
  canDeclareSovereignty,
  sovereigntyTriggerStatus,
  ConcordFleetCampaign,
} from './concord/index.js';
export type {
  TitheRates,
  TitheParams,
  ConcordTensionMeterInit,
  ConcordTensionMeterJSON,
  ConcordUltimatumEvent,
  SovereigntyTriggerInputs,
  SovereigntyTriggerStatus,
  SovereigntyTriggerThresholds,
  ConcordCampaignOutcome,
  ConcordDifficultyId,
  ConcordFleetCampaignInit,
  ConcordFleetCampaignJSON,
  ConcordFleetGroundUnitId,
  ConcordFleetPendingWave,
  ConcordFleetShipUnitId,
  ConcordFleetWave,
} from './concord/index.js';
export {
  EndgameKind,
  ALL_ENDGAME_KINDS,
  isEndgameKind,
  EndgameResult,
  ALL_ENDGAME_RESULTS,
  isEndgameResult,
  checkEndgame,
  endgameKindForResult,
} from './endgame/index.js';
export type { EndgameOutcome, EndgameCheckInputs } from './endgame/index.js';
export {
  MerchantRoute,
  MerchantRouteActionKind,
  ALL_MERCHANT_ROUTE_ACTION_KINDS,
  isMerchantRouteActionKind,
  AutoRoute,
  AutoRouteStatus,
  ALL_AUTO_ROUTE_STATUSES,
  isAutoRouteStatus,
  tickMerchantRoute,
} from './route/index.js';
export type {
  MerchantRouteJSON,
  MerchantRouteInit,
  MerchantRouteId,
  MerchantRouteAction,
  MerchantRouteStop,
  ColonyId,
  AutoRouteJSON,
  AutoRouteInit,
  TickMerchantRouteInput,
  TickMerchantRouteResult,
  MerchantRouteActionOutcome,
} from './route/index.js';
