import { describe, expect, it } from 'vitest';

import { evaluateAdGuard, type AdGuardFlags } from './ads-guard';

function flags(overrides: Partial<AdGuardFlags> = {}): AdGuardFlags {
  return {
    inSovereigntyWar: false,
    narrativeModalOpen: false,
    combatOverlayOpen: false,
    tutorialStepActive: false,
    hasRemoveAdsEntitlement: false,
    ...overrides,
  };
}

describe('evaluateAdGuard', () => {
  it('allows ads when every flag is clear', () => {
    expect(evaluateAdGuard(flags())).toEqual({ allowed: true, reason: null });
  });

  it('blocks during a Sovereignty War', () => {
    expect(evaluateAdGuard(flags({ inSovereigntyWar: true }))).toEqual({
      allowed: false,
      reason: 'war',
    });
  });

  it('blocks while a narrative modal is open', () => {
    expect(evaluateAdGuard(flags({ narrativeModalOpen: true }))).toEqual({
      allowed: false,
      reason: 'narrative',
    });
  });

  it('blocks while the combat overlay is mounted', () => {
    expect(evaluateAdGuard(flags({ combatOverlayOpen: true }))).toEqual({
      allowed: false,
      reason: 'combat',
    });
  });

  it('blocks while a tutorial step is active', () => {
    expect(evaluateAdGuard(flags({ tutorialStepActive: true }))).toEqual({
      allowed: false,
      reason: 'tutorial',
    });
  });

  it('blocks when the player holds the remove_ads entitlement', () => {
    expect(evaluateAdGuard(flags({ hasRemoveAdsEntitlement: true }))).toEqual({
      allowed: false,
      reason: 'entitlement',
    });
  });

  it('reports entitlement ahead of war + every other flag when all are set', () => {
    // Reason-priority ordering is load-bearing for telemetry: a paid
    // user never contributes a `skip/war` telemetry line, so the
    // entitlement flag short-circuits ahead of every situational guard.
    expect(
      evaluateAdGuard(
        flags({
          hasRemoveAdsEntitlement: true,
          inSovereigntyWar: true,
          narrativeModalOpen: true,
          combatOverlayOpen: true,
          tutorialStepActive: true,
        }),
      ),
    ).toEqual({ allowed: false, reason: 'entitlement' });
  });

  it('reports war ahead of lesser flags when entitlement is clear', () => {
    // Reason-priority ordering is load-bearing for telemetry: "blocked
    // for war" is a stronger signal than "blocked for a combat overlay
    // that happens to be mid-war-beat".
    expect(
      evaluateAdGuard(
        flags({
          inSovereigntyWar: true,
          narrativeModalOpen: true,
          combatOverlayOpen: true,
          tutorialStepActive: true,
        }),
      ),
    ).toEqual({ allowed: false, reason: 'war' });
  });
});
