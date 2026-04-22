import type { FactionId } from '../unit/unit.js';

// Stat snapshot supplied to the combat resolver. Per the scalar-seam pattern,
// the resolver does not look up ship-class registries — the caller (orchestrator)
// reads stats from packages/content's SHIP_CLASSES (or LegendaryShipSlot) and
// passes the values in. This keeps the combat module independent of which
// registry sources the numbers and avoids a content -> core dependency edge.
export interface Combatant {
  readonly id: string;
  readonly faction: FactionId;
  readonly hull: number;
  readonly maxHull: number;
  readonly guns: number;
  readonly crew: number;
  readonly maxCrew: number;
  readonly movement: number;
  readonly maxMovement: number;
}

export function assertValidCombatant(label: string, c: Combatant): void {
  if (typeof c !== 'object' || c === null) {
    throw new TypeError(`${label} must be a Combatant object`);
  }
  if (typeof c.id !== 'string' || c.id.length === 0) {
    throw new TypeError(`${label}.id must be a non-empty string`);
  }
  if (typeof c.faction !== 'string' || c.faction.length === 0) {
    throw new TypeError(`${label}.faction must be a non-empty string`);
  }
  assertNonNegativeInt(label, 'hull', c.hull);
  assertPositiveInt(label, 'maxHull', c.maxHull);
  assertNonNegativeInt(label, 'guns', c.guns);
  assertNonNegativeInt(label, 'crew', c.crew);
  assertPositiveInt(label, 'maxCrew', c.maxCrew);
  assertNonNegativeInt(label, 'movement', c.movement);
  assertNonNegativeInt(label, 'maxMovement', c.maxMovement);
  if (c.hull > c.maxHull) {
    throw new RangeError(`${label}.hull ${c.hull} exceeds maxHull ${c.maxHull}`);
  }
  if (c.crew > c.maxCrew) {
    throw new RangeError(`${label}.crew ${c.crew} exceeds maxCrew ${c.maxCrew}`);
  }
  if (c.movement > c.maxMovement) {
    throw new RangeError(`${label}.movement ${c.movement} exceeds maxMovement ${c.maxMovement}`);
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
