import { CargoHold } from '../cargo/cargo-hold.js';
import type { CargoHoldInit, CargoHoldJSON } from '../cargo/cargo-hold.js';
import type { Coord } from '../map/map.js';
import { getUnitTypeDefinition, isUnitType } from './unit-type.js';
import type { UnitType } from './unit-type.js';

export type FactionId = string;

export interface UnitJSON {
  readonly id: string;
  readonly faction: FactionId;
  readonly position: Coord;
  readonly type: UnitType;
  readonly movement: number;
  readonly cargo: CargoHoldJSON;
}

export interface UnitInit {
  readonly id: string;
  readonly faction: FactionId;
  readonly position: Coord;
  readonly type: UnitType;
  readonly movement?: number;
  readonly cargo?: CargoHoldInit;
}

export class Unit {
  readonly id: string;
  readonly faction: FactionId;
  readonly type: UnitType;
  readonly cargo: CargoHold;
  private _position: Coord;
  private _movement: number;

  constructor(init: UnitInit) {
    if (typeof init.id !== 'string' || init.id.length === 0) {
      throw new TypeError('Unit id must be a non-empty string');
    }
    if (typeof init.faction !== 'string' || init.faction.length === 0) {
      throw new TypeError('Unit faction must be a non-empty string');
    }
    if (!isUnitType(init.type)) {
      throw new TypeError(`Unit type is not a valid UnitType: ${String(init.type)}`);
    }
    if (!isCoord(init.position)) {
      throw new TypeError('Unit position is not a valid Coord');
    }
    const def = getUnitTypeDefinition(init.type);
    const movement = init.movement ?? def.baseMovement;
    if (!Number.isInteger(movement) || movement < 0) {
      throw new RangeError(`Unit movement must be a non-negative integer (got ${movement})`);
    }
    if (movement > def.baseMovement) {
      throw new RangeError(
        `Unit movement ${movement} exceeds baseMovement ${def.baseMovement} for type ${init.type}`,
      );
    }
    this.id = init.id;
    this.faction = init.faction;
    this.type = init.type;
    this._position = { x: init.position.x, y: init.position.y };
    this._movement = movement;
    this.cargo = new CargoHold(init.cargo);
  }

  get position(): Coord {
    return this._position;
  }

  get movement(): number {
    return this._movement;
  }

  get maxMovement(): number {
    return getUnitTypeDefinition(this.type).baseMovement;
  }

  get canMove(): boolean {
    return this._movement > 0;
  }

  resetMovement(): void {
    this._movement = this.maxMovement;
  }

  spendMovement(cost: number): void {
    if (!Number.isInteger(cost) || cost < 0) {
      throw new RangeError(`spendMovement cost must be a non-negative integer (got ${cost})`);
    }
    if (cost > this._movement) {
      throw new RangeError(
        `spendMovement: cost ${cost} exceeds remaining movement ${this._movement}`,
      );
    }
    this._movement -= cost;
  }

  moveTo(position: Coord, cost: number): void {
    if (!isCoord(position)) {
      throw new TypeError('moveTo position is not a valid Coord');
    }
    this.spendMovement(cost);
    this._position = { x: position.x, y: position.y };
  }

  toJSON(): UnitJSON {
    return {
      id: this.id,
      faction: this.faction,
      position: { x: this._position.x, y: this._position.y },
      type: this.type,
      movement: this._movement,
      cargo: this.cargo.toJSON(),
    };
  }

  static fromJSON(data: UnitJSON): Unit {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('UnitJSON must be an object');
    }
    if (data.cargo === undefined || data.cargo === null) {
      throw new TypeError('UnitJSON.cargo must be present');
    }
    return new Unit({
      id: data.id,
      faction: data.faction,
      position: data.position,
      type: data.type,
      movement: data.movement,
      cargo: data.cargo,
    });
  }
}

function isCoord(value: unknown): value is Coord {
  if (value === null || typeof value !== 'object') return false;
  const c = value as { x?: unknown; y?: unknown };
  return Number.isInteger(c.x) && Number.isInteger(c.y);
}
