import { describe, it, expect } from 'vitest';
import { CombatActionType } from './combat-action.js';
import { CombatResult } from './combat-result.js';
import { resolveCombat } from './resolve.js';
import type { Combatant } from './combatant.js';

function frigate(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'a-1',
    faction: 'otk',
    hull: 75,
    maxHull: 75,
    guns: 32,
    crew: 200,
    maxCrew: 200,
    movement: 3,
    maxMovement: 3,
    ...overrides,
  };
}

function sloop(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'd-1',
    faction: 'phantom',
    hull: 30,
    maxHull: 30,
    guns: 10,
    crew: 70,
    maxCrew: 70,
    movement: 4,
    maxMovement: 4,
    ...overrides,
  };
}

function shipOfTheLine(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 's-1',
    faction: 'iron',
    hull: 120,
    maxHull: 120,
    guns: 64,
    crew: 500,
    maxCrew: 500,
    movement: 2,
    maxMovement: 2,
    ...overrides,
  };
}

function rngFromSequence(values: readonly number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) {
      throw new Error(`rng exhausted after ${values.length} values`);
    }
    const v = values[i++]!;
    return v;
  };
}

describe('resolveCombat — input validation', () => {
  it('rejects an attacker with hull 0', () => {
    expect(() =>
      resolveCombat(frigate({ hull: 0 }), sloop(), {
        action: CombatActionType.Broadside,
        rng: () => 0.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a defender with hull 0', () => {
    expect(() =>
      resolveCombat(frigate(), sloop({ hull: 0 }), {
        action: CombatActionType.Broadside,
        rng: () => 0.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a non-function rng', () => {
    expect(() =>
      resolveCombat(frigate(), sloop(), {
        action: CombatActionType.Broadside,
        rng: 'not-a-function' as unknown as () => number,
      }),
    ).toThrow(TypeError);
  });

  it('rejects a malformed combatant (negative hull)', () => {
    expect(() =>
      resolveCombat(frigate({ hull: -1 }), sloop(), {
        action: CombatActionType.Broadside,
        rng: () => 0.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a combatant where current hull exceeds max', () => {
    expect(() =>
      resolveCombat(frigate({ hull: 200, maxHull: 75 }), sloop(), {
        action: CombatActionType.Broadside,
        rng: () => 0.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects an empty id', () => {
    expect(() =>
      resolveCombat(frigate({ id: '' }), sloop(), {
        action: CombatActionType.Broadside,
        rng: () => 0.5,
      }),
    ).toThrow(TypeError);
  });
});

describe('resolveCombat — broadside', () => {
  it('emits an opening volley followed by return fire when the defender survives', () => {
    const outcome = resolveCombat(frigate(), shipOfTheLine(), {
      action: CombatActionType.Broadside,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.action).toBe(CombatActionType.Broadside);
    expect(outcome.events).toHaveLength(2);
    expect(outcome.events[0]).toMatchObject({ kind: 'broadside-volley', firer: 'attacker' });
    expect(outcome.events[1]).toMatchObject({ kind: 'broadside-volley', firer: 'defender' });
  });

  it('returns DefenderSunk and skips return fire when the opening volley sinks the defender', () => {
    const outcome = resolveCombat(frigate(), sloop({ hull: 5 }), {
      action: CombatActionType.Broadside,
      rng: rngFromSequence([1.0]),
    });
    expect(outcome.result).toBe(CombatResult.DefenderSunk);
    expect(outcome.defender.hull).toBe(0);
    expect(outcome.events).toHaveLength(1);
    expect(outcome.events[0]).toMatchObject({ firer: 'attacker' });
  });

  it('returns AttackerSunk when the return volley sinks the attacker', () => {
    const outcome = resolveCombat(frigate({ hull: 1 }), shipOfTheLine(), {
      action: CombatActionType.Broadside,
      rng: rngFromSequence([0.0, 1.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerSunk);
    expect(outcome.attacker.hull).toBe(0);
  });

  it('returns Inconclusive when both ships survive', () => {
    const outcome = resolveCombat(shipOfTheLine(), shipOfTheLine(), {
      action: CombatActionType.Broadside,
      rng: rngFromSequence([0.1, 0.1]),
    });
    expect(outcome.result).toBe(CombatResult.Inconclusive);
    expect(outcome.attacker.hull).toBeGreaterThan(0);
    expect(outcome.defender.hull).toBeGreaterThan(0);
  });

  it('damage never reduces hull below zero', () => {
    const outcome = resolveCombat(frigate(), sloop({ hull: 1 }), {
      action: CombatActionType.Broadside,
      rng: rngFromSequence([1.0]),
    });
    expect(outcome.defender.hull).toBe(0);
    expect(outcome.defender.hull).toBeGreaterThanOrEqual(0);
  });

  it('zero-gun attacker deals zero damage and triggers a return volley', () => {
    const outcome = resolveCombat(frigate({ guns: 0 }), shipOfTheLine(), {
      action: CombatActionType.Broadside,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.events[0]).toMatchObject({ damage: 0 });
    expect(outcome.events).toHaveLength(2);
  });

  it('is deterministic for a fixed RNG sequence', () => {
    const seq = [0.42, 0.71];
    const a1 = resolveCombat(frigate(), shipOfTheLine(), {
      action: CombatActionType.Broadside,
      rng: rngFromSequence(seq),
    });
    const a2 = resolveCombat(frigate(), shipOfTheLine(), {
      action: CombatActionType.Broadside,
      rng: rngFromSequence(seq),
    });
    expect(a1).toEqual(a2);
  });
});

describe('resolveCombat — boarding', () => {
  it('emits a boarding-round per round', () => {
    const outcome = resolveCombat(frigate(), sloop(), {
      action: CombatActionType.Boarding,
      rng: rngFromSequence([
        0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      ]),
    });
    for (const e of outcome.events) {
      expect(e.kind).toBe('boarding-round');
    }
  });

  it('returns DefenderCaptured when the defender crew reaches zero first', () => {
    const outcome = resolveCombat(frigate(), sloop({ crew: 1, maxCrew: 70 }), {
      action: CombatActionType.Boarding,
      rng: rngFromSequence([1.0, 1.0]),
    });
    expect(outcome.result).toBe(CombatResult.DefenderCaptured);
    expect(outcome.defender.crew).toBe(0);
    expect(outcome.attacker.crew).toBeGreaterThan(0);
  });

  it('returns AttackerCaptured when the attacker crew reaches zero first', () => {
    const outcome = resolveCombat(frigate({ crew: 1, maxCrew: 200 }), shipOfTheLine(), {
      action: CombatActionType.Boarding,
      rng: rngFromSequence([1.0, 0.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerCaptured);
    expect(outcome.attacker.crew).toBe(0);
  });

  it('returns Inconclusive at the boarding round cap when neither side breaks', () => {
    const outcome = resolveCombat(shipOfTheLine(), shipOfTheLine(), {
      action: CombatActionType.Boarding,
      rng: rngFromSequence(new Array(64).fill(0)),
    });
    expect(outcome.result).toBe(CombatResult.Inconclusive);
    expect(outcome.events.length).toBeLessThanOrEqual(8);
  });

  it('crew counts never go negative', () => {
    const outcome = resolveCombat(frigate(), sloop({ crew: 1, maxCrew: 70 }), {
      action: CombatActionType.Boarding,
      rng: rngFromSequence([1.0, 1.0]),
    });
    expect(outcome.defender.crew).toBeGreaterThanOrEqual(0);
    expect(outcome.attacker.crew).toBeGreaterThanOrEqual(0);
  });

  it('hull is preserved during boarding (only crew changes)', () => {
    const outcome = resolveCombat(frigate(), sloop(), {
      action: CombatActionType.Boarding,
      rng: rngFromSequence(new Array(64).fill(0.3)),
    });
    expect(outcome.attacker.hull).toBe(75);
    expect(outcome.defender.hull).toBe(30);
  });
});

describe('resolveCombat — ramming', () => {
  it('emits a single ram-impact event', () => {
    const outcome = resolveCombat(frigate(), sloop(), {
      action: CombatActionType.Ram,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.events).toHaveLength(1);
    expect(outcome.events[0]?.kind).toBe('ram-impact');
  });

  it('returns DefenderSunk when defender hull falls to zero and attacker survives', () => {
    const outcome = resolveCombat(shipOfTheLine(), sloop({ hull: 5 }), {
      action: CombatActionType.Ram,
      rng: rngFromSequence([1.0, 0.0]),
    });
    expect(outcome.result).toBe(CombatResult.DefenderSunk);
    expect(outcome.defender.hull).toBe(0);
    expect(outcome.attacker.hull).toBeGreaterThan(0);
  });

  it('returns AttackerSunk when attacker hull falls to zero and defender survives', () => {
    const outcome = resolveCombat(frigate({ hull: 1 }), shipOfTheLine(), {
      action: CombatActionType.Ram,
      rng: rngFromSequence([0.0, 1.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerSunk);
    expect(outcome.attacker.hull).toBe(0);
  });

  it('returns MutualSunk when both ships fall to zero hull', () => {
    const outcome = resolveCombat(frigate({ hull: 1 }), sloop({ hull: 1 }), {
      action: CombatActionType.Ram,
      rng: rngFromSequence([1.0, 1.0]),
    });
    expect(outcome.result).toBe(CombatResult.MutualSunk);
  });

  it('returns Inconclusive when both ships survive a glancing ram', () => {
    const outcome = resolveCombat(shipOfTheLine(), shipOfTheLine(), {
      action: CombatActionType.Ram,
      rng: rngFromSequence([0.0, 0.0]),
    });
    expect(outcome.result).toBe(CombatResult.Inconclusive);
    expect(outcome.attacker.hull).toBeGreaterThan(0);
    expect(outcome.defender.hull).toBeGreaterThan(0);
  });
});

describe('resolveCombat — fleeing', () => {
  it('returns AttackerFled when the speed-favoured attacker rolls a low success number', () => {
    const outcome = resolveCombat(sloop(), shipOfTheLine(), {
      action: CombatActionType.Flee,
      rng: rngFromSequence([0.0, 0.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerFled);
  });

  it('returns Inconclusive when the speed-favoured attacker rolls a high success number', () => {
    const outcome = resolveCombat(sloop(), shipOfTheLine(), {
      action: CombatActionType.Flee,
      rng: rngFromSequence([0.99, 0.0]),
    });
    expect(outcome.result).toBe(CombatResult.Inconclusive);
  });

  it('returns AttackerSunk when the parting volley wipes out the fleeing attacker', () => {
    const outcome = resolveCombat(sloop({ hull: 1 }), shipOfTheLine(), {
      action: CombatActionType.Flee,
      rng: rngFromSequence([0.0, 1.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerSunk);
    expect(outcome.attacker.hull).toBe(0);
  });

  it('emits exactly one flee-attempt event', () => {
    const outcome = resolveCombat(sloop(), shipOfTheLine(), {
      action: CombatActionType.Flee,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.events).toHaveLength(1);
    expect(outcome.events[0]?.kind).toBe('flee-attempt');
  });

  it('preserves defender hull (defender is the pursuer, not the target)', () => {
    const defender = shipOfTheLine();
    const outcome = resolveCombat(sloop(), defender, {
      action: CombatActionType.Flee,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.defender.hull).toBe(defender.hull);
  });

  it('zero pursuer movement does not divide by zero', () => {
    const outcome = resolveCombat(sloop(), shipOfTheLine({ movement: 0, maxMovement: 2 }), {
      action: CombatActionType.Flee,
      rng: rngFromSequence([0.0, 0.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerFled);
  });
});

describe('resolveCombat — replay determinism', () => {
  it('produces identical outcomes for identical RNG sequences across all actions', () => {
    const seq = [
      0.31, 0.62, 0.18, 0.94, 0.55, 0.27, 0.83, 0.41, 0.09, 0.76, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
    ];
    for (const action of [
      CombatActionType.Broadside,
      CombatActionType.Boarding,
      CombatActionType.Ram,
      CombatActionType.Flee,
    ]) {
      const a = resolveCombat(frigate(), shipOfTheLine(), {
        action,
        rng: rngFromSequence(seq),
      });
      const b = resolveCombat(frigate(), shipOfTheLine(), {
        action,
        rng: rngFromSequence(seq),
      });
      expect(a).toEqual(b);
    }
  });
});
