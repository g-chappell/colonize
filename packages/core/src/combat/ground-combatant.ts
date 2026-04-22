import { isGroundUnitType } from '../unit/unit-type.js';
import type { UnitType } from '../unit/unit-type.js';
import type { FactionId } from '../unit/unit.js';

// Stat snapshot supplied to the ground-combat resolver. Per the scalar-seam
// pattern, the resolver does not look up GROUND_CLASSES — the caller
// (orchestrator) reads hp/attack/defense from packages/content and passes the
// values in. `type` stays on the combatant because the resolver owns the
// rock-paper-scissors matrix (balance tuning is rule-relevant, lives in core).
export interface GroundCombatant {
  readonly id: string;
  readonly faction: FactionId;
  readonly type: UnitType;
  readonly hp: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
}

export function assertValidGroundCombatant(label: string, c: GroundCombatant): void {
  if (typeof c !== 'object' || c === null) {
    throw new TypeError(`${label} must be a GroundCombatant object`);
  }
  if (typeof c.id !== 'string' || c.id.length === 0) {
    throw new TypeError(`${label}.id must be a non-empty string`);
  }
  if (typeof c.faction !== 'string' || c.faction.length === 0) {
    throw new TypeError(`${label}.faction must be a non-empty string`);
  }
  if (!isGroundUnitType(c.type)) {
    throw new TypeError(`${label}.type must be a ground UnitType (got ${String(c.type)})`);
  }
  assertNonNegativeInt(label, 'hp', c.hp);
  assertPositiveInt(label, 'maxHp', c.maxHp);
  assertNonNegativeInt(label, 'attack', c.attack);
  assertNonNegativeInt(label, 'defense', c.defense);
  if (c.hp > c.maxHp) {
    throw new RangeError(`${label}.hp ${c.hp} exceeds maxHp ${c.maxHp}`);
  }
}

function assertNonNegativeInt(label: string, field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label}.${field} must be a non-negative integer (got ${value})`);
  }
}

function assertPositiveInt(label: string, field: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label}.${field} must be a positive integer (got ${value})`);
  }
}
