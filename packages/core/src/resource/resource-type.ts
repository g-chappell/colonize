// ResourceType — the canonical save-format registry for fungible goods.
//
// The kebab-case values are the wire format: they appear verbatim in
// CargoHoldJSON.resources, ColonyJSON.stocks, BuildingDefinition.cost,
// and TileYield vectors. Renames require a save-version migration.
//
// Scope locked to resources used by an existing rule today:
//   - raws produced by a tile: timber, fibre, provisions, salvage
//   - processed goods consumed by a building cost: planks, forgework
// Further chain outputs (rope, salt, rum, etc.) are added as their
// producing recipe / consuming cost lands. See CLAUDE.md:
// "Trim consumer-specific fields off save-format registries."

export const ResourceType = {
  Timber: 'timber',
  Fibre: 'fibre',
  Provisions: 'provisions',
  Salvage: 'salvage',
  Planks: 'planks',
  Forgework: 'forgework',
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const ALL_RESOURCE_TYPES: readonly ResourceType[] = Object.values(ResourceType);

export function isResourceType(value: unknown): value is ResourceType {
  return typeof value === 'string' && (ALL_RESOURCE_TYPES as readonly string[]).includes(value);
}
