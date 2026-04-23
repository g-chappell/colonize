// NPC faction flavour — tooltip / encounter-log copy for the four
// non-playable factions registered by `@colonize/core/npc`.
//
// Rule-relevant shape — the id union, the spawn-trigger enum, the
// encounter-behaviour enum, and the template registry — lives in
// core. Content duplicates the id string union next to display copy
// so HUD / encounter-modal surfaces can pull the full entry (name,
// summary, description, tone register) without the content-to-core
// cross-workspace edge the dependency-direction rule forbids.
//
// A drift guard in `npc-factions.test.ts` asserts the canonical four
// ids independently; the sibling core-side test in
// `packages/core/src/npc/npc-faction.test.ts` does the same — both
// copies must update together when the MVP NPC roster ever changes.

import type { ToneRegister } from './palette.js';

// Mirrors `NpcFactionId` in packages/core/src/npc/npc-faction.ts.
// Duplicated for the dependency-direction rule. The string values are
// the wire format and must agree letter-for-letter across both
// packages — the drift guard is the sibling test in each package.
export type NpcFactionId = 'pale-watch' | 'abyssal-brotherhood' | 'blackwater' | 'sons-of-scylla';

export interface NpcFactionFlavourEntry {
  readonly id: NpcFactionId;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly register: ToneRegister;
}

export const NPC_FACTION_FLAVOURS: readonly NpcFactionFlavourEntry[] = [
  {
    id: 'pale-watch',
    name: 'Pale Watch',
    summary: 'Guardians of the Abyssal sites. They watch, and they do not blink.',
    description:
      'Hooded wardens in bleached oilcloth, posted wherever the old shrines drown. They treat every flag as a future trespasser and intervene only when the stones are disturbed — never for profit, never for parley.',
    register: 'eldritch',
  },
  {
    id: 'abyssal-brotherhood',
    name: 'Abyssal Brotherhood',
    summary: 'A cult that would wake what sleeps. Opportunistic when the Watch looks elsewhere.',
    description:
      "Hood-and-bone raiders chasing the full pantheon of Horrors. They cut a bargain with pressure, not with men — they strike where the convoy is thin and slip back into the reef's mouth before the Watch arrives.",
    register: 'eldritch',
  },
  {
    id: 'blackwater',
    name: 'Blackwater Collective',
    summary: 'Smugglers and ex-mercenaries who prefer your cargo to a conversation.',
    description:
      'Ex-Dominion press-gangs and cashiered quartermasters, working the lanes no flag patrols. They ride a trade lane until the manifest is too rich to ignore, then come aboard with a lantern and a ledger.',
    register: 'salt-and-rum',
  },
  {
    id: 'sons-of-scylla',
    name: 'Sons of Scylla',
    summary: 'Deep-water guerrillas who worship a many-headed dark. They ambush in pieces.',
    description:
      "Scylla's devotees, muster in the deep fathoms and strike in three directions at once. They take the first hull before the lookout calls it — and what they leave behind, the water claims.",
    register: 'eldritch',
  },
];

const FLAVOUR_BY_ID = new Map(NPC_FACTION_FLAVOURS.map((entry) => [entry.id, entry]));

export function getNpcFactionFlavour(id: NpcFactionId): NpcFactionFlavourEntry {
  const entry = FLAVOUR_BY_ID.get(id);
  if (!entry) {
    throw new Error(`Unknown NpcFactionId: ${id}`);
  }
  return entry;
}

export function isNpcFactionId(value: unknown): value is NpcFactionId {
  return typeof value === 'string' && FLAVOUR_BY_ID.has(value as NpcFactionId);
}
