import { describe, expect, it } from 'vitest';
import {
  CombatActionType,
  CombatResult,
  type CombatEvent,
  type CombatOutcome,
  type Combatant,
} from '@colonize/core';
import {
  activeBeat,
  buildCombatTimeline,
  cinematicDurationMs,
  describeResult,
  revealedBeats,
} from './cinematic-state';

const ATK: Combatant = {
  id: 'a',
  faction: 'otk',
  hull: 50,
  maxHull: 50,
  guns: 12,
  crew: 50,
  maxCrew: 50,
  movement: 4,
  maxMovement: 4,
};

const DEF: Combatant = {
  id: 'd',
  faction: 'ironclad',
  hull: 50,
  maxHull: 50,
  guns: 10,
  crew: 50,
  maxCrew: 50,
  movement: 3,
  maxMovement: 3,
};

function outcomeWith(events: readonly CombatEvent[]): CombatOutcome {
  return {
    action: CombatActionType.Broadside,
    result: CombatResult.Inconclusive,
    attacker: ATK,
    defender: DEF,
    events,
  };
}

describe('buildCombatTimeline', () => {
  it('returns an empty timeline for an outcome with no events', () => {
    const beats = buildCombatTimeline(outcomeWith([]));
    expect(beats).toEqual([]);
    expect(cinematicDurationMs(beats)).toBe(0);
  });

  it('lays beats sequentially with a 200ms gap between them', () => {
    const beats = buildCombatTimeline(
      outcomeWith([
        { kind: 'broadside-volley', firer: 'attacker', damage: 7, targetHullAfter: 43 },
        { kind: 'broadside-volley', firer: 'defender', damage: 4, targetHullAfter: 46 },
      ]),
    );
    expect(beats).toHaveLength(2);
    expect(beats[0]!.startMs).toBe(0);
    expect(beats[0]!.durationMs).toBe(800);
    expect(beats[1]!.startMs).toBe(1000);
    expect(beats[1]!.durationMs).toBe(800);
    expect(cinematicDurationMs(beats)).toBe(1800);
  });

  it('describes a broadside fired by the attacker with target=defender', () => {
    const [beat] = buildCombatTimeline(
      outcomeWith([
        { kind: 'broadside-volley', firer: 'attacker', damage: 12, targetHullAfter: 38 },
      ]),
    );
    expect(beat!.description).toBe('Attacker broadside — 12 damage (defender hull: 38)');
    expect(beat!.focus).toBe('attacker');
  });

  it('describes a broadside fired by the defender with target=attacker', () => {
    const [beat] = buildCombatTimeline(
      outcomeWith([
        { kind: 'broadside-volley', firer: 'defender', damage: 9, targetHullAfter: 41 },
      ]),
    );
    expect(beat!.description).toBe('Defender returns fire — 9 damage (attacker hull: 41)');
    expect(beat!.focus).toBe('defender');
  });

  it('describes a boarding round with both casualty counts and no focus', () => {
    const [beat] = buildCombatTimeline(
      outcomeWith([
        {
          kind: 'boarding-round',
          attackerCasualties: 3,
          defenderCasualties: 5,
          attackerCrewAfter: 47,
          defenderCrewAfter: 35,
        },
      ]),
    );
    expect(beat!.description).toBe('Boarding melee — attacker -3 crew (47), defender -5 crew (35)');
    expect(beat!.focus).toBeNull();
    expect(beat!.durationMs).toBe(600);
  });

  it('describes a ram impact with both hull deltas and no focus', () => {
    const [beat] = buildCombatTimeline(
      outcomeWith([
        {
          kind: 'ram-impact',
          attackerHullDamage: 8,
          defenderHullDamage: 15,
          attackerHullAfter: 32,
          defenderHullAfter: 25,
        },
      ]),
    );
    expect(beat!.description).toBe('Ram impact — attacker -8 hull (32), defender -15 hull (25)');
    expect(beat!.focus).toBeNull();
    expect(beat!.durationMs).toBe(1000);
  });

  it('describes a successful flee with focus on the attacker', () => {
    const [beat] = buildCombatTimeline(
      outcomeWith([
        { kind: 'flee-attempt', success: true, pursuerVolleyDamage: 4, fleerHullAfter: 36 },
      ]),
    );
    expect(beat!.description).toBe('Attacker flees — parting shot 4 damage (attacker hull: 36)');
    expect(beat!.focus).toBe('attacker');
  });

  it('describes a failed flee with the pursuer-volley framing', () => {
    const [beat] = buildCombatTimeline(
      outcomeWith([
        { kind: 'flee-attempt', success: false, pursuerVolleyDamage: 7, fleerHullAfter: 33 },
      ]),
    );
    expect(beat!.description).toBe(
      "Attacker fails to flee — pursuer's volley 7 damage (attacker hull: 33)",
    );
  });
});

describe('activeBeat', () => {
  const beats = buildCombatTimeline(
    outcomeWith([
      { kind: 'broadside-volley', firer: 'attacker', damage: 7, targetHullAfter: 43 },
      { kind: 'broadside-volley', firer: 'defender', damage: 4, targetHullAfter: 46 },
    ]),
  );

  it('returns null before time zero', () => {
    expect(activeBeat(beats, -1)).toBeNull();
  });

  it('returns the first beat at t=0', () => {
    expect(activeBeat(beats, 0)?.index).toBe(0);
  });

  it('keeps the previous beat active during the inter-beat gap', () => {
    expect(activeBeat(beats, 900)?.index).toBe(0);
  });

  it('switches to the next beat exactly at its startMs', () => {
    expect(activeBeat(beats, 1000)?.index).toBe(1);
  });

  it('returns the last beat for elapsed past the end', () => {
    expect(activeBeat(beats, 99_999)?.index).toBe(1);
  });

  it('returns null for an empty timeline', () => {
    expect(activeBeat([], 0)).toBeNull();
  });
});

describe('revealedBeats', () => {
  const beats = buildCombatTimeline(
    outcomeWith([
      { kind: 'broadside-volley', firer: 'attacker', damage: 7, targetHullAfter: 43 },
      { kind: 'broadside-volley', firer: 'defender', damage: 4, targetHullAfter: 46 },
    ]),
  );

  it('returns an empty list before the first beat', () => {
    expect(revealedBeats(beats, -1)).toEqual([]);
  });

  it('reveals only the first beat while it is active', () => {
    expect(revealedBeats(beats, 500)).toHaveLength(1);
  });

  it('reveals both beats once the second has begun', () => {
    expect(revealedBeats(beats, 1000)).toHaveLength(2);
  });
});

describe('describeResult', () => {
  it('renders each result with a single-sentence summary', () => {
    expect(describeResult(CombatResult.AttackerSunk)).toMatch(/attacker sunk/i);
    expect(describeResult(CombatResult.DefenderSunk)).toMatch(/defender sunk/i);
    expect(describeResult(CombatResult.AttackerCaptured)).toMatch(/captured/i);
    expect(describeResult(CombatResult.DefenderCaptured)).toMatch(/captured/i);
    expect(describeResult(CombatResult.AttackerFled)).toMatch(/broke away/i);
    expect(describeResult(CombatResult.MutualSunk)).toMatch(/destroyed/i);
    expect(describeResult(CombatResult.Inconclusive)).toMatch(/inconclusive/i);
  });
});
