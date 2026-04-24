import { describe, it, expect } from 'vitest';
import { ALL_DIRECTIONS, ALL_MAP_HINT_CATEGORIES } from '@colonize/core';
import {
  TAVERN_RUMOURS,
  collectTavernRumourHints,
  eligibleTavernRumours,
  getTavernRumour,
  isTavernRumourId,
  tavernRumourWeight,
  type TavernContext,
  type TavernRumourEntry,
  type TavernRumourId,
} from './tavern-rumours.js';
import { FACTIONS } from './factions.js';

const ANY_CONTEXT: TavernContext = {
  town: 'colony-1',
  year: 5,
  faction: 'otk',
};

const VALID_REGISTERS = new Set(['salt-and-rum', 'eldritch', 'salvaged-futurism']);
const FACTION_IDS = new Set(FACTIONS.map((f) => f.id));

describe('TAVERN_RUMOURS', () => {
  it('exposes at least 12 rumours so a single tavern visit can sample without exhausting the pool', () => {
    expect(TAVERN_RUMOURS.length).toBeGreaterThanOrEqual(12);
  });

  it('has unique ids', () => {
    const ids = TAVERN_RUMOURS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every id is a non-empty kebab-case string with the rumour- prefix', () => {
    for (const r of TAVERN_RUMOURS) {
      expect(r.id).toMatch(/^rumour-[a-z]+(-[a-z]+)*$/);
    }
  });

  it('every entry has a non-empty headline + body', () => {
    for (const r of TAVERN_RUMOURS) {
      expect(r.headline.length).toBeGreaterThan(0);
      expect(r.body.length).toBeGreaterThan(0);
    }
  });

  it('every register is one of the three tonal registers from CLAUDE.md', () => {
    for (const r of TAVERN_RUMOURS) {
      expect(VALID_REGISTERS.has(r.register)).toBe(true);
    }
  });

  it('every faction-tagged rumour names a playable faction id', () => {
    for (const r of TAVERN_RUMOURS) {
      if (r.trigger.faction !== undefined) {
        expect(FACTION_IDS.has(r.trigger.faction)).toBe(true);
      }
    }
  });

  it('every year window is non-degenerate (min <= max when both set, both integers)', () => {
    for (const r of TAVERN_RUMOURS) {
      if (r.trigger.year === undefined) continue;
      const { min, max } = r.trigger.year;
      if (min !== undefined) expect(Number.isInteger(min)).toBe(true);
      if (max !== undefined) expect(Number.isInteger(max)).toBe(true);
      if (min !== undefined && max !== undefined) {
        expect(min).toBeLessThanOrEqual(max);
      }
    }
  });

  it('the random-pool (no filters, default weight) holds enough rumours to fill a 3-slot tavern', () => {
    const ambient = TAVERN_RUMOURS.filter(
      (r) =>
        r.trigger.town === undefined &&
        r.trigger.year === undefined &&
        r.trigger.faction === undefined &&
        (r.trigger.weight ?? 1) > 0,
    );
    expect(ambient.length).toBeGreaterThanOrEqual(3);
  });

  it('every playable faction has at least one faction-tagged rumour (so each player sees flavour for theirs)', () => {
    const tagged = new Set<string>();
    for (const r of TAVERN_RUMOURS) {
      if (r.trigger.faction !== undefined) tagged.add(r.trigger.faction);
    }
    for (const id of FACTION_IDS) {
      expect(tagged.has(id)).toBe(true);
    }
  });
});

describe('isTavernRumourId / getTavernRumour', () => {
  it('isTavernRumourId narrows known ids', () => {
    expect(isTavernRumourId('rumour-archive-cache-east')).toBe(true);
  });

  it('isTavernRumourId rejects unknown values', () => {
    expect(isTavernRumourId('rumour-mystery-tale')).toBe(false);
    expect(isTavernRumourId('')).toBe(false);
    expect(isTavernRumourId(0)).toBe(false);
    expect(isTavernRumourId(undefined)).toBe(false);
    expect(isTavernRumourId(null)).toBe(false);
  });

  it('getTavernRumour returns the matching entry', () => {
    const r = getTavernRumour('rumour-archive-cache-east');
    expect(r.id).toBe('rumour-archive-cache-east');
    expect(r.headline.length).toBeGreaterThan(0);
  });

  it('getTavernRumour throws TypeError on unknown id', () => {
    expect(() => getTavernRumour('rumour-mystery-tale' as TavernRumourId)).toThrow(TypeError);
  });
});

