import { describe, it, expect } from 'vitest';
import {
  Direction,
  ALL_DIRECTIONS,
  isDirection,
  oppositeDirection,
  stepDirection,
  directionAngleDelta,
  directionalCostOffset,
} from './direction.js';

describe('Direction const-object', () => {
  it('enumerates exactly 8 compass directions', () => {
    expect(ALL_DIRECTIONS).toHaveLength(8);
    expect(new Set(ALL_DIRECTIONS).size).toBe(8);
  });

  it('accepts known string values via isDirection', () => {
    for (const d of ALL_DIRECTIONS) expect(isDirection(d)).toBe(true);
  });

  it('rejects unknown values via isDirection', () => {
    expect(isDirection('north')).toBe(false);
    expect(isDirection('')).toBe(false);
    expect(isDirection(42)).toBe(false);
    expect(isDirection(null)).toBe(false);
  });
});

describe('oppositeDirection', () => {
  it('returns the 180° rotation for each direction', () => {
    expect(oppositeDirection(Direction.N)).toBe(Direction.S);
    expect(oppositeDirection(Direction.NE)).toBe(Direction.SW);
    expect(oppositeDirection(Direction.E)).toBe(Direction.W);
    expect(oppositeDirection(Direction.SE)).toBe(Direction.NW);
    expect(oppositeDirection(Direction.S)).toBe(Direction.N);
    expect(oppositeDirection(Direction.SW)).toBe(Direction.NE);
    expect(oppositeDirection(Direction.W)).toBe(Direction.E);
    expect(oppositeDirection(Direction.NW)).toBe(Direction.SE);
  });

  it('is its own inverse', () => {
    for (const d of ALL_DIRECTIONS) {
      expect(oppositeDirection(oppositeDirection(d))).toBe(d);
    }
  });
});

describe('stepDirection', () => {
  it('returns null for zero-length steps', () => {
    expect(stepDirection({ x: 3, y: 3 }, { x: 3, y: 3 })).toBeNull();
  });

  it('maps each 8-neighbour offset to the matching direction', () => {
    const from = { x: 5, y: 5 };
    expect(stepDirection(from, { x: 5, y: 4 })).toBe(Direction.N);
    expect(stepDirection(from, { x: 6, y: 4 })).toBe(Direction.NE);
    expect(stepDirection(from, { x: 6, y: 5 })).toBe(Direction.E);
    expect(stepDirection(from, { x: 6, y: 6 })).toBe(Direction.SE);
    expect(stepDirection(from, { x: 5, y: 6 })).toBe(Direction.S);
    expect(stepDirection(from, { x: 4, y: 6 })).toBe(Direction.SW);
    expect(stepDirection(from, { x: 4, y: 5 })).toBe(Direction.W);
    expect(stepDirection(from, { x: 4, y: 4 })).toBe(Direction.NW);
  });

  it('normalises long steps to the same 8 cardinal/diagonal directions', () => {
    const from = { x: 0, y: 0 };
    expect(stepDirection(from, { x: 5, y: 0 })).toBe(Direction.E);
    expect(stepDirection(from, { x: -3, y: -7 })).toBe(Direction.NW);
  });
});

describe('directionAngleDelta', () => {
  it('returns 0 for identical directions', () => {
    for (const d of ALL_DIRECTIONS) {
      expect(directionAngleDelta(d, d)).toBe(0);
    }
  });

  it('returns 180 for opposite directions', () => {
    for (const d of ALL_DIRECTIONS) {
      expect(directionAngleDelta(d, oppositeDirection(d))).toBe(180);
    }
  });

  it('returns 45 for adjacent directions', () => {
    expect(directionAngleDelta(Direction.N, Direction.NE)).toBe(45);
    expect(directionAngleDelta(Direction.E, Direction.NE)).toBe(45);
    expect(directionAngleDelta(Direction.NW, Direction.N)).toBe(45);
  });

  it('is symmetric', () => {
    for (const a of ALL_DIRECTIONS) {
      for (const b of ALL_DIRECTIONS) {
        expect(directionAngleDelta(a, b)).toBe(directionAngleDelta(b, a));
      }
    }
  });
});

describe('directionalCostOffset', () => {
  it('returns -0.5 for aligned travel (tailwind/favourable current)', () => {
    for (const d of ALL_DIRECTIONS) {
      expect(directionalCostOffset(d, d)).toBe(-0.5);
    }
  });

  it('returns +0.5 for head-on opposition', () => {
    for (const d of ALL_DIRECTIONS) {
      expect(directionalCostOffset(d, oppositeDirection(d))).toBe(0.5);
    }
  });

  it('returns 0 for perpendicular travel', () => {
    expect(directionalCostOffset(Direction.N, Direction.E)).toBe(0);
    expect(directionalCostOffset(Direction.N, Direction.W)).toBe(0);
    expect(directionalCostOffset(Direction.NE, Direction.SE)).toBe(0);
  });

  it('scales linearly with 45° steps between aligned and opposed', () => {
    expect(directionalCostOffset(Direction.N, Direction.NE)).toBeCloseTo(-0.25);
    expect(directionalCostOffset(Direction.N, Direction.SE)).toBeCloseTo(0.25);
  });
});
