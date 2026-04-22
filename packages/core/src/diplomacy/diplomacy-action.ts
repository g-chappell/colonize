// Diplomacy actions — the per-action score delta, cooldown length, and AI
// acceptance rules. Kept as a pure lookup module so consumers can reason
// about an action's effect without touching the RelationsMatrix primitive.
//
// The action identifier is a string-literal const-object (save-format-bound
// via the attempt outcome's `action` field and any future event log), and
// consumers read it through `getDiplomacyActionEffect(action)` which is an
// exhaustive `switch` with no default — adding a new action surfaces as a
// compile error at every consumer. See CLAUDE.md "Consume save-format
// const-object unions via an exhaustive switch with no default case."

export const DiplomacyAction = {
  DeclareWar: 'declare-war',
  ProposePeace: 'propose-peace',
  ProposeAlliance: 'propose-alliance',
  GiftResources: 'gift-resources',
  Denounce: 'denounce',
  ShareIntel: 'share-intel',
} as const;

export type DiplomacyAction = (typeof DiplomacyAction)[keyof typeof DiplomacyAction];

export const ALL_DIPLOMACY_ACTIONS: readonly DiplomacyAction[] = Object.values(DiplomacyAction);

export function isDiplomacyAction(value: unknown): value is DiplomacyAction {
  return typeof value === 'string' && (ALL_DIPLOMACY_ACTIONS as readonly string[]).includes(value);
}

export interface DiplomacyActionEffect {
  // Score delta applied when the action resolves "accepted" (or unconditionally
  // for unilateral actions). Sign carries meaning: negative for hostile actions.
  readonly acceptedScoreDelta: number;
  // Score delta applied when the action resolves "declined". Zero for unilateral
  // actions that do not require acceptance.
  readonly declinedScoreDelta: number;
  // Turns (inclusive) the pair is locked out of repeating this same action.
  // Cooldown is set to `currentTurn + cooldownTurns`.
  readonly cooldownTurns: number;
  // Whether the action is a proposal that the target can accept or decline.
  // Unilateral actions (declare-war, denounce, gift-resources, share-intel)
  // always resolve accepted.
  readonly requiresAcceptance: boolean;
}

/**
 * Per-action effect table. Exhaustive `switch` with no default so adding a
 * new DiplomacyAction fails the build until every consumer is updated.
 */
export function getDiplomacyActionEffect(action: DiplomacyAction): DiplomacyActionEffect {
  switch (action) {
    case DiplomacyAction.DeclareWar:
      return {
        acceptedScoreDelta: -60,
        declinedScoreDelta: 0,
        cooldownTurns: 5,
        requiresAcceptance: false,
      };
    case DiplomacyAction.ProposePeace:
      return {
        acceptedScoreDelta: 20,
        declinedScoreDelta: -5,
        cooldownTurns: 3,
        requiresAcceptance: true,
      };
    case DiplomacyAction.ProposeAlliance:
      return {
        acceptedScoreDelta: 30,
        declinedScoreDelta: -10,
        cooldownTurns: 10,
        requiresAcceptance: true,
      };
    case DiplomacyAction.GiftResources:
      return {
        acceptedScoreDelta: 15,
        declinedScoreDelta: 0,
        cooldownTurns: 2,
        requiresAcceptance: false,
      };
    case DiplomacyAction.Denounce:
      return {
        acceptedScoreDelta: -20,
        declinedScoreDelta: 0,
        cooldownTurns: 3,
        requiresAcceptance: false,
      };
    case DiplomacyAction.ShareIntel:
      return {
        acceptedScoreDelta: 10,
        declinedScoreDelta: 0,
        cooldownTurns: 4,
        requiresAcceptance: false,
      };
  }
}

/**
 * Basic AI accept/decline rule based on the current relations score with the
 * proposing faction. Unilateral actions (non-proposals) always "accept" at
 * this layer — the attempt orchestrator applies the unconditional delta.
 *
 * Thresholds are intentionally coarse — "basic decision rules" per task.
 * Future richer policies (faction personality, resource state, strategic
 * context) read these values plus their own inputs; this primitive only
 * captures the score-threshold slice.
 */
export function aiShouldAccept(action: DiplomacyAction, score: number): boolean {
  if (!Number.isFinite(score)) {
    throw new RangeError(`aiShouldAccept: score must be finite (got ${score})`);
  }
  switch (action) {
    case DiplomacyAction.DeclareWar:
    case DiplomacyAction.GiftResources:
    case DiplomacyAction.Denounce:
    case DiplomacyAction.ShareIntel:
      return true;
    case DiplomacyAction.ProposePeace:
      return score >= -50;
    case DiplomacyAction.ProposeAlliance:
      return score >= 50;
  }
}
