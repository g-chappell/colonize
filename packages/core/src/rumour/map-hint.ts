import type { Coord } from '../map/map.js';
import { ALL_DIRECTIONS, Direction, stepDirection } from '../map/direction.js';

// Subset of RumourOutcomeCategory that the tavern hint UI actually
// points at today (TASK-076). The directional chevrons only surface
// for Archive caches and Legendary wrecks — the two categories whose
// locations reward the player for a trip in roughly the right
// direction. Shrines and mirages stay pure flavour.
export const MapHintCategory = {
  ArchiveCache: 'archive-cache',
  Wreck: 'wreck',
} as const;

export type MapHintCategory = (typeof MapHintCategory)[keyof typeof MapHintCategory];

export const ALL_MAP_HINT_CATEGORIES: readonly MapHintCategory[] = Object.values(MapHintCategory);

export function isMapHintCategory(value: unknown): value is MapHintCategory {
  return (
    typeof value === 'string' && (ALL_MAP_HINT_CATEGORIES as readonly string[]).includes(value)
  );
}

// A directional hint pinned to a known origin tile (the colony whose
// tavern surfaced the rumour). The direction is intentionally coarse
// (8-way) so the payoff comes from exploration, not a click-through.
export interface MapHint {
  readonly origin: Coord;
  readonly direction: Direction;
  readonly category: MapHintCategory;
  readonly sourceRumourId: string;
}

export interface DeriveMapHintInput {
  readonly origin: Coord;
  readonly target: Coord;
  readonly category: MapHintCategory;
  readonly sourceRumourId: string;
  // Optional jitter rng — when supplied, the derived direction may
  // rotate by ±1 step (45°) half the time, so the hint reads as
  // "roughly" not "exactly". Omit for deterministic paths (tests,
  // pre-baked content hints).
  readonly rng?: () => number;
}

// Rotate a direction by `steps` 45° increments (positive = clockwise).
// Wraps through the 8-way compass.
export function rotateDirection(dir: Direction, steps: number): Direction {
  const i = ALL_DIRECTIONS.indexOf(dir);
  if (i < 0) throw new TypeError(`rotateDirection: not a valid Direction: ${String(dir)}`);
  const n = ALL_DIRECTIONS.length;
  const next = (((i + steps) % n) + n) % n;
  return ALL_DIRECTIONS[next]!;
}

// Pure derivation of a directional hint from origin toward target.
// Returns null when origin === target (no direction to point in) so
// callers can skip hint emission for same-tile targets without
// throwing. Optional rng applies a small rotation jitter to blur the
// "exact" heading into a "roughly" one.
export function deriveMapHint(input: DeriveMapHintInput): MapHint | null {
  const { origin, target, category, sourceRumourId, rng } = input;
  const exact = stepDirection(origin, target);
  if (exact === null) return null;
  const direction = rng ? applyJitter(exact, rng) : exact;
  return {
    origin: { x: origin.x, y: origin.y },
    direction,
    category,
    sourceRumourId,
  };
}

function applyJitter(dir: Direction, rng: () => number): Direction {
  const roll = rng();
  if (roll < 0.25) return rotateDirection(dir, -1);
  if (roll < 0.5) return rotateDirection(dir, 1);
  return dir;
}
