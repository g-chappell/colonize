// Build-queue helpers — pure-TS sibling for the colony production queue
// slice in the zustand store and the queue panel in ColonyOverlay.
// Framework-free so it can be unit-tested without pulling React or
// Phaser into the test module graph.
//
// TASK-041 scopes the queue to a web-store slice (workspaces: [web])
// rather than extending ColonyJSON. The serialized save-format impact
// is zero — a future roster task will re-home the queue into
// @colonize/core with a save-version migration once per-colony
// production values, tile yields, and resource payment all exist.

import { ALL_BUILDING_TYPES, getBuildingDefinition } from '@colonize/core';
import type { BuildingType, ColonyJSON } from '@colonize/core';

export interface ProductionQueueItem {
  readonly buildingId: BuildingType;
  readonly progress: number;
  readonly effort: number;
}

// Total build effort for a building, derived as the sum of its resource
// cost entries. Matches the player's intuition: richer buildings take
// longer. Deterministic and stable per building type.
export function buildingEffort(type: BuildingType): number {
  const def = getBuildingDefinition(type);
  let total = 0;
  for (const value of Object.values(def.cost)) total += value;
  return total;
}

// Per-turn production value for a colony. MVP proxy until the tile-
// yield model (TASK-042) and profession output multipliers (later in
// EPIC-06) land — scales with population so a one-person founding
// settlement still ticks its queue forward (floor of 1), while larger
// colonies resolve builds faster.
export function colonyProductionValue(colony: ColonyJSON): number {
  return Math.max(1, colony.population);
}

// Buildings the player can legally queue right now: not already built,
// not already queued, all prerequisites satisfied by completed buildings.
// Returns BuildingType values in ALL_BUILDING_TYPES order so the UI has
// a stable left-to-right list without needing its own sort key.
export function availableBuildings(
  colony: ColonyJSON,
  queue: readonly ProductionQueueItem[],
): readonly BuildingType[] {
  const built = new Set<string>(colony.buildings);
  const queued = new Set<BuildingType>(queue.map((q) => q.buildingId));
  const out: BuildingType[] = [];
  for (const type of ALL_BUILDING_TYPES) {
    if (built.has(type)) continue;
    if (queued.has(type)) continue;
    const def = getBuildingDefinition(type);
    if (!def.prerequisites.every((p) => built.has(p))) continue;
    out.push(type);
  }
  return out;
}

// Advances the head of a queue by `productionValue` work units and
// rolls completed items off the front. A single tick may complete more
// than one item if the production value exceeds the head item's
// remaining effort — the leftover spills into the next item so heavy
// colonies don't stall on cheap buildings.
export function tickProductionQueue(
  queue: readonly ProductionQueueItem[],
  productionValue: number,
): { readonly next: readonly ProductionQueueItem[]; readonly completed: readonly BuildingType[] } {
  if (queue.length === 0 || productionValue <= 0) {
    return { next: queue, completed: [] };
  }
  const working = queue.map((item) => ({ ...item }));
  const completed: BuildingType[] = [];
  let remaining = productionValue;
  while (remaining > 0 && working.length > 0) {
    const head = working[0]!;
    const needed = Math.max(0, head.effort - head.progress);
    if (remaining >= needed) {
      remaining -= needed;
      completed.push(head.buildingId);
      working.shift();
    } else {
      head.progress += remaining;
      remaining = 0;
    }
  }
  return { next: working, completed };
}
