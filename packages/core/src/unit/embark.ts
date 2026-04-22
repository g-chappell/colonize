// Embark / disembark — the predicates for a ground unit boarding a friendly
// ship, or leaving one to stand on a landable tile. Per "Ship the entity's
// primitive; leave iteration / scheduling to the task that owns the
// collection," these are *validation-only* functions: the caller decides
// whether to apply the state change. The orchestrator (future roster task)
// owns the actual `ship.id → passengers[]` map.
//
// Scalar seams: the caller supplies `shipCapacity` + `currentPassengerCount`
// (no registry field yet on SHIP_CLASSES; adding one is the orchestrator's
// call once the roster task lands) and `targetTile` (read from the map).

import type { Coord } from '../map/map.js';
import { TileType } from '../map/tile.js';
import type { FactionId } from './unit.js';
import { isGroundUnitType, isShipUnitType } from './unit-type.js';
import type { UnitType } from './unit-type.js';

export const EMBARK_MOVEMENT_COST = 1;
export const DISEMBARK_MOVEMENT_COST = 1;

// A disembarking ground unit must land on a tile the game treats as walkable.
// Mirrors FOUNDABLE_TILE_TYPES in the colony module — only islands and
// floating-city nodes are on-foot terrain in the Water World.
export const DISEMBARKABLE_TILE_TYPES: readonly TileType[] = [
  TileType.Island,
  TileType.FloatingCity,
];

export interface EmbarkableUnit {
  readonly id: string;
  readonly faction: FactionId;
  readonly type: UnitType;
  readonly position: Coord;
  readonly movement: number;
}

export interface CarrierShip {
  readonly id: string;
  readonly faction: FactionId;
  readonly type: UnitType;
  readonly position: Coord;
}

export type EmbarkCheck = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export interface EmbarkParams {
  readonly groundUnit: EmbarkableUnit;
  readonly ship: CarrierShip;
  readonly shipCapacity: number;
  readonly currentPassengerCount: number;
}

export function canEmbark(params: EmbarkParams): EmbarkCheck {
  const { groundUnit, ship, shipCapacity, currentPassengerCount } = params;
  if (groundUnit.id === ship.id) {
    return { ok: false, reason: 'embark: groundUnit and ship must be different units' };
  }
  if (!isGroundUnitType(groundUnit.type)) {
    return { ok: false, reason: `embark: unit type "${groundUnit.type}" is not a ground unit` };
  }
  if (!isShipUnitType(ship.type)) {
    return { ok: false, reason: `embark: carrier type "${ship.type}" is not a ship` };
  }
  if (groundUnit.faction !== ship.faction) {
    return {
      ok: false,
      reason: `embark: unit faction "${groundUnit.faction}" does not match ship faction "${ship.faction}"`,
    };
  }
  if (!sameTile(groundUnit.position, ship.position)) {
    return { ok: false, reason: 'embark: unit must occupy the same tile as the ship' };
  }
  if (groundUnit.movement < EMBARK_MOVEMENT_COST) {
    return {
      ok: false,
      reason: `embark: unit has insufficient movement (need ${EMBARK_MOVEMENT_COST}, have ${groundUnit.movement})`,
    };
  }
  if (!Number.isInteger(shipCapacity) || shipCapacity < 0) {
    return {
      ok: false,
      reason: `embark: shipCapacity must be a non-negative integer (got ${shipCapacity})`,
    };
  }
  if (!Number.isInteger(currentPassengerCount) || currentPassengerCount < 0) {
    return {
      ok: false,
      reason: `embark: currentPassengerCount must be a non-negative integer (got ${currentPassengerCount})`,
    };
  }
  if (currentPassengerCount >= shipCapacity) {
    return {
      ok: false,
      reason: `embark: ship is full (${currentPassengerCount} / ${shipCapacity})`,
    };
  }
  return { ok: true };
}

export interface DisembarkParams {
  readonly groundUnit: EmbarkableUnit;
  readonly ship: CarrierShip;
  readonly targetPosition: Coord;
  readonly targetTile: TileType;
}

export function canDisembark(params: DisembarkParams): EmbarkCheck {
  const { groundUnit, ship, targetPosition, targetTile } = params;
  if (groundUnit.id === ship.id) {
    return { ok: false, reason: 'disembark: groundUnit and ship must be different units' };
  }
  if (!isGroundUnitType(groundUnit.type)) {
    return { ok: false, reason: `disembark: unit type "${groundUnit.type}" is not a ground unit` };
  }
  if (!isShipUnitType(ship.type)) {
    return { ok: false, reason: `disembark: carrier type "${ship.type}" is not a ship` };
  }
  if (groundUnit.faction !== ship.faction) {
    return {
      ok: false,
      reason: `disembark: unit faction "${groundUnit.faction}" does not match ship faction "${ship.faction}"`,
    };
  }
  if (groundUnit.movement < DISEMBARK_MOVEMENT_COST) {
    return {
      ok: false,
      reason: `disembark: unit has insufficient movement (need ${DISEMBARK_MOVEMENT_COST}, have ${groundUnit.movement})`,
    };
  }
  if (!Number.isInteger(targetPosition.x) || !Number.isInteger(targetPosition.y)) {
    return { ok: false, reason: 'disembark: targetPosition must have integer x/y' };
  }
  if (!isAdjacentOrSame(ship.position, targetPosition)) {
    return {
      ok: false,
      reason: 'disembark: targetPosition must be adjacent to (or the same as) the ship',
    };
  }
  if (!(DISEMBARKABLE_TILE_TYPES as readonly string[]).includes(targetTile)) {
    return { ok: false, reason: `disembark: tile type "${targetTile}" is not landable` };
  }
  return { ok: true };
}

function sameTile(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

function isAdjacentOrSame(a: Coord, b: Coord): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx <= 1 && dy <= 1;
}
