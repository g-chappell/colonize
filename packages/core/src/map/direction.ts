import type { Coord } from './map.js';

export const Direction = {
  N: 'n',
  NE: 'ne',
  E: 'e',
  SE: 'se',
  S: 's',
  SW: 'sw',
  W: 'w',
  NW: 'nw',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export const ALL_DIRECTIONS: readonly Direction[] = [
  Direction.N,
  Direction.NE,
  Direction.E,
  Direction.SE,
  Direction.S,
  Direction.SW,
  Direction.W,
  Direction.NW,
];

export function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && (ALL_DIRECTIONS as readonly string[]).includes(value);
}

export function oppositeDirection(dir: Direction): Direction {
  const i = ALL_DIRECTIONS.indexOf(dir);
  return ALL_DIRECTIONS[(i + 4) % 8]!;
}

export function stepDirection(from: Coord, to: Coord): Direction | null {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (dx === 0 && dy === 0) return null;
  if (dx === 0 && dy === -1) return Direction.N;
  if (dx === 1 && dy === -1) return Direction.NE;
  if (dx === 1 && dy === 0) return Direction.E;
  if (dx === 1 && dy === 1) return Direction.SE;
  if (dx === 0 && dy === 1) return Direction.S;
  if (dx === -1 && dy === 1) return Direction.SW;
  if (dx === -1 && dy === 0) return Direction.W;
  if (dx === -1 && dy === -1) return Direction.NW;
  return null;
}

export function directionAngleDelta(a: Direction, b: Direction): number {
  const ai = ALL_DIRECTIONS.indexOf(a);
  const bi = ALL_DIRECTIONS.indexOf(b);
  const d = Math.abs(ai - bi);
  return Math.min(d, 8 - d) * 45;
}

export function directionalCostOffset(stepDir: Direction, zoneDir: Direction): number {
  return (directionAngleDelta(stepDir, zoneDir) - 90) / 180;
}
