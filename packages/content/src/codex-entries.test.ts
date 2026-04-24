import { describe, it, expect } from 'vitest';
import {
  CODEX_CATEGORIES,
  CODEX_ENTRIES,
  codexCategoryLabel,
  getCodexEntry,
  initialUnlockedCodexEntryIds,
  isCodexEntryId,
  type CodexCategory,
} from './codex-entries.js';

describe('CODEX_ENTRIES', () => {
  it('has unique, non-empty ids', () => {
    const ids = CODEX_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });

  it('every entry has non-empty title / summary / body', () => {
    for (const e of CODEX_ENTRIES) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.summary.length).toBeGreaterThan(0);
      expect(e.body.length).toBeGreaterThan(0);
    }
  });

  it('every entry uses a known category', () => {
    for (const e of CODEX_ENTRIES) expect(CODEX_CATEGORIES).toContain(e.category);
  });

  it('every entry uses a known canon tier', () => {
    for (const e of CODEX_ENTRIES) {
      expect(['established', 'draft', 'open']).toContain(e.canonTier);
    }
  });

  it('every category in CODEX_CATEGORIES has at least one entry', () => {
    for (const cat of CODEX_CATEGORIES) {
      const hasEntry = CODEX_ENTRIES.some((e) => e.category === cat);
      expect(hasEntry, `no entries for category ${cat}`).toBe(true);
    }
  });

  it('includes at least one initially-unlocked entry (otherwise the viewer is empty)', () => {
    expect(initialUnlockedCodexEntryIds().length).toBeGreaterThan(0);
  });
});

describe('getCodexEntry', () => {
  it('returns the entry for a known id', () => {
    const entry = getCodexEntry('faction-otk');
    expect(entry?.title).toBe('Order of the Kraken');
  });

  it('returns undefined for an unknown id', () => {
    expect(getCodexEntry('not-a-real-entry')).toBeUndefined();
  });
});

describe('isCodexEntryId', () => {
  it('is true for a known id, false for an unknown id or non-string', () => {
    expect(isCodexEntryId('faction-otk')).toBe(true);
    expect(isCodexEntryId('nope')).toBe(false);
    expect(isCodexEntryId(42)).toBe(false);
    expect(isCodexEntryId(null)).toBe(false);
  });
});

describe('codexCategoryLabel', () => {
  it('returns a human-readable label for every category', () => {
    for (const cat of CODEX_CATEGORIES) {
      const label = codexCategoryLabel(cat);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('covers every CodexCategory member (exhaustiveness guard)', () => {
    // Type-level guard: the test fails at compile time if a new category
    // is added to the union without being labelled.
    const all: Record<CodexCategory, string> = {
      faction: codexCategoryLabel('faction'),
      bloodline: codexCategoryLabel('bloodline'),
      horror: codexCategoryLabel('horror'),
      ship: codexCategoryLabel('ship'),
      location: codexCategoryLabel('location'),
    };
    for (const value of Object.values(all)) expect(value.length).toBeGreaterThan(0);
  });
});

describe('initialUnlockedCodexEntryIds', () => {
  it('returns only ids of entries flagged unlockedFromStart', () => {
    const ids = new Set(initialUnlockedCodexEntryIds());
    for (const entry of CODEX_ENTRIES) {
      if (entry.unlockedFromStart === true) {
        expect(ids.has(entry.id)).toBe(true);
      } else {
        expect(ids.has(entry.id)).toBe(false);
      }
    }
  });

  it('returns a fresh array on each call (callers cannot mutate registry order)', () => {
    const a = initialUnlockedCodexEntryIds();
    const b = initialUnlockedCodexEntryIds();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
