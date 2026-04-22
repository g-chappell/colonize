import { describe, it, expect } from 'vitest';
import { attemptDiplomacyAction } from './attempt.js';
import { DiplomacyAction, getDiplomacyActionEffect } from './diplomacy-action.js';
import { RelationsMatrix } from './relations-matrix.js';

describe('attemptDiplomacyAction unilateral actions', () => {
  it('declare-war applies the accepted delta and locks the cooldown', () => {
    const matrix = new RelationsMatrix();
    const outcome = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.DeclareWar,
      currentTurn: 5,
    });

    const effect = getDiplomacyActionEffect(DiplomacyAction.DeclareWar);
    expect(outcome.status).toBe('accepted');
    if (outcome.status !== 'accepted') throw new Error('narrow');
    expect(outcome.scoreDelta).toBe(effect.acceptedScoreDelta);
    expect(outcome.newScore).toBe(effect.acceptedScoreDelta);
    expect(outcome.cooldownUntil).toBe(5 + effect.cooldownTurns);
    expect(matrix.getScore('otk', 'phantom')).toBe(effect.acceptedScoreDelta);
    expect(matrix.getCooldownExpiry('otk', 'phantom', DiplomacyAction.DeclareWar)).toBe(
      5 + effect.cooldownTurns,
    );
  });

  it('gift-resources always resolves accepted regardless of score', () => {
    const matrix = new RelationsMatrix();
    matrix.setScore('otk', 'phantom', -80);
    const outcome = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.GiftResources,
      currentTurn: 1,
    });
    expect(outcome.status).toBe('accepted');
  });
});

describe('attemptDiplomacyAction proposals', () => {
  it('accepts propose-peace when score >= -50', () => {
    const matrix = new RelationsMatrix();
    matrix.setScore('otk', 'phantom', -50);
    const outcome = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.ProposePeace,
      currentTurn: 3,
    });
    expect(outcome.status).toBe('accepted');
    if (outcome.status !== 'accepted') throw new Error('narrow');
    const effect = getDiplomacyActionEffect(DiplomacyAction.ProposePeace);
    expect(outcome.scoreDelta).toBe(effect.acceptedScoreDelta);
    expect(outcome.newScore).toBe(-50 + effect.acceptedScoreDelta);
  });

  it('declines propose-peace when score < -50 and applies decline penalty', () => {
    const matrix = new RelationsMatrix();
    matrix.setScore('otk', 'phantom', -60);
    const outcome = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.ProposePeace,
      currentTurn: 3,
    });
    expect(outcome.status).toBe('declined');
    if (outcome.status !== 'declined') throw new Error('narrow');
    const effect = getDiplomacyActionEffect(DiplomacyAction.ProposePeace);
    expect(outcome.scoreDelta).toBe(effect.declinedScoreDelta);
    expect(outcome.newScore).toBe(-60 + effect.declinedScoreDelta);
  });

  it('accepts propose-alliance at the exact threshold (score 50)', () => {
    const matrix = new RelationsMatrix();
    matrix.setScore('otk', 'phantom', 50);
    const outcome = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.ProposeAlliance,
      currentTurn: 2,
    });
    expect(outcome.status).toBe('accepted');
  });

  it('declines propose-alliance just below the threshold (score 49)', () => {
    const matrix = new RelationsMatrix();
    matrix.setScore('otk', 'phantom', 49);
    const outcome = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.ProposeAlliance,
      currentTurn: 2,
    });
    expect(outcome.status).toBe('declined');
  });

  it('locks the cooldown regardless of accept/decline outcome', () => {
    const matrix = new RelationsMatrix();
    matrix.setScore('otk', 'phantom', -70);
    attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.ProposePeace,
      currentTurn: 4,
    });
    const effect = getDiplomacyActionEffect(DiplomacyAction.ProposePeace);
    expect(matrix.getCooldownExpiry('otk', 'phantom', DiplomacyAction.ProposePeace)).toBe(
      4 + effect.cooldownTurns,
    );
  });
});

describe('attemptDiplomacyAction cooldown blocking', () => {
  it('blocks a repeat of the same action within the cooldown window', () => {
    const matrix = new RelationsMatrix();
    const first = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.DeclareWar,
      currentTurn: 5,
    });
    expect(first.status).toBe('accepted');

    const second = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.DeclareWar,
      currentTurn: 6,
    });
    expect(second.status).toBe('blocked-cooldown');
    if (second.status !== 'blocked-cooldown') throw new Error('narrow');
    const effect = getDiplomacyActionEffect(DiplomacyAction.DeclareWar);
    expect(second.cooldownUntil).toBe(5 + effect.cooldownTurns);

    // Score unchanged on the second attempt.
    expect(matrix.getScore('otk', 'phantom')).toBe(effect.acceptedScoreDelta);
  });

  it('allows a repeat once currentTurn reaches cooldownUntil', () => {
    const matrix = new RelationsMatrix();
    const effect = getDiplomacyActionEffect(DiplomacyAction.GiftResources);
    attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.GiftResources,
      currentTurn: 1,
    });
    const expiresOn = 1 + effect.cooldownTurns;
    const retry = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.GiftResources,
      currentTurn: expiresOn,
    });
    expect(retry.status).toBe('accepted');
  });

  it('does not block an orthogonal action on the same pair', () => {
    const matrix = new RelationsMatrix();
    attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.DeclareWar,
      currentTurn: 1,
    });
    const other = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.Denounce,
      currentTurn: 2,
    });
    expect(other.status).toBe('accepted');
  });

  it('cooldown lock is symmetric between (proposer, target) and (target, proposer)', () => {
    const matrix = new RelationsMatrix();
    attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.DeclareWar,
      currentTurn: 1,
    });
    const reciprocal = attemptDiplomacyAction({
      matrix,
      proposer: 'phantom',
      target: 'otk',
      action: DiplomacyAction.DeclareWar,
      currentTurn: 2,
    });
    expect(reciprocal.status).toBe('blocked-cooldown');
  });
});

describe('attemptDiplomacyAction invalid input', () => {
  it('refuses a same-faction attempt', () => {
    const matrix = new RelationsMatrix();
    const outcome = attemptDiplomacyAction({
      matrix,
      proposer: 'otk',
      target: 'otk',
      action: DiplomacyAction.DeclareWar,
      currentTurn: 1,
    });
    expect(outcome.status).toBe('invalid-same-faction');
    // No state change.
    expect(matrix.getEntry('otk', 'phantom')).toBeNull();
  });

  it.each([
    ['non-RelationsMatrix', { matrix: {} as RelationsMatrix }],
    ['empty proposer', { proposer: '' }],
    ['empty target', { target: '' }],
    ['unknown action', { action: 'bribe' as never }],
    ['non-integer currentTurn', { currentTurn: 1.5 }],
    ['zero currentTurn', { currentTurn: 0 }],
  ])('rejects malformed params (%s)', (_label, overrides) => {
    const base = {
      matrix: new RelationsMatrix(),
      proposer: 'otk',
      target: 'phantom',
      action: DiplomacyAction.DeclareWar,
      currentTurn: 1,
    };
    expect(() => attemptDiplomacyAction({ ...base, ...overrides })).toThrow();
  });

  it('rejects null params object', () => {
    expect(() =>
      attemptDiplomacyAction(null as unknown as Parameters<typeof attemptDiplomacyAction>[0]),
    ).toThrow(TypeError);
  });
});
