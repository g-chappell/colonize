// Resource flavour entries for the HUD / tooltips.
//
// The save-format-bound registry (ResourceType + recipe chains) lives in
// @colonize/core; this module mirrors the ids next to the flavour copy so
// a single tooltip read gets the full entry without needing both
// workspaces. Per CLAUDE.md, content never imports core — the id list is
// kept in sync by the invariant test in resources.test.ts, mirroring the
// BUILDINGS / TILE_YIELDS / ship-class pattern.

export type ResourceEntryId =
  | 'timber'
  | 'fibre'
  | 'provisions'
  | 'salvage'
  | 'planks'
  | 'forgework';

export interface ResourceEntry {
  readonly id: ResourceEntryId;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
}

export const RESOURCES: readonly ResourceEntry[] = [
  {
    id: 'timber',
    name: 'Timber',
    summary: 'Raw coastal-grove logs, uncut and bark-on.',
    description:
      'Salt-warped pine and slow-grown hardwoods, felled in the tidal groves. Feeds the sawmill and every rough-framed palisade a colony puts up in its first season.',
  },
  {
    id: 'fibre',
    name: 'Fibre',
    summary: 'Kelp-hemp twist, awaiting a rope-walk.',
    description:
      'Long fibrous strands pulled from deepwater kelp and salt-tolerant hemp. Rigging, caulking, netting — nothing in the rigging locker starts as anything else.',
  },
  {
    id: 'provisions',
    name: 'Provisions',
    summary: 'Salted fish, hardtack, barrelled cask-stock.',
    description:
      'The mixed larder that keeps a crew upright between ports: split fish, ship-biscuit, brined greens. Spoils slower when a saltworks is running.',
  },
  {
    id: 'salvage',
    name: 'Salvage',
    summary: 'Pre-Collapse scrap pulled from floating cities.',
    description:
      'Twisted rebar, pot-metal plate, the occasional unrusted fitting with a Rayon stamp. Raw input for forges — and the occasional find for a study hall.',
  },
  {
    id: 'planks',
    name: 'Planks',
    summary: 'Dimension-sawn boards, sawmill-finished.',
    description:
      "Straight-edged stock ready for a shipwright or a wall. A sawmill turns a colony's timber pile into this faster than any hand-axe crew can match.",
  },
  {
    id: 'forgework',
    name: 'Forgework',
    summary: 'Iron fittings and cast parts, forge-finished.',
    description:
      'Nails, bands, chain, and the occasional cannon-trunnion. A forge turns colony salvage into the hardware a shipyard or gun-deck actually needs.',
  },
];

const RESOURCE_IDS: readonly string[] = RESOURCES.map((r) => r.id);

export function isResourceEntryId(value: unknown): value is ResourceEntryId {
  return typeof value === 'string' && RESOURCE_IDS.includes(value);
}

export function getResource(id: ResourceEntryId): ResourceEntry {
  if (!isResourceEntryId(id)) {
    throw new TypeError(`getResource: not a valid ResourceEntryId: ${String(id)}`);
  }
  const found = RESOURCES.find((r) => r.id === id);
  if (!found) {
    throw new Error(`getResource: missing ResourceEntry for ${id}`);
  }
  return found;
}
