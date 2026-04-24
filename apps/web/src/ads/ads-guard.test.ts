import { describe, expect, it } from 'vitest';

import { evaluateAdGuard, type AdGuardFlags } from './ads-guard';

function flags(overrides: Partial<AdGuardFlags> = {}): AdGuardFlags {
  return {
    inSovereigntyWar: false,
    narrativeModalOpen: false,
    combatOverlayOpen: false,
    tutorialStepActive: false,
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

  it('reports war ahead of any other flag when multiple are set', () => {
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
