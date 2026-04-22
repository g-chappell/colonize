import { CombatActionType } from './combat-action.js';
import type { CombatEvent } from './combat-event.js';
import { CombatResult } from './combat-result.js';
import { assertValidCombatant } from './combatant.js';
import type { Combatant } from './combatant.js';

export interface CombatContext {
  readonly action: CombatActionType;
  readonly rng: () => number;
}

export interface CombatOutcome {
  readonly action: CombatActionType;
  readonly result: CombatResult;
  readonly attacker: Combatant;
  readonly defender: Combatant;
  readonly events: readonly CombatEvent[];
}

// Cap on attritional rounds for boarding actions to prevent pathological
// non-terminating sequences when both crews are large and per-round damage
// rolls low. Eight rounds is enough for the boarding model below to almost
// always reach a decisive end at typical (70-500) crew sizes; a draw at the
// cap returns CombatResult.Inconclusive so the caller can decide what to do.
const BOARDING_ROUND_CAP = 8;

const RETURN_FIRE_DAMAGE_FACTOR = 0.5;

export function resolveCombat(
  attacker: Combatant,
  defender: Combatant,
  context: CombatContext,
): CombatOutcome {
  assertValidCombatant('attacker', attacker);
  assertValidCombatant('defender', defender);
  if (typeof context !== 'object' || context === null) {
    throw new TypeError('resolveCombat: context must be an object');
  }
  if (typeof context.rng !== 'function') {
    throw new TypeError('resolveCombat: context.rng must be a function () => number');
  }
  if (attacker.hull === 0) {
    throw new RangeError('resolveCombat: attacker is already disabled (hull 0)');
  }
  if (defender.hull === 0) {
    throw new RangeError('resolveCombat: defender is already disabled (hull 0)');
  }
  switch (context.action) {
    case CombatActionType.Broadside:
      return resolveBroadside(attacker, defender, context.rng);
    case CombatActionType.Boarding:
      return resolveBoarding(attacker, defender, context.rng);
    case CombatActionType.Ram:
      return resolveRam(attacker, defender, context.rng);
    case CombatActionType.Flee:
      return resolveFlee(attacker, defender, context.rng);
  }
}

function resolveBroadside(
  attacker: Combatant,
  defender: Combatant,
  rng: () => number,
): CombatOutcome {
  const events: CombatEvent[] = [];
  const openingDamage = clampDamage(rollVolleyDamage(attacker.guns, rng), defender.hull);
  const defenderAfterOpening = withHull(defender, defender.hull - openingDamage);
  events.push({
    kind: 'broadside-volley',
    firer: 'attacker',
    damage: openingDamage,
    targetHullAfter: defenderAfterOpening.hull,
  });
  if (defenderAfterOpening.hull === 0) {
    return {
      action: CombatActionType.Broadside,
      result: CombatResult.DefenderSunk,
      attacker,
      defender: defenderAfterOpening,
      events,
    };
  }
  const returnDamage = clampDamage(
    rollReturnFireDamage(defenderAfterOpening.guns, rng),
    attacker.hull,
  );
  const attackerAfterReturn = withHull(attacker, attacker.hull - returnDamage);
  events.push({
    kind: 'broadside-volley',
    firer: 'defender',
    damage: returnDamage,
    targetHullAfter: attackerAfterReturn.hull,
  });
  const result =
    attackerAfterReturn.hull === 0 ? CombatResult.AttackerSunk : CombatResult.Inconclusive;
  return {
    action: CombatActionType.Broadside,
    result,
    attacker: attackerAfterReturn,
    defender: defenderAfterOpening,
    events,
  };
}

function resolveBoarding(
  attacker: Combatant,
  defender: Combatant,
  rng: () => number,
): CombatOutcome {
  const events: CombatEvent[] = [];
  let a = attacker;
  let d = defender;
  for (let round = 0; round < BOARDING_ROUND_CAP; round++) {
    if (a.crew === 0 || d.crew === 0) break;
    const attackerCasualties = clampDamage(rollBoardingCasualties(d.crew, rng), a.crew);
    const defenderCasualties = clampDamage(
      rollBoardingCasualties(a.crew, rng, /* attackerInitiates */ true),
      d.crew,
    );
    a = withCrew(a, a.crew - attackerCasualties);
    d = withCrew(d, d.crew - defenderCasualties);
    events.push({
      kind: 'boarding-round',
      attackerCasualties,
      defenderCasualties,
      attackerCrewAfter: a.crew,
      defenderCrewAfter: d.crew,
    });
  }
  // The asymmetric initiator factor (0.12 vs 0.10) means whichever side reaches
  // zero crew first reaches it strictly before the other under typical play, so
  // the MutualSunk branch only triggers for degenerate inputs (both crews zero
  // on entry). Ram is the realistic path to MutualSunk; this branch is here for
  // completeness so a zero-crew boarding scenario still classifies cleanly.
  let result: CombatResult;
  if (a.crew === 0 && d.crew === 0) {
    result = CombatResult.MutualSunk;
  } else if (a.crew === 0) {
    result = CombatResult.AttackerCaptured;
  } else if (d.crew === 0) {
    result = CombatResult.DefenderCaptured;
  } else {
    result = CombatResult.Inconclusive;
  }
  return {
    action: CombatActionType.Boarding,
    result,
    attacker: a,
    defender: d,
    events,
  };
}

