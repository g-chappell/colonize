// Archive Charter flavour — per-charter narrative copy for the Council
// pick-modal and any codex / tooltip surface.
//
// The rule-relevant fields (axis + scalar delta) live in
// `@colonize/core/charter` — content cannot import core per the
// dependency-direction rule. This module mirrors the 20 charter ids
// alongside the descriptive fields the HUD wants (display name, one-
// line summary, narrative description, tone register). A drift guard
// test in `charters.test.ts` pins the two id lists together; a sibling
// test in the core workspace asserts the rule-relevant half.
//
// Canon register: mostly salt-and-rum with an eldritch thread (Kraken-
// Wind Blessing, Kelp-Witch Pact) and salvaged-futurism where the
// codex / tribunal tone fits. Registers drive palette picks in the
// Council card UI; see `palette.ts`.

import type { ToneRegister } from './palette.js';

export type ArchiveCharterFlavourId =
  | 'pirata-codex-fragment'
  | 'blade-oath-parchment'
  | 'bloodline-writ'
  | 'press-gang-commission'
  | 'tidekeepers-ledger'
  | 'forge-master-accord'
  | 'shipwright-guild-charter'
  | 'sawmill-syndicate-pact'
  | 'corsair-marque'
  | 'plunder-share-writ'
  | 'free-port-compact'
  | 'cartographers-bond'
  | 'lighthouse-keepers-oath'
  | 'astral-sextant-warrant'
  | 'kraken-wind-blessing'
  | 'careened-hull-pact'
  | 'envoys-seal'
  | 'tribunal-charter'
  | 'archivists-oath'
  | 'kelp-witch-pact';

export interface ArchiveCharterFlavour {
  readonly id: ArchiveCharterFlavourId;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly register: ToneRegister;
}

