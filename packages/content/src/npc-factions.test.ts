import { describe, it, expect } from 'vitest';
import { PALETTE_BY_REGISTER } from './palette.js';
import {
  NPC_FACTION_FLAVOURS,
  getNpcFactionFlavour,
  isNpcFactionId,
  type NpcFactionId,
} from './npc-factions.js';

const CANONICAL_IDS: readonly NpcFactionId[] = [
  'pale-watch',
  'abyssal-brotherhood',
  'blackwater',
  'sons-of-scylla',
];

describe('NPC_FACTION_FLAVOURS', () => {
  it('has one entry per canonical NPC faction id', () => {
    expect(NPC_FACTION_FLAVOURS).toHaveLength(CANONICAL_IDS.length);
    const ids = NPC_FACTION_FLAVOURS.map((e) => e.id);
    expect(new Set(ids).size).toBe(CANONICAL_IDS.length);
    for (const id of CANONICAL_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('every entry has non-empty copy fields and a unique display name', () => {
    for (const entry of NPC_FACTION_FLAVOURS) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
    const names = NPC_FACTION_FLAVOURS.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every entry uses a known tone register', () => {
    const knownRegisters = Object.keys(PALETTE_BY_REGISTER);
    for (const entry of NPC_FACTION_FLAVOURS) {
      expect(knownRegisters).toContain(entry.register);
    }
  });

  it('Abyssal-site factions read as eldritch', () => {
    // Pale Watch (guardians), Abyssal Brotherhood (cult), Sons of
    // Scylla (Horror-patron) all draw their register from the
    // eldritch side of the tonal palette. Blackwater is the salt-
    // and-rum smuggler outlier.
    for (const id of ['pale-watch', 'abyssal-brotherhood', 'sons-of-scylla'] as const) {
      const entry = NPC_FACTION_FLAVOURS.find((e) => e.id === id);
      expect(entry?.register).toBe('eldritch');
    }
  });
});

describe('getNpcFactionFlavour', () => {
  it('returns the matching entry for every canonical id', () => {
    for (const id of CANONICAL_IDS) {
      expect(getNpcFactionFlavour(id).id).toBe(id);
    }
  });

  it('throws for an unknown id', () => {
    expect(() => getNpcFactionFlavour('scarlet-forge' as NpcFactionId)).toThrow();
  });
});

describe('isNpcFactionId', () => {
  it('returns true for every canonical id', () => {
    for (const id of CANONICAL_IDS) {
      expect(isNpcFactionId(id)).toBe(true);
    }
  });

  it('returns false for unknowns and non-strings', () => {
    expect(isNpcFactionId('PALE-WATCH')).toBe(false);
    expect(isNpcFactionId('pale watch')).toBe(false);
    expect(isNpcFactionId('otk')).toBe(false);
    expect(isNpcFactionId('scarlet-forge')).toBe(false);
    expect(isNpcFactionId(null)).toBe(false);
    expect(isNpcFactionId(undefined)).toBe(false);
    expect(isNpcFactionId(0)).toBe(false);
  });
});
