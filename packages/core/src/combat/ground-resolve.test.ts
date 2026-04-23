import { describe, it, expect } from 'vitest';
import { TileType } from '../map/tile.js';
import { UnitType } from '../unit/unit-type.js';
import { CombatResult } from './combat-result.js';
import { GroundCombatActionType } from './ground-combat-action.js';
import type { GroundCombatant } from './ground-combatant.js';
import { getTerrainDefenderModifier, resolveGroundCombat } from './ground-resolve.js';

function marines(overrides: Partial<GroundCombatant> = {}): GroundCombatant {
  return {
    id: 'a-1',
    faction: 'otk',
    type: UnitType.Marines,
    hp: 30,
    maxHp: 30,
    attack: 14,
    defense: 12,
    ...overrides,
  };
}

function dragoons(overrides: Partial<GroundCombatant> = {}): GroundCombatant {
  return {
    id: 'd-1',
    faction: 'phantom',
    type: UnitType.Dragoons,
    hp: 25,
    maxHp: 25,
    attack: 16,
    defense: 9,
    ...overrides,
  };
}

function pikemen(overrides: Partial<GroundCombatant> = {}): GroundCombatant {
  return {
    id: 'p-1',
    faction: 'iron',
    type: UnitType.Pikemen,
    hp: 35,
    maxHp: 35,
    attack: 11,
    defense: 15,
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

describe('resolveGroundCombat — input validation', () => {
  it('rejects an attacker with hp 0', () => {
    expect(() =>
      resolveGroundCombat(marines({ hp: 0 }), pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a defender with hp 0', () => {
    expect(() =>
      resolveGroundCombat(marines(), pikemen({ hp: 0 }), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a non-function rng', () => {
    expect(() =>
      resolveGroundCombat(marines(), pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: 'not-a-function' as unknown as () => number,
      }),
    ).toThrow(TypeError);
  });

  it('rejects a malformed combatant (negative hp)', () => {
    expect(() =>
      resolveGroundCombat(marines({ hp: -1 }), pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a combatant whose current hp exceeds max', () => {
    expect(() =>
      resolveGroundCombat(marines({ hp: 99, maxHp: 30 }), pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a non-ground UnitType', () => {
    expect(() =>
      resolveGroundCombat({ ...marines(), type: UnitType.Sloop }, pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
      }),
    ).toThrow(TypeError);
  });
});

describe('resolveGroundCombat — rock-paper-scissors', () => {
  it('marines have the advantage vs pikemen', () => {
    const outcome = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.rpsMultiplier).toBeGreaterThan(1);
  });

  it('dragoons have the advantage vs marines', () => {
    const outcome = resolveGroundCombat(dragoons(), marines(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.rpsMultiplier).toBeGreaterThan(1);
  });

  it('pikemen have the advantage vs dragoons', () => {
    const outcome = resolveGroundCombat(pikemen(), dragoons(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.rpsMultiplier).toBeGreaterThan(1);
  });

  it('rpsMultiplier is below 1 when attacker is on the losing side of the cycle', () => {
    const outcome = resolveGroundCombat(pikemen(), marines(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.rpsMultiplier).toBeLessThan(1);
  });

  it('same-type matchup is neutral (multiplier 1)', () => {
    const outcome = resolveGroundCombat(marines(), marines({ id: 'm-2' }), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.rpsMultiplier).toBe(1);
  });
});

describe('resolveGroundCombat — engage outcomes', () => {
  it('emits an attacker volley followed by a defender counter when the defender survives', () => {
    const outcome = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.action).toBe(GroundCombatActionType.Engage);
    expect(outcome.events).toHaveLength(2);
    expect(outcome.events[0]).toMatchObject({ kind: 'ground-volley', firer: 'attacker' });
    expect(outcome.events[1]).toMatchObject({ kind: 'ground-volley', firer: 'defender' });
  });

  it('returns DefenderSunk and skips the counter when the attacker strike routs the defender', () => {
    const outcome = resolveGroundCombat(marines(), pikemen({ hp: 2 }), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([1.0]),
    });
    expect(outcome.result).toBe(CombatResult.DefenderSunk);
    expect(outcome.defender.hp).toBe(0);
    expect(outcome.events).toHaveLength(1);
    expect(outcome.events[0]).toMatchObject({ firer: 'attacker' });
  });

  it('returns AttackerSunk when the defender counter routs the attacker', () => {
    const outcome = resolveGroundCombat(marines({ hp: 1 }), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.FloatingCity,
      rng: rngFromSequence([0.0, 1.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerSunk);
    expect(outcome.attacker.hp).toBe(0);
  });

  it('returns Inconclusive when both survive', () => {
    const outcome = resolveGroundCombat(pikemen(), pikemen({ id: 'p-2' }), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.1, 0.1]),
    });
    expect(outcome.result).toBe(CombatResult.Inconclusive);
    expect(outcome.attacker.hp).toBeGreaterThan(0);
    expect(outcome.defender.hp).toBeGreaterThan(0);
  });

  it('damage never reduces hp below zero', () => {
    const outcome = resolveGroundCombat(marines(), pikemen({ hp: 1 }), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([1.0]),
    });
    expect(outcome.defender.hp).toBe(0);
    expect(outcome.defender.hp).toBeGreaterThanOrEqual(0);
  });

  it('zero-attack attacker deals zero damage and triggers a defender counter', () => {
    const outcome = resolveGroundCombat(marines({ attack: 0 }), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.events[0]).toMatchObject({ damage: 0 });
    expect(outcome.events).toHaveLength(2);
  });
});

describe('resolveGroundCombat — terrain modifiers', () => {
  it('exposes the per-terrain defender modifier on the outcome', () => {
    const onIsland = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    const inCity = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.FloatingCity,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(onIsland.terrainDefenderModifier).toBe(1.25);
    expect(inCity.terrainDefenderModifier).toBe(1.5);
  });

  it('floating-city terrain reduces attacker damage vs island terrain', () => {
    const islandOutcome = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.7, 0.7]),
    });
    const cityOutcome = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.FloatingCity,
      rng: rngFromSequence([0.7, 0.7]),
    });
    const islandVolley = islandOutcome.events[0];
    const cityVolley = cityOutcome.events[0];
    if (islandVolley?.kind !== 'ground-volley' || cityVolley?.kind !== 'ground-volley') {
      throw new Error('expected ground-volley events');
    }
    expect(cityVolley.damage).toBeLessThan(islandVolley.damage);
  });

  it('red-tide terrain increases attacker damage above the island baseline', () => {
    const islandOutcome = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.7, 0.7]),
    });
    const redTideOutcome = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.RedTide,
      rng: rngFromSequence([0.7, 0.7]),
    });
    const islandVolley = islandOutcome.events[0];
    const redTideVolley = redTideOutcome.events[0];
    if (islandVolley?.kind !== 'ground-volley' || redTideVolley?.kind !== 'ground-volley') {
      throw new Error('expected ground-volley events');
    }
    expect(redTideVolley.damage).toBeGreaterThan(islandVolley.damage);
  });

  it('getTerrainDefenderModifier returns 1.0 for neutral tiles', () => {
    expect(getTerrainDefenderModifier(TileType.Ocean)).toBe(1);
    expect(getTerrainDefenderModifier(TileType.RayonPassage)).toBe(1);
    expect(getTerrainDefenderModifier(TileType.FataMorgana)).toBe(1);
  });
});

