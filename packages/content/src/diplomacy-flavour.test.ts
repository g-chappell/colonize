import { describe, it, expect } from 'vitest';
import {
  DIPLOMACY_ACTION_FLAVOURS,
  getDiplomacyActionFlavour,
  isDiplomacyActionId,
  type DiplomacyActionId,
} from './diplomacy-flavour.js';

describe('DIPLOMACY_ACTION_FLAVOURS', () => {
  it('covers all six diplomacy actions exactly once', () => {
    const ids = DIPLOMACY_ACTION_FLAVOURS.map((f) => f.action).sort();
    expect(ids).toEqual([
      'declare-war',
      'denounce',
      'gift-resources',
      'propose-alliance',
      'propose-peace',
      'share-intel',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has non-empty title, summary, flavour, cost label, confirm label, and a valid tone register', () => {
    for (const entry of DIPLOMACY_ACTION_FLAVOURS) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(20);
      expect(entry.flavour.length).toBeGreaterThan(20);
      expect(entry.costLabel.length).toBeGreaterThan(0);
      expect(entry.confirmLabel.length).toBeGreaterThan(0);
      expect(['salt-and-rum', 'eldritch', 'salvaged-futurism']).toContain(entry.register);
    }
  });
});

describe('getDiplomacyActionFlavour', () => {
  it('returns the entry for a known action', () => {
    expect(getDiplomacyActionFlavour('declare-war').title).toBe('Declare War');
    expect(getDiplomacyActionFlavour('propose-alliance').action).toBe('propose-alliance');
  });

  it('throws on an unknown action', () => {
    expect(() => getDiplomacyActionFlavour('bribe-ferryman' as DiplomacyActionId)).toThrow(
      /Unknown diplomacy action/,
    );
  });
});

describe('isDiplomacyActionId', () => {
  it('narrows known action strings', () => {
    expect(isDiplomacyActionId('declare-war')).toBe(true);
    expect(isDiplomacyActionId('gift-resources')).toBe(true);
  });

  it('rejects unknown strings and non-strings', () => {
    expect(isDiplomacyActionId('bribe-ferryman')).toBe(false);
    expect(isDiplomacyActionId(7)).toBe(false);
    expect(isDiplomacyActionId(null)).toBe(false);
    expect(isDiplomacyActionId(undefined)).toBe(false);
  });
});
