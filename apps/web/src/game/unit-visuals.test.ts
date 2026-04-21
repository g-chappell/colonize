import { describe, expect, it } from 'vitest';
import { ALL_UNIT_TYPES, UnitType } from '@colonize/core';
import {
  FACTION_COLORS,
  NEUTRAL_FACTION_COLOR,
  SELECTION_RING_COLOR,
  UNIT_BODY_SCALE,
  UNIT_VISUAL_SPECS,
  SELECTION_RING_SCALE,
  colorForFaction,
  visualForUnitType,
} from './unit-visuals';

describe('UNIT_VISUAL_SPECS', () => {
  it('defines a visual spec for every UnitType', () => {
    for (const type of ALL_UNIT_TYPES) {
      const spec = UNIT_VISUAL_SPECS[type];
      expect(spec).toBeDefined();
      expect(spec.label.length).toBeGreaterThan(0);
      expect(['circle', 'square', 'diamond']).toContain(spec.shape);
    }
  });

  it('renders Settlers with a diamond and warships with squares', () => {
    expect(UNIT_VISUAL_SPECS[UnitType.Settler].shape).toBe('diamond');
    expect(UNIT_VISUAL_SPECS[UnitType.Sloop].shape).toBe('square');
    expect(UNIT_VISUAL_SPECS[UnitType.ShipOfTheLine].shape).toBe('square');
  });
});

describe('visualForUnitType', () => {
  it('returns the matching spec', () => {
    expect(visualForUnitType(UnitType.Scout)).toEqual(UNIT_VISUAL_SPECS[UnitType.Scout]);
  });
});

describe('colorForFaction', () => {
  it('maps each playable faction to its tint', () => {
    for (const [faction, color] of Object.entries(FACTION_COLORS)) {
      expect(colorForFaction(faction)).toBe(color);
    }
  });

  it('falls back to the neutral grey for unknown factions', () => {
    expect(colorForFaction('npc-traders')).toBe(NEUTRAL_FACTION_COLOR);
    expect(colorForFaction('')).toBe(NEUTRAL_FACTION_COLOR);
  });

  it('keeps tints within the 24-bit RGB range', () => {
    for (const color of Object.values(FACTION_COLORS)) {
      expect(color).toBeGreaterThanOrEqual(0);
      expect(color).toBeLessThanOrEqual(0xffffff);
    }
    expect(NEUTRAL_FACTION_COLOR).toBeLessThanOrEqual(0xffffff);
    expect(SELECTION_RING_COLOR).toBeLessThanOrEqual(0xffffff);
  });
});

describe('size scales', () => {
  it('keeps body and selection ring within one tile', () => {
    expect(UNIT_BODY_SCALE).toBeGreaterThan(0);
    expect(UNIT_BODY_SCALE).toBeLessThan(1);
    expect(SELECTION_RING_SCALE).toBeGreaterThan(UNIT_BODY_SCALE);
    expect(SELECTION_RING_SCALE).toBeLessThanOrEqual(1);
  });
});
