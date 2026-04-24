// Pure sibling to ad-manager.ts. Takes a snapshot of the game flags
// that should block ads and returns whether an ad is allowed; if not,
// which flag caused the block. Framework-free so tests can assert the
// truth table without pulling in zustand or Capacitor.
//
// The orchestrator (a follow-up task) reads the live game store each
// turn, constructs an AdGuardFlags snapshot, and flips
// `AdManager.setGuarded(!evaluateAdGuard(flags).allowed)`. The guard
// module itself does not know the store shape.

export interface AdGuardFlags {
  readonly inSovereigntyWar: boolean;
  readonly narrativeModalOpen: boolean;
  readonly combatOverlayOpen: boolean;
  readonly tutorialStepActive: boolean;
  // Set when the signed-in user holds the `remove_ads` entitlement
  // granted by /iap/verify-receipt. Checked before the other guards so
  // a paid user never trips a `skip/war` telemetry line on a day they
  // would not have seen an ad anyway.
  readonly hasRemoveAdsEntitlement: boolean;
}

export type AdGuardReason = 'entitlement' | 'war' | 'narrative' | 'combat' | 'tutorial';

export interface AdGuardEvaluation {
  readonly allowed: boolean;
  readonly reason: AdGuardReason | null;
}

export function evaluateAdGuard(flags: AdGuardFlags): AdGuardEvaluation {
  if (flags.hasRemoveAdsEntitlement) return { allowed: false, reason: 'entitlement' };
  if (flags.inSovereigntyWar) return { allowed: false, reason: 'war' };
  if (flags.narrativeModalOpen) return { allowed: false, reason: 'narrative' };
  if (flags.combatOverlayOpen) return { allowed: false, reason: 'combat' };
  if (flags.tutorialStepActive) return { allowed: false, reason: 'tutorial' };
  return { allowed: true, reason: null };
}
