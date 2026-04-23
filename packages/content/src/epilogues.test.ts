import { describe, expect, it } from 'vitest';
import { FACTIONS } from './factions.js';
import {
  ALL_ENDGAME_RESULT_IDS,
  EPILOGUES,
  getEpilogue,
  type EndgameResultId,
} from './epilogues.js';

describe('epilogue registry', () => {
  it('provides an entry for every (faction, result) pairing', () => {
    for (const faction of FACTIONS) {
      for (const result of ALL_ENDGAME_RESULT_IDS) {
        const entry = EPILOGUES.find((e) => e.factionId === faction.id && e.result === result);
        expect(entry, `missing epilogue: ${faction.id}/${result}`).toBeDefined();
      }
    }
    // And no extras — combinatorial-complete count.
    expect(EPILOGUES.length).toBe(FACTIONS.length * ALL_ENDGAME_RESULT_IDS.length);
  });

  it('exposes both endgame result ids', () => {
    expect(new Set(ALL_ENDGAME_RESULT_IDS)).toEqual(
      new Set<EndgameResultId>(['sovereignty-victory', 'annihilated']),
    );
  });

  it('has non-empty title + body for every entry', () => {
    for (const entry of EPILOGUES) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.body.length).toBeGreaterThan(0);
    }
  });

  it('titles are unique per (faction, result) so UI can key off them', () => {
    const titles = EPILOGUES.map((e) => `${e.factionId}:${e.result}:${e.title}`);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('getEpilogue returns the matching entry', () => {
    const otkVictory = getEpilogue('otk', 'sovereignty-victory');
    expect(otkVictory.factionId).toBe('otk');
    expect(otkVictory.result).toBe('sovereignty-victory');
  });

  it('getEpilogue throws on unknown pairings', () => {
    // @ts-expect-error intentional invalid input for runtime guard
    expect(() => getEpilogue('otk', 'conquest')).toThrow();
    // @ts-expect-error intentional invalid input for runtime guard
    expect(() => getEpilogue('romans', 'annihilated')).toThrow();
  });
});
