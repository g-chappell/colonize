// Liberty Chimes — the Colonization-style "liberty-bells" analogue.
//
// Scope is the two pieces of rule-relevant state an Elders-Council
// scheduler cares about:
//
//   1. Which buildings produce chimes per turn, and at what rate.
//   2. The ascending threshold ladder at which a Council convocation
//      event fires.
//
// Both are save-format-adjacent registries — serialized state rounds
// through `BuildingType` identifiers, and the thresholds are the
// natural ladder any saved `ChimesLedger` has to interpret on reload.
// Per CLAUDE.md's content/core split, the rate + threshold numbers
// live here (rule-relevant); `@colonize/content/chimes-flavour.ts`
// mirrors the thresholds next to narrative copy and a drift guard
// pins the two copies together.
//
// Production orchestration (iterate colonies, sum building rates,
// attribute to the owning faction's ledger) lives with the task that
// owns the colony collection — see CLAUDE.md: "Ship the entity's
// primitive; leave iteration / scheduling to the task that owns the
// collection." This module ships the per-building rate lookup + a
// flat summation helper for tests and single-colony callers; it
// never reaches into colony storage itself.

import { BuildingType } from '../building/building-type.js';

const CHIMES_PER_TURN_BY_BUILDING: Readonly<Partial<Record<BuildingType, number>>> = {
  [BuildingType.ChapelOfTheKraken]: 3,
  [BuildingType.StudyHall]: 5,
};

export function buildingChimeRate(type: BuildingType): number {
  return CHIMES_PER_TURN_BY_BUILDING[type] ?? 0;
}

export function isChimeProducingBuilding(type: BuildingType): boolean {
  return buildingChimeRate(type) > 0;
}

export const CHIME_PRODUCING_BUILDINGS: readonly BuildingType[] = Object.keys(
  CHIMES_PER_TURN_BY_BUILDING,
)
  .filter((key): key is BuildingType =>
    (Object.values(BuildingType) as readonly string[]).includes(key),
  )
  .sort();

// Total chimes produced by one colony's building set per turn. Ignores
// non-qualifying buildings. Duplicates are allowed and counted — colony
// state serializes buildings as a Set so the caller already dedupes,
// but the helper stays permissive for iterator-of-anything callers.
export function chimesFromBuildings(buildings: Iterable<BuildingType>): number {
  let total = 0;
  for (const b of buildings) total += buildingChimeRate(b);
  return total;
}

// Council convocation thresholds — ascending. When the running chime
// total crosses a new threshold, a `CouncilEvent` is queued on the
// owning faction's ledger. The ladder is hand-picked to space the
// four Archive-Charter picks across an MVP campaign arc without
// front-loading them (the gap grows so late-game charters require
// sustained chime production, not a single early-game burst).
export const LIBERTY_CHIMES_THRESHOLDS: readonly number[] = [50, 150, 300, 500];

export function isCouncilThreshold(value: number): boolean {
  return LIBERTY_CHIMES_THRESHOLDS.includes(value);
}
