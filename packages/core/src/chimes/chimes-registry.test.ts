import { describe, it, expect } from 'vitest';
import { ALL_BUILDING_TYPES, BuildingType } from '../building/building-type.js';
import {
  CHIME_PRODUCING_BUILDINGS,
  LIBERTY_CHIMES_THRESHOLDS,
  buildingChimeRate,
  chimesFromBuildings,
  isChimeProducingBuilding,
  isCouncilThreshold,
} from './chimes-registry.js';

describe('buildingChimeRate', () => {
  it('returns a positive rate for qualifying buildings', () => {
    expect(buildingChimeRate(BuildingType.ChapelOfTheKraken)).toBeGreaterThan(0);
    expect(buildingChimeRate(BuildingType.StudyHall)).toBeGreaterThan(0);
  });

  it('returns 0 for non-qualifying buildings', () => {
    expect(buildingChimeRate(BuildingType.Tavern)).toBe(0);
    expect(buildingChimeRate(BuildingType.Warehouse)).toBe(0);
    expect(buildingChimeRate(BuildingType.Forge)).toBe(0);
    expect(buildingChimeRate(BuildingType.Shipyard)).toBe(0);
  });

  it('StudyHall outproduces ChapelOfTheKraken (late-game building is the louder bell)', () => {
    expect(buildingChimeRate(BuildingType.StudyHall)).toBeGreaterThan(
      buildingChimeRate(BuildingType.ChapelOfTheKraken),
    );
  });

  it('every rate is a finite non-negative integer', () => {
    for (const type of ALL_BUILDING_TYPES) {
      const rate = buildingChimeRate(type);
      expect(Number.isFinite(rate)).toBe(true);
      expect(Number.isInteger(rate)).toBe(true);
      expect(rate).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('isChimeProducingBuilding', () => {
  it('returns true for the two canonical producers and false otherwise', () => {
    for (const type of ALL_BUILDING_TYPES) {
      const expected = type === BuildingType.ChapelOfTheKraken || type === BuildingType.StudyHall;
      expect(isChimeProducingBuilding(type)).toBe(expected);
    }
  });
});

describe('CHIME_PRODUCING_BUILDINGS', () => {
  it('lists exactly the qualifying buildings in alphabetical order', () => {
    expect([...CHIME_PRODUCING_BUILDINGS]).toEqual(
      [BuildingType.ChapelOfTheKraken, BuildingType.StudyHall].sort(),
    );
  });

  it('agrees with isChimeProducingBuilding', () => {
    for (const type of ALL_BUILDING_TYPES) {
      expect(CHIME_PRODUCING_BUILDINGS.includes(type)).toBe(isChimeProducingBuilding(type));
    }
  });
});

describe('chimesFromBuildings', () => {
  it('returns 0 for an empty iterable', () => {
    expect(chimesFromBuildings([])).toBe(0);
  });

  it('sums per-building rates for a mixed list', () => {
    const buildings = [
      BuildingType.Tavern,
      BuildingType.ChapelOfTheKraken,
      BuildingType.Warehouse,
      BuildingType.StudyHall,
    ];
    expect(chimesFromBuildings(buildings)).toBe(
      buildingChimeRate(BuildingType.ChapelOfTheKraken) + buildingChimeRate(BuildingType.StudyHall),
    );
  });

  it('counts duplicates — caller controls dedupe', () => {
    const buildings = [BuildingType.ChapelOfTheKraken, BuildingType.ChapelOfTheKraken];
    expect(chimesFromBuildings(buildings)).toBe(
      buildingChimeRate(BuildingType.ChapelOfTheKraken) * 2,
    );
  });

  it('ignores non-qualifying entries even when they dominate the list', () => {
    const buildings = ALL_BUILDING_TYPES.filter((t) => !isChimeProducingBuilding(t));
    expect(chimesFromBuildings(buildings)).toBe(0);
  });

  it('accepts any iterable, not just arrays', () => {
    const set: Set<BuildingType> = new Set([
      BuildingType.ChapelOfTheKraken,
      BuildingType.StudyHall,
      BuildingType.Forge,
    ]);
    expect(chimesFromBuildings(set)).toBe(
      buildingChimeRate(BuildingType.ChapelOfTheKraken) + buildingChimeRate(BuildingType.StudyHall),
    );
  });
});

describe('LIBERTY_CHIMES_THRESHOLDS', () => {
  it('is non-empty', () => {
    expect(LIBERTY_CHIMES_THRESHOLDS.length).toBeGreaterThan(0);
  });

  it('is strictly ascending', () => {
    for (let i = 1; i < LIBERTY_CHIMES_THRESHOLDS.length; i++) {
      const prev = LIBERTY_CHIMES_THRESHOLDS[i - 1]!;
      const cur = LIBERTY_CHIMES_THRESHOLDS[i]!;
      expect(cur).toBeGreaterThan(prev);
    }
  });

  it('contains only positive finite integers', () => {
    for (const t of LIBERTY_CHIMES_THRESHOLDS) {
      expect(Number.isFinite(t)).toBe(true);
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThan(0);
    }
  });

  it('spacing grows (each gap ≥ the previous gap) — late charters cost more sustained production', () => {
    let prevGap = 0;
    for (let i = 1; i < LIBERTY_CHIMES_THRESHOLDS.length; i++) {
      const gap = LIBERTY_CHIMES_THRESHOLDS[i]! - LIBERTY_CHIMES_THRESHOLDS[i - 1]!;
      expect(gap).toBeGreaterThanOrEqual(prevGap);
      prevGap = gap;
    }
  });
});

describe('LIBERTY_CHIMES_THRESHOLDS drift guard (core side)', () => {
  // Mirror of packages/content/src/chimes-flavour.test.ts. Content cannot
  // import core (dependency-direction rule), so this test + its content-
  // side sibling jointly pin the canonical MVP ladder.
  it('matches the canonical MVP ladder (50, 150, 300, 500)', () => {
    expect([...LIBERTY_CHIMES_THRESHOLDS]).toEqual([50, 150, 300, 500]);
  });
});

describe('isCouncilThreshold', () => {
  it('returns true for every listed threshold', () => {
    for (const t of LIBERTY_CHIMES_THRESHOLDS) {
      expect(isCouncilThreshold(t)).toBe(true);
    }
  });

  it('returns false for values between / outside thresholds', () => {
    expect(isCouncilThreshold(0)).toBe(false);
    expect(isCouncilThreshold(1)).toBe(false);
    expect(isCouncilThreshold(49)).toBe(false);
    expect(isCouncilThreshold(99999)).toBe(false);
  });
});
