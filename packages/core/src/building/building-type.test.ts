import { describe, it, expect } from 'vitest';
import {
  ALL_BUILDING_TYPES,
  BuildingType,
  getBuildingDefinition,
  isBuildingType,
} from './building-type.js';

describe('BuildingType registry', () => {
  it('exposes at least 15 canonical building kinds', () => {
    expect(ALL_BUILDING_TYPES.length).toBeGreaterThanOrEqual(15);
  });

  it('has unique string values', () => {
    expect(new Set(ALL_BUILDING_TYPES).size).toBe(ALL_BUILDING_TYPES.length);
  });

  it('every value is a non-empty kebab-case string', () => {
    for (const id of ALL_BUILDING_TYPES) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('includes the roadmap-canonical names', () => {
    const ids = new Set<string>(ALL_BUILDING_TYPES);
    expect(ids.has(BuildingType.Tavern)).toBe(true);
    expect(ids.has(BuildingType.Shipyard)).toBe(true);
    expect(ids.has(BuildingType.Forge)).toBe(true);
    expect(ids.has(BuildingType.School)).toBe(true);
    expect(ids.has(BuildingType.StudyHall)).toBe(true);
    expect(ids.has(BuildingType.ChapelOfTheKraken)).toBe(true);
    expect(ids.has(BuildingType.Distillery)).toBe(true);
    expect(ids.has(BuildingType.GunDeck)).toBe(true);
    expect(ids.has(BuildingType.Warehouse)).toBe(true);
    expect(ids.has(BuildingType.RopeWalk)).toBe(true);
  });
});

describe('isBuildingType', () => {
  it('narrows every canonical id', () => {
    for (const id of ALL_BUILDING_TYPES) {
      expect(isBuildingType(id)).toBe(true);
    }
  });

  it('rejects unknown and non-string values', () => {
    expect(isBuildingType('mystery-hut')).toBe(false);
    expect(isBuildingType('')).toBe(false);
    expect(isBuildingType(0)).toBe(false);
    expect(isBuildingType(undefined)).toBe(false);
    expect(isBuildingType(null)).toBe(false);
    expect(isBuildingType({})).toBe(false);
  });
});

describe('getBuildingDefinition', () => {
  it('returns a definition for every listed BuildingType', () => {
    for (const type of ALL_BUILDING_TYPES) {
      const def = getBuildingDefinition(type);
      expect(def.id).toBe(type);
      expect(Array.isArray(def.prerequisites)).toBe(true);
    }
  });

  it('every cost entry is a positive-integer resource qty keyed by a non-empty string', () => {
    for (const type of ALL_BUILDING_TYPES) {
      const def = getBuildingDefinition(type);
      const entries = Object.entries(def.cost);
      expect(entries.length).toBeGreaterThan(0);
      for (const [resourceId, qty] of entries) {
        expect(resourceId.length).toBeGreaterThan(0);
        expect(Number.isInteger(qty)).toBe(true);
        expect(qty).toBeGreaterThan(0);
      }
    }
  });

  it('every prerequisite points to a registered BuildingType', () => {
    for (const type of ALL_BUILDING_TYPES) {
      for (const prereq of getBuildingDefinition(type).prerequisites) {
        expect(isBuildingType(prereq)).toBe(true);
      }
    }
  });

  it('prerequisites are acyclic (a building never requires itself, directly or transitively)', () => {
    const visit = (start: BuildingType): Set<BuildingType> => {
      const seen = new Set<BuildingType>();
      const stack: BuildingType[] = [...getBuildingDefinition(start).prerequisites];
      while (stack.length > 0) {
        const next = stack.pop()!;
        if (next === start) throw new Error(`cycle detected starting at ${start}`);
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(...getBuildingDefinition(next).prerequisites);
      }
      return seen;
    };
    for (const type of ALL_BUILDING_TYPES) {
      expect(() => visit(type)).not.toThrow();
    }
  });

  it('prerequisite lists contain unique entries', () => {
    for (const type of ALL_BUILDING_TYPES) {
      const prereqs = getBuildingDefinition(type).prerequisites;
      expect(new Set(prereqs).size).toBe(prereqs.length);
    }
  });

  it('advanced buildings require strictly more prerequisites than base buildings', () => {
    const shipyard = getBuildingDefinition(BuildingType.Shipyard);
    const warehouse = getBuildingDefinition(BuildingType.Warehouse);
    expect(shipyard.prerequisites.length).toBeGreaterThan(warehouse.prerequisites.length);
  });

  it('shipyard is strictly more expensive than a starter tavern on overlapping resources', () => {
    const shipyard = getBuildingDefinition(BuildingType.Shipyard);
    const tavern = getBuildingDefinition(BuildingType.Tavern);
    const sum = (def: ReturnType<typeof getBuildingDefinition>) =>
      Object.values(def.cost).reduce((a, b) => a + b, 0);
    expect(sum(shipyard)).toBeGreaterThan(sum(tavern));
  });

  it('throws TypeError on an unknown string', () => {
    expect(() => getBuildingDefinition('mystery-hut' as BuildingType)).toThrow(TypeError);
  });
});
