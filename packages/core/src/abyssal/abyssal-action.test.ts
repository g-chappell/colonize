import { describe, it, expect } from 'vitest';
import {
  ABYSSAL_ACTION_AFFINITY,
  ALL_ABYSSAL_ACTIONS,
  AbyssalAction,
  abyssalActionAffinity,
  isAbyssalAction,
} from './abyssal-action.js';
import { ALL_ABYSSAL_STANCES, AbyssalStance } from './stance.js';

describe('AbyssalAction', () => {
  it('exposes the four canonical actions', () => {
    expect(AbyssalAction.Offering).toBe('offering');
    expect(AbyssalAction.PassThrough).toBe('pass-through');
    expect(AbyssalAction.Plunder).toBe('plunder');
    expect(AbyssalAction.Patrol).toBe('patrol');
  });

  it('ALL_ABYSSAL_ACTIONS contains every action with no duplicates', () => {
    expect(ALL_ABYSSAL_ACTIONS).toHaveLength(4);
    expect(new Set(ALL_ABYSSAL_ACTIONS).size).toBe(4);
    for (const id of Object.values(AbyssalAction)) {
      expect(ALL_ABYSSAL_ACTIONS.includes(id)).toBe(true);
    }
  });
});

describe('isAbyssalAction', () => {
  it('returns true for every canonical action', () => {
    for (const id of ALL_ABYSSAL_ACTIONS) {
      expect(isAbyssalAction(id)).toBe(true);
    }
  });

  it('returns false for non-action strings and non-strings', () => {
    expect(isAbyssalAction('worship')).toBe(false);
    expect(isAbyssalAction('PLUNDER')).toBe(false);
    expect(isAbyssalAction('')).toBe(false);
    expect(isAbyssalAction(null)).toBe(false);
    expect(isAbyssalAction(undefined)).toBe(false);
    expect(isAbyssalAction(0)).toBe(false);
  });
});

describe('ABYSSAL_ACTION_AFFINITY', () => {
  it('maps every action to a valid stance', () => {
    for (const action of ALL_ABYSSAL_ACTIONS) {
      const stance = ABYSSAL_ACTION_AFFINITY[action];
      expect(ALL_ABYSSAL_STANCES.includes(stance)).toBe(true);
    }
  });

  it('covers all four stances exactly once (1:1 with the action vocabulary)', () => {
    const stancesAffected = new Set(ALL_ABYSSAL_ACTIONS.map((a) => ABYSSAL_ACTION_AFFINITY[a]));
    expect(stancesAffected.size).toBe(ALL_ABYSSAL_STANCES.length);
    for (const stance of ALL_ABYSSAL_STANCES) {
      expect(stancesAffected.has(stance)).toBe(true);
    }
  });

  it('Offering pleases the Kraken (drives Venerate)', () => {
    expect(ABYSSAL_ACTION_AFFINITY[AbyssalAction.Offering]).toBe(AbyssalStance.Venerate);
  });

  it('Plunder breeds plunder (drives Plunder)', () => {
    expect(ABYSSAL_ACTION_AFFINITY[AbyssalAction.Plunder]).toBe(AbyssalStance.Plunder);
  });

  it('abyssalActionAffinity returns the table value', () => {
    for (const action of ALL_ABYSSAL_ACTIONS) {
      expect(abyssalActionAffinity(action)).toBe(ABYSSAL_ACTION_AFFINITY[action]);
    }
  });
});
