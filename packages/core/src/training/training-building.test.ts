import { describe, it, expect } from 'vitest';
import { ALL_BUILDING_TYPES, BuildingType } from '../building/building-type.js';
import { ALL_PROFESSION_TYPES, ProfessionType } from '../profession/profession-type.js';
import {
  canTrainAt,
  getTrainingDuration,
  isTrainingBuilding,
  listTrainingOfferings,
} from './training-building.js';

describe('isTrainingBuilding', () => {
  it('returns true only for School and Study Hall', () => {
    const trainingBuildings = ALL_BUILDING_TYPES.filter(isTrainingBuilding);
    expect(new Set(trainingBuildings)).toEqual(
      new Set<BuildingType>([BuildingType.School, BuildingType.StudyHall]),
    );
  });
});

describe('canTrainAt', () => {
  it('School offers every common profession (non-Deckhand, non-rare)', () => {
    expect(canTrainAt(BuildingType.School, ProfessionType.Shipwright)).toBe(true);
    expect(canTrainAt(BuildingType.School, ProfessionType.Gunner)).toBe(true);
    expect(canTrainAt(BuildingType.School, ProfessionType.Cartographer)).toBe(true);
    expect(canTrainAt(BuildingType.School, ProfessionType.Quartermaster)).toBe(true);
  });

  it('School does NOT offer the rare Scholar / Loremaster track', () => {
    expect(canTrainAt(BuildingType.School, ProfessionType.Scholar)).toBe(false);
    expect(canTrainAt(BuildingType.School, ProfessionType.Loremaster)).toBe(false);
  });

  it('Study Hall offers only the rare Scholar / Loremaster track', () => {
    expect(canTrainAt(BuildingType.StudyHall, ProfessionType.Scholar)).toBe(true);
    expect(canTrainAt(BuildingType.StudyHall, ProfessionType.Loremaster)).toBe(true);
    expect(canTrainAt(BuildingType.StudyHall, ProfessionType.Shipwright)).toBe(false);
    expect(canTrainAt(BuildingType.StudyHall, ProfessionType.Gunner)).toBe(false);
    expect(canTrainAt(BuildingType.StudyHall, ProfessionType.Cartographer)).toBe(false);
    expect(canTrainAt(BuildingType.StudyHall, ProfessionType.Quartermaster)).toBe(false);
  });

  it('Deckhand is never trainable at any building (the unspecialised baseline)', () => {
    for (const b of ALL_BUILDING_TYPES) {
      expect(canTrainAt(b, ProfessionType.Deckhand)).toBe(false);
    }
  });

  it('non-training buildings refuse every target', () => {
    const nonTraining = ALL_BUILDING_TYPES.filter((b) => !isTrainingBuilding(b));
    for (const b of nonTraining) {
      for (const p of ALL_PROFESSION_TYPES) {
        expect(canTrainAt(b, p)).toBe(false);
      }
    }
  });
});

describe('getTrainingDuration', () => {
  it('returns a positive integer for every trainable offering', () => {
    for (const offering of listTrainingOfferings()) {
      expect(Number.isInteger(offering.duration)).toBe(true);
      expect(offering.duration).toBeGreaterThan(0);
    }
  });

  it('Study Hall rare-profession durations are strictly longer than School common-profession durations', () => {
    const schoolDurations = listTrainingOfferings()
      .filter((o) => o.building === BuildingType.School)
      .map((o) => o.duration);
    const studyHallDurations = listTrainingOfferings()
      .filter((o) => o.building === BuildingType.StudyHall)
      .map((o) => o.duration);
    const schoolMax = Math.max(...schoolDurations);
    const studyHallMin = Math.min(...studyHallDurations);
    expect(studyHallMin).toBeGreaterThan(schoolMax);
  });

  it('throws when the building is not a training building', () => {
    expect(() => getTrainingDuration(BuildingType.Tavern, ProfessionType.Shipwright)).toThrow();
  });

  it('throws when the building does not train the requested profession', () => {
    expect(() => getTrainingDuration(BuildingType.School, ProfessionType.Scholar)).toThrow();
    expect(() => getTrainingDuration(BuildingType.StudyHall, ProfessionType.Shipwright)).toThrow();
  });
});

describe('listTrainingOfferings', () => {
  it('enumerates at least one offering per training building', () => {
    const perBuilding = new Map<BuildingType, number>();
    for (const o of listTrainingOfferings()) {
      perBuilding.set(o.building, (perBuilding.get(o.building) ?? 0) + 1);
    }
    expect(perBuilding.get(BuildingType.School)).toBeGreaterThan(0);
    expect(perBuilding.get(BuildingType.StudyHall)).toBeGreaterThan(0);
  });

  it('emits entries in a stable (building, target) order', () => {
    const first = listTrainingOfferings().map((o) => `${o.building}:${o.target}`);
    const second = listTrainingOfferings().map((o) => `${o.building}:${o.target}`);
    expect(first).toEqual(second);
  });

  it('every entry references a real BuildingType + ProfessionType and has duration ≥ 1', () => {
    const buildings = new Set<string>(ALL_BUILDING_TYPES);
    const professions = new Set<string>(ALL_PROFESSION_TYPES);
    for (const o of listTrainingOfferings()) {
      expect(buildings.has(o.building)).toBe(true);
      expect(professions.has(o.target)).toBe(true);
      expect(o.duration).toBeGreaterThanOrEqual(1);
      expect(o.target).not.toBe(ProfessionType.Deckhand);
    }
  });

  it('every entry is consistent with canTrainAt + getTrainingDuration', () => {
    for (const o of listTrainingOfferings()) {
      expect(canTrainAt(o.building, o.target)).toBe(true);
      expect(getTrainingDuration(o.building, o.target)).toBe(o.duration);
    }
  });
});
