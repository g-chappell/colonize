import { describe, it, expect } from 'vitest';
import {
  ARCHIVE_CHARTER_FLAVOURS,
  getArchiveCharterFlavour,
  isArchiveCharterFlavourId,
  type ArchiveCharterFlavourId,
} from './charters.js';

// Mirror of the 20 ids in
// `packages/core/src/charter/charter-registry.ts`. Content cannot import
// core (dependency-direction rule), so this canonical list + the sibling
// test in the core workspace jointly pin the two registries.
const CANONICAL_CHARTER_IDS: readonly ArchiveCharterFlavourId[] = [
  'pirata-codex-fragment',
  'blade-oath-parchment',
  'bloodline-writ',
  'press-gang-commission',
  'tidekeepers-ledger',
  'forge-master-accord',
  'shipwright-guild-charter',
  'sawmill-syndicate-pact',
  'corsair-marque',
  'plunder-share-writ',
  'free-port-compact',
  'cartographers-bond',
  'lighthouse-keepers-oath',
  'astral-sextant-warrant',
  'kraken-wind-blessing',
  'careened-hull-pact',
  'envoys-seal',
  'tribunal-charter',
  'archivists-oath',
  'kelp-witch-pact',
];

describe('ARCHIVE_CHARTER_FLAVOURS', () => {
  it('ships exactly twenty charters', () => {
    expect(ARCHIVE_CHARTER_FLAVOURS).toHaveLength(20);
  });

  it('covers the canonical MVP id list exactly once per id', () => {
    const ids = ARCHIVE_CHARTER_FLAVOURS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...CANONICAL_CHARTER_IDS]);
  });

  it('every entry has a non-empty name, summary, description, and a valid register', () => {
    for (const entry of ARCHIVE_CHARTER_FLAVOURS) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(20);
      expect(entry.description.length).toBeGreaterThan(40);
      expect(['salt-and-rum', 'eldritch', 'salvaged-futurism']).toContain(entry.register);
    }
  });

  it('includes every charter named in the task description', () => {
    const names = ARCHIVE_CHARTER_FLAVOURS.map((c) => c.name);
    expect(names).toContain('Pirata Codex Fragment');
    expect(names).toContain('Bloodline Writ');
  });
});

describe('isArchiveCharterFlavourId', () => {
  it('returns true for every canonical id', () => {
    for (const id of CANONICAL_CHARTER_IDS) {
      expect(isArchiveCharterFlavourId(id)).toBe(true);
    }
  });

  it('returns false for unknown strings and non-strings', () => {
    expect(isArchiveCharterFlavourId('ghost-charter')).toBe(false);
    expect(isArchiveCharterFlavourId(42)).toBe(false);
    expect(isArchiveCharterFlavourId(null)).toBe(false);
    expect(isArchiveCharterFlavourId(undefined)).toBe(false);
  });
});

describe('getArchiveCharterFlavour', () => {
  it('returns the flavour entry for a known id', () => {
    const pirata = getArchiveCharterFlavour('pirata-codex-fragment');
    expect(pirata.name).toBe('Pirata Codex Fragment');
    expect(pirata.register).toBe('salt-and-rum');
  });

  it('throws on an unknown id', () => {
    expect(() => getArchiveCharterFlavour('ghost-charter' as ArchiveCharterFlavourId)).toThrow(
      TypeError,
    );
  });
});

describe('Archive Charter drift guard (content side)', () => {
  // Sibling of packages/core/src/charter/charter-registry.test.ts.
  // Content and core cannot import each other; this test + the core-
  // side sibling jointly pin the canonical 20-charter id list.
  it('matches the canonical MVP id list', () => {
    expect(ARCHIVE_CHARTER_FLAVOURS.map((c) => c.id)).toEqual([...CANONICAL_CHARTER_IDS]);
  });
});
