import { describe, expect, it } from 'vitest';
import {
  ALL_ENDGAME_KINDS,
  ALL_ENDGAME_RESULTS,
  EndgameKind,
  EndgameResult,
  checkEndgame,
  endgameKindForResult,
  isEndgameKind,
  isEndgameResult,
} from './endgame.js';

describe('endgame discriminators', () => {
  it('exposes every kind via ALL_ENDGAME_KINDS', () => {
    expect(new Set(ALL_ENDGAME_KINDS)).toEqual(new Set([EndgameKind.Victory, EndgameKind.Defeat]));
  });

  it('exposes every result via ALL_ENDGAME_RESULTS', () => {
    expect(new Set(ALL_ENDGAME_RESULTS)).toEqual(
      new Set([EndgameResult.SovereigntyVictory, EndgameResult.Annihilated]),
    );
  });

  it('narrows with isEndgameKind', () => {
    expect(isEndgameKind('victory')).toBe(true);
    expect(isEndgameKind('defeat')).toBe(true);
    expect(isEndgameKind('draw')).toBe(false);
    expect(isEndgameKind(undefined)).toBe(false);
    expect(isEndgameKind(42)).toBe(false);
  });

  it('narrows with isEndgameResult', () => {
    expect(isEndgameResult('sovereignty-victory')).toBe(true);
    expect(isEndgameResult('annihilated')).toBe(true);
    expect(isEndgameResult('conquest')).toBe(false);
    expect(isEndgameResult('')).toBe(false);
  });

  it('maps every result to a kind exhaustively', () => {
    expect(endgameKindForResult(EndgameResult.SovereigntyVictory)).toBe(EndgameKind.Victory);
    expect(endgameKindForResult(EndgameResult.Annihilated)).toBe(EndgameKind.Defeat);
  });
});

describe('checkEndgame — victory', () => {
  it('returns sovereignty-victory when the Concord campaign is won', () => {
    const outcome = checkEndgame({
      turn: 42,
      colonyCount: 3,
      fleetCount: 5,
      sovereigntyWarVictorious: true,
    });
    expect(outcome).toEqual({
      kind: EndgameKind.Victory,
      result: EndgameResult.SovereigntyVictory,
      turn: 42,
    });
  });

  it('victory takes precedence over annihilation on the same tick', () => {
    const outcome = checkEndgame({
      turn: 50,
      colonyCount: 0,
      fleetCount: 0,
      sovereigntyWarVictorious: true,
    });
    expect(outcome?.kind).toBe(EndgameKind.Victory);
    expect(outcome?.result).toBe(EndgameResult.SovereigntyVictory);
  });
});

describe('checkEndgame — defeat', () => {
  it('returns annihilated when both colonies and fleet are empty', () => {
    const outcome = checkEndgame({
      turn: 12,
      colonyCount: 0,
      fleetCount: 0,
      sovereigntyWarVictorious: false,
    });
    expect(outcome).toEqual({
      kind: EndgameKind.Defeat,
      result: EndgameResult.Annihilated,
      turn: 12,
    });
  });

  it('does NOT declare defeat while the faction still has a single ship', () => {
    expect(
      checkEndgame({
        turn: 5,
        colonyCount: 0,
        fleetCount: 1,
        sovereigntyWarVictorious: false,
      }),
    ).toBeNull();
  });

  it('does NOT declare defeat while the faction still has a single colony', () => {
    expect(
      checkEndgame({
        turn: 5,
        colonyCount: 1,
        fleetCount: 0,
        sovereigntyWarVictorious: false,
      }),
    ).toBeNull();
  });
});

describe('checkEndgame — in-progress', () => {
  it('returns null when the campaign is ongoing and assets remain', () => {
    expect(
      checkEndgame({
        turn: 1,
        colonyCount: 2,
        fleetCount: 3,
        sovereigntyWarVictorious: false,
      }),
    ).toBeNull();
  });
});

describe('checkEndgame — input validation', () => {
  it('throws on non-positive turn', () => {
    expect(() =>
      checkEndgame({
        turn: 0,
        colonyCount: 1,
        fleetCount: 1,
        sovereigntyWarVictorious: false,
      }),
    ).toThrow(TypeError);
  });

  it('throws on non-integer turn', () => {
    expect(() =>
      checkEndgame({
        turn: 1.5,
        colonyCount: 1,
        fleetCount: 1,
        sovereigntyWarVictorious: false,
      }),
    ).toThrow(TypeError);
  });

  it('throws on negative colonyCount', () => {
    expect(() =>
      checkEndgame({
        turn: 1,
        colonyCount: -1,
        fleetCount: 1,
        sovereigntyWarVictorious: false,
      }),
    ).toThrow(RangeError);
  });

  it('throws on negative fleetCount', () => {
    expect(() =>
      checkEndgame({
        turn: 1,
        colonyCount: 1,
        fleetCount: -1,
        sovereigntyWarVictorious: false,
      }),
    ).toThrow(RangeError);
  });
});
