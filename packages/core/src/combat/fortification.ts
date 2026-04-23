// fortification — colony defender bonus from the Stockade → Bastion →
// Citadel building tier ladder.
//
// Per CLAUDE.md "Trim consumer-specific fields off save-format registries":
// the per-tier bonus is a combat-only concern, so it lives here as a switch
// on BuildingType rather than as a `defenseBonus` field on
// BuildingDefinition. Adding a new BuildingType to the registry surfaces as
// a compile error in `getFortificationDefenderBonus` (exhaustive switch
// with no default), which forces the author to either pick a tier bonus or
// classify the building as non-fortification.
//
// Per CLAUDE.md "Scalar seams for pre-registry axis values": the combat
// resolver consumes a single scalar (`defenderFortificationBonus`) supplied
// by an orchestrator that walks `colony.buildings` through this function.
// The fortifications are an upgrade ladder, not stacking — only the
// highest-tier present applies, mirroring how players physically upgrade a
// stockade into a bastion into a citadel.
//
// Numbers are balance-tunable; tests pin the relational invariants (the
// ladder ascends, neutral baseline = 1) per CLAUDE.md "Relational
// invariants over literal numbers in balance-tunable registry tests".

import { BuildingType } from '../building/building-type.js';

export const FORTIFICATION_NEUTRAL_BONUS = 1.0;

export const FORTIFICATION_TIER_BONUS: Readonly<Record<FortificationTierId, number>> = {
  [BuildingType.Stockade]: 1.2,
  [BuildingType.Bastion]: 1.4,
  [BuildingType.Citadel]: 1.65,
};

export type FortificationTierId =
  | typeof BuildingType.Stockade
  | typeof BuildingType.Bastion
  | typeof BuildingType.Citadel;

// Highest-tier-first descending; getFortificationDefenderBonus walks this
// list and returns the first tier present in the input set.
export const FORTIFICATION_TIERS_DESCENDING: readonly FortificationTierId[] = [
  BuildingType.Citadel,
  BuildingType.Bastion,
  BuildingType.Stockade,
];

export function isFortificationTier(building: BuildingType): building is FortificationTierId {
  switch (building) {
    case BuildingType.Stockade:
    case BuildingType.Bastion:
    case BuildingType.Citadel:
      return true;
    case BuildingType.Tavern:
    case BuildingType.Warehouse:
    case BuildingType.RopeWalk:
    case BuildingType.Sawmill:
    case BuildingType.FishMarket:
    case BuildingType.Saltworks:
    case BuildingType.Dockworks:
    case BuildingType.ChapelOfTheKraken:
    case BuildingType.Watchtower:
    case BuildingType.Barracks:
    case BuildingType.Distillery:
    case BuildingType.Forge:
    case BuildingType.School:
    case BuildingType.StudyHall:
    case BuildingType.Shipyard:
    case BuildingType.GunDeck:
      return false;
  }
}

// Returns the combat defender multiplier for the highest fortification tier
// present in `buildings`. Non-fortification entries are ignored. An empty
// or fortification-free input returns `FORTIFICATION_NEUTRAL_BONUS` (1.0).
//
// Input is `Iterable<BuildingType>` so callers can pass a `Set`, an
// `Array`, or a colony's `buildings` snapshot directly without copying.
// Unknown strings (e.g. raw save-file values that haven't been narrowed)
// are skipped silently — callers responsible for validation should do so
// at the colony boundary, not here.
export function getFortificationDefenderBonus(buildings: Iterable<BuildingType>): number {
  const owned = new Set<BuildingType>();
  for (const b of buildings) owned.add(b);
  for (const tier of FORTIFICATION_TIERS_DESCENDING) {
    if (owned.has(tier)) return FORTIFICATION_TIER_BONUS[tier];
  }
  return FORTIFICATION_NEUTRAL_BONUS;
}
