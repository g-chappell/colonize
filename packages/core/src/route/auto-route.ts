// AutoRoute — the mutable per-ship progress tracker for a MerchantRoute.
//
// Bound 1:1 to a ship via `unitId`. Names the route it is following,
// the index of the stop currently being approached, and a status plus
// human-readable reason when the route breaks (colony destroyed, ship
// captured, no path, etc.). The orchestrator that owns the ship
// collection wraps a `Map<unitId, AutoRoute>` and calls the tick
// executor once per turn for every ship that has an entry.
//
// Status is a const-object union for exhaustiveness at the consumer
// (UI surfaces, save-format reviver, tick executor). The broken
// reason is a free-form string — UIs may surface it verbatim; it is
// not localisation-keyed yet.

export const AutoRouteStatus = {
  Active: 'active',
  Broken: 'broken',
} as const;

export type AutoRouteStatus = (typeof AutoRouteStatus)[keyof typeof AutoRouteStatus];

export const ALL_AUTO_ROUTE_STATUSES: readonly AutoRouteStatus[] = Object.values(AutoRouteStatus);

export function isAutoRouteStatus(value: unknown): value is AutoRouteStatus {
  return (
    typeof value === 'string' && (ALL_AUTO_ROUTE_STATUSES as readonly string[]).includes(value)
  );
}

export interface AutoRouteJSON {
  readonly unitId: string;
  readonly routeId: string;
  readonly currentStopIndex: number;
  readonly status: AutoRouteStatus;
  readonly brokenReason: string | null;
}

export interface AutoRouteInit {
  readonly unitId: string;
  readonly routeId: string;
  readonly currentStopIndex?: number;
  readonly status?: AutoRouteStatus;
  readonly brokenReason?: string | null;
}

export class AutoRoute {
  readonly unitId: string;
  readonly routeId: string;
  private _currentStopIndex: number;
  private _status: AutoRouteStatus;
  private _brokenReason: string | null;

  constructor(init: AutoRouteInit) {
    assertNonEmptyString('AutoRoute', 'unitId', init.unitId);
    assertNonEmptyString('AutoRoute', 'routeId', init.routeId);
    const index = init.currentStopIndex ?? 0;
    if (!Number.isInteger(index) || index < 0) {
      throw new RangeError(
        `AutoRoute currentStopIndex must be a non-negative integer (got ${index})`,
      );
    }
    const status = init.status ?? AutoRouteStatus.Active;
    if (!isAutoRouteStatus(status)) {
      throw new TypeError(`AutoRoute status is not a valid AutoRouteStatus: ${String(status)}`);
    }
    const brokenReason = init.brokenReason ?? null;
    if (brokenReason !== null && (typeof brokenReason !== 'string' || brokenReason.length === 0)) {
      throw new TypeError('AutoRoute brokenReason must be null or a non-empty string');
    }
    if (status === AutoRouteStatus.Broken && brokenReason === null) {
      throw new Error('AutoRoute status=broken requires a non-empty brokenReason');
    }
    if (status === AutoRouteStatus.Active && brokenReason !== null) {
      throw new Error('AutoRoute status=active must have a null brokenReason');
    }
    this.unitId = init.unitId;
    this.routeId = init.routeId;
    this._currentStopIndex = index;
    this._status = status;
    this._brokenReason = brokenReason;
  }

  get currentStopIndex(): number {
    return this._currentStopIndex;
  }

  get status(): AutoRouteStatus {
    return this._status;
  }

  get brokenReason(): string | null {
    return this._brokenReason;
  }

  get isActive(): boolean {
    return this._status === AutoRouteStatus.Active;
  }

  get isBroken(): boolean {
    return this._status === AutoRouteStatus.Broken;
  }

  advanceTo(index: number, totalStops: number): void {
    if (!Number.isInteger(totalStops) || totalStops <= 0) {
      throw new RangeError(
        `AutoRoute.advanceTo: totalStops must be a positive integer (got ${totalStops})`,
      );
    }
    if (!Number.isInteger(index) || index < 0 || index >= totalStops) {
      throw new RangeError(`AutoRoute.advanceTo: index ${index} out of range [0, ${totalStops})`);
    }
    if (this._status !== AutoRouteStatus.Active) {
      throw new Error('AutoRoute.advanceTo: route is not active');
    }
    this._currentStopIndex = index;
  }

  markBroken(reason: string): void {
    assertNonEmptyString('AutoRoute.markBroken', 'reason', reason);
    this._status = AutoRouteStatus.Broken;
    this._brokenReason = reason;
  }

  toJSON(): AutoRouteJSON {
    return {
      unitId: this.unitId,
      routeId: this.routeId,
      currentStopIndex: this._currentStopIndex,
      status: this._status,
      brokenReason: this._brokenReason,
    };
  }

  static fromJSON(data: AutoRouteJSON): AutoRoute {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('AutoRouteJSON must be an object');
    }
    return new AutoRoute({
      unitId: data.unitId,
      routeId: data.routeId,
      currentStopIndex: data.currentStopIndex,
      status: data.status,
      brokenReason: data.brokenReason,
    });
  }
}

function assertNonEmptyString(op: string, label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: ${label} must be a non-empty string`);
  }
}
