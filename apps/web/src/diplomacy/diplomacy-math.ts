// Pure math for the diplomacy screen. Given a RelationsMatrix, the
// player's faction id, the list of other factions, the current turn,
// and the (optional) most-recent attempt outcome, produce one panel
// descriptor per target faction. Each panel carries the score + stance
// label + per-action availability (on cooldown? which turn frees it?).
//
// Lives as a sibling of DiplomacyScreen.tsx for symmetry with
// trade-math / transfer-math — keeps arithmetic + action-row decisions
// testable without mounting a component.

import {
  ALL_DIPLOMACY_ACTIONS,
  getDiplomacyActionEffect,
  MAX_RELATIONS_SCORE,
  MIN_RELATIONS_SCORE,
  type DiplomacyAction,
  type DiplomacyAttemptOutcome,
  type RelationsMatrix,
} from '@colonize/core';

export type RelationsStance = 'hostile' | 'tense' | 'neutral' | 'warm' | 'allied';

export interface DiplomacyActionRow {
  readonly action: DiplomacyAction;
  readonly onCooldown: boolean;
  // Absolute turn on which the cooldown expires (null when no cooldown
  // has been recorded for this pair + action).
  readonly cooldownUntil: number | null;
  // True when the action is a proposal that the target can decline.
  // The UI surfaces this via a "may be declined" hint in the confirm
  // modal; unilateral actions carry no such risk.
  readonly requiresAcceptance: boolean;
  // Positive for friendly actions, negative for hostile. The UI colours
  // the row by sign without knowing the specifics of each action.
  readonly acceptedScoreDelta: number;
}

export interface DiplomacyFactionPanel {
  readonly factionId: string;
  readonly score: number;
  readonly stance: RelationsStance;
  // Per-action row descriptors in a stable ALL_DIPLOMACY_ACTIONS order.
  readonly rows: readonly DiplomacyActionRow[];
  // Human-readable summary of the most recent attempt targeting this
  // faction, if one is cached in the store and points at this target.
  // Null otherwise — panels for other targets continue to show blank.
  readonly lastActionSummary: string | null;
}

/**
 * Derive a coarse stance label from a score in [-100, 100]. Thresholds
 * match the AI accept/decline thresholds in `aiShouldAccept` so the UI
 * doesn't tell the player "allied" while the AI refuses an alliance:
 *
 *   score ≥ +50  → "allied"   (the Alliance acceptance threshold)
 *   +50 > score ≥ +20 → "warm"
 *   +20 > score > -20 → "neutral"
 *   -20 ≥ score > -50 → "tense"
 *   score ≤ -50  → "hostile"  (the Peace acceptance threshold)
 */
export function stanceFromScore(score: number): RelationsStance {
  if (!Number.isFinite(score)) {
    throw new RangeError(`stanceFromScore: score must be finite (got ${score})`);
  }
  if (score < MIN_RELATIONS_SCORE || score > MAX_RELATIONS_SCORE) {
    throw new RangeError(
      `stanceFromScore: score ${score} out of range [${MIN_RELATIONS_SCORE}, ${MAX_RELATIONS_SCORE}]`,
    );
  }
  if (score >= 50) return 'allied';
  if (score >= 20) return 'warm';
  if (score > -20) return 'neutral';
  if (score > -50) return 'tense';
  return 'hostile';
}

/**
 * Short human-readable summary of the most recent attempt outcome.
 * Null when the outcome targets a different faction than `forTarget`,
 * or when no outcome is cached. The UI renders this as "Last action:
 * …" under the stance chip on the target panel.
 */
export function describeOutcome(
  outcome: DiplomacyAttemptOutcome | null,
  forTarget: string,
): string | null {
  if (outcome === null) return null;
  if (outcome.target !== forTarget) return null;
  const actionLabel = outcome.action;
  switch (outcome.status) {
    case 'accepted':
      return `${actionLabel} — accepted (${formatDelta(outcome.scoreDelta)})`;
    case 'declined':
      return `${actionLabel} — declined (${formatDelta(outcome.scoreDelta)})`;
    case 'blocked-cooldown':
      return `${actionLabel} — cooldown until turn ${outcome.cooldownUntil}`;
    case 'invalid-same-faction':
      return `${actionLabel} — invalid target`;
  }
}

function formatDelta(delta: number): string {
  if (delta === 0) return '±0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/**
 * Build the per-faction panel list. `targets` is the caller-supplied
 * list of *other* factions (player's own faction should be excluded by
 * the caller); this function does no filtering of its own so tests can
 * feed synthetic faction sets.
 */
export function computeDiplomacyPanels(params: {
  readonly matrix: RelationsMatrix;
  readonly proposer: string;
  readonly targets: readonly string[];
  readonly currentTurn: number;
  readonly lastOutcome: DiplomacyAttemptOutcome | null;
}): readonly DiplomacyFactionPanel[] {
  const { matrix, proposer, targets, currentTurn, lastOutcome } = params;
  if (!Number.isInteger(currentTurn) || currentTurn < 1) {
    throw new RangeError(
      `computeDiplomacyPanels: currentTurn must be a positive integer (got ${currentTurn})`,
    );
  }
  const panels: DiplomacyFactionPanel[] = [];
  for (const target of targets) {
    if (target === proposer) continue;
    const score = matrix.getScore(proposer, target);
    const rows: DiplomacyActionRow[] = [];
    for (const action of ALL_DIPLOMACY_ACTIONS) {
      const effect = getDiplomacyActionEffect(action);
      const cooldownUntil = matrix.getCooldownExpiry(proposer, target, action);
      const onCooldown = cooldownUntil !== null && currentTurn < cooldownUntil;
      rows.push({
        action,
        onCooldown,
        cooldownUntil,
        requiresAcceptance: effect.requiresAcceptance,
        acceptedScoreDelta: effect.acceptedScoreDelta,
      });
    }
    panels.push({
      factionId: target,
      score,
      stance: stanceFromScore(score),
      rows,
      lastActionSummary: describeOutcome(lastOutcome, target),
    });
  }
  return panels;
}
