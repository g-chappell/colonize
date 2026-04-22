import { describe, it, expect } from 'vitest';
import { BuildingType, getBuildingDefinition, type ColonyJSON } from '@colonize/core';
import {
  availableBuildings,
  buildingEffort,
  colonyProductionValue,
  tickProductionQueue,
  type ProductionQueueItem,
} from './build-queue';

const EMPTY_STOCKS = { resources: {}, artifacts: [] } as const;

function makeColony(overrides: Partial<ColonyJSON> = {}): ColonyJSON {
  return {
    id: 'c1',
    faction: 'otk',
    position: { x: 0, y: 0 },
    population: 1,
    crew: [],
    buildings: [],
    stocks: EMPTY_STOCKS,
    ...overrides,
  };
}

describe('buildingEffort', () => {
  it('sums resource cost values into a single work total', () => {
    const tavernCost = getBuildingDefinition(BuildingType.Tavern).cost;
    const expected = Object.values(tavernCost).reduce((a, b) => a + b, 0);
    expect(buildingEffort(BuildingType.Tavern)).toBe(expected);
  });

  it('gives heavier builds a higher effort than lighter ones', () => {
    expect(buildingEffort(BuildingType.Shipyard)).toBeGreaterThan(
      buildingEffort(BuildingType.Tavern),
    );
    expect(buildingEffort(BuildingType.GunDeck)).toBeGreaterThan(
      buildingEffort(BuildingType.Watchtower),
    );
  });
});

describe('colonyProductionValue', () => {
  it('returns the colony population', () => {
    expect(colonyProductionValue(makeColony({ population: 4 }))).toBe(4);
  });

  it('floors at 1 so a zero-population colony still ticks', () => {
    expect(colonyProductionValue(makeColony({ population: 0 }))).toBe(1);
  });
});

describe('availableBuildings', () => {
  it('lists zero-prereq buildings when the colony is empty', () => {
    const list = availableBuildings(makeColony(), []);
    expect(list).toContain(BuildingType.Tavern);
    expect(list).toContain(BuildingType.Warehouse);
    expect(list).toContain(BuildingType.Sawmill);
    expect(list).toContain(BuildingType.Dockworks);
  });

  it('excludes buildings whose prerequisites are unmet', () => {
    const list = availableBuildings(makeColony(), []);
    // Shipyard requires sawmill + dockworks; Gun-Deck requires forge.
    expect(list).not.toContain(BuildingType.Shipyard);
    expect(list).not.toContain(BuildingType.GunDeck);
    expect(list).not.toContain(BuildingType.Forge);
  });

  it('unlocks buildings once their prerequisites are satisfied', () => {
    const colony = makeColony({ buildings: [BuildingType.Dockworks] });
    const list = availableBuildings(colony, []);
    expect(list).toContain(BuildingType.Barracks);
  });

  it('excludes buildings that are already built', () => {
    const colony = makeColony({ buildings: [BuildingType.Tavern] });
    const list = availableBuildings(colony, []);
    expect(list).not.toContain(BuildingType.Tavern);
  });

  it('excludes buildings that are already queued', () => {
    const queue: readonly ProductionQueueItem[] = [
      { buildingId: BuildingType.Warehouse, progress: 0, effort: 20 },
    ];
    const list = availableBuildings(makeColony(), queue);
    expect(list).not.toContain(BuildingType.Warehouse);
  });
});

describe('tickProductionQueue', () => {
  it('is a no-op on an empty queue', () => {
    const result = tickProductionQueue([], 5);
    expect(result.next).toEqual([]);
    expect(result.completed).toEqual([]);
  });

  it('adds the production value to the head item progress', () => {
    const queue: readonly ProductionQueueItem[] = [
      { buildingId: BuildingType.Tavern, progress: 2, effort: 20 },
    ];
    const result = tickProductionQueue(queue, 3);
    expect(result.completed).toEqual([]);
    expect(result.next).toHaveLength(1);
    expect(result.next[0]!.progress).toBe(5);
  });

  it('completes the head item when progress reaches effort', () => {
    const queue: readonly ProductionQueueItem[] = [
      { buildingId: BuildingType.Tavern, progress: 18, effort: 20 },
    ];
    const result = tickProductionQueue(queue, 2);
    expect(result.completed).toEqual([BuildingType.Tavern]);
    expect(result.next).toEqual([]);
  });

  it('spills overflow work into the next queued item', () => {
    const queue: readonly ProductionQueueItem[] = [
      { buildingId: BuildingType.Tavern, progress: 18, effort: 20 },
      { buildingId: BuildingType.Warehouse, progress: 0, effort: 20 },
    ];
    const result = tickProductionQueue(queue, 7);
    expect(result.completed).toEqual([BuildingType.Tavern]);
    expect(result.next).toHaveLength(1);
    expect(result.next[0]!.buildingId).toBe(BuildingType.Warehouse);
    expect(result.next[0]!.progress).toBe(5);
  });

  it('completes multiple items in a single tick when work exceeds both', () => {
    const queue: readonly ProductionQueueItem[] = [
      { buildingId: BuildingType.Tavern, progress: 0, effort: 5 },
      { buildingId: BuildingType.Warehouse, progress: 0, effort: 5 },
    ];
    const result = tickProductionQueue(queue, 20);
    expect(result.completed).toEqual([BuildingType.Tavern, BuildingType.Warehouse]);
    expect(result.next).toEqual([]);
  });

  it('does nothing when production value is zero or negative', () => {
    const queue: readonly ProductionQueueItem[] = [
      { buildingId: BuildingType.Tavern, progress: 3, effort: 20 },
    ];
    expect(tickProductionQueue(queue, 0).next[0]!.progress).toBe(3);
    expect(tickProductionQueue(queue, -5).next[0]!.progress).toBe(3);
  });

  it('does not mutate the input queue', () => {
    const queue: readonly ProductionQueueItem[] = [
      { buildingId: BuildingType.Tavern, progress: 0, effort: 20 },
    ];
    tickProductionQueue(queue, 5);
    expect(queue[0]!.progress).toBe(0);
  });
});
