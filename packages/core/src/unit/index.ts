export {
  UnitType,
  ALL_UNIT_TYPES,
  SHIP_UNIT_TYPES,
  GROUND_UNIT_TYPES,
  isUnitType,
  isShipUnitType,
  isGroundUnitType,
  getUnitTypeDefinition,
} from './unit-type.js';
export type { UnitTypeDefinition } from './unit-type.js';
export { Unit } from './unit.js';
export type { UnitJSON, UnitInit, FactionId } from './unit.js';
export {
  DISEMBARKABLE_TILE_TYPES,
  DISEMBARK_MOVEMENT_COST,
  EMBARK_MOVEMENT_COST,
  canDisembark,
  canEmbark,
} from './embark.js';
export type {
  CarrierShip,
  DisembarkParams,
  EmbarkCheck,
  EmbarkParams,
  EmbarkableUnit,
} from './embark.js';
