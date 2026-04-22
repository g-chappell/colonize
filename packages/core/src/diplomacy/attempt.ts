// attemptDiplomacyAction — the "execute one diplomacy action" verb that
// composes the three diplomacy primitives:
//
//   1. RelationsMatrix      — per-pair score + per-pair-per-action cooldowns
//   2. getDiplomacyActionEffect — per-action score delta + cooldown length
//   3. aiShouldAccept       — basic per-action threshold rule
//
// Orchestration stops here. Wiring this verb to a player action (UI button,
// hotkey), to AI faction turn loop (which actions to try, in what order), or
// to event broadcast (notify the target faction, log to history) belongs
// with the task that owns those surfaces. This module just answers: given a
// proposer, a target, an action, and the current turn, what happens?

import type { FactionId } from '../unit/unit.js';
import { aiShouldAccept, getDiplomacyActionEffect, isDiplomacyAction } from './diplomacy-action.js';
import type { DiplomacyAction } from './diplomacy-action.js';
import { RelationsMatrix } from './relations-matrix.js';

export type DiplomacyAttemptStatus =
  // The proposing action resolved favourably — either unilateral (always
  // accepted) or a proposal the AI's threshold rule accepted.
  | 'accepted'
  // A proposal the target declined. Only proposals produce this status;
  // unilateral actions always resolve "accepted" at this layer.
  | 'declined'
  // The action was not attempted because the pair is still locked out from
  // the same action's prior cooldown. Neither score nor cooldown changes.
  | 'blocked-cooldown'
  // Proposer and target must differ. Not attempted; neither score nor
  // cooldown changes.
  | 'invalid-same-faction';

export interface DiplomacyAttemptSuccess {
  readonly status: 'accepted' | 'declined';
  readonly action: DiplomacyAction;
  readonly proposer: FactionId;
  readonly target: FactionId;
  // Signed delta applied to the pair's relations score. May be 0 when the
  // action carries no decline penalty and the AI declined.
  readonly scoreDelta: number;
  // The (clamped) score *after* the delta has been applied.
  readonly newScore: number;
  // Absolute turn on which the matching cooldown expires. The pair is
  // locked out of repeating *this* action until `currentTurn >= cooldownUntil`.
  readonly cooldownUntil: number;
}

export interface DiplomacyAttemptBlocked {
  readonly status: 'blocked-cooldown';
  readonly action: DiplomacyAction;
  readonly proposer: FactionId;
  readonly target: FactionId;
  // Absolute turn on which the blocking cooldown expires. Caller can surface
  // "try again on turn N" without a second matrix read.
  readonly cooldownUntil: number;
}

export interface DiplomacyAttemptInvalid {
  readonly status: 'invalid-same-faction';
  readonly action: DiplomacyAction;
  readonly proposer: FactionId;
  readonly target: FactionId;
}

export type DiplomacyAttemptOutcome =
  | DiplomacyAttemptSuccess
  | DiplomacyAttemptBlocked
  | DiplomacyAttemptInvalid;

export interface DiplomacyAttemptParams {
  readonly matrix: RelationsMatrix;
  readonly proposer: FactionId;
  readonly target: FactionId;
  readonly action: DiplomacyAction;
  readonly currentTurn: number;
}

/**
 * Attempt a diplomacy action. Mutates {@link RelationsMatrix} when the
 * action resolves (score shift + cooldown lock). Does nothing when the
 * action is blocked by an active cooldown or targets the same faction.
 */
export function attemptDiplomacyAction(params: DiplomacyAttemptParams): DiplomacyAttemptOutcome {
  if (params === null || typeof params !== 'object') {
    throw new TypeError('attemptDiplomacyAction: params must be an object');
  }
  const { matrix, proposer, target, action, currentTurn } = params;
  if (!(matrix instanceof RelationsMatrix)) {
    throw new TypeError('attemptDiplomacyAction: params.matrix must be a RelationsMatrix');
  }
  if (typeof proposer !== 'string' || proposer.length === 0) {
    throw new TypeError('attemptDiplomacyAction: proposer must be a non-empty string');
  }
  if (typeof target !== 'string' || target.length === 0) {
    throw new TypeError('attemptDiplomacyAction: target must be a non-empty string');
  }
  if (!isDiplomacyAction(action)) {
    throw new TypeError(
      `attemptDiplomacyAction: action is not a valid DiplomacyAction (got ${String(action)})`,
    );
  }
  if (!Number.isInteger(currentTurn) || currentTurn < 1) {
    throw new RangeError(
      `attemptDiplomacyAction: currentTurn must be a positive integer (got ${currentTurn})`,
    );
  }

  if (proposer === target) {
    return { status: 'invalid-same-faction', action, proposer, target };
  }

  if (matrix.isOnCooldown(proposer, target, action, currentTurn)) {
    const cooldownUntil = matrix.getCooldownExpiry(proposer, target, action);
    // isOnCooldown returning true guarantees a non-null expiry.
    return {
      status: 'blocked-cooldown',
      action,
      proposer,
      target,
      cooldownUntil: cooldownUntil!,
    };
  }

  const effect = getDiplomacyActionEffect(action);
  const currentScore = matrix.getScore(proposer, target);
  const accepted = !effect.requiresAcceptance || aiShouldAccept(action, currentScore);
  const delta = accepted ? effect.acceptedScoreDelta : effect.declinedScoreDelta;
  const cooldownUntil = currentTurn + effect.cooldownTurns;

  const newScore = delta === 0 ? currentScore : matrix.shiftScore(proposer, target, delta);
  matrix.setCooldown(proposer, target, action, cooldownUntil);

  return {
    status: accepted ? 'accepted' : 'declined',
    action,
    proposer,
    target,
    scoreDelta: delta,
    newScore,
    cooldownUntil,
  };
}
