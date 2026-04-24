import { describe, expect, it } from 'vitest';

import {
  decideTurnEndAdAction,
  deriveAdGuardFlags,
  type AdOrchestratorSnapshot,
} from './ad-orchestrator-pure';

function snapshot(overrides: Partial<AdOrchestratorSnapshot> = {}): AdOrchestratorSnapshot {
  return {
    sovereigntyWar: null,
    combatOutcome: null,
    tutorialStep: null,
    rumourReveal: null,
    councilPick: null,
    blackMarketEncounter: null,
    tavernEncounter: null,
    sovereigntyBeat: null,
    titheNotification: null,
    tidewaterPartyEvent: null,
    entitlements: { hasRemoveAds: false },
    ...overrides,
  };
}

describe('deriveAdGuardFlags', () => {
  it('returns all-false flags for a clean snapshot', () => {
    expect(deriveAdGuardFlags(snapshot())).toEqual({
      inSovereigntyWar: false,
      narrativeModalOpen: false,
      combatOverlayOpen: false,
      tutorialStepActive: false,
      hasRemoveAdsEntitlement: false,
    });
  });

  it('reads entitlements.hasRemoveAds into the hasRemoveAdsEntitlement flag', () => {
    expect(
      deriveAdGuardFlags(snapshot({ entitlements: { hasRemoveAds: true } }))
        .hasRemoveAdsEntitlement,
    ).toBe(true);
  });

  it('reads sovereigntyWar into the inSovereigntyWar flag', () => {
    expect(
      deriveAdGuardFlags(snapshot({ sovereigntyWar: { id: 'campaign-1' } })).inSovereigntyWar,
    ).toBe(true);
  });

  it('reads combatOutcome into the combatOverlayOpen flag', () => {
    expect(
      deriveAdGuardFlags(snapshot({ combatOutcome: { result: 'attacker-victory' } }))
        .combatOverlayOpen,
    ).toBe(true);
  });

  it('reads tutorialStep into the tutorialStepActive flag', () => {
    expect(deriveAdGuardFlags(snapshot({ tutorialStep: 'step-1' })).tutorialStepActive).toBe(true);
  });

  it.each([
    ['rumourReveal', { rumourReveal: { kind: 'windfall' } }],
    ['councilPick', { councilPick: { factionId: 'otk' } }],
    ['blackMarketEncounter', { blackMarketEncounter: { stallId: 's1' } }],
    ['tavernEncounter', { tavernEncounter: { colonyId: 'c1' } }],
    ['sovereigntyBeat', { sovereigntyBeat: 'beat-first-wave' }],
    ['titheNotification', { titheNotification: { amount: 100 } }],
    ['tidewaterPartyEvent', { tidewaterPartyEvent: { colonyId: 'c1' } }],
  ] as const)('rolls %s up under narrativeModalOpen', (_name, patch) => {
    // Every transient-event slice shares the same blocking semantics —
    // if any one is non-null, an interstitial would render on top of a
    // modal the player is already reading.
    expect(deriveAdGuardFlags(snapshot(patch)).narrativeModalOpen).toBe(true);
  });
});

describe('decideTurnEndAdAction', () => {
  const clearFlags = {
    inSovereigntyWar: false,
    narrativeModalOpen: false,
    combatOverlayOpen: false,
    tutorialStepActive: false,
    hasRemoveAdsEntitlement: false,
  };

  it('skips with reason=cadence before N turns have elapsed', () => {
    expect(
      decideTurnEndAdAction({
        currentTurn: 5,
        lastAdShowTurn: 0,
        cadenceN: 10,
        flags: clearFlags,
      }),
    ).toEqual({ action: 'skip', reason: 'cadence' });
  });

  it('shows when cadence is met and all guards are clear', () => {
    expect(
      decideTurnEndAdAction({
        currentTurn: 10,
        lastAdShowTurn: 0,
        cadenceN: 10,
        flags: clearFlags,
      }),
    ).toEqual({ action: 'show' });
  });

  it('reports cadence skip FIRST, even when a guard is also blocking', () => {
    // Rationale: telemetry readers treat `skip/cadence` as the normal
    // non-ad turn; bubbling the guard reason up when cadence itself is
    // the gating factor would misreport normal turns as war/narrative
    // interruptions.
    expect(
      decideTurnEndAdAction({
        currentTurn: 3,
        lastAdShowTurn: 0,
        cadenceN: 10,
        flags: { ...clearFlags, inSovereigntyWar: true, combatOverlayOpen: true },
      }),
    ).toEqual({ action: 'skip', reason: 'cadence' });
  });

  it('skips with the guard reason when cadence is met but a guard blocks', () => {
    expect(
      decideTurnEndAdAction({
        currentTurn: 10,
        lastAdShowTurn: 0,
        cadenceN: 10,
        flags: { ...clearFlags, inSovereigntyWar: true },
      }),
    ).toEqual({ action: 'skip', reason: 'war' });
    expect(
      decideTurnEndAdAction({
        currentTurn: 10,
        lastAdShowTurn: 0,
        cadenceN: 10,
        flags: { ...clearFlags, combatOverlayOpen: true },
      }),
    ).toEqual({ action: 'skip', reason: 'combat' });
    expect(
      decideTurnEndAdAction({
        currentTurn: 10,
        lastAdShowTurn: 0,
        cadenceN: 10,
        flags: { ...clearFlags, tutorialStepActive: true },
      }),
    ).toEqual({ action: 'skip', reason: 'tutorial' });
    expect(
      decideTurnEndAdAction({
        currentTurn: 10,
        lastAdShowTurn: 0,
        cadenceN: 10,
        flags: { ...clearFlags, narrativeModalOpen: true },
      }),
    ).toEqual({ action: 'skip', reason: 'narrative' });
    expect(
      decideTurnEndAdAction({
        currentTurn: 10,
        lastAdShowTurn: 0,
        cadenceN: 10,
        flags: { ...clearFlags, hasRemoveAdsEntitlement: true },
      }),
    ).toEqual({ action: 'skip', reason: 'entitlement' });
  });

  it('re-arms after a successful show: cadence restarts from lastAdShowTurn', () => {
    expect(
      decideTurnEndAdAction({
        currentTurn: 15,
        lastAdShowTurn: 10,
        cadenceN: 10,
        flags: clearFlags,
      }),
    ).toEqual({ action: 'skip', reason: 'cadence' });
    expect(
      decideTurnEndAdAction({
        currentTurn: 20,
        lastAdShowTurn: 10,
        cadenceN: 10,
        flags: clearFlags,
      }),
    ).toEqual({ action: 'show' });
  });
});
