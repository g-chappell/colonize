// training-building — scalar-seam module for "which building trains
// which profession at what duration".
//
// Per CLAUDE.md "Scalar seams for pre-registry axis values", consumers
// that need a training duration (a colony orchestrator, a UI tooltip,
// the captured-crew 1-shot-conversion flow) call into these helpers
// rather than hardcoding numbers. The tables here are balance-tunable;
// individual numbers are not pinned by tests — instead the tests pin
// the relational design intent (School durations < Study Hall
// durations; rare-profession targets live at Study Hall, common ones
// live at School) per CLAUDE.md "Relational invariants over literal
// numbers in balance-tunable registry tests".
//
// Deckhand is deliberately never in either table — it's the
// unspecialised baseline; you don't "train to" Deckhand (TrainingOrder
// already rejects it at the construction boundary, symmetrically with
// this table's omission).
//
// `canTrainAt(building, target)` is the predicate consumers query to
// gate "is this profession offered by this building?" decisions.
// `getTrainingDuration(building, target)` is the scalar the consumer
// passes to `new TrainingOrder({ ..., turnsRemaining: duration })`.
// Both are exhaustive over BuildingType via a single switch that
// throws for every non-training building — adding a new building to
// the registry surfaces as a compile error here, and the error points
// to the right pick (either "not a training building" or "add it to
// the table").

import { BuildingType } from '../building/building-type.js';
import { ProfessionType } from '../profession/profession-type.js';

const SCHOOL_DURATIONS: Readonly<Partial<Record<ProfessionType, number>>> = {
  [ProfessionType.Shipwright]: 3,
  [ProfessionType.Gunner]: 3,
  [ProfessionType.Cartographer]: 3,
  [ProfessionType.Quartermaster]: 3,
};

const STUDY_HALL_DURATIONS: Readonly<Partial<Record<ProfessionType, number>>> = {
  [ProfessionType.Scholar]: 5,
  [ProfessionType.Loremaster]: 5,
};

// The const-object registry of buildings that participate in training.
// Lookups into non-training buildings fall through to the default
// branch that returns `undefined` / `false` / throws, so adding a new
// building to BuildingType does not silently enable training at it.
function durationTable(
  building: BuildingType,
): Readonly<Partial<Record<ProfessionType, number>>> | undefined {
  switch (building) {
    case BuildingType.School:
      return SCHOOL_DURATIONS;
    case BuildingType.StudyHall:
      return STUDY_HALL_DURATIONS;
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
    case BuildingType.Shipyard:
    case BuildingType.GunDeck:
      return undefined;
  }
}

export function isTrainingBuilding(building: BuildingType): boolean {
  return durationTable(building) !== undefined;
}

export function canTrainAt(building: BuildingType, target: ProfessionType): boolean {
  const table = durationTable(building);
  if (table === undefined) return false;
  return table[target] !== undefined;
}

export function getTrainingDuration(building: BuildingType, target: ProfessionType): number {
  const table = durationTable(building);
  if (table === undefined) {
    throw new Error(`getTrainingDuration: ${building} is not a training building`);
  }
  const duration = table[target];
  if (duration === undefined) {
    throw new Error(`getTrainingDuration: ${building} does not train ${target}`);
  }
  return duration;
}

// Enumerate every (building, target) pair that is trainable, in a
// stable order (building-name ascending, then profession-name
// ascending). Useful for UI listings and invariant tests.
export function listTrainingOfferings(): readonly {
  readonly building: BuildingType;
  readonly target: ProfessionType;
  readonly duration: number;
}[] {
  const out: { building: BuildingType; target: ProfessionType; duration: number }[] = [];
  const buildings: readonly BuildingType[] = [BuildingType.School, BuildingType.StudyHall];
  for (const building of buildings) {
    const table = durationTable(building)!;
    const targets = Object.keys(table).sort() as ProfessionType[];
    for (const target of targets) {
      out.push({ building, target, duration: table[target]! });
    }
  }
  return out;
}
