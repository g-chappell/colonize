import type { GameMap, Coord } from './map.js';
import { TileType } from './tile.js';
import { directionalCostOffset, stepDirection } from './direction.js';
import type { DirectionLayer } from './direction-layer.js';

export interface PathfindFlags {
  readonly redTideImmunity?: boolean;
  readonly wind?: DirectionLayer;
  readonly current?: DirectionLayer;
}

export interface PathResult {
  readonly path: readonly Coord[];
  readonly cost: number;
}

export const MIN_SAILING_STEP_COST = 0.25;

export function tileCost(type: TileType, flags: PathfindFlags = {}): number {
  switch (type) {
    case TileType.Ocean:
    case TileType.RayonPassage:
    case TileType.FataMorgana:
    case TileType.FloatingCity:
      return 1;
    case TileType.RedTide:
      return flags.redTideImmunity ? 1 : Infinity;
    case TileType.Island:
      return Infinity;
  }
}

export function sailingStepCost(
  map: GameMap,
  from: Coord,
  to: Coord,
  flags: PathfindFlags = {},
): number {
  const base = tileCost(map.get(to.x, to.y), flags);
  if (!Number.isFinite(base)) return base;
  const dir = stepDirection(from, to);
  if (dir === null) return base;
  let cost = base;
  if (flags.wind) {
    const w = flags.wind.get(to.x, to.y);
    if (w !== null) cost += directionalCostOffset(dir, w);
  }
  if (flags.current) {
    const c = flags.current.get(to.x, to.y);
    if (c !== null) cost += directionalCostOffset(dir, c);
  }
  return Math.max(MIN_SAILING_STEP_COST, cost);
}

export function findPath(
  map: GameMap,
  start: Coord,
  goal: Coord,
  flags: PathfindFlags = {},
): PathResult | null {
  if (!map.inBounds(start.x, start.y)) {
    throw new RangeError(`findPath start (${start.x}, ${start.y}) out of bounds`);
  }
  if (!map.inBounds(goal.x, goal.y)) {
    throw new RangeError(`findPath goal (${goal.x}, ${goal.y}) out of bounds`);
  }
  if (!Number.isFinite(tileCost(map.get(goal.x, goal.y), flags))) {
    return null;
  }
  if (start.x === goal.x && start.y === goal.y) {
    return { path: [{ x: start.x, y: start.y }], cost: 0 };
  }

  const keyOf = (x: number, y: number): number => y * map.width + x;
  const startKey = keyOf(start.x, start.y);
  const goalKey = keyOf(goal.x, goal.y);

  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();
  gScore.set(startKey, 0);

  const heuristicScale =
    flags.wind !== undefined || flags.current !== undefined ? MIN_SAILING_STEP_COST : 1;

  const open = new MinHeap();
  open.push(startKey, heuristic(start, goal) * heuristicScale);

  while (open.size > 0) {
    const currentKey = open.pop();
    if (currentKey === goalKey) {
      return reconstruct(cameFrom, currentKey, map.width, gScore.get(goalKey)!);
    }
    const cx = currentKey % map.width;
    const cy = Math.floor(currentKey / map.width);
    const currentG = gScore.get(currentKey)!;

    for (const n of map.neighbours(cx, cy)) {
      const step = sailingStepCost(map, { x: cx, y: cy }, n, flags);
      if (!Number.isFinite(step)) continue;
      const tentative = currentG + step;
      const nKey = keyOf(n.x, n.y);
      const prev = gScore.get(nKey);
      if (prev === undefined || tentative < prev) {
        gScore.set(nKey, tentative);
        cameFrom.set(nKey, currentKey);
        open.push(nKey, tentative + heuristic(n, goal) * heuristicScale);
      }
    }
  }

  return null;
}

function heuristic(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function reconstruct(
  cameFrom: Map<number, number>,
  goalKey: number,
  width: number,
  cost: number,
): PathResult {
  const path: Coord[] = [];
  let cur: number | undefined = goalKey;
  while (cur !== undefined) {
    path.push({ x: cur % width, y: Math.floor(cur / width) });
    cur = cameFrom.get(cur);
  }
  path.reverse();
  return { path, cost };
}

class MinHeap {
  private readonly keys: number[] = [];
  private readonly priorities: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, priority: number): void {
    this.keys.push(key);
    this.priorities.push(priority);
    this.siftUp(this.keys.length - 1);
  }

  pop(): number {
    const top = this.keys[0]!;
    const lastKey = this.keys.pop()!;
    const lastPriority = this.priorities.pop()!;
    if (this.keys.length > 0) {
      this.keys[0] = lastKey;
      this.priorities[0] = lastPriority;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorities[parent]! <= this.priorities[i]!) break;
      this.swap(parent, i);
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.keys.length;
    while (true) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let smallest = i;
      if (l < n && this.priorities[l]! < this.priorities[smallest]!) smallest = l;
      if (r < n && this.priorities[r]! < this.priorities[smallest]!) smallest = r;
      if (smallest === i) break;
      this.swap(smallest, i);
      i = smallest;
    }
  }

  private swap(a: number, b: number): void {
    [this.keys[a], this.keys[b]] = [this.keys[b]!, this.keys[a]!];
    [this.priorities[a], this.priorities[b]] = [this.priorities[b]!, this.priorities[a]!];
  }
}