describe('eligibleTavernRumours', () => {
  it('returns all rumours when context permits everything', () => {
    const eligible = eligibleTavernRumours(ANY_CONTEXT);
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible.length).toBeLessThanOrEqual(TAVERN_RUMOURS.length);
  });

  it('drops faction-tagged rumours that do not match the player faction', () => {
    const phantomOnly = phantom();
    const otkContext: TavernContext = { ...ANY_CONTEXT, faction: 'otk' };
    expect(eligibleTavernRumours(otkContext, [phantomOnly])).toEqual([]);
    const phantomContext: TavernContext = { ...ANY_CONTEXT, faction: 'phantom' };
    expect(eligibleTavernRumours(phantomContext, [phantomOnly])).toEqual([phantomOnly]);
  });

  it('drops year-windowed rumours outside the window', () => {
    const lateRumour: TavernRumourEntry = {
      id: 'rumour-collapse-era-relic',
      headline: 'late',
      body: 'late',
      register: 'salt-and-rum',
      trigger: { year: { min: 5 } },
    };
    expect(eligibleTavernRumours({ ...ANY_CONTEXT, year: 4 }, [lateRumour])).toEqual([]);
    expect(eligibleTavernRumours({ ...ANY_CONTEXT, year: 5 }, [lateRumour])).toEqual([lateRumour]);
    expect(eligibleTavernRumours({ ...ANY_CONTEXT, year: 99 }, [lateRumour])).toEqual([lateRumour]);
  });

  it('drops town-anchored rumours when visiting a different colony', () => {
    const townOnly: TavernRumourEntry = {
      id: 'rumour-singing-buoy',
      headline: 'town',
      body: 'town',
      register: 'salt-and-rum',
      trigger: { town: 'specific-port' },
    };
    expect(eligibleTavernRumours({ ...ANY_CONTEXT, town: 'other-port' }, [townOnly])).toEqual([]);
    expect(eligibleTavernRumours({ ...ANY_CONTEXT, town: 'specific-port' }, [townOnly])).toEqual([
      townOnly,
    ]);
  });

  it('excludes rumours with weight === 0 even when filters would otherwise admit them', () => {
    const muted: TavernRumourEntry = {
      id: 'rumour-empty-keel',
      headline: 'muted',
      body: 'muted',
      register: 'salt-and-rum',
      trigger: { weight: 0 },
    };
    expect(eligibleTavernRumours(ANY_CONTEXT, [muted])).toEqual([]);
  });
});

describe('tavernRumourWeight', () => {
  it('defaults to 1 when not set', () => {
    expect(tavernRumourWeight(getTavernRumour('rumour-archive-cache-east'))).toBe(1);
  });

  it('uses the explicit weight when set', () => {
    expect(tavernRumourWeight(getTavernRumour('rumour-pale-watch-sighting'))).toBe(2);
  });
});

describe('TavernRumourHint', () => {
  it('every hint names a valid MapHintCategory', () => {
    const validCategories = new Set(ALL_MAP_HINT_CATEGORIES);
    for (const r of TAVERN_RUMOURS) {
      if (r.hint) expect(validCategories.has(r.hint.category)).toBe(true);
    }
  });

  it('every hint names a valid Direction', () => {
    const validDirs = new Set(ALL_DIRECTIONS);
    for (const r of TAVERN_RUMOURS) {
      if (r.hint) expect(validDirs.has(r.hint.direction)).toBe(true);
    }
  });

  it('at least one rumour per payoff category carries a hint so each category can surface', () => {
    const seen = new Set<string>();
    for (const r of TAVERN_RUMOURS) {
      if (r.hint) seen.add(r.hint.category);
    }
    for (const cat of ALL_MAP_HINT_CATEGORIES) {
      expect(seen.has(cat)).toBe(true);
    }
  });

  it('rumours that lack a hint stay undefined (no stray empty objects)', () => {
    for (const r of TAVERN_RUMOURS) {
      if (r.hint === undefined) continue;
      expect(typeof r.hint.category).toBe('string');
      expect(typeof r.hint.direction).toBe('string');
    }
  });
});

describe('collectTavernRumourHints', () => {
  it('returns hints in the order of the supplied ids, paired with the rumour id', () => {
    const result = collectTavernRumourHints([
      'rumour-archive-cache-east',
      'rumour-singing-buoy',
      'rumour-derelict-leeward',
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      rumourId: 'rumour-archive-cache-east',
      hint: { category: 'archive-cache', direction: 'e' },
    });
    expect(result[1]).toEqual({
      rumourId: 'rumour-derelict-leeward',
      hint: { category: 'wreck', direction: 'w' },
    });
  });

  it('returns an empty array when no supplied rumour carries a hint', () => {
    expect(collectTavernRumourHints(['rumour-singing-buoy', 'rumour-empty-keel'])).toEqual([]);
  });

  it('returns an empty array for an empty id list', () => {
    expect(collectTavernRumourHints([])).toEqual([]);
  });
});

function phantom(): TavernRumourEntry {
  return {
    id: 'rumour-phantom-fog-bank',
    headline: 'phantom',
    body: 'phantom',
    register: 'salt-and-rum',
    trigger: { faction: 'phantom' },
  };
}
