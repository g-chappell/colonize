import { TileType } from '../map/tile.js';
import { UnitType } from '../unit/unit-type.js';
import { CombatResult } from './combat-result.js';
import { GroundCombatActionType } from './ground-combat-action.js';
import type { GroundCombatEvent } from './ground-combat-event.js';
import { assertValidGroundCombatant } from './ground-combatant.js';
import type { GroundCombatant } from './ground-combatant.js';

// Ground combat: rock-paper-scissors between three unit classes (marines beat
// pikemen, dragoons beat marines, pikemen beat dragoons), modulated by a
// per-TileType terrain defender-bonus. Mirrors the naval resolveCombat shape
// (deterministic on a seeded rng, pure function, emits an audit event stream).

export interface GroundCombatContext {
  readonly action: GroundCombatActionType;
  readonly terrain: TileType;
  readonly rng: () => number;
  // Optional scalar the orchestrator computes from the defender's
  // colony.buildings via getFortificationDefenderBonus. Composes
  // multiplicatively with terrainDefenderModifier in the damage rolls,
  // matching the terrain-modifier shape. Omitted = 1.0 (no fortification).
  // Per CLAUDE.md "Scalar seams for pre-registry axis values": the combat
  // resolver takes the scalar, the orchestrator owns the colony lookup.
  readonly defenderFortificationBonus?: number;
}

export const FORTIFICATION_NEUTRAL_MODIFIER = 1.0;

export interface GroundCombatOutcome {
  readonly action: GroundCombatActionType;
  readonly result: CombatResult;
  readonly attacker: GroundCombatant;
  readonly defender: GroundCombatant;
  readonly events: readonly GroundCombatEvent[];
  readonly rpsMultiplier: number;
  readonly terrainDefenderModifier: number;
  readonly defenderFortificationBonus: number;
}

const RPS_ADVANTAGE = 1.3;
const RPS_DISADVANTAGE = 0.7;
const RPS_NEUTRAL = 1.0;

const COUNTERATTACK_FACTOR = 0.6;
const PARTING_DAMAGE_FACTOR = 0.3;

// Upper-bound on the speed ratio's effect on flee success. Mirrors the naval
// flee formula so units that share baseMovement still have a meaningful chance
// to slip free when the attacker's initiative (rng roll) is low.
const MIN_FLEE_SUCCESS = 0.1;
const MAX_FLEE_SUCCESS = 0.9;

export function resolveGroundCombat(
  attacker: GroundCombatant,
  defender: GroundCombatant,
  context: GroundCombatContext,
): GroundCombatOutcome {
  assertValidGroundCombatant('attacker', attacker);
  assertValidGroundCombatant('defender', defender);
  if (typeof context !== 'object' || context === null) {
    throw new TypeError('resolveGroundCombat: context must be an object');
  }
  if (typeof context.rng !== 'function') {
    throw new TypeError('resolveGroundCombat: context.rng must be a function () => number');
  }
  if (attacker.hp === 0) {
    throw new RangeError('resolveGroundCombat: attacker is already routed (hp 0)');
  }
  if (defender.hp === 0) {
    throw new RangeError('resolveGroundCombat: defender is already routed (hp 0)');
  }
  const rpsMultiplier = getRpsMultiplier(attacker.type, defender.type);
  const terrainDefenderModifier = getTerrainDefenderModifier(context.terrain);
  const defenderFortificationBonus = normaliseFortificationBonus(
    context.defenderFortificationBonus,
  );
  switch (context.action) {
    case GroundCombatActionType.Engage:
      return resolveEngage(
        attacker,
        defender,
        context,
        rpsMultiplier,
        terrainDefenderModifier,
        defenderFortificationBonus,
      );
    case GroundCombatActionType.Flee:
      return resolveFlee(
        attacker,
        defender,
        context,
        rpsMultiplier,
        terrainDefenderModifier,
        defenderFortificationBonus,
      );
  }
}

function normaliseFortificationBonus(raw: number | undefined): number {
  if (raw === undefined) return FORTIFICATION_NEUTRAL_MODIFIER;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    throw new RangeError(
      `resolveGroundCombat: defenderFortificationBonus must be a positive finite number (got ${raw})`,
    );
  }
  return raw;
}

function resolveEngage(
  attacker: GroundCombatant,
  defender: GroundCombatant,
  context: GroundCombatContext,
  rpsMultiplier: number,
  terrainDefenderModifier: number,
  defenderFortificationBonus: number,
): GroundCombatOutcome {
  const events: GroundCombatEvent[] = [];
  const effectiveDefenderModifier = terrainDefenderModifier * defenderFortificationBonus;
  const attackerStrike = clampDamage(
    rollEngageDamage(attacker.attack, rpsMultiplier, effectiveDefenderModifier, context.rng),
    defender.hp,
  );
  const defenderAfter = withHp(defender, defender.hp - attackerStrike);
  events.push({
    kind: 'ground-volley',
    firer: 'attacker',
    damage: attackerStrike,
    targetHpAfter: defenderAfter.hp,
  });
  if (defenderAfter.hp === 0) {
    return {
      action: GroundCombatActionType.Engage,
      result: CombatResult.DefenderSunk,
      attacker,
      defender: defenderAfter,
      events,
      rpsMultiplier,
      terrainDefenderModifier,
      defenderFortificationBonus,
    };
  }
  // Defender counterattack is not shielded by terrain or fortifications —
  // the attacker has to leave cover to press the assault. Inverse RPS
  // multiplier: if attacker had the RPS advantage, the defender returns
  // fire at a disadvantage.
  const counterDamage = clampDamage(
    rollCounterDamage(defenderAfter.attack, rpsMultiplier, context.rng),
    attacker.hp,
  );
  const attackerAfter = withHp(attacker, attacker.hp - counterDamage);
  events.push({
    kind: 'ground-volley',
    firer: 'defender',
    damage: counterDamage,
    targetHpAfter: attackerAfter.hp,
  });
  const result = attackerAfter.hp === 0 ? CombatResult.AttackerSunk : CombatResult.Inconclusive;
  return {
    action: GroundCombatActionType.Engage,
    result,
    attacker: attackerAfter,
    defender: defenderAfter,
    events,
    rpsMultiplier,
    terrainDefenderModifier,
    defenderFortificationBonus,
  };
}

