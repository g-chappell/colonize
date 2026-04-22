// Colony — the primitive for a founded settlement owned by a faction.
//
// Scope intentionally narrow: id, faction, position, population, crew roster,
// buildings, and a stockpile. Crew ids and building ids are opaque strings
// (ResourceId-style) because the profession and building registries are
// introduced later in EPIC-06 — keeping them string-typed here avoids a
// premature cross-module dependency. The stockpile reuses CargoHold so the
// delivery primitive (`CargoHold.transferTo`) works out of the box once a
// roster task wires ship-to-colony offload.
//
// Orchestration (founding, assigning crew to tiles, applying building
// production, turn-tick upkeep) lives with the task that owns the colony
// collection. See CLAUDE.md: "Ship the entity's primitive; leave iteration
// / scheduling to the task that owns the collection."

import { CargoHold } from '../cargo/cargo-hold.js';
import type { CargoHoldInit, CargoHoldJSON } from '../cargo/cargo-hold.js';
import type { Coord } from '../map/map.js';
import type { FactionId } from '../unit/unit.js';

export type CrewId = string;
export type BuildingId = string;

export interface ColonyJSON {
  readonly id: string;
  readonly faction: FactionId;
  readonly position: Coord;
  readonly population: number;
  readonly crew: readonly CrewId[];
  readonly buildings: readonly BuildingId[];
  readonly stocks: CargoHoldJSON;
}

export interface ColonyInit {
  readonly id: string;
  readonly faction: FactionId;
  readonly position: Coord;
  readonly population?: number;
  readonly crew?: readonly CrewId[];
  readonly buildings?: readonly BuildingId[];
  readonly stocks?: CargoHoldInit;
}

export class Colony {
  readonly id: string;
  readonly faction: FactionId;
  readonly stocks: CargoHold;
  private _position: Coord;
  private _population: number;
  private readonly _crew: Set<CrewId>;
  private readonly _buildings: Set<BuildingId>;

  constructor(init: ColonyInit) {
    if (typeof init.id !== 'string' || init.id.length === 0) {
      throw new TypeError('Colony id must be a non-empty string');
    }
    if (typeof init.faction !== 'string' || init.faction.length === 0) {
      throw new TypeError('Colony faction must be a non-empty string');
    }
    if (!isCoord(init.position)) {
      throw new TypeError('Colony position is not a valid Coord');
    }
    const population = init.population ?? 1;
    if (!Number.isInteger(population) || population < 0) {
      throw new RangeError(`Colony population must be a non-negative integer (got ${population})`);
    }
    this.id = init.id;
    this.faction = init.faction;
    this._position = { x: init.position.x, y: init.position.y };
    this._population = population;
    this._crew = new Set();
    this._buildings = new Set();
    if (init.crew !== undefined) {
      if (!Array.isArray(init.crew)) {
        throw new TypeError('Colony init.crew must be an array');
      }
      for (const id of init.crew) this.assignCrew(id);
    }
    if (init.buildings !== undefined) {
      if (!Array.isArray(init.buildings)) {
        throw new TypeError('Colony init.buildings must be an array');
      }
      for (const id of init.buildings) this.addBuilding(id);
    }
    this.stocks = new CargoHold(init.stocks);
  }

  get position(): Coord {
    return this._position;
  }

  get population(): number {
    return this._population;
  }

  get crew(): readonly CrewId[] {
    return [...this._crew].sort();
  }

  get buildings(): readonly BuildingId[] {
    return [...this._buildings].sort();
  }

  hasCrew(id: CrewId): boolean {
    return this._crew.has(id);
  }

  hasBuilding(id: BuildingId): boolean {
    return this._buildings.has(id);
  }

  adjustPopulation(delta: number): void {
    if (!Number.isInteger(delta)) {
      throw new RangeError(`adjustPopulation delta must be an integer (got ${delta})`);
    }
    const next = this._population + delta;
    if (next < 0) {
      throw new RangeError(
        `adjustPopulation would drop population below zero (${this._population} + ${delta})`,
      );
    }
    this._population = next;
  }

  assignCrew(id: CrewId): void {
    assertNonEmptyString('assignCrew', 'crew id', id);
    this._crew.add(id);
  }

  releaseCrew(id: CrewId): void {
    assertNonEmptyString('releaseCrew', 'crew id', id);
    if (!this._crew.has(id)) {
      throw new Error(`releaseCrew: crew "${id}" not assigned to colony "${this.id}"`);
    }
    this._crew.delete(id);
  }

  addBuilding(id: BuildingId): void {
    assertNonEmptyString('addBuilding', 'building id', id);
    this._buildings.add(id);
  }

  removeBuilding(id: BuildingId): void {
    assertNonEmptyString('removeBuilding', 'building id', id);
    if (!this._buildings.has(id)) {
      throw new Error(`removeBuilding: building "${id}" not present in colony "${this.id}"`);
    }
    this._buildings.delete(id);
  }

  toJSON(): ColonyJSON {
    return {
      id: this.id,
      faction: this.faction,
      position: { x: this._position.x, y: this._position.y },
      population: this._population,
      crew: [...this._crew].sort(),
      buildings: [...this._buildings].sort(),
      stocks: this.stocks.toJSON(),
    };
  }

  static fromJSON(data: ColonyJSON): Colony {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('ColonyJSON must be an object');
    }
    if (!Array.isArray(data.crew)) {
      throw new TypeError('ColonyJSON.crew must be an array');
    }
    if (!Array.isArray(data.buildings)) {
      throw new TypeError('ColonyJSON.buildings must be an array');
    }
    if (data.stocks === undefined || data.stocks === null) {
      throw new TypeError('ColonyJSON.stocks must be present');
    }
    return new Colony({
      id: data.id,
      faction: data.faction,
      position: data.position,
      population: data.population,
      crew: data.crew,
      buildings: data.buildings,
      stocks: data.stocks,
    });
  }
}

function isCoord(value: unknown): value is Coord {
  if (value === null || typeof value !== 'object') return false;
  const c = value as { x?: unknown; y?: unknown };
  return Number.isInteger(c.x) && Number.isInteger(c.y);
}

function assertNonEmptyString(op: string, label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: ${label} must be a non-empty string`);
  }
}
