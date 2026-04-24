import { describe, expect, it } from 'vitest';

import {
  AD_CADENCE_BY_GAME_LENGTH,
  ALL_GAME_LENGTHS,
  DEFAULT_AD_CADENCE_TURNS,
  DEFAULT_GAME_LENGTH,
  GameLength,
  cadenceForGameLength,
  isGameLength,
  shouldShowInterstitial,
} from './cadence.js';

describe('GameLength registry', () => {
  it('enumerates every preset', () => {
    expect(ALL_GAME_LENGTHS).toEqual([GameLength.Short, GameLength.Standard, GameLength.Long]);
  });

  it('round-trips through the type guard', () => {
    for (const length of ALL_GAME_LENGTHS) {
      expect(isGameLength(length)).toBe(true);
    }
    expect(isGameLength('epic')).toBe(false);
    expect(isGameLength(null)).toBe(false);
    expect(isGameLength(undefined)).toBe(false);
  });

  it('anchors Standard on DEFAULT_AD_CADENCE_TURNS so brief + code cannot drift', () => {
    // The task brief pins the Standard default at 10 turns. Re-deriving
    // it from the same constant keeps balance.md, the registry, and the
    // orchestrator from drifting apart.
    expect(AD_CADENCE_BY_GAME_LENGTH[GameLength.Standard]).toBe(DEFAULT_AD_CADENCE_TURNS);
    expect(cadenceForGameLength(DEFAULT_GAME_LENGTH)).toBe(DEFAULT_AD_CADENCE_TURNS);
  });

  it('orders cadences so shorter runs see ads more often than longer runs', () => {
    // Relational invariant (per registry-patterns.md): the specific
    // numbers are tunable in balance.md, but the ordering short < standard
    // < long is a design constraint — a shorter game must not have a
    // sparser ad cadence than a longer one.
    const short = cadenceForGameLength(GameLength.Short);
    const standard = cadenceForGameLength(GameLength.Standard);
    const long = cadenceForGameLength(GameLength.Long);
    expect(short).toBeLessThan(standard);
    expect(standard).toBeLessThan(long);
  });
});

describe('shouldShowInterstitial', () => {
  it('returns false until N turns have elapsed since the last show', () => {
    // Fresh game: lastAdShowTurn stays at 0 until the first ad.
    for (let turn = 0; turn < 10; turn++) {
      expect(shouldShowInterstitial({ currentTurn: turn, lastAdShowTurn: 0, cadenceN: 10 })).toBe(
        false,
      );
    }
  });

  it('triggers on the exact N-th turn after lastAdShowTurn (>=, not >)', () => {
    expect(shouldShowInterstitial({ currentTurn: 10, lastAdShowTurn: 0, cadenceN: 10 })).toBe(true);
    expect(shouldShowInterstitial({ currentTurn: 20, lastAdShowTurn: 10, cadenceN: 10 })).toBe(
      true,
    );
  });

  it('keeps triggering while the cadence remains unmet by a stale lastAdShowTurn', () => {
    // If the ad manager returned `skipped` (guarded / unavailable) the
    // orchestrator leaves lastAdShowTurn untouched; the check must not
    // latch to false — every subsequent turn is a fresh attempt.
    expect(shouldShowInterstitial({ currentTurn: 11, lastAdShowTurn: 0, cadenceN: 10 })).toBe(true);
    expect(shouldShowInterstitial({ currentTurn: 15, lastAdShowTurn: 0, cadenceN: 10 })).toBe(true);
  });

  it('respects the Short preset (cadenceN=6) — first ad fires at turn 6', () => {
    const n = cadenceForGameLength(GameLength.Short);
    expect(shouldShowInterstitial({ currentTurn: 5, lastAdShowTurn: 0, cadenceN: n })).toBe(false);
    expect(shouldShowInterstitial({ currentTurn: 6, lastAdShowTurn: 0, cadenceN: n })).toBe(true);
  });

  it('respects the Long preset (cadenceN=15) — no ad through turn 14', () => {
    const n = cadenceForGameLength(GameLength.Long);
    expect(shouldShowInterstitial({ currentTurn: 14, lastAdShowTurn: 0, cadenceN: n })).toBe(false);
    expect(shouldShowInterstitial({ currentTurn: 15, lastAdShowTurn: 0, cadenceN: n })).toBe(true);
  });

  it('rejects non-integer currentTurn', () => {
    expect(() =>
      shouldShowInterstitial({ currentTurn: 1.5, lastAdShowTurn: 0, cadenceN: 10 }),
    ).toThrow(RangeError);
  });

  it('rejects negative currentTurn', () => {
    expect(() =>
      shouldShowInterstitial({ currentTurn: -1, lastAdShowTurn: 0, cadenceN: 10 }),
    ).toThrow(RangeError);
  });

  it('rejects negative lastAdShowTurn', () => {
    expect(() =>
      shouldShowInterstitial({ currentTurn: 10, lastAdShowTurn: -1, cadenceN: 10 }),
    ).toThrow(RangeError);
  });

  it('rejects cadenceN < 1 (would mean every turn is an ad turn)', () => {
    expect(() =>
      shouldShowInterstitial({ currentTurn: 10, lastAdShowTurn: 0, cadenceN: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      shouldShowInterstitial({ currentTurn: 10, lastAdShowTurn: 0, cadenceN: -5 }),
    ).toThrow(RangeError);
  });

  it('rejects a non-object inputs argument', () => {
    // The check guards against a common mis-call pattern where a caller
    // forgets to wrap positional args in an object.
    expect(() =>
      shouldShowInterstitial(null as unknown as Parameters<typeof shouldShowInterstitial>[0]),
    ).toThrow(TypeError);
  });
});
