// tickMerchantRoute — the single-ship turn executor for a MerchantRoute.
//
// Pure(ish) function called once per turn per ship that has an active
// AutoRoute. Advances the AutoRoute state machine:
//
//   1. Validate the route is still feasible (target colony exists, ship
//      faction matches route faction). If not, mark broken.
//   2. If the ship is at the current stop's colony (same position or
//      8-adjacent to account for island-tile colonies), execute the
//      stop's load/unload actions against the colony stockpile, clamp
//      per-action qty to what is actually available, then advance the
//      AutoRoute index to the next stop (wraps around).
//   3. Otherwise, find a path to the colony (or the closest reachable
//      tile adjacent to it when the colony itself sits on an Island
//      tile) and walk the ship along it, spending movement. If no path
//      exists, mark broken.
//
// Per CLAUDE.md "Ship the entity's primitive; leave iteration /
// scheduling to the task that owns the collection": this function
// operates on a single ship. The caller (TASK-051 route-builder UI,
// and later a roster orchestrator) owns the Map<unitId, AutoRoute> +
// Map<MerchantRouteId, MerchantRoute> and is responsible for iterating
// per turn.
//
// Per CLAUDE.md "Clamp-and-skip out-of-range qty at the store
// boundary": the executor clamps every load/unload qty to the actual
// source/destination balance and reports the applied qty in the
// outcome, rather than throwing on over-draw. The route itself stores
// the player's intended qty; a partial apply is closer to their intent
// than a no-op.

import type { CargoHold } from '../cargo/cargo-hold.js';
import type { Colony } from '../colony/colony.js';
import type { GameMap, Coord } from '../map/map.js';
import { findPath, sailingStepCost } from '../map/pathfind.js';
import type { PathfindFlags } from '../map/pathfind.js';
import type { Unit } from '../unit/unit.js';
import type { AutoRoute } from './auto-route.js';
import type {
  ColonyId,
  MerchantRoute,
  MerchantRouteAction,
  MerchantRouteActionKind,
} from './merchant-route.js';
import { MerchantRouteActionKind as Kind } from './merchant-route.js';

export interface MerchantRouteActionOutcome {
  readonly kind: MerchantRouteActionKind;
  readonly resourceId: string;
  readonly requestedQty: number;
  readonly appliedQty: number;
}

export type TickMerchantRouteResult =
  | { readonly kind: 'already-broken'; readonly reason: string }
  | { readonly kind: 'broken'; readonly reason: string }
  | {
      readonly kind: 'arrived';
      readonly stopIndex: number;
      readonly colonyId: ColonyId;
      readonly actionOutcomes: readonly MerchantRouteActionOutcome[];
      readonly nextStopIndex: number;
    }
  | {
      readonly kind: 'travelling';
      readonly targetStopIndex: number;
      readonly targetColonyId: ColonyId;
      readonly from: Coord;
      readonly to: Coord;
      readonly movementSpent: number;
    }
  | {
      readonly kind: 'idle';
      readonly targetStopIndex: number;
      readonly targetColonyId: ColonyId;
      readonly reason: 'no-movement';
    };

export interface TickMerchantRouteInput {
  readonly unit: Unit;
  readonly autoRoute: AutoRoute;
  readonly route: MerchantRoute;
  readonly colonies: ReadonlyMap<ColonyId, Colony>;
  readonly map: GameMap;
  readonly pathfindFlags?: PathfindFlags;
}

