import type { Coord, GameMap, PathResult, PathfindFlags } from '@colonize/core';
import { tileCost } from '@colonize/core';

// Pure-sibling helpers for click-to-move. The Phaser scene pulls these
// through without ever importing Phaser, so the path proposal + budget
// maths stay unit-testable under jsdom (CLAUDE.md: pure-sibling module
// pattern for Phaser game code).

// Result of truncating a proposed path to what the mover can afford
// this turn. `path` always starts with the origin tile; `reachable` is
// the index (into `path`) of the furthest tile the unit can reach —
// equal to path.length - 1 when the whole path fits in the budget, or
// a smaller index (possibly 0) when the path cost exceeds the budget.
// `cost` is the total tile cost along `path[0..reachable]`.
export interface TruncatedPath {
  readonly path: readonly Coord[];
  readonly reachable: number;
  readonly cost: number;
}

// Given a full pathfinder result (origin → goal, inclusive), return the
// prefix the unit can actually traverse with `movementBudget` points.
// Origin tile always stays in the path (index 0). Each subsequent tile
// costs `tileCost(map.get(…), flags)`; we accumulate until the next
// step would exceed the budget.
//
// Caller owns the pathfinder; this helper deliberately mirrors
// pathfind.ts's cost model instead of reimplementing A*. Impassable
// tiles inside the path are already impossible (the pathfinder would
// not have emitted them), but we treat an Infinity step defensively by
// stopping short — belt-and-braces against future map cost changes.
export function truncatePathToBudget(
  path: readonly Coord[],
  map: GameMap,
  flags: PathfindFlags,
  movementBudget: number,
): TruncatedPath {
  if (path.length === 0) {
    return { path: [], reachable: -1, cost: 0 };
  }
  const origin = path[0]!;
  const reachablePath: Coord[] = [{ x: origin.x, y: origin.y }];
  let accumulated = 0;
  let reachable = 0;
  for (let i = 1; i < path.length; i++) {
    const next = path[i]!;
    const step = tileCost(map.get(next.x, next.y), flags);
    if (!Number.isFinite(step)) break;
    if (accumulated + step > movementBudget) break;
    accumulated += step;
    reachablePath.push({ x: next.x, y: next.y });
    reachable = i;
  }
  return { path: reachablePath, reachable, cost: accumulated };
}

// Convenience: given a PathResult and a budget, return the truncation.
// Shorthand for `truncatePathToBudget(result.path, map, flags, budget)`.
export function truncatePathResult(
  result: PathResult,
  map: GameMap,
  flags: PathfindFlags,
  movementBudget: number,
): TruncatedPath {
  return truncatePathToBudget(result.path, map, flags, movementBudget);
}

// True when the origin + goal of a proposed move refer to the same
// tile (clicks on the selected unit's tile). The scene uses this to
// short-circuit pathfinding — there's nothing to propose.
export function isSameTile(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}
