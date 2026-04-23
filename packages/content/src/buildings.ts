// Building descriptions + duplicated rule stats for the HUD / tooltips.
//
// The save-format-bound registry (BuildingType + cost + prerequisites)
// lives in @colonize/core; this module mirrors the rule stats next to the
// flavour strings so a single tooltip read gets the full entry without
// needing both workspaces. Per CLAUDE.md, content never imports core —
// the registries are kept in sync by invariant tests below.

export type BuildingEntryId =
  | 'tavern'
  | 'warehouse'
  | 'rope-walk'
  | 'sawmill'
  | 'fish-market'
  | 'saltworks'
  | 'dockworks'
  | 'chapel-of-the-kraken'
  | 'watchtower'
  | 'barracks'
  | 'distillery'
  | 'forge'
  | 'school'
  | 'study-hall'
  | 'shipyard'
  | 'gun-deck';

export interface BuildingEntry {
  readonly id: BuildingEntryId;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly cost: { readonly [resourceId: string]: number };
  readonly prerequisites: readonly BuildingEntryId[];
}

export const BUILDINGS: readonly BuildingEntry[] = [
  {
    id: 'tavern',
    name: 'Tavern',
    summary: 'Draws rumours; lifts crew morale between voyages.',
    description:
      'Lamplit hall where salted crews trade lies for honest rum. A good tavern seeds the rumour-mill and steadies the colony between tides.',
    cost: { timber: 15, fibre: 5 },
    prerequisites: [],
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    summary: 'Expands colony storage for hauled-in cargo.',
    description:
      'Timber-framed loft stacked with crates, coils, and ledger-bound goods. The first roof a founding expedition raises after the palisade.',
    cost: { timber: 20 },
    prerequisites: [],
  },
  {
    id: 'rope-walk',
    name: 'Rope-Walk',
    summary: 'Spins fibre into cordage for rigging and repairs.',
    description:
      'A long straight shed where hemp and kelp-fibre is twisted into line. Ships rot fast without fresh rope to hand.',
    cost: { timber: 10, fibre: 10 },
    prerequisites: [],
  },
  {
    id: 'sawmill',
    name: 'Sawmill',
    summary: 'Converts raw timber into planks for advanced builds.',
    description:
      'Water-driven blades chew coastal grove timber into clean planks. The bottleneck that gates forge, distillery, and shipyard alike.',
    cost: { timber: 25 },
    prerequisites: [],
  },
  {
    id: 'fish-market',
    name: 'Fish Market',
    summary: 'Barrels the daily catch into trade-ready provisions.',
    description:
      'Plank stalls along the quay, salted runoff staining the boards. Turns fresh hauls into keep-well provisions for ledger or larder.',
    cost: { timber: 15, fibre: 10 },
    prerequisites: [],
  },
  {
    id: 'saltworks',
    name: 'Saltworks',
    summary: 'Boils brine for the salt that keeps provisions edible.',
    description:
      'Iron pans, charcoal fires, white crust on every beam. Without salt, a cruise past the first fortnight is only a cruise toward scurvy.',
    cost: { timber: 10, salvage: 10 },
    prerequisites: [],
  },
  {
    id: 'dockworks',
    name: 'Dockworks',
    summary: 'Deepens the harbour for ship repairs and faster turnaround.',
    description:
      'Pilings, capstan, and a stone-faced slip. A proper dockworks is what separates a mooring from a port.',
    cost: { timber: 20, fibre: 5 },
    prerequisites: [],
  },
  {
    id: 'chapel-of-the-kraken',
    name: 'Chapel of the Kraken',
    summary: 'Grants Talisman blessings to departing voyages.',
    description:
      'Twin dragons twine around the lintel; inside, saltwater bowls catch candle-drip like offerings. Captains leave bearing a blessed talisman and a sharper eye for the Deep.',
    cost: { timber: 20, salvage: 10 },
    prerequisites: [],
  },
  {
    id: 'watchtower',
    name: 'Watchtower',
    summary: 'Extends spotting range over the surrounding waters.',
    description:
      'A timber spar above the palisade, perched with glass and a signal-bell. Cannot see the Deep, but the shallows stop hiding.',
    cost: { timber: 15, salvage: 5 },
    prerequisites: [],
  },
  {
    id: 'barracks',
    name: 'Barracks',
    summary: 'Trains dockside crew into drilled marines.',
    description:
      'Bunkhouse and a scuffed drill-yard beside the quay. Marines trained here fight steadier on a rolling deck than any pressed hand.',
    cost: { timber: 20, planks: 10, fibre: 10 },
    prerequisites: ['dockworks'],
  },
  {
    id: 'distillery',
    name: 'Distillery',
    summary: 'Distils provisions and sugar into rum for trade or parley.',
    description:
      'Copper worm, molasses tang, a still-master who answers to no captain. Rum is currency the Concord does not audit.',
    cost: { planks: 20, fibre: 10 },
    prerequisites: ['warehouse'],
  },
  {
    id: 'forge',
    name: 'Forge',
    summary: 'Works salvage into forgework fittings and iron stock.',
    description:
      'Bellows-heat, anvil-song, a hissing quench-tub. Nothing else in the colony turns scrap into hardware a shipwright can trust.',
    cost: { planks: 20, salvage: 20 },
    prerequisites: ['sawmill'],
  },
  {
    id: 'school',
    name: 'School',
    summary: 'Trains Deckhands into working professions over several turns.',
    description:
      'Slate boards, rope-end pointers, a master who shouts over the tide. Deckhands walk in green and walk out as shipwrights, gunners, cartographers, or quartermasters.',
    cost: { timber: 15, fibre: 5 },
    prerequisites: ['tavern'],
  },
  {
    id: 'study-hall',
    name: 'Archive & Study Hall',
    summary: 'Trains rarer Scholars and Loremasters; unlocks lore recovery from salvage.',
    description:
      'Oilcloth-bound atlases, glass cases of mica-etched charts, one door that is always locked. Scholars and loremasters train here; what the wreckers sell by the pound is read, not burned.',
    cost: { planks: 15, salvage: 10 },
    prerequisites: ['chapel-of-the-kraken'],
  },
  {
    id: 'shipyard',
    name: 'Shipyard',
    summary: 'Enables construction of new hulls on the building-ways.',
    description:
      'Keel blocks, a gantry crane, and the unmistakable tar-and-pitch perfume of a working yard. Every hull in your fleet begins here, one timber at a time.',
    cost: { timber: 20, planks: 40, forgework: 10 },
    prerequisites: ['sawmill', 'dockworks'],
  },
  {
    id: 'gun-deck',
    name: 'Gun-Deck Foundry',
    summary: 'Casts cannon for your ships and the colony battery.',
    description:
      'Sand-moulds, bronze pours, a foreman who counts every swab. Without this house, your hulls sail light and your battery stays dumb.',
    cost: { planks: 20, forgework: 30 },
    prerequisites: ['forge'],
  },
];

const BUILDING_IDS: readonly string[] = BUILDINGS.map((b) => b.id);

export function isBuildingEntryId(value: unknown): value is BuildingEntryId {
  return typeof value === 'string' && BUILDING_IDS.includes(value);
}

export function getBuilding(id: BuildingEntryId): BuildingEntry {
  if (!isBuildingEntryId(id)) {
    throw new TypeError(`getBuilding: not a valid BuildingEntryId: ${String(id)}`);
  }
  const found = BUILDINGS.find((b) => b.id === id);
  if (!found) {
    throw new Error(`getBuilding: missing BuildingEntry for ${id}`);
  }
  return found;
}
