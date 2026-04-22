// FoundColony action — the founding primitive.
//
// Pure(ish) function: validates the founding unit + tile, creates a new
// Colony seeded with the unit's position and faction, transfers any cargo
// the unit was carrying into the colony stockpile, and returns the id of
// the unit to consume. Removing the consumed unit from the roster, and
// inserting the returned Colony into the colony collection, are the
// caller's responsibility — see CLAUDE.md "Ship the entity's primitive;
// leave iteration / scheduling to the task that owns the collection."
//
// Floating-city tiles grant a +1 starting-population bonus (canon: a
// floating-city node is a pre-existing population hub; founding there is
// more of a claiming ceremony than a pioneer landing).

import { GameMap } from '../map/map.js';
import type { Coord } from '../map/map.js';
import { TileType } from '../map/tile.js';
import { UnitType } from '../unit/unit-type.js';
import type { Unit } from '../unit/unit.js';
import { Colony } from './colony.js';

export const FOUNDABLE_TILE_TYPES: readonly TileType[] = [TileType.Island, TileType.FloatingCity];

const FLOATING_CITY_POPULATION_BONUS = 1;
const DEFAULT_STARTING_POPULATION = 1;

export interface FoundColonyParams {
  readonly unit: Unit;
  readonly map: GameMap;
  readonly colonyId: string;
  readonly existingColonyPositions?: readonly Coord[];
}

export interface FoundColonyResult {
  readonly colony: Colony;
  readonly consumedUnitId: string;
}

export function canFoundColonyAt(map: GameMap, position: Coord): boolean {
  if (!(map instanceof GameMap)) return false;
  if (!Number.isInteger(position.x) || !Number.isInteger(position.y)) return false;
  if (!map.inBounds(position.x, position.y)) return false;
  const tile = map.get(position.x, position.y);
  return (FOUNDABLE_TILE_TYPES as readonly string[]).includes(tile);
}

export function foundColony(params: FoundColonyParams): FoundColonyResult {
  const { unit, map, colonyId, existingColonyPositions } = params;
  if (typeof colonyId !== 'string' || colonyId.length === 0) {
    throw new TypeError('foundColony: colonyId must be a non-empty string');
  }
  if (unit.type !== UnitType.FoundingShip) {
    throw new Error(`foundColony: unit ${unit.id} of type "${unit.type}" cannot found a colony`);
  }
  const { x, y } = unit.position;
  if (!map.inBounds(x, y)) {
    throw new RangeError(`foundColony: unit position (${x}, ${y}) is off the map`);
  }
  const tile = map.get(x, y);
  if (!(FOUNDABLE_TILE_TYPES as readonly string[]).includes(tile)) {
    throw new Error(`foundColony: tile type "${tile}" at (${x}, ${y}) is not foundable`);
  }
  if (existingColonyPositions) {
    for (const pos of existingColonyPositions) {
      if (pos.x === x && pos.y === y) {
        throw new Error(`foundColony: a colony already exists at (${x}, ${y})`);
      }
    }
  }
  const bonus = tile === TileType.FloatingCity ? FLOATING_CITY_POPULATION_BONUS : 0;
  const colony = new Colony({
    id: colonyId,
    faction: unit.faction,
    position: { x, y },
    population: DEFAULT_STARTING_POPULATION + bonus,
  });
  unit.cargo.transferTo(colony.stocks);
  return { colony, consumedUnitId: unit.id };
}
