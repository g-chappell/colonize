// Abyssal stance flavour — tooltip + narrative copy for the four
// per-faction Abyssal stances (Venerate / Tolerate / Plunder / Guard).
//
// The rule-relevant pieces — stance enum, action vocabulary, tracker,
// modifier multipliers — live in `@colonize/core/abyssal`. Content
// duplicates the four stance ids next to display copy so HUD / tooltip
// surfaces get the full entry without the content-to-core cross-
// workspace edge the dependency-direction rule forbids. A drift guard
// in `apps/web` (when an Abyssal HUD lands) pins the two copies.

import type { ToneRegister } from './palette.js';

// Mirrors `AbyssalStance` in packages/core/src/abyssal/stance.ts.
// Duplicated for the dependency-direction rule. The string values are
// the wire format and must agree letter-for-letter.
export type AbyssalStanceId = 'venerate' | 'tolerate' | 'plunder' | 'guard';

export interface AbyssalStanceFlavourEntry {
  readonly id: AbyssalStanceId;
  readonly name: string;
  readonly summary: string;
  readonly flavour: string;
  readonly register: ToneRegister;
}

export const ABYSSAL_STANCE_FLAVOURS: readonly AbyssalStanceFlavourEntry[] = [
  {
    id: 'venerate',
    name: 'Venerate',
    summary: 'Offerings, vigil, hushed bells. The Kraken is owed and the Watch reads kin.',
    flavour:
      'Crews kneel at the reef-edge with rum poured into the swell. The lanterns are doused before the Chapel doors open; what listens beneath does not need light.',
    register: 'eldritch',
  },
  {
    id: 'tolerate',
    name: 'Tolerate',
    summary: 'Pass through, log the sighting, light no fires. The default of the cautious.',
    flavour:
      'A nod toward the dark water and a course laid wide of the shrines. No tribute, no insult — the bargain neither party signed.',
    register: 'salt-and-rum',
  },
  {
    id: 'plunder',
    name: 'Plunder',
    summary: 'Strip the shrines, sell the relics. The Kraken stirs; the Pale Watch hunts.',
    flavour:
      'Crowbars under altar plates, the relics bagged in oilcloth. The men do not look at the water on the way out, and the water remembers each face.',
    register: 'salvaged-futurism',
  },
  {
    id: 'guard',
    name: 'Guard',
    summary: 'Patrol the shrines, deter trespass. The Watch reads ally; the Kraken reads soldier.',
    flavour:
      'Pickets walk the tide-line in matched cadence, gunlocks oiled, eyes on the deep. They guard the site for reasons the Chapel never quite spells out.',
    register: 'salt-and-rum',
  },
];

const FLAVOUR_BY_ID = new Map(ABYSSAL_STANCE_FLAVOURS.map((entry) => [entry.id, entry]));

export function getAbyssalStanceFlavour(id: AbyssalStanceId): AbyssalStanceFlavourEntry {
  const entry = FLAVOUR_BY_ID.get(id);
  if (!entry) {
    throw new Error(`Unknown AbyssalStanceId: ${id}`);
  }
  return entry;
}

export function isAbyssalStanceId(value: unknown): value is AbyssalStanceId {
  return typeof value === 'string' && FLAVOUR_BY_ID.has(value as AbyssalStanceId);
}
