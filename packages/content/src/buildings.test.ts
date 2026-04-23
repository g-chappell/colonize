import { describe, it, expect } from 'vitest';
import { BUILDINGS, getBuilding, isBuildingEntryId, type BuildingEntryId } from './buildings.js';

describe('BUILDINGS', () => {
  it('exposes at least 15 starter buildings', () => {
    expect(BUILDINGS.length).toBeGreaterThanOrEqual(15);
  });

  it('has unique ids', () => {
    const ids = BUILDINGS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every id is a non-empty kebab-case string', () => {
    for (const b of BUILDINGS) {
      expect(b.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('every entry has non-empty name, summary, and description', () => {
    for (const b of BUILDINGS) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.summary.length).toBeGreaterThan(0);
      expect(b.description.length).toBeGreaterThan(0);
    }
  });

  it('every cost entry is a positive integer under a non-empty resource id', () => {
    for (const b of BUILDINGS) {
      const entries = Object.entries(b.cost);
      expect(entries.length).toBeGreaterThan(0);
      for (const [resourceId, qty] of entries) {
        expect(resourceId.length).toBeGreaterThan(0);
        expect(Number.isInteger(qty)).toBe(true);
        expect(qty).toBeGreaterThan(0);
      }
    }
  });

  it('every prerequisite id refers to another BUILDINGS entry', () => {
    const ids = new Set<string>(BUILDINGS.map((b) => b.id));
    for (const b of BUILDINGS) {
      for (const prereq of b.prerequisites) {
        expect(ids.has(prereq)).toBe(true);
      }
    }
  });

  it('prerequisite lists are unique per building and never self-reference', () => {
    for (const b of BUILDINGS) {
      expect(new Set(b.prerequisites).size).toBe(b.prerequisites.length);
      expect(b.prerequisites as readonly string[]).not.toContain(b.id);
    }
  });

  it('at least one building has no prerequisites (bootstrap path exists)', () => {
    expect(BUILDINGS.some((b) => b.prerequisites.length === 0)).toBe(true);
  });

  it('shipyard depends on sawmill + dockworks (ship construction gate)', () => {
    const shipyard = getBuilding('shipyard');
    expect(shipyard.prerequisites).toContain('sawmill');
    expect(shipyard.prerequisites).toContain('dockworks');
  });

  it('gun-deck depends on forge (cannon-casting gate)', () => {
    expect(getBuilding('gun-deck').prerequisites).toContain('forge');
  });

  it('chapel-of-the-kraken is foundable without prerequisites (lore: early OTK outpost)', () => {
    expect(getBuilding('chapel-of-the-kraken').prerequisites).toEqual([]);
  });

  it('school depends on tavern (common-profession training gate)', () => {
    expect(getBuilding('school').prerequisites).toContain('tavern');
  });

  it('study-hall depends on chapel-of-the-kraken (rare-profession training gate)', () => {
    expect(getBuilding('study-hall').prerequisites).toContain('chapel-of-the-kraken');
  });

  it('fortification ladder is foundable from a bare colony (stockade has no prerequisites)', () => {
    expect(getBuilding('stockade').prerequisites).toEqual([]);
  });

  it('fortification ladder requires its predecessor (stockade < bastion < citadel)', () => {
    expect(getBuilding('bastion').prerequisites).toContain('stockade');
    expect(getBuilding('citadel').prerequisites).toContain('bastion');
  });

  it('fortification cost ascends stockade < bastion < citadel (design-intent ladder)', () => {
    const sumCost = (entry: ReturnType<typeof getBuilding>) =>
      Object.values(entry.cost).reduce((a, b) => a + b, 0);
    const stockade = sumCost(getBuilding('stockade'));
    const bastion = sumCost(getBuilding('bastion'));
    const citadel = sumCost(getBuilding('citadel'));
    expect(stockade).toBeLessThan(bastion);
    expect(bastion).toBeLessThan(citadel);
  });

  it('shipyard is strictly more expensive than a starter warehouse on overlapping resources', () => {
    const shipyard = getBuilding('shipyard');
    const warehouse = getBuilding('warehouse');
    const sum = (entry: ReturnType<typeof getBuilding>) =>
      Object.values(entry.cost).reduce((a, b) => a + b, 0);
    expect(sum(shipyard)).toBeGreaterThan(sum(warehouse));
  });
});

describe('isBuildingEntryId / getBuilding', () => {
  it('isBuildingEntryId narrows known ids', () => {
    expect(isBuildingEntryId('shipyard')).toBe(true);
    expect(isBuildingEntryId('chapel-of-the-kraken')).toBe(true);
  });

  it('isBuildingEntryId rejects unknown values', () => {
    expect(isBuildingEntryId('mystery-hut')).toBe(false);
    expect(isBuildingEntryId('')).toBe(false);
    expect(isBuildingEntryId(0)).toBe(false);
    expect(isBuildingEntryId(undefined)).toBe(false);
    expect(isBuildingEntryId(null)).toBe(false);
  });

  it('getBuilding returns the matching entry', () => {
    const forge = getBuilding('forge');
    expect(forge.id).toBe('forge');
    expect(forge.name).toBe('Forge');
  });

  it('getBuilding throws TypeError on unknown id', () => {
    expect(() => getBuilding('mystery-hut' as BuildingEntryId)).toThrow(TypeError);
  });
});
