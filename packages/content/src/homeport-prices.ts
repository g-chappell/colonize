// Per-faction starting base prices for HomePort spawns.
//
// Each entry is the mid-price the home port opens at for one resource;
// the engine derives sell / buy-back from mid ± PRICE_SPREAD and
// shifts mid as net player volume accumulates (see HomePort in
// @colonize/core). Numbers reflect that faction's economic profile —
// e.g. Ironclad forges flood forgework, OTK kelp groves cheapen
// fibre, Phantom raids glut salvage. Tweak here, never in core; the
// downstream port-spawning code reads this table and supplies it via
// HomePortInit.basePrices.
//
// Per CLAUDE.md, content never imports core — the resource-id list is
// kept in sync with ResourceType via the invariant test in
// homeport-prices.test.ts (mirroring the resources / buildings /
// tile-yields pattern).

import type { PlayableFactionId } from './factions.js';
import type { ResourceEntryId } from './resources.js';

export type ResourcePriceTable = Readonly<Record<ResourceEntryId, number>>;

export const HOMEPORT_STARTING_PRICES: Readonly<Record<PlayableFactionId, ResourcePriceTable>> = {
  otk: {
    timber: 10,
    fibre: 8,
    provisions: 12,
    salvage: 18,
    planks: 14,
    forgework: 16,
  },
  ironclad: {
    timber: 12,
    fibre: 14,
    provisions: 15,
    salvage: 10,
    planks: 15,
    forgework: 8,
  },
  phantom: {
    timber: 11,
    fibre: 11,
    provisions: 18,
    salvage: 8,
    planks: 13,
    forgework: 14,
  },
  bloodborne: {
    timber: 15,
    fibre: 10,
    provisions: 11,
    salvage: 12,
    planks: 9,
    forgework: 14,
  },
};

export function getHomePortStartingPrices(factionId: PlayableFactionId): ResourcePriceTable {
  const table = HOMEPORT_STARTING_PRICES[factionId];
  if (!table) {
    throw new Error(`getHomePortStartingPrices: unknown faction id "${factionId}"`);
  }
  return table;
}