describe('resolveGroundCombat — fleeing', () => {
  it('returns AttackerFled when speed-favoured dragoons roll a low success number', () => {
    const outcome = resolveGroundCombat(dragoons(), pikemen(), {
      action: GroundCombatActionType.Flee,
      terrain: TileType.Island,
      rng: rngFromSequence([0.0, 0.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerFled);
  });

  it('returns Inconclusive when the flee success roll is too high', () => {
    const outcome = resolveGroundCombat(dragoons(), pikemen(), {
      action: GroundCombatActionType.Flee,
      terrain: TileType.Island,
      rng: rngFromSequence([0.99, 0.0]),
    });
    expect(outcome.result).toBe(CombatResult.Inconclusive);
  });

  it('returns AttackerSunk when the parting volley routs the fleeing attacker', () => {
    const outcome = resolveGroundCombat(dragoons({ hp: 1 }), pikemen(), {
      action: GroundCombatActionType.Flee,
      terrain: TileType.Island,
      rng: rngFromSequence([0.0, 1.0]),
    });
    expect(outcome.result).toBe(CombatResult.AttackerSunk);
    expect(outcome.attacker.hp).toBe(0);
  });

  it('emits exactly one ground-flee-attempt event', () => {
    const outcome = resolveGroundCombat(dragoons(), pikemen(), {
      action: GroundCombatActionType.Flee,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.events).toHaveLength(1);
    expect(outcome.events[0]?.kind).toBe('ground-flee-attempt');
  });

  it('preserves defender hp (defender is the pursuer, not the target)', () => {
    const defender = pikemen();
    const outcome = resolveGroundCombat(dragoons(), defender, {
      action: GroundCombatActionType.Flee,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.defender.hp).toBe(defender.hp);
  });
});

describe('resolveGroundCombat — fortification modifier', () => {
  it('omitted defenderFortificationBonus defaults to 1.0 on the outcome', () => {
    const outcome = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
    });
    expect(outcome.defenderFortificationBonus).toBe(1);
  });

  it('a fortification bonus reduces attacker damage vs the same-terrain baseline', () => {
    const baseline = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.7, 0.7]),
    });
    const fortified = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.7, 0.7]),
      defenderFortificationBonus: 1.5,
    });
    const baselineVolley = baseline.events[0];
    const fortifiedVolley = fortified.events[0];
    if (baselineVolley?.kind !== 'ground-volley' || fortifiedVolley?.kind !== 'ground-volley') {
      throw new Error('expected ground-volley events');
    }
    expect(fortifiedVolley.damage).toBeLessThan(baselineVolley.damage);
  });

  it('exposes the supplied bonus on the outcome verbatim', () => {
    const outcome = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.5, 0.5]),
      defenderFortificationBonus: 1.65,
    });
    expect(outcome.defenderFortificationBonus).toBe(1.65);
  });

  it('a higher fortification bonus reduces damage further than a lower one', () => {
    const stockade = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.7, 0.7]),
      defenderFortificationBonus: 1.2,
    });
    const citadel = resolveGroundCombat(marines(), pikemen(), {
      action: GroundCombatActionType.Engage,
      terrain: TileType.Island,
      rng: rngFromSequence([0.7, 0.7]),
      defenderFortificationBonus: 1.65,
    });
    const stockadeVolley = stockade.events[0];
    const citadelVolley = citadel.events[0];
    if (stockadeVolley?.kind !== 'ground-volley' || citadelVolley?.kind !== 'ground-volley') {
      throw new Error('expected ground-volley events');
    }
    expect(citadelVolley.damage).toBeLessThan(stockadeVolley.damage);
  });

  it('rejects a non-positive fortification bonus', () => {
    expect(() =>
      resolveGroundCombat(marines(), pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
        defenderFortificationBonus: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      resolveGroundCombat(marines(), pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
        defenderFortificationBonus: -1,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a non-finite fortification bonus', () => {
    expect(() =>
      resolveGroundCombat(marines(), pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
        defenderFortificationBonus: Infinity,
      }),
    ).toThrow(RangeError);
    expect(() =>
      resolveGroundCombat(marines(), pikemen(), {
        action: GroundCombatActionType.Engage,
        terrain: TileType.Island,
        rng: () => 0.5,
        defenderFortificationBonus: NaN,
      }),
    ).toThrow(RangeError);
  });

  it('flee action also exposes the supplied fortification bonus on the outcome', () => {
    const outcome = resolveGroundCombat(dragoons(), pikemen(), {
      action: GroundCombatActionType.Flee,
      terrain: TileType.Island,
      rng: rngFromSequence([0.0, 0.0]),
      defenderFortificationBonus: 1.4,
    });
    expect(outcome.defenderFortificationBonus).toBe(1.4);
  });
});

describe('resolveGroundCombat — replay determinism', () => {
  it('produces identical outcomes for identical RNG sequences across both actions', () => {
    const seq = [0.31, 0.62, 0.18, 0.94, 0.55];
    for (const action of [GroundCombatActionType.Engage, GroundCombatActionType.Flee]) {
      const a = resolveGroundCombat(marines(), pikemen(), {
        action,
        terrain: TileType.Island,
        rng: rngFromSequence(seq),
      });
      const b = resolveGroundCombat(marines(), pikemen(), {
        action,
        terrain: TileType.Island,
        rng: rngFromSequence(seq),
      });
      expect(a).toEqual(b);
    }
  });
});
