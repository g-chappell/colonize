import { describe, it, expect } from 'vitest';
import { isToneRegister, REGISTERS, type ToneRegister } from './register.js';
import { OTK_PALETTE } from './palette.js';
import { FACTIONS } from './factions.js';
import { ARCHIVE_CHARTER_FLAVOURS } from './charters.js';
import { COUNCIL_THRESHOLD_FLAVOURS } from './chimes-flavour.js';
import { TITHE_FLAVOURS } from './concord-tithe-flavour.js';
import { DIPLOMACY_ACTION_FLAVOURS } from './diplomacy-flavour.js';
import { ABYSSAL_STANCE_FLAVOURS } from './abyssal-stance.js';
import { TIDEWATER_PARTY_FLAVOUR } from './tidewater-party.js';
import { NPC_FACTION_FLAVOURS } from './npc-factions.js';
import { PRICE_SHOCKS } from './price-shocks.js';
import { RUMOUR_OUTCOME_FLAVOURS } from './rumour-outcomes.js';
import { TAVERN_RUMOURS } from './tavern-rumours.js';
import { FRONTIER_MOTIF_REGISTER } from './frontier-motifs.js';

// Register-coverage lint rule (TASK-081).
//
// Pins the list of user-visible content registries that carry a per-
// entry `register: ToneRegister` tag. Every entry in each listed
// registry must resolve to a canonical register value. The registry
// list itself is pinned: adding a new tagged registry requires a line
// here, and removing an existing one fails loudly.
//
// Pattern intent: this is the *lint rule* half of the register-tagging
// infra. Entry-level structural invariants (non-empty copy, id
// uniqueness, ordering) continue to live in each registry's dedicated
// test file; this file only asserts the register-tag contract.
//
// Module-level single-register pins (FRONTIER_MOTIF_REGISTER) are
// covered separately at the bottom of this file.

interface TaggedEntry {
  readonly register: ToneRegister;
}

interface TaggedRegistry {
  readonly name: string;
  readonly entries: readonly TaggedEntry[];
}

const TAGGED_REGISTRIES: readonly TaggedRegistry[] = [
  { name: 'OTK_PALETTE', entries: OTK_PALETTE },
  { name: 'FACTIONS', entries: FACTIONS },
  { name: 'ARCHIVE_CHARTER_FLAVOURS', entries: ARCHIVE_CHARTER_FLAVOURS },
  { name: 'COUNCIL_THRESHOLD_FLAVOURS', entries: COUNCIL_THRESHOLD_FLAVOURS },
  { name: 'TITHE_FLAVOURS', entries: TITHE_FLAVOURS },
  { name: 'DIPLOMACY_ACTION_FLAVOURS', entries: DIPLOMACY_ACTION_FLAVOURS },
  { name: 'ABYSSAL_STANCE_FLAVOURS', entries: ABYSSAL_STANCE_FLAVOURS },
  { name: 'NPC_FACTION_FLAVOURS', entries: NPC_FACTION_FLAVOURS },
  { name: 'PRICE_SHOCKS', entries: PRICE_SHOCKS },
  { name: 'RUMOUR_OUTCOME_FLAVOURS', entries: RUMOUR_OUTCOME_FLAVOURS },
  { name: 'TAVERN_RUMOURS', entries: TAVERN_RUMOURS },
];

describe('register-coverage — per-entry tagged registries', () => {
  for (const registry of TAGGED_REGISTRIES) {
    describe(registry.name, () => {
      it('is non-empty', () => {
        expect(registry.entries.length).toBeGreaterThan(0);
      });

      it('tags every entry with a canonical tone register', () => {
        for (const entry of registry.entries) {
          expect(isToneRegister(entry.register)).toBe(true);
        }
      });
    });
  }
});

describe('register-coverage — single-object tagged surfaces', () => {
  it('TIDEWATER_PARTY_FLAVOUR tags its entry with a canonical tone register', () => {
    expect(isToneRegister(TIDEWATER_PARTY_FLAVOUR.register)).toBe(true);
  });
});

describe('register-coverage — module-level single-register pins', () => {
  it('FRONTIER_MOTIF_REGISTER is a canonical tone register', () => {
    expect(isToneRegister(FRONTIER_MOTIF_REGISTER)).toBe(true);
  });
});

describe('register-coverage — pinned tagged-registry list', () => {
  // Pins the count of tagged per-entry registries so dropping a
  // register tag from one of them fails loudly. Bump this number
  // when you legitimately add or remove a tagged registry and add a
  // VOICE.md line explaining why.
  const CANONICAL_TAGGED_REGISTRY_COUNT = 11;

  it('covers exactly the canonical count of tagged per-entry registries', () => {
    expect(TAGGED_REGISTRIES).toHaveLength(CANONICAL_TAGGED_REGISTRY_COUNT);
  });

  it('lists tagged registry names uniquely', () => {
    const names = TAGGED_REGISTRIES.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('register-coverage — REGISTERS contract', () => {
  it('every REGISTERS value passes the isToneRegister guard', () => {
    for (const r of REGISTERS) {
      expect(isToneRegister(r)).toBe(true);
    }
  });
});
