import { describe, it, expect } from 'vitest';
import { CODEX_CATEGORIES, type CodexEntry } from '@colonize/content';
import { countUnlockedEntries, groupUnlockedCodexEntries } from './codex-math';

const SAMPLE: readonly CodexEntry[] = [
  {
    id: 'faction-a',
    category: 'faction',
    title: 'Faction A',
    summary: 's',
    body: 'b',
    canonTier: 'established',
  },
  {
    id: 'faction-b',
    category: 'faction',
    title: 'Faction B',
    summary: 's',
    body: 'b',
    canonTier: 'established',
  },
  {
    id: 'ship-a',
    category: 'ship',
    title: 'Ship A',
    summary: 's',
    body: 'b',
    canonTier: 'established',
  },
  {
    id: 'horror-a',
    category: 'horror',
    title: 'Horror A',
    summary: 's',
    body: 'b',
    canonTier: 'draft',
  },
];

describe('groupUnlockedCodexEntries', () => {
  it('emits one group per CODEX_CATEGORIES member in fixed order', () => {
    const groups = groupUnlockedCodexEntries(SAMPLE, ['faction-a']);
    expect(groups.map((g) => g.category)).toEqual([...CODEX_CATEGORIES]);
  });

  it('filters out entries whose id is not unlocked', () => {
    const groups = groupUnlockedCodexEntries(SAMPLE, ['faction-a', 'horror-a']);
    const faction = groups.find((g) => g.category === 'faction')!;
    const horror = groups.find((g) => g.category === 'horror')!;
    const ship = groups.find((g) => g.category === 'ship')!;
    expect(faction.entries.map((e) => e.id)).toEqual(['faction-a']);
    expect(horror.entries.map((e) => e.id)).toEqual(['horror-a']);
    expect(ship.entries).toEqual([]);
  });

  it('emits an empty entry list for categories with no unlocked entries', () => {
    const groups = groupUnlockedCodexEntries(SAMPLE, []);
    for (const group of groups) expect(group.entries).toEqual([]);
  });

  it('ignores unlocked ids that are not in the entry list', () => {
    const groups = groupUnlockedCodexEntries(SAMPLE, ['ghost-id', 'faction-a']);
    const faction = groups.find((g) => g.category === 'faction')!;
    expect(faction.entries.map((e) => e.id)).toEqual(['faction-a']);
  });

  it('preserves authoring order within a category', () => {
    const groups = groupUnlockedCodexEntries(SAMPLE, ['faction-b', 'faction-a']);
    const faction = groups.find((g) => g.category === 'faction')!;
    // 'faction-a' precedes 'faction-b' in SAMPLE regardless of the
    // unlockedIds ordering — the display is driven by authoring order.
    expect(faction.entries.map((e) => e.id)).toEqual(['faction-a', 'faction-b']);
  });
});

describe('countUnlockedEntries', () => {
  it('returns the number of entries whose id is in the unlocked set', () => {
    expect(countUnlockedEntries(SAMPLE, ['faction-a', 'horror-a'])).toBe(2);
  });

  it('returns 0 when nothing is unlocked', () => {
    expect(countUnlockedEntries(SAMPLE, [])).toBe(0);
  });

  it('ignores unlocked ids that are not in the entry list', () => {
    expect(countUnlockedEntries(SAMPLE, ['ghost', 'faction-a'])).toBe(1);
  });
});
