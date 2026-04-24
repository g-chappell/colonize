import { describe, expect, it } from 'vitest';
import { Direction } from '../map/direction.js';
import {
  ALL_MAP_HINT_CATEGORIES,
  MapHintCategory,
  deriveMapHint,
  isMapHintCategory,
  rotateDirection,
} from './map-hint.js';

describe('MapHintCategory', () => {
  it('exposes the two payoff categories the tavern hints point at', () => {
    expect(ALL_MAP_HINT_CATEGORIES).toContain(MapHintCategory.ArchiveCache);
    expect(ALL_MAP_HINT_CATEGORIES).toContain(MapHintCategory.Wreck);
  });

  it('isMapHintCategory narrows valid values and rejects junk', () => {
    expect(isMapHintCategory('archive-cache')).toBe(true);
    expect(isMapHintCategory('wreck')).toBe(true);
    expect(isMapHintCategory('shrine')).toBe(false);
    expect(isMapHintCategory('')).toBe(false);
    expect(isMapHintCategory(undefined)).toBe(false);
    expect(isMapHintCategory(null)).toBe(false);
    expect(isMapHintCategory(42)).toBe(false);
  });
});

describe('rotateDirection', () => {
  it('rotates clockwise by 45° steps', () => {
    expect(rotateDirection(Direction.N, 1)).toBe(Direction.NE);
    expect(rotateDirection(Direction.N, 2)).toBe(Direction.E);
    expect(rotateDirection(Direction.N, 4)).toBe(Direction.S);
  });

  it('rotates counter-clockwise with negative steps', () => {
    expect(rotateDirection(Direction.N, -1)).toBe(Direction.NW);
    expect(rotateDirection(Direction.E, -2)).toBe(Direction.N);
  });

  it('wraps through the compass on 8+ steps', () => {
    expect(rotateDirection(Direction.N, 8)).toBe(Direction.N);
    expect(rotateDirection(Direction.N, 9)).toBe(Direction.NE);
    expect(rotateDirection(Direction.N, -9)).toBe(Direction.NW);
  });

  it('throws TypeError on an unknown direction', () => {
    expect(() => rotateDirection('up' as Direction, 1)).toThrow(TypeError);
  });
});

describe('deriveMapHint', () => {
  const base = {
    category: MapHintCategory.ArchiveCache,
    sourceRumourId: 'rumour-archive-cache-east',
  } as const;

  it('returns the exact 8-way direction toward the target without rng', () => {
    const hint = deriveMapHint({ ...base, origin: { x: 4, y: 4 }, target: { x: 9, y: 4 } });
    expect(hint?.direction).toBe(Direction.E);
  });

  it('returns a diagonal direction when the target is on a diagonal', () => {
    const hint = deriveMapHint({ ...base, origin: { x: 4, y: 4 }, target: { x: 7, y: 1 } });
    expect(hint?.direction).toBe(Direction.NE);
  });

  it('returns null when origin and target share the same tile', () => {
    const hint = deriveMapHint({ ...base, origin: { x: 3, y: 3 }, target: { x: 3, y: 3 } });
    expect(hint).toBeNull();
  });

  it('copies origin so mutating the caller coord does not leak into the hint', () => {
    const origin = { x: 1, y: 2 };
    const hint = deriveMapHint({ ...base, origin, target: { x: 5, y: 2 } });
    expect(hint).not.toBeNull();
    // Mutate the original coord; the hint's origin must not change.
    (origin as { x: number }).x = 99;
    expect(hint!.origin).toEqual({ x: 1, y: 2 });
  });

  it('passes through category + sourceRumourId unchanged', () => {
    const hint = deriveMapHint({
      origin: { x: 0, y: 0 },
      target: { x: 0, y: 3 },
      category: MapHintCategory.Wreck,
      sourceRumourId: 'rumour-derelict-leeward',
    });
    expect(hint?.category).toBe(MapHintCategory.Wreck);
    expect(hint?.sourceRumourId).toBe('rumour-derelict-leeward');
  });

  it('applies jitter deterministically with a seeded rng: low roll rotates CCW', () => {
    const hint = deriveMapHint({
      ...base,
      origin: { x: 0, y: 0 },
      target: { x: 4, y: 0 },
      rng: () => 0.1,
    });
    expect(hint?.direction).toBe(Direction.NE);
  });

  it('applies jitter deterministically with a seeded rng: mid roll rotates CW', () => {
    const hint = deriveMapHint({
      ...base,
      origin: { x: 0, y: 0 },
      target: { x: 4, y: 0 },
      rng: () => 0.4,
    });
    expect(hint?.direction).toBe(Direction.SE);
  });

  it('leaves direction exact when jitter roll is in the upper half', () => {
    const hint = deriveMapHint({
      ...base,
      origin: { x: 0, y: 0 },
      target: { x: 4, y: 0 },
      rng: () => 0.9,
    });
    expect(hint?.direction).toBe(Direction.E);
  });
});