export const ARCHIVE_CHARTER_FLAVOURS: readonly ArchiveCharterFlavour[] = [
  {
    id: 'pirata-codex-fragment',
    name: 'Pirata Codex Fragment',
    summary: 'A stanza of the old raiders’ creed — crews fight steadier under its oath.',
    description:
      'Half a canvas binding, ink cracked by salt. The verses are older than any flag on these waters. Recited before a boarding, they settle the blood in any deckhand’s chest.',
    register: 'salt-and-rum',
  },
  {
    id: 'blade-oath-parchment',
    name: 'Blade-Oath Parchment',
    summary: 'A swearing-in vow that binds recruits to the fleet’s colours, pike or pistol.',
    description:
      'Four signatures deep, most of them in blood. The wording is plain — no captain survives the lie of it — and marines sworn to it fight as a braced rank, not a scatter.',
    register: 'salt-and-rum',
  },
  {
    id: 'bloodline-writ',
    name: 'Bloodline Writ',
    summary: 'Registers kin-lines as fleet-folk, cutting the wait for every new muster.',
    description:
      'A scroll of names — mothers, sons, cousins twice-removed — certifying each as fleet-blood. When the press-drum sounds, the rolls fill faster than any recruiting sergeant can march.',
    register: 'salt-and-rum',
  },
  {
    id: 'press-gang-commission',
    name: 'Press-Gang Commission',
    summary: 'Elder-sanctioned warrant to muster hands from any dockside tavern.',
    description:
      'Stamped in brass-wax and smudged with tar. The pressgang no longer answers to any one captain; they answer to this seal, and the quayside empties faster every time it is shown.',
    register: 'salt-and-rum',
  },
  {
    id: 'tidekeepers-ledger',
    name: 'Tide-Keeper’s Ledger',
    summary: 'Balanced columns that lift every colony’s honest production.',
    description:
      'A bound account-book, iron-clasped, every page ruled with a straight-edge. The tidekeepers teach our reeves to read it; granaries stop leaking and forges stop idle-burning the day the ledger arrives.',
    register: 'salvaged-futurism',
  },
  {
    id: 'forge-master-accord',
    name: 'Forge-Master Accord',
    summary: 'A covenant that threads every colony’s forge into one quotaless chain.',
    description:
      'Hammered into a copper plate, not paper — the forge-masters would not sign in ink. Production lifts across the archipelago; apprentices learn from whichever master forged the nearest iron, not the one that pressed them into an indenture.',
    register: 'salvaged-futurism',
  },
  {
    id: 'shipwright-guild-charter',
    name: 'Shipwright Guild Charter',
    summary: 'Guild-rate on every hull laid in our yards — keels cost what they ought, not more.',
    description:
      'Signed by three master-shipwrights and one drunk apprentice; the apprentice’s name is the binding one. Shipyards bill by the league of keel, not the depth of the captain’s purse, and the fleet grows correspondingly cheaper.',
    register: 'salt-and-rum',
  },
  {
    id: 'sawmill-syndicate-pact',
    name: 'Sawmill Syndicate Pact',
    summary: 'A pact with the timber-runners that softens every shipyard bill.',
    description:
      'Green wax, crossed-saw sigil. The syndicate will not cut a plank for the Concord at any price, but they cut for our yards at the old wartime rate — and our bills thin in proportion.',
    register: 'salt-and-rum',
  },
  {
    id: 'corsair-marque',
    name: 'Corsair Marque',
    summary: 'A letter-of-marque that legalises every prize taken on the open sea.',
    description:
      'The oldest surviving sheet in the archipelago’s archives — reissued, endorsed, and freshly sealed. A ship flying under it keeps what it takes, and the Concord’s tax-men dare not approach the anchorage.',
    register: 'salt-and-rum',
  },
  {
    id: 'plunder-share-writ',
    name: 'Plunder-Share Writ',
    summary: 'Formalises the crew’s cut — raid-hauls swell, and crews enlist twice over.',
    description:
      'Seventeen clauses and a clean math-table. Every hand knows their share to the fractional doubloon; when the boarding parties return, ledger and pistol agree, and the next voyage is twice as eager.',
    register: 'salt-and-rum',
  },
  {
    id: 'free-port-compact',
    name: 'Free-Port Compact',
    summary: 'Slices a hair off every broker’s margin in our harbours.',
    description:
      'A fold-out chart of harbour fees, every line struck through. Our ports offer the flag-free rate the Concord reserves for its own merchant-princes, and our trade-margins thicken modestly but reliably.',
    register: 'salvaged-futurism',
  },
  {
    id: 'cartographers-bond',
    name: 'Cartographer’s Bond',
    summary:
      'A shared survey of every lane in the archipelago — quoting the right price, every time.',
    description:
      'Seven fat volumes of charts, cross-referenced with soundings and market-day figures. Our brokers quote loads to the ounce and the mile, and every trade-run clears at a cleaner margin.',
    register: 'salvaged-futurism',
  },
  {
    id: 'lighthouse-keepers-oath',
    name: 'Lighthouse-Keeper’s Oath',
    summary: 'Lantern-tended sea-lanes — an extra tile of vision everywhere a keeper walks.',
    description:
      'A simple vow, recited each dusk. Keepers tend their lamps the same way whether or not a ship is expected; our watch-lines drift further over the water because their lights are always burning.',
    register: 'salt-and-rum',
  },
  {
    id: 'astral-sextant-warrant',
    name: 'Astral Sextant Warrant',
    summary: 'A codex-taught star-navigation regime — the sea thins by two tiles for our pilots.',
    description:
      'Brass sextant, glass mirror, and a chapter of notes the Archive keeps under lock. Trained pilots fix their positions from stars the Concord’s schools forgot, and our scouts see further across a moonless tide.',
    register: 'eldritch',
  },
  {
    id: 'kraken-wind-blessing',
    name: 'Kraken-Wind Blessing',
    summary: 'A Chapel-blown gale that nudges every hull one pace faster across the charts.',
    description:
      'A verse spoken over the standing rigging; the sails take a breath the Concord’s sloops never feel. Our hulls answer the helm faster, and the leagues shrink against the glass.',
    register: 'eldritch',
  },
  {
    id: 'careened-hull-pact',
    name: 'Careened-Hull Pact',
    summary: 'A fleet-wide careening rota — barnacle-free, every hull runs two paces truer.',
    description:
      'A master-yard accord that rotates each hull through a careening slip every season. Clean copper, no kelp-drag, two extra leagues a watch — and the shipwrights know every keel by scar, not by invoice.',
    register: 'salt-and-rum',
  },
  {
    id: 'envoys-seal',
    name: 'Envoy’s Seal',
    summary: 'A diplomat’s press that opens doors the Concord would prefer closed.',
    description:
      'Waxed once, at the Council’s founding, and refreshed every Equinox. Envoys bearing it are received by factions we have no right to address; diplomacy leans perceptibly our way on every pressed matter.',
    register: 'salvaged-futurism',
  },
  {
    id: 'tribunal-charter',
    name: 'Tribunal Charter',
    summary: 'A standing court that rules in our favour where the ink is ours.',
    description:
      'Two judges, one elder, one oath-keeper — and a page of citations the Concord refuses to acknowledge. Diplomatic disputes resolve in our favour where the law can be cited; we gain pressure on every bargaining table.',
    register: 'salvaged-futurism',
  },
  {
    id: 'archivists-oath',
    name: 'Archivist’s Oath',
    summary: 'Every rumour read thrice — the wreck-piles yield more for our recovery crews.',
    description:
      'The Archive’s own scribes swear it, and the wreck-piles follow suit. Where a rumour would have yielded one answer, it yields a quarter more; our codex thickens by the season.',
    register: 'salvaged-futurism',
  },
  {
    id: 'kelp-witch-pact',
    name: 'Kelp-Witch Pact',
    summary: 'A bargain with the drowned — the wreck-piles surrender twice what they ought.',
    description:
      'Signed where the kelp-witches feed — a reef no charter-hand visits twice. The rumour-tiles give up doubled recoveries; the cost is a smell in the back of the throat that never quite washes out.',
    register: 'eldritch',
  },
];

const CHARTER_FLAVOUR_IDS: readonly string[] = ARCHIVE_CHARTER_FLAVOURS.map((c) => c.id);

export function isArchiveCharterFlavourId(value: unknown): value is ArchiveCharterFlavourId {
  return typeof value === 'string' && CHARTER_FLAVOUR_IDS.includes(value);
}

export function getArchiveCharterFlavour(id: ArchiveCharterFlavourId): ArchiveCharterFlavour {
  if (!isArchiveCharterFlavourId(id)) {
    throw new TypeError(
      `getArchiveCharterFlavour: not a valid ArchiveCharterFlavourId: ${String(id)}`,
    );
  }
  const found = ARCHIVE_CHARTER_FLAVOURS.find((c) => c.id === id);
  if (!found) {
    throw new Error(`getArchiveCharterFlavour: missing ArchiveCharterFlavour for ${id}`);
  }
  return found;
}
