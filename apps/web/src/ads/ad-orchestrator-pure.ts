// Pure sibling to ad-orchestrator.ts (pure-sibling pattern per
// apps/web/src/CLAUDE.md). Owns two framework-free decisions the
// orchestrator runs on every `turn:advanced` bus event:
//
//   1. `deriveAdGuardFlags` — collapse the live store slice values into
//      the four-flag shape `evaluateAdGuard` consumes. The store has a
//      long tail of nullable "transient narrative modal" slices
//      (rumour reveal, council pick, tavern, tithe, ...) — this module
//      decides which slices roll up under `narrativeModalOpen` so the
//      orchestrator itself stays tiny and testable with plain fixtures.
//
//   2. `decideTurnEndAdAction` — wrap the cadence + guard-evaluation
//      result in a single discriminated-union decision. The orchestrator
//      takes the `action` verbatim; unit tests assert the decision
//      against explicit snapshots rather than mocking zustand + the bus.

import { shouldShowInterstitial } from '@colonize/core';

import { evaluateAdGuard, type AdGuardFlags, type AdGuardReason } from './ads-guard';

// Subset of the store slices this module reads. The orchestrator narrows
// `useGameStore.getState()` to this shape before calling in so the pure
// module does not import the store's full `GameState` (which transitively
// pulls every slice's type into the test sandbox).
export interface AdOrchestratorSnapshot {
  readonly sovereigntyWar: unknown;
  readonly combatOutcome: unknown;
  readonly tutorialStep: unknown;
  readonly rumourReveal: unknown;
  readonly councilPick: unknown;
  readonly blackMarketEncounter: unknown;
  readonly tavernEncounter: unknown;
  readonly sovereigntyBeat: unknown;
  readonly titheNotification: unknown;
  readonly tidewaterPartyEvent: unknown;
}

// Which store slices roll up under each AdGuardFlag. `narrativeModalOpen`
// is a union — any one of the narrative-event slices non-null flips it —
// because every single one represents a transient unbidden modal mounted
// over the game stage, and all of them should block an interstitial for
// the same reason (the player is mid-narrative, popping an ad on top
// would jumble two "notice me" surfaces at once).
export function deriveAdGuardFlags(snapshot: AdOrchestratorSnapshot): AdGuardFlags {
  const narrativeModalOpen =
    snapshot.rumourReveal !== null ||
    snapshot.councilPick !== null ||
    snapshot.blackMarketEncounter !== null ||
    snapshot.tavernEncounter !== null ||
    snapshot.sovereigntyBeat !== null ||
    snapshot.titheNotification !== null ||
    snapshot.tidewaterPartyEvent !== null;
  return {
    inSovereigntyWar: snapshot.sovereigntyWar !== null,
    narrativeModalOpen,
    combatOverlayOpen: snapshot.combatOutcome !== null,
    tutorialStepActive: snapshot.tutorialStep !== null,
  };
}

export interface AdCadenceDecisionInputs {
  readonly currentTurn: number;
  readonly lastAdShowTurn: number;
  readonly cadenceN: number;
  readonly flags: AdGuardFlags;
}

export type AdCadenceSkipReason = 'cadence' | AdGuardReason;

export type AdCadenceDecision =
  | { readonly action: 'show' }
  | { readonly action: 'skip'; readonly reason: AdCadenceSkipReason };

// Cadence is checked FIRST: if N turns have not elapsed, we do not need
// to look at guards at all. This ordering matters for telemetry — a
// `skip/cadence` is the common case (every turn that is not an ad-turn),
// and reporting it as `skip/war` whenever the player happens to also be
// in a Sovereignty War would bury the actual skip reason under a
// secondary flag.
export function decideTurnEndAdAction(inputs: AdCadenceDecisionInputs): AdCadenceDecision {
  const cadenceMet = shouldShowInterstitial({
    currentTurn: inputs.currentTurn,
    lastAdShowTurn: inputs.lastAdShowTurn,
    cadenceN: inputs.cadenceN,
  });
  if (!cadenceMet) return { action: 'skip', reason: 'cadence' };
  const guard = evaluateAdGuard(inputs.flags);
  if (!guard.allowed && guard.reason !== null) {
    return { action: 'skip', reason: guard.reason };
  }
  return { action: 'show' };
}
