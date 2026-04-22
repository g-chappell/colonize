import { describe, it, expect } from 'vitest';
import {
  ALL_DIPLOMACY_ACTIONS,
  DiplomacyAction,
  RelationsMatrix,
  type DiplomacyAttemptOutcome,
} from '@colonize/core';
import {
  computeDiplomacyPanels,
  describeOutcome,
  stanceFromScore,
  type DiplomacyFactionPanel,
} from './diplomacy-math';

describe('stanceFromScore', () => {
  it('maps the canonical thresholds', () => {
    expect(stanceFromScore(100)).toBe('allied');
    expect(stanceFromScore(50)).toBe('allied');
    expect(stanceFromScore(49)).toBe('warm');
    expect(stanceFromScore(20)).toBe('warm');
    expect(stanceFromScore(19)).toBe('neutral');
    expect(stanceFromScore(0)).toBe('neutral');
    expect(stanceFromScore(-19)).toBe('neutral');
    expect(stanceFromScore(-20)).toBe('tense');
    expect(stanceFromScore(-49)).toBe('tense');
    expect(stanceFromScore(-50)).toBe('hostile');
    expect(stanceFromScore(-100)).toBe('hostile');
  });

  it('rejects non-finite or out-of-range scores', () => {
    expect(() => stanceFromScore(Number.NaN)).toThrow(/finite/);
    expect(() => stanceFromScore(101)).toThrow(/out of range/);
    expect(() => stanceFromScore(-101)).toThrow(/out of range/);
  });
});

describe('describeOutcome', () => {
  it('returns null when no outcome is cached', () => {
    expect(describeOutcome(null, 'ironclad')).toBeNull();
  });

  it('returns null when the cached outcome targets a different faction', () => {
    const outcome: DiplomacyAttemptOutcome = {
      status: 'accepted',
      action: DiplomacyAction.GiftResources,
      proposer: 'otk',
      target: 'phantom',
      scoreDelta: 15,
      newScore: 15,
      cooldownUntil: 3,
    };
    expect(describeOutcome(outcome, 'ironclad')).toBeNull();
  });

  it('formats accepted, declined, blocked, and invalid outcomes for the matching target', () => {
    expect(
      describeOutcome(
        {
          status: 'accepted',
          action: DiplomacyAction.GiftResources,
          proposer: 'otk',
          target: 'ironclad',
          scoreDelta: 15,
          newScore: 15,
          cooldownUntil: 3,
        },
        'ironclad',
      ),
    ).toBe('gift-resources — accepted (+15)');

    expect(
      describeOutcome(
        {
          status: 'declined',
          action: DiplomacyAction.ProposeAlliance,
          proposer: 'otk',
          target: 'ironclad',
          scoreDelta: -10,
          newScore: -10,
          cooldownUntil: 11,
        },
        'ironclad',
      ),
    ).toBe('propose-alliance — declined (-10)');

    expect(
      describeOutcome(
        {
          status: 'blocked-cooldown',
          action: DiplomacyAction.DeclareWar,
          proposer: 'otk',
          target: 'ironclad',
          cooldownUntil: 7,
        },
        'ironclad',
      ),
    ).toBe('declare-war — cooldown until turn 7');

    expect(
      describeOutcome(
        {
          status: 'invalid-same-faction',
          action: DiplomacyAction.Denounce,
          proposer: 'otk',
          target: 'otk',
        },
        'otk',
      ),
    ).toBe('denounce — invalid target');
  });

  it('uses ±0 when the delta is zero (e.g., declined action with no decline penalty)', () => {
    expect(
      describeOutcome(
        {
          status: 'accepted',
          action: DiplomacyAction.GiftResources,
          proposer: 'otk',
          target: 'ironclad',
          scoreDelta: 0,
          newScore: 0,
          cooldownUntil: 3,
        },
        'ironclad',
      ),
    ).toBe('gift-resources — accepted (±0)');
  });
});

