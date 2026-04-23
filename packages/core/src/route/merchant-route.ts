// MerchantRoute — the immutable data model for a player-authored
// multi-stop trade loop. A route is an ordered list of stops, each
// naming a target colony plus a list of load/unload actions to execute
// when the ship arrives there.
//
// Per CLAUDE.md "Ship the entity's primitive; leave iteration /
// scheduling to the task that owns the collection": this module ships
// the template. The mutable per-ship progress tracker lives in
// `auto-route.ts`; the turn-tick advancer lives in
// `tick-merchant-route.ts`. The route-builder UI task (TASK-051) owns
// the collection `Map<MerchantRouteId, MerchantRoute>` and decides when
// to register/edit/delete routes.
//
// `MerchantRouteId` and `ColonyId` are opaque string aliases per
// CLAUDE.md "Opaque string aliases bridge pre-registry save-format
// identifiers": there is no route registry (routes are player-created,
// not content-authored) and Colony ids are already opaque strings on
// `Colony.id`. Kebab-case conventions apply at the wire level.
//
// `MerchantRouteActionKind` is a save-format const-object union
// ('load' | 'unload') consumed by an exhaustive switch in the tick
// executor — adding a new kind (e.g. 'wait', 'drop-off-passenger')
// surfaces as a build error at every consumer.

import type { ResourceId } from '../cargo/cargo-hold.js';
import type { FactionId } from '../unit/unit.js';

export type MerchantRouteId = string;
export type ColonyId = string;

export const MerchantRouteActionKind = {
  Load: 'load',
  Unload: 'unload',
} as const;

export type MerchantRouteActionKind =
  (typeof MerchantRouteActionKind)[keyof typeof MerchantRouteActionKind];

export const ALL_MERCHANT_ROUTE_ACTION_KINDS: readonly MerchantRouteActionKind[] =
  Object.values(MerchantRouteActionKind);

export function isMerchantRouteActionKind(value: unknown): value is MerchantRouteActionKind {
  return (
    typeof value === 'string' &&
    (ALL_MERCHANT_ROUTE_ACTION_KINDS as readonly string[]).includes(value)
  );
}

export interface MerchantRouteAction {
  readonly kind: MerchantRouteActionKind;
  readonly resourceId: ResourceId;
  readonly qty: number;
}

export interface MerchantRouteStop {
  readonly colonyId: ColonyId;
  readonly actions: readonly MerchantRouteAction[];
}

export interface MerchantRouteJSON {
  readonly id: MerchantRouteId;
  readonly faction: FactionId;
  readonly stops: readonly MerchantRouteStop[];
}

export interface MerchantRouteInit {
  readonly id: MerchantRouteId;
  readonly faction: FactionId;
  readonly stops: readonly MerchantRouteStop[];
}

export class MerchantRoute {
  readonly id: MerchantRouteId;
  readonly faction: FactionId;
  private readonly _stops: readonly MerchantRouteStop[];

  constructor(init: MerchantRouteInit) {
    assertNonEmptyString('MerchantRoute', 'id', init.id);
    assertNonEmptyString('MerchantRoute', 'faction', init.faction);
    if (!Array.isArray(init.stops)) {
      throw new TypeError('MerchantRoute stops must be an array');
    }
    if (init.stops.length === 0) {
      throw new RangeError('MerchantRoute must have at least one stop');
    }
    const frozenStops: MerchantRouteStop[] = [];
    for (let i = 0; i < init.stops.length; i++) {
      const stop = init.stops[i]!;
      frozenStops.push(freezeStop(i, stop));
    }
    this.id = init.id;
    this.faction = init.faction;
    this._stops = frozenStops;
  }

  get stops(): readonly MerchantRouteStop[] {
    return this._stops;
  }

  get length(): number {
    return this._stops.length;
  }

  stopAt(index: number): MerchantRouteStop {
    if (!Number.isInteger(index) || index < 0 || index >= this._stops.length) {
      throw new RangeError(
        `MerchantRoute.stopAt: index ${index} out of range [0, ${this._stops.length})`,
      );
    }
    return this._stops[index]!;
  }

  nextStopIndex(current: number): number {
    if (!Number.isInteger(current) || current < 0 || current >= this._stops.length) {
      throw new RangeError(
        `MerchantRoute.nextStopIndex: current ${current} out of range [0, ${this._stops.length})`,
      );
    }
    return (current + 1) % this._stops.length;
  }

  toJSON(): MerchantRouteJSON {
    return {
      id: this.id,
      faction: this.faction,
      stops: this._stops.map((stop) => ({
        colonyId: stop.colonyId,
        actions: stop.actions.map((a) => ({
          kind: a.kind,
          resourceId: a.resourceId,
          qty: a.qty,
        })),
      })),
    };
  }

  static fromJSON(data: MerchantRouteJSON): MerchantRoute {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('MerchantRouteJSON must be an object');
    }
    if (!Array.isArray(data.stops)) {
      throw new TypeError('MerchantRouteJSON.stops must be an array');
    }
    return new MerchantRoute({
      id: data.id,
      faction: data.faction,
      stops: data.stops,
    });
  }
}

function freezeStop(index: number, stop: MerchantRouteStop): MerchantRouteStop {
  if (stop === null || typeof stop !== 'object') {
    throw new TypeError(`MerchantRoute stop[${index}] must be an object`);
  }
  assertNonEmptyString(`MerchantRoute stop[${index}]`, 'colonyId', stop.colonyId);
  if (!Array.isArray(stop.actions)) {
    throw new TypeError(`MerchantRoute stop[${index}].actions must be an array`);
  }
  const actions: MerchantRouteAction[] = [];
  for (let a = 0; a < stop.actions.length; a++) {
    actions.push(freezeAction(index, a, stop.actions[a]!));
  }
  return { colonyId: stop.colonyId, actions };
}

function freezeAction(
  stopIndex: number,
  actionIndex: number,
  action: MerchantRouteAction,
): MerchantRouteAction {
  if (action === null || typeof action !== 'object') {
    throw new TypeError(
      `MerchantRoute stop[${stopIndex}].actions[${actionIndex}] must be an object`,
    );
  }
  if (!isMerchantRouteActionKind(action.kind)) {
    throw new TypeError(
      `MerchantRoute stop[${stopIndex}].actions[${actionIndex}].kind is not a valid MerchantRouteActionKind: ${String(action.kind)}`,
    );
  }
  assertNonEmptyString(
    `MerchantRoute stop[${stopIndex}].actions[${actionIndex}]`,
    'resourceId',
    action.resourceId,
  );
  if (!Number.isInteger(action.qty) || action.qty <= 0) {
    throw new RangeError(
      `MerchantRoute stop[${stopIndex}].actions[${actionIndex}].qty must be a positive integer (got ${action.qty})`,
    );
  }
  return { kind: action.kind, resourceId: action.resourceId, qty: action.qty };
}

function assertNonEmptyString(op: string, label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: ${label} must be a non-empty string`);
  }
}
