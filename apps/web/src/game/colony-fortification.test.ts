import { describe, it, expect } from 'vitest';
import { BuildingType, type ColonyJSON } from '@colonize/core';
import {
  COLONY_BASE_STROKE_COLOR,
  COLONY_BASE_STROKE_WIDTH,
  COLONY_BASTION_STROKE_COLOR,
  COLONY_BASTION_STROKE_WIDTH,
  COLONY_CITADEL_STROKE_COLOR,
  COLONY_CITADEL_STROKE_WIDTH,
  COLONY_STOCKADE_STROKE_COLOR,
  COLONY_STOCKADE_STROKE_WIDTH,
  getColonyFortificationVisual,
} from './colony-fortification';

function colony(buildings: readonly string[]): ColonyJSON {
  return {
    id: 'c-1',
    faction: 'otk',
    position: { x: 0, y: 0 },
    population: 1,
    crew: [],
    buildings,
    stocks: { resources: {}, artifacts: [] },
  };
}

describe('getColonyFortificationVisual', () => {
  it('returns the base style when the colony has no fortifications', () => {
    const v = getColonyFortificationVisual(colony([]));
    expect(v.tier).toBe('none');
    expect(v.strokeColor).toBe(COLONY_BASE_STROKE_COLOR);
    expect(v.strokeWidth).toBe(COLONY_BASE_STROKE_WIDTH);
  });

  it('returns the base style for a colony with non-fortification buildings only', () => {
    const v = getColonyFortificationVisual(colony([BuildingType.Tavern, BuildingType.Forge]));
    expect(v.tier).toBe('none');
  });

  it('returns the stockade style when only a stockade is built', () => {
    const v = getColonyFortificationVisual(colony([BuildingType.Stockade]));
    expect(v.tier).toBe('stockade');
    expect(v.strokeColor).toBe(COLONY_STOCKADE_STROKE_COLOR);
    expect(v.strokeWidth).toBe(COLONY_STOCKADE_STROKE_WIDTH);
  });

  it('returns the bastion style when both stockade and bastion are built (highest tier wins)', () => {
    const v = getColonyFortificationVisual(colony([BuildingType.Stockade, BuildingType.Bastion]));
    expect(v.tier).toBe('bastion');
    expect(v.strokeColor).toBe(COLONY_BASTION_STROKE_COLOR);
    expect(v.strokeWidth).toBe(COLONY_BASTION_STROKE_WIDTH);
  });

  it('returns the citadel style when all three tiers are built (highest tier wins)', () => {
    const v = getColonyFortificationVisual(
      colony([BuildingType.Stockade, BuildingType.Bastion, BuildingType.Citadel]),
    );
    expect(v.tier).toBe('citadel');
    expect(v.strokeColor).toBe(COLONY_CITADEL_STROKE_COLOR);
    expect(v.strokeWidth).toBe(COLONY_CITADEL_STROKE_WIDTH);
  });

  it('ignores unknown building ids in the colony.buildings array', () => {
    const v = getColonyFortificationVisual(colony(['mystery-hut', BuildingType.Bastion]));
    expect(v.tier).toBe('bastion');
  });

  it('stroke width ascends none < stockade < bastion < citadel', () => {
    const none = getColonyFortificationVisual(colony([]));
    const stockade = getColonyFortificationVisual(colony([BuildingType.Stockade]));
    const bastion = getColonyFortificationVisual(colony([BuildingType.Bastion]));
    const citadel = getColonyFortificationVisual(colony([BuildingType.Citadel]));
    expect(none.strokeWidth).toBeLessThan(stockade.strokeWidth);
    expect(stockade.strokeWidth).toBeLessThan(bastion.strokeWidth);
    expect(bastion.strokeWidth).toBeLessThan(citadel.strokeWidth);
  });
});