function resolveRam(attacker: Combatant, defender: Combatant, rng: () => number): CombatOutcome {
  const defenderDamage = clampDamage(rollRamDamage(attacker.maxHull, 0.4, rng), defender.hull);
  const attackerDamage = clampDamage(rollRamDamage(defender.maxHull, 0.25, rng), attacker.hull);
  const attackerAfter = withHull(attacker, attacker.hull - attackerDamage);
  const defenderAfter = withHull(defender, defender.hull - defenderDamage);
  const events: CombatEvent[] = [
    {
      kind: 'ram-impact',
      attackerHullDamage: attackerDamage,
      defenderHullDamage: defenderDamage,
      attackerHullAfter: attackerAfter.hull,
      defenderHullAfter: defenderAfter.hull,
    },
  ];
  let result: CombatResult;
  if (attackerAfter.hull === 0 && defenderAfter.hull === 0) {
    result = CombatResult.MutualSunk;
  } else if (defenderAfter.hull === 0) {
    result = CombatResult.DefenderSunk;
  } else if (attackerAfter.hull === 0) {
    result = CombatResult.AttackerSunk;
  } else {
    result = CombatResult.Inconclusive;
  }
  return {
    action: CombatActionType.Ram,
    result,
    attacker: attackerAfter,
    defender: defenderAfter,
    events,
  };
}

function resolveFlee(attacker: Combatant, defender: Combatant, rng: () => number): CombatOutcome {
  const success = rollFleeSuccess(attacker.movement, defender.movement, rng);
  const partingShot = clampDamage(rollPartingShotDamage(defender.guns, rng), attacker.hull);
  const attackerAfter = withHull(attacker, attacker.hull - partingShot);
  const events: CombatEvent[] = [
    {
      kind: 'flee-attempt',
      success,
      pursuerVolleyDamage: partingShot,
      fleerHullAfter: attackerAfter.hull,
    },
  ];
  let result: CombatResult;
  if (attackerAfter.hull === 0) {
    result = CombatResult.AttackerSunk;
  } else if (success) {
    result = CombatResult.AttackerFled;
  } else {
    result = CombatResult.Inconclusive;
  }
  return {
    action: CombatActionType.Flee,
    result,
    attacker: attackerAfter,
    defender,
    events,
  };
}

function rollVolleyDamage(guns: number, rng: () => number): number {
  return Math.round(guns * (0.4 + 0.6 * rng()));
}

function rollReturnFireDamage(guns: number, rng: () => number): number {
  return Math.round(guns * RETURN_FIRE_DAMAGE_FACTOR * (0.4 + 0.6 * rng()));
}

function rollBoardingCasualties(
  opposingCrew: number,
  rng: () => number,
  initiator = false,
): number {
  const factor = initiator ? 0.12 : 0.1;
  return Math.round(opposingCrew * factor * (0.5 + rng()));
}

function rollRamDamage(rammerMaxHull: number, severity: number, rng: () => number): number {
  return Math.round(rammerMaxHull * severity * (0.5 + rng()));
}

function rollFleeSuccess(fleerMov: number, pursuerMov: number, rng: () => number): boolean {
  const ratio = fleerMov / Math.max(1, pursuerMov);
  const successChance = clamp(0.5 + 0.4 * (ratio - 1), 0.1, 0.9);
  return rng() < successChance;
}

function rollPartingShotDamage(guns: number, rng: () => number): number {
  return Math.round(guns * 0.3 * rng());
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

function withHull(c: Combatant, hull: number): Combatant {
  return { ...c, hull };
}

function withCrew(c: Combatant, crew: number): Combatant {
  return { ...c, crew };
}