export function tickMerchantRoute(input: TickMerchantRouteInput): TickMerchantRouteResult {
  const { unit, autoRoute, route, colonies, map, pathfindFlags } = input;

  if (autoRoute.unitId !== unit.id) {
    throw new Error(
      `tickMerchantRoute: autoRoute.unitId "${autoRoute.unitId}" does not match unit.id "${unit.id}"`,
    );
  }
  if (autoRoute.routeId !== route.id) {
    throw new Error(
      `tickMerchantRoute: autoRoute.routeId "${autoRoute.routeId}" does not match route.id "${route.id}"`,
    );
  }

  if (autoRoute.isBroken) {
    return { kind: 'already-broken', reason: autoRoute.brokenReason ?? 'unknown' };
  }

  if (unit.faction !== route.faction) {
    const reason = `ship captured: unit faction "${unit.faction}" no longer matches route faction "${route.faction}"`;
    autoRoute.markBroken(reason);
    return { kind: 'broken', reason };
  }

  const stop = route.stopAt(autoRoute.currentStopIndex);
  const colony = colonies.get(stop.colonyId);
  if (colony === undefined) {
    const reason = `target colony "${stop.colonyId}" no longer exists`;
    autoRoute.markBroken(reason);
    return { kind: 'broken', reason };
  }
  if (colony.faction !== route.faction) {
    const reason = `target colony "${colony.id}" is no longer owned by faction "${route.faction}"`;
    autoRoute.markBroken(reason);
    return { kind: 'broken', reason };
  }

  if (isAtColony(unit.position, colony.position)) {
    const outcomes = executeStopActions(stop.actions, unit.cargo, colony.stocks);
    const nextIndex = route.nextStopIndex(autoRoute.currentStopIndex);
    autoRoute.advanceTo(nextIndex, route.length);
    return {
      kind: 'arrived',
      stopIndex: route.length === 1 ? 0 : previousIndex(nextIndex, route.length),
      colonyId: colony.id,
      actionOutcomes: outcomes,
      nextStopIndex: nextIndex,
    };
  }

  if (!unit.canMove) {
    return {
      kind: 'idle',
      targetStopIndex: autoRoute.currentStopIndex,
      targetColonyId: colony.id,
      reason: 'no-movement',
    };
  }

  const target = closestReachableTile(map, unit.position, colony.position, pathfindFlags);
  if (target === null) {
    const reason = `no path from (${unit.position.x}, ${unit.position.y}) to colony "${colony.id}"`;
    autoRoute.markBroken(reason);
    return { kind: 'broken', reason };
  }

  const result = advanceShipAlongPath(unit, target.path, map, pathfindFlags);
  return {
    kind: 'travelling',
    targetStopIndex: autoRoute.currentStopIndex,
    targetColonyId: colony.id,
    from: result.from,
    to: result.to,
    movementSpent: result.movementSpent,
  };
}

function previousIndex(current: number, total: number): number {
  return (current - 1 + total) % total;
}

function isAtColony(shipPos: Coord, colonyPos: Coord): boolean {
  return Math.max(Math.abs(shipPos.x - colonyPos.x), Math.abs(shipPos.y - colonyPos.y)) <= 1;
}

function executeStopActions(
  actions: readonly MerchantRouteAction[],
  ship: CargoHold,
  colony: CargoHold,
): readonly MerchantRouteActionOutcome[] {
  const outcomes: MerchantRouteActionOutcome[] = [];
  for (const action of actions) {
    let applied: number;
    switch (action.kind) {
      case Kind.Load: {
        const available = colony.getQuantity(action.resourceId);
        applied = Math.min(action.qty, available);
        if (applied > 0) {
          colony.removeResource(action.resourceId, applied);
          ship.addResource(action.resourceId, applied);
        }
        break;
      }
      case Kind.Unload: {
        const carried = ship.getQuantity(action.resourceId);
        applied = Math.min(action.qty, carried);
        if (applied > 0) {
          ship.removeResource(action.resourceId, applied);
          colony.addResource(action.resourceId, applied);
        }
        break;
      }
    }
    outcomes.push({
      kind: action.kind,
      resourceId: action.resourceId,
      requestedQty: action.qty,
      appliedQty: applied,
    });
  }
  return outcomes;
}

interface ReachableTile {
  readonly path: readonly Coord[];
  readonly cost: number;
}

function closestReachableTile(
  map: GameMap,
  start: Coord,
  target: Coord,
  flags: PathfindFlags | undefined,
): ReachableTile | null {
  const direct = findPath(map, start, target, flags);
  if (direct !== null) return direct;
  let best: ReachableTile | null = null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = target.x + dx;
      const ny = target.y + dy;
      if (!map.inBounds(nx, ny)) continue;
      const candidate = findPath(map, start, { x: nx, y: ny }, flags);
      if (candidate === null) continue;
      if (best === null || candidate.cost < best.cost) {
        best = candidate;
      }
    }
  }
  return best;
}

interface AdvanceResult {
  readonly from: Coord;
  readonly to: Coord;
  readonly movementSpent: number;
}

function advanceShipAlongPath(
  unit: Unit,
  path: readonly Coord[],
  map: GameMap,
  flags: PathfindFlags | undefined,
): AdvanceResult {
  const origin: Coord = { x: unit.position.x, y: unit.position.y };
  let spent = 0;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1]!;
    const to = path[i]!;
    const step = sailingStepCost(map, from, to, flags ?? {});
    if (!Number.isFinite(step)) break;
    const roundedStep = Math.max(1, Math.ceil(step));
    if (roundedStep > unit.movement) break;
    unit.moveTo(to, roundedStep);
    spent += roundedStep;
  }
  return { from: origin, to: { x: unit.position.x, y: unit.position.y }, movementSpent: spent };
}
