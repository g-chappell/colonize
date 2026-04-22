// Tile-yield flavour entries + mirrored rule stats for the HUD / tooltips.
//
// The save-format-bound registry (TileType + base yield vector) lives in
// @colonize/core; this module mirrors the yield quantities next to the
// flavour copy so a single tooltip read gets the full entry without needing
// both workspaces. Per CLAUDE.md, content never imports core — the yield
// numbers are kept in sync by invariant tests below, mirroring the
// BUILDINGS / ship-class pattern.

export type TileYieldEntryId =
  | 'ocean'
  | 'rayon-passage'
  | 'island'
  | 'floating-city'
  | 'red-tide'
  | 'fata-morgana';

export interface TileYieldEntry {
  readonly id: TileYieldEntryId;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly yields: { readonly [resourceId: string]: number };
}

export const TILE_YIELDS: readonly TileYieldEntry[] = [
  {
    id: 'ocean',
    name: 'Open Ocean',
    summary: 'Fishing waters — provisions for the larder.',
    description:
      'Long swell, circling gulls, nets hauled hand-over-hand. A steady larder while the boats keep coming home.',
    yields: { provisions: 1 },
  },
  {
    id: 'island',
    name: 'Island Shore',
    summary: 'Coastal grove + kelp — timber and fibre.',
    description:
      'Stunted pines leaning off the headland, kelp racks drying above the tide-line. Half a colony is built from what a crew can cut here.',
    yields: { timber: 1, fibre: 1 },
  },
  {
    id: 'floating-city',
    name: 'Floating City',
    summary: 'Scavenging berths — salvage and provisions.',
    description:
      'Rafted hulks and tar-black quays, ribs of drowned ships lashed together. Pick-and-gaff work pays in salvage; traders run a side-line in provisions.',
    yields: { salvage: 1, provisions: 1 },
  },
  {
    id: 'rayon-passage',
    name: 'Rayon Passage',
    summary: 'Concord waters — tithed lanes, no honest yield.',
    description:
      'Marker-buoys painted Concord-white, toll-ships at anchor. Crews who work these lanes end up paying, not earning.',
    yields: {},
  },
  {
    id: 'red-tide',
    name: 'Red Tide',
    summary: 'Hazard — unfishable, untillable, untouchable.',
    description:
      'Water the colour of a slit vein, foam that hisses where it meets a net. Nothing lives here that a crew can bring home.',
    yields: {},
  },
  {
    id: 'fata-morgana',
    name: 'Fata Morgana',
    summary: 'Mirage — no ground to work, no net to cast.',
    description:
      'A shore that is not there seen from a ship that is. Crews who put out boats find rope, splinters, and the wrong stars overhead.',
    yields: {},
  },
];

const TILE_YIELD_IDS: readonly string[] = TILE_YIELDS.map((t) => t.id);

export function isTileYieldEntryId(value: unknown): value is TileYieldEntryId {
  return typeof value === 'string' && TILE_YIELD_IDS.includes(value);
}

export function getTileYieldEntry(id: TileYieldEntryId): TileYieldEntry {
  if (!isTileYieldEntryId(id)) {
    throw new TypeError(`getTileYieldEntry: not a valid TileYieldEntryId: ${String(id)}`);
  }
  const found = TILE_YIELDS.find((t) => t.id === id);
  if (!found) {
    throw new Error(`getTileYieldEntry: missing TileYieldEntry for ${id}`);
  }
  return found;
}
