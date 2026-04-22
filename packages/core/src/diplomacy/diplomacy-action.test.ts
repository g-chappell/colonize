import { describe, it, expect } from 'vitest';
import {
  ALL_DIPLOMACY_ACTIONS,
  DiplomacyAction,
  aiShouldAccept,
  getDiplomacyActionEffect,
  isDiplomacyAction,
} from './diplomacy-action.js';

describe('DiplomacyAction const-object', () => {
  it('exposes the expected kebab-case identifiers', () => {
    expect(DiplomacyAction.DeclareWar).toBe('declare-war');
    expect(DiplomacyAction.ProposePeace).toBe('propose-peace');
    expect(DiplomacyAction.ProposeAlliance).toBe('propose-alliance');
    expect(DiplomacyAction.GiftResources).toBe('gift-resources');
    expect(DiplomacyAction.Denounce).toBe('denounce');
    expect(DiplomacyAction.ShareIntel).toBe('share-intel');
  });

  it('ALL_DIPLOMACY_ACTIONS covers every member', () => {
    expect(ALL_DIPLOMACY_ACTIONS).toEqual([
      'declare-war',
      'propose-peace',
      'propose-alliance',
      'gift-resources',
      'denounce',
      'share-intel',
    ]);
  });

  it.each([
    ['declare-war', true],
    ['propose-peace', true],
    ['gift-resources', true],
    ['share-intel', true],
    ['denounce', true],
    ['propose-alliance', true],
    ['unknown', false],
    ['', false],
    [42, false],
    [null, false],
  ])('isDiplomacyAction(%p) === %p', (value, expected) => {
    expect(isDiplomacyAction(value)).toBe(expected);
  });
});

describe('getDiplomacyActionEffect', () => {
  it('returns a concrete effect for every member', () => {
    for (const action of ALL_DIPLOMACY_ACTIONS) {
      const effect = getDiplomacyActionEffect(action);
      expect(Number.isFinite(effect.acceptedScoreDelta)).toBe(true);
      expect(Number.isFinite(effect.declinedScoreDelta)).toBe(true);
      expect(Number.isInteger(effect.cooldownTurns)).toBe(true);
      expect(effect.cooldownTurns).toBeGreaterThan(0);
      expect(typeof effect.requiresAcceptance).toBe('boolean');
    }
  });

  it('hostile actions apply negative deltas', () => {
    expect(getDiplomacyActionEffect(DiplomacyAction.DeclareWar).acceptedScoreDelta).toBeLessThan(0);
    expect(getDiplomacyActionEffect(DiplomacyAction.Denounce).acceptedScoreDelta).toBeLessThan(0);
  });

  it('goodwill actions apply positive deltas', () => {
    expect(
      getDiplomacyActionEffect(DiplomacyAction.GiftResources).acceptedScoreDelta,
    ).toBeGreaterThan(0);
    expect(getDiplomacyActionEffect(DiplomacyAction.ShareIntel).acceptedScoreDelta).toBeGreaterThan(
      0,
    );
  });

  it('proposals require acceptance and have non-zero decline penalty', () => {
    const peace = getDiplomacyActionEffect(DiplomacyAction.ProposePeace);
    expect(peace.requiresAcceptance).toBe(true);
    expect(peace.declinedScoreDelta).toBeLessThan(0);
    const alliance = getDiplomacyActionEffect(DiplomacyAction.ProposeAlliance);
    expect(alliance.requiresAcceptance).toBe(true);
    expect(alliance.declinedScoreDelta).toBeLessThan(0);
  });

  it('unilateral actions do not require acceptance', () => {
    expect(getDiplomacyActionEffect(DiplomacyAction.DeclareWar).requiresAcceptance).toBe(false);
    expect(getDiplomacyActionEffect(DiplomacyAction.Denounce).requiresAcceptance).toBe(false);
    expect(getDiplomacyActionEffect(DiplomacyAction.GiftResources).requiresAcceptance).toBe(false);
    expect(getDiplomacyActionEffect(DiplomacyAction.ShareIntel).requiresAcceptance).toBe(false);
  });

  it('alliance is harder to earn than peace', () => {
    const peace = getDiplomacyActionEffect(DiplomacyAction.ProposePeace);
    const alliance = getDiplomacyActionEffect(DiplomacyAction.ProposeAlliance);
    expect(alliance.acceptedScoreDelta).toBeGreaterThan(peace.acceptedScoreDelta);
    expect(alliance.cooldownTurns).toBeGreaterThan(peace.cooldownTurns);
  });
});

describe('aiShouldAccept', () => {
  it('always accepts unilateral actions', () => {
    for (const action of [
      DiplomacyAction.DeclareWar,
      DiplomacyAction.GiftResources,
      DiplomacyAction.Denounce,
      DiplomacyAction.ShareIntel,
    ] as const) {
      for (const score of [-100, -50, 0, 50, 100]) {
        expect(aiShouldAccept(action, score)).toBe(true);
      }
    }
  });

  it.each([
    [DiplomacyAction.ProposePeace, -100, false],
    [DiplomacyAction.ProposePeace, -51, false],
    [DiplomacyAction.ProposePeace, -50, true],
    [DiplomacyAction.ProposePeace, 0, true],
    [DiplomacyAction.ProposePeace, 100, true],
    [DiplomacyAction.ProposeAlliance, 0, false],
    [DiplomacyAction.ProposeAlliance, 49, false],
    [DiplomacyAction.ProposeAlliance, 50, true],
    [DiplomacyAction.ProposeAlliance, 100, true],
  ] as const)('aiShouldAccept(%s, %i) === %p', (action, score, expected) => {
    expect(aiShouldAccept(action, score)).toBe(expected);
  });

  it('rejects non-finite scores', () => {
    expect(() => aiShouldAccept(DiplomacyAction.ProposePeace, Number.NaN)).toThrow(RangeError);
    expect(() => aiShouldAccept(DiplomacyAction.ProposePeace, Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });
});