function resolveFlee(
  attacker: GroundCombatant,
  defender: GroundCombatant,
  context: GroundCombatContext,
  rpsMultiplier: number,
  terrainDefenderModifier: number,
  defenderFortificationBonus: number,
): GroundCombatOutcome {
  const success = rollFleeSuccess(attacker.type, defender.type, context.rng);
  const partingDamage = clampDamage(
    rollPartingDamage(defender.attack, rpsMultiplier, context.rng),
    attacker.hp,
  );
  const attackerAfter = withHp(attacker, attacker.hp - partingDamage);
  const events: GroundCombatEvent[] = [
    {
      kind: 'ground-flee-attempt',
      success,
      pursuerVolleyDamage: partingDamage,
      fleerHpAfter: attackerAfter.hp,
    },
  ];
  let result: CombatResult;
  if (attackerAfter.hp === 0) {
    result = CombatResult.AttackerSunk;
  } else if (success) {
    result = CombatResult.AttackerFled;
  } else {
    result = CombatResult.Inconclusive;
  }
  return {
    action: GroundCombatActionType.Flee,
    result,
    attacker: attackerAfter,
    defender,
    events,
    rpsMultiplier,
    terrainDefenderModifier,
    defenderFortificationBonus,
  };
}

function getRpsMultiplier(attackerType: UnitType, defenderType: UnitType): number {
  if (beats(attackerType, defenderType)) return RPS_ADVANTAGE;
  if (beats(defenderType, attackerType)) return RPS_DISADVANTAGE;
  return RPS_NEUTRAL;
}

function beats(a: UnitType, b: UnitType): boolean {
  return (
    (a === UnitType.Marines && b === UnitType.Pikemen) ||
    (a === UnitType.Dragoons && b === UnitType.Marines) ||
    (a === UnitType.Pikemen && b === UnitType.Dragoons)
  );
}

// Exhaustive switch on TileType — adding a new tile kind is a compile error
// here until the author picks a defender modifier for it (per CLAUDE.md
// "Consume save-format const-object unions via an exhaustive switch").
export function getTerrainDefenderModifier(tile: TileType): number {
  switch (tile) {
    case TileType.Island:
      return 1.25;
    case TileType.FloatingCity:
      return 1.5;
    case TileType.RedTide:
      return 0.75;
    case TileType.FataMorgana:
      return 1.0;
    case TileType.Ocean:
    case TileType.RayonPassage:
      return 1.0;
  }
}

function rollEngageDamage(
  attack: number,
  rpsMultiplier: number,
  terrainDefenderModifier: number,
  rng: () => number,
): number {
  const raw = (attack * rpsMultiplier * (0.5 + 0.5 * rng())) / terrainDefenderModifier;
  return Math.round(raw);
}

function rollCounterDamage(
  attack: number,
  attackerRpsMultiplier: number,
  rng: () => number,
): number {
  const inverse = 1 / attackerRpsMultiplier;
  return Math.round(attack * inverse * COUNTERATTACK_FACTOR * (0.5 + 0.5 * rng()));
}

function rollPartingDamage(attack: number, rpsMultiplier: number, rng: () => number): number {
  return Math.round((attack * PARTING_DAMAGE_FACTOR * rng()) / Math.max(1, rpsMultiplier));
}

function rollFleeSuccess(fleerType: UnitType, pursuerType: UnitType, rng: () => number): boolean {
  const fleerSpeed = groundBaseSpeed(fleerType);
  const pursuerSpeed = groundBaseSpeed(pursuerType);
  const ratio = fleerSpeed / Math.max(1, pursuerSpeed);
  const chance = clamp(0.5 + 0.4 * (ratio - 1), MIN_FLEE_SUCCESS, MAX_FLEE_SUCCESS);
  return rng() < chance;
}

// Local ground-type speed table — mirrors getUnitTypeDefinition baseMovement
// for the three ground kinds. Kept inline here (not through the registry) so
// the resolver remains a standalone pure function whose only state inputs are
// the combatants + rng. Cross-reference test in ground-resolve.test.ts pins
// the two copies together.
function groundBaseSpeed(type: UnitType): number {
  switch (type) {
    case UnitType.Dragoons:
      return 2;
    case UnitType.Marines:
    case UnitType.Pikemen:
      return 1;
    // Ground resolver only runs with ground types — the input validator in
    // assertValidGroundCombatant rules out every other UnitType before this
    // switch is reached, so the remaining branch is unreachable. Return 1
    // defensively to keep the exhaustiveness check happy if a future ground
    // type lands before it's added here.
    case UnitType.Scout:
    case UnitType.Settler:
    case UnitType.FoundingShip:
    case UnitType.Sloop:
    case UnitType.Brig:
    case UnitType.Frigate:
    case UnitType.ShipOfTheLine:
    case UnitType.Privateer:
    case UnitType.Cartographer:
    case UnitType.Explorer:
      return 1;
  }
}

function clampDamage(raw: number, ceiling: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  if (raw > ceiling) return ceiling;
  return raw;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function withHp(c: GroundCombatant, hp: number): GroundCombatant {
  return { ...c, hp };
}