describe('computeDiplomacyPanels', () => {
  function panel(panels: readonly DiplomacyFactionPanel[], factionId: string) {
    const p = panels.find((x) => x.factionId === factionId);
    if (!p) throw new Error(`panel for ${factionId} missing`);
    return p;
  }

  it('emits one panel per target (excluding the proposer)', () => {
    const matrix = new RelationsMatrix();
    const panels = computeDiplomacyPanels({
      matrix,
      proposer: 'otk',
      targets: ['otk', 'ironclad', 'phantom', 'bloodborne'],
      currentTurn: 1,
      lastOutcome: null,
    });
    expect(panels.map((p) => p.factionId)).toEqual(['ironclad', 'phantom', 'bloodborne']);
  });

  it('defaults every panel to score 0 / neutral / no-cooldown rows', () => {
    const matrix = new RelationsMatrix();
    const panels = computeDiplomacyPanels({
      matrix,
      proposer: 'otk',
      targets: ['ironclad'],
      currentTurn: 1,
      lastOutcome: null,
    });
    const p = panel(panels, 'ironclad');
    expect(p.score).toBe(0);
    expect(p.stance).toBe('neutral');
    expect(p.rows.length).toBe(ALL_DIPLOMACY_ACTIONS.length);
    for (const row of p.rows) {
      expect(row.onCooldown).toBe(false);
      expect(row.cooldownUntil).toBeNull();
    }
  });

  it('flags rows as on cooldown when the matrix has one', () => {
    const matrix = new RelationsMatrix();
    matrix.setCooldown('otk', 'ironclad', DiplomacyAction.ProposeAlliance, 10);
    const panels = computeDiplomacyPanels({
      matrix,
      proposer: 'otk',
      targets: ['ironclad'],
      currentTurn: 3,
      lastOutcome: null,
    });
    const row = panel(panels, 'ironclad').rows.find(
      (r) => r.action === DiplomacyAction.ProposeAlliance,
    )!;
    expect(row.onCooldown).toBe(true);
    expect(row.cooldownUntil).toBe(10);
  });

  it('clears the cooldown flag once currentTurn reaches the expiry', () => {
    const matrix = new RelationsMatrix();
    matrix.setCooldown('otk', 'ironclad', DiplomacyAction.Denounce, 5);
    const panels = computeDiplomacyPanels({
      matrix,
      proposer: 'otk',
      targets: ['ironclad'],
      currentTurn: 5,
      lastOutcome: null,
    });
    const row = panel(panels, 'ironclad').rows.find((r) => r.action === DiplomacyAction.Denounce)!;
    expect(row.onCooldown).toBe(false);
    expect(row.cooldownUntil).toBe(5);
  });

  it('surfaces the cached outcome summary only for the matching target', () => {
    const matrix = new RelationsMatrix();
    matrix.setScore('otk', 'ironclad', 25);
    const panels = computeDiplomacyPanels({
      matrix,
      proposer: 'otk',
      targets: ['ironclad', 'phantom'],
      currentTurn: 2,
      lastOutcome: {
        status: 'accepted',
        action: DiplomacyAction.GiftResources,
        proposer: 'otk',
        target: 'ironclad',
        scoreDelta: 15,
        newScore: 25,
        cooldownUntil: 4,
      },
    });
    expect(panel(panels, 'ironclad').lastActionSummary).toBe('gift-resources — accepted (+15)');
    expect(panel(panels, 'phantom').lastActionSummary).toBeNull();
  });

  it('reflects the current stance when the score has shifted', () => {
    const matrix = new RelationsMatrix();
    matrix.setScore('otk', 'ironclad', 75);
    matrix.setScore('otk', 'phantom', -75);
    const panels = computeDiplomacyPanels({
      matrix,
      proposer: 'otk',
      targets: ['ironclad', 'phantom'],
      currentTurn: 1,
      lastOutcome: null,
    });
    expect(panel(panels, 'ironclad').stance).toBe('allied');
    expect(panel(panels, 'phantom').stance).toBe('hostile');
  });

  it('rejects a non-positive currentTurn', () => {
    const matrix = new RelationsMatrix();
    expect(() =>
      computeDiplomacyPanels({
        matrix,
        proposer: 'otk',
        targets: ['ironclad'],
        currentTurn: 0,
        lastOutcome: null,
      }),
    ).toThrow(/positive integer/);
  });
});
