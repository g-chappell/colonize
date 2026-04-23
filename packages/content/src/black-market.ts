// Blackwater Collective vendor — the Tortuga black-market stall.
//
// Flavour-only UI data: the Blackwater NPC faction declared in
// `npc-factions.ts` runs a smugglers' stall at Tortuga that offers
// rare-good swaps at odd prices and, occasionally, a Kraken Talisman.
// The Chime prices here are display-layer numbers only — no buy/sell
// side-effect is wired yet, so these values sit with the flavour copy
// (salt-and-rum register) in content rather than in core.
//
// Per CLAUDE.md registry rules: we ship the UI-facing primitive — the
// shape of an offering, the canonical pool, flavour pitch — and leave
// the encounter orchestrator (which rolls a subset per Tortuga visit)
// to a downstream task. The consumer today is the modal in
// `apps/web/src/blackmarket/`; that modal reads whatever offerings the
// store slice holds, which will eventually be a dice-rolled subset of
// this pool.

import type { ResourceEntryId } from './resources.js';

export type BlackMarketOfferingId =
  | 'buy-timber-bundle'
  | 'buy-forgework-crate'
  | 'buy-planks-parcel'
  | 'sell-salvage-load'
  | 'sell-provisions-cask'
  | 'sell-fibre-bale'
  | 'talisman-kraken';

export interface BlackMarketBuyOffer {
  readonly kind: 'buy';
  readonly id: BlackMarketOfferingId;
  readonly resourceId: ResourceEntryId;
  readonly quantity: number;
  readonly priceChimes: number;
  readonly pitch: string;
}

export interface BlackMarketSellOffer {
  readonly kind: 'sell';
  readonly id: BlackMarketOfferingId;
  readonly resourceId: ResourceEntryId;
  readonly quantity: number;
  readonly priceChimes: number;
  readonly pitch: string;
}

export interface BlackMarketTalismanOffer {
  readonly kind: 'talisman';
  readonly id: BlackMarketOfferingId;
  readonly priceChimes: number;
  readonly pitch: string;
}

export type BlackMarketOffering =
  | BlackMarketBuyOffer
  | BlackMarketSellOffer
  | BlackMarketTalismanOffer;

// Display-layer "odd pricing" baselines, chosen so that every buy offer
// sits clearly above the fair-market Chime-per-unit floor and every
// sell offer sits clearly below the fair-market Chime-per-unit ceiling.
// The invariant test in `black-market.test.ts` pins the relationship
// rather than these literals — rebalancing the numbers should not
// cascade into a test fix.
const BUY_CHIMES_PER_UNIT_FLOOR = 4;
const SELL_CHIMES_PER_UNIT_CEILING = 3;

export const BLACK_MARKET_BUY_CHIMES_PER_UNIT_FLOOR = BUY_CHIMES_PER_UNIT_FLOOR;
export const BLACK_MARKET_SELL_CHIMES_PER_UNIT_CEILING = SELL_CHIMES_PER_UNIT_CEILING;

export const BLACK_MARKET_OFFERINGS: readonly BlackMarketOffering[] = [
  {
    kind: 'buy',
    id: 'buy-timber-bundle',
    resourceId: 'timber',
    quantity: 4,
    priceChimes: 23,
    pitch:
      "Grove-felled, bark-on, no questions — 'fell off a Dominion barge,' he winks, and the ledger says otherwise.",
  },
  {
    kind: 'buy',
    id: 'buy-forgework-crate',
    resourceId: 'forgework',
    quantity: 2,
    priceChimes: 19,
    pitch:
      "A crate of fittings with the Rayon stamp filed off — 'honest brass, re-struck twice, pay no mind to the old dent.'",
  },
  {
    kind: 'buy',
    id: 'buy-planks-parcel',
    resourceId: 'planks',
    quantity: 3,
    priceChimes: 17,
    pitch:
      'Sawmill-finished stock the quartermaster never inventoried. Straight-edged, true to length, salt-stained honest.',
  },
  {
    kind: 'sell',
    id: 'sell-salvage-load',
    resourceId: 'salvage',
    quantity: 6,
    priceChimes: 13,
    pitch:
      "'We'll take the rust off your hands — call it a courtesy.' He pays in clipped chimes and a nod you cannot bank.",
  },
  {
    kind: 'sell',
    id: 'sell-provisions-cask',
    resourceId: 'provisions',
    quantity: 5,
    priceChimes: 11,
    pitch:
      "'Hardtack and brined greens, same as any wharfside — only your crew won't miss what never sailed.'",
  },
  {
    kind: 'sell',
    id: 'sell-fibre-bale',
    resourceId: 'fibre',
    quantity: 4,
    priceChimes: 9,
    pitch:
      "'Rope-walk feedstock. He'll knock a chime off if you don't ask what lane it came down.'",
  },
  {
    kind: 'talisman',
    id: 'talisman-kraken',
    priceChimes: 88,
    pitch:
      'Barnacled bone on a salt-bleached cord. The inscription reads against the Kraken — the Collective will not say how it came ashore, only that the asking price climbs with the tide.',
  },
];

const OFFERING_BY_ID = new Map(BLACK_MARKET_OFFERINGS.map((o) => [o.id, o]));

export function getBlackMarketOffering(id: BlackMarketOfferingId): BlackMarketOffering {
  const entry = OFFERING_BY_ID.get(id);
  if (!entry) {
    throw new Error(`Unknown BlackMarketOfferingId: ${id}`);
  }
  return entry;
}

export function isBlackMarketOfferingId(value: unknown): value is BlackMarketOfferingId {
  return typeof value === 'string' && OFFERING_BY_ID.has(value as BlackMarketOfferingId);
}

export function isBlackMarketTalismanOffer(
  offer: BlackMarketOffering,
): offer is BlackMarketTalismanOffer {
  return offer.kind === 'talisman';
}
