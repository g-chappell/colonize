// ConcordTensionMeter — per-faction accumulator for Concord-tithe
// defiance and its ultimatum-event queue.
//
// One meter per faction. The orchestrator that owns the faction
// collection calls `raise(amount)` whenever that faction refuses a
// tithe (via boycott, Tidewater Party, or explicit non-payment) and
// drains `pendingEvents` via `consumeNextEvent()` when the player is
// idle (out of combat, out of a colony screen, out of a rumour
// resolution). Crossings queue FIFO in ascending-threshold order; the
// final threshold is the Sovereignty-triggering ultimatum that
// TASK-070 wires into the Concord Fleet spawn.
//
// Mirror of `ChimesLedger`'s shape — threshold-monotonic counter with
// a deferred `ConcordUltimatumEvent` queue — because the Council
// scheduler and the Concord scheduler both want the same "cross once,
// drain later" semantics. Kept as a sibling primitive instead of
// generalising-too-early: the two counters accumulate from different
// sources (building chimes vs boycott events), serialize to different
// wire fields, and the future Concord registry (difficulty-scaled
// tension costs, per-faction decay) will diverge from the chime
// registry's shape.
//
// Per CLAUDE.md: "Ship the entity's primitive; leave iteration /
// scheduling to the task that owns the collection." The meter ships
// `raise` + threshold crossing + event queue. It does NOT wire a
// `TurnManager` hook — the orchestrator decides when tension rises
// (per refused turn, per Tidewater Party trigger, per colony
// population review).

import { CONCORD_TENSION_THRESHOLDS } from './concord-registry.js';

export interface ConcordUltimatumEvent {
  readonly threshold: number;
}

export interface ConcordTensionMeterJSON {
  readonly tension: number;
  readonly thresholds: readonly number[];
  readonly crossed: readonly number[];
  readonly pending: readonly ConcordUltimatumEvent[];
  // Permanent accumulator of Concord "ire" — every Tidewater Party
  // bumps it and it is never spent. Drives post-MVP difficulty knobs
  // (Concord campaign cadence, encounter table weighting); the meter
  // just stores the count. Optional for save-format back-compat:
  // pre-TASK-069 saves omit it and `fromJSON` defaults to 0.
  readonly ire?: number;
  // Turns remaining in the current Tidewater Party reprieve. Zero (or
  // omitted) means tension accumulates normally; positive means
  // `raise(amount)` drops the raise on the floor. Orchestrator calls
  // `tickFreeze()` once per turn to decrement.
  readonly freezeTurnsRemaining?: number;
}

export interface ConcordTensionMeterInit {
  readonly tension?: number;
  readonly thresholds?: readonly number[];
  readonly crossed?: readonly number[];
  readonly pending?: readonly ConcordUltimatumEvent[];
  readonly ire?: number;
  readonly freezeTurnsRemaining?: number;
}

export interface TidewaterPartyParams {
  // Turns the tension meter stays pinned at 0 after the dump — reprieve window.
  readonly freezeTurns: number;
  // Amount the permanent `ire` counter rises by as the long-term cost of the reprieve.
  readonly irePenalty: number;
}

export class ConcordTensionMeter {
  private _tension: number;
  private readonly _thresholds: readonly number[];
  private readonly _crossed: Set<number>;
  private readonly _pending: ConcordUltimatumEvent[];
  private _ire: number;
  private _freezeTurnsRemaining: number;

  constructor(init: ConcordTensionMeterInit = {}) {
    const tension = init.tension ?? 0;
    if (!Number.isFinite(tension) || tension < 0) {
      throw new RangeError(
        `ConcordTensionMeter tension must be a non-negative finite number (got ${tension})`,
      );
    }
    if (!Number.isInteger(tension)) {
      throw new RangeError(`ConcordTensionMeter tension must be an integer (got ${tension})`);
    }
    const ire = init.ire ?? 0;
    assertNonNegativeInteger('ire', ire);
    const freezeTurnsRemaining = init.freezeTurnsRemaining ?? 0;
    assertNonNegativeInteger('freezeTurnsRemaining', freezeTurnsRemaining);
    const thresholds = init.thresholds ?? CONCORD_TENSION_THRESHOLDS;
    validateThresholds(thresholds);
    this._thresholds = [...thresholds];
    this._tension = tension;
    this._ire = ire;
    this._freezeTurnsRemaining = freezeTurnsRemaining;
    this._crossed = new Set();
    if (init.crossed !== undefined) {
      if (!Array.isArray(init.crossed)) {
        throw new TypeError('ConcordTensionMeter init.crossed must be an array');
      }
      for (const t of init.crossed) {
        if (!this._thresholds.includes(t)) {
          throw new RangeError(`ConcordTensionMeter init.crossed contains unknown threshold ${t}`);
        }
        this._crossed.add(t);
      }
    }
    this._pending = [];
    if (init.pending !== undefined) {
      if (!Array.isArray(init.pending)) {
        throw new TypeError('ConcordTensionMeter init.pending must be an array');
      }
      for (const ev of init.pending) {
        if (ev === null || typeof ev !== 'object') {
          throw new TypeError('ConcordTensionMeter init.pending entry must be an object');
        }
        if (!this._thresholds.includes(ev.threshold)) {
          throw new RangeError(
            `ConcordTensionMeter init.pending contains unknown threshold ${ev.threshold}`,
          );
        }
        this._pending.push({ threshold: ev.threshold });
      }
    }
  }

  get tension(): number {
    return this._tension;
  }

  get thresholds(): readonly number[] {
    return this._thresholds;
  }

  // Sorted ascending — matches the chimes ledger's contract.
  get crossedThresholds(): readonly number[] {
    return [...this._crossed].sort((a, b) => a - b);
  }

  get pendingEvents(): readonly ConcordUltimatumEvent[] {
    return this._pending.map((ev) => ({ threshold: ev.threshold }));
  }

  hasPendingEvents(): boolean {
    return this._pending.length > 0;
  }

  get ire(): number {
    return this._ire;
  }

  get freezeTurnsRemaining(): number {
    return this._freezeTurnsRemaining;
  }

  get isTensionFrozen(): boolean {
    return this._freezeTurnsRemaining > 0;
  }

  // Raise tension by `amount` (typically from a refused-tithe turn),
  // detect newly-crossed thresholds, enqueue one event per crossing
  // in ascending order, and return the freshly-enqueued events for
  // immediate observation. Callers may ignore the return value and
  // walk `pendingEvents` instead — both views agree.
  raise(amount: number): readonly ConcordUltimatumEvent[] {
    if (!Number.isFinite(amount)) {
      throw new RangeError(`ConcordTensionMeter.raise amount must be finite (got ${amount})`);
    }
    if (!Number.isInteger(amount)) {
      throw new RangeError(`ConcordTensionMeter.raise amount must be an integer (got ${amount})`);
    }
    if (amount < 0) {
      throw new RangeError(`ConcordTensionMeter.raise amount must be non-negative (got ${amount})`);
    }
    if (amount === 0) return [];
    // During the Tidewater Party reprieve tension cannot rise — the
    // player has paid the cargo + ire cost in exchange for a flat
    // window of zero tension. Raises that arrive inside the window are
    // dropped rather than deferred: deferring would let the tension
    // spike the turn the freeze ends, defeating the whole point of
    // the reprieve. The ire penalty accounts for the lost raises.
    if (this._freezeTurnsRemaining > 0) return [];
    this._tension += amount;
    const newlyCrossed: ConcordUltimatumEvent[] = [];
    for (const threshold of this._thresholds) {
      if (this._crossed.has(threshold)) continue;
      if (this._tension < threshold) break;
      this._crossed.add(threshold);
      const event: ConcordUltimatumEvent = { threshold };
      this._pending.push(event);
      newlyCrossed.push(event);
    }
    return newlyCrossed;
  }

  // FIFO drain of the next queued ultimatum. Matches the
  // `ChimesLedger.consumeNextEvent` contract so a single UI scheduler
  // can pop from either queue with the same code path.
  consumeNextEvent(): ConcordUltimatumEvent | undefined {
    return this._pending.shift();
  }

  // Apply a Tidewater Party dump: clamp tension to 0, install an
  // M-turn reprieve window during which `raise` is a no-op, and bump
  // the permanent `ire` counter by the configured penalty. Crossed
  // thresholds are intentionally preserved — the Concord remembers
  // prior ultimatums regardless of the theatrical dump. Consumers of
  // this method (the web store's `confirmTidewaterParty` is the only
  // caller today) must deduct the dumped cargo externally; the meter
  // only owns the tension + ire axes.
  triggerTidewaterParty(params: TidewaterPartyParams): void {
    assertNonNegativeInteger('triggerTidewaterParty.freezeTurns', params.freezeTurns);
    assertNonNegativeInteger('triggerTidewaterParty.irePenalty', params.irePenalty);
    this._tension = 0;
    this._freezeTurnsRemaining = params.freezeTurns;
    this._ire += params.irePenalty;
  }

  // Decrement the freeze window by one. The orchestrator that drives
  // the turn clock calls this once per full turn cycle for each
  // faction's meter; no-op while already unfrozen so the caller does
  // not have to branch on `isTensionFrozen` first.
  tickFreeze(): void {
    if (this._freezeTurnsRemaining > 0) this._freezeTurnsRemaining -= 1;
  }

  toJSON(): ConcordTensionMeterJSON {
    return {
      tension: this._tension,
      thresholds: [...this._thresholds],
      crossed: [...this._crossed].sort((a, b) => a - b),
      pending: this._pending.map((ev) => ({ threshold: ev.threshold })),
      ire: this._ire,
      freezeTurnsRemaining: this._freezeTurnsRemaining,
    };
  }

  static fromJSON(data: ConcordTensionMeterJSON): ConcordTensionMeter {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('ConcordTensionMeterJSON must be an object');
    }
    if (!Array.isArray(data.thresholds)) {
      throw new TypeError('ConcordTensionMeterJSON.thresholds must be an array');
    }
    if (!Array.isArray(data.crossed)) {
      throw new TypeError('ConcordTensionMeterJSON.crossed must be an array');
    }
    if (!Array.isArray(data.pending)) {
      throw new TypeError('ConcordTensionMeterJSON.pending must be an array');
    }
    const init: { -readonly [K in keyof ConcordTensionMeterInit]: ConcordTensionMeterInit[K] } = {
      tension: data.tension,
      thresholds: data.thresholds,
      crossed: data.crossed,
      pending: data.pending,
    };
    if (data.ire !== undefined) init.ire = data.ire;
    if (data.freezeTurnsRemaining !== undefined)
      init.freezeTurnsRemaining = data.freezeTurnsRemaining;
    return new ConcordTensionMeter(init);
  }
}

function assertNonNegativeInteger(field: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`ConcordTensionMeter ${field} must be finite (got ${value})`);
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(`ConcordTensionMeter ${field} must be an integer (got ${value})`);
  }
  if (value < 0) {
    throw new RangeError(`ConcordTensionMeter ${field} must be non-negative (got ${value})`);
  }
}

function validateThresholds(thresholds: readonly number[]): void {
  if (!Array.isArray(thresholds)) {
    throw new TypeError('ConcordTensionMeter thresholds must be an array');
  }
  if (thresholds.length === 0) {
    throw new RangeError('ConcordTensionMeter thresholds must be non-empty');
  }
  let prev = -Infinity;
  for (const t of thresholds) {
    if (!Number.isFinite(t) || !Number.isInteger(t) || t <= 0) {
      throw new RangeError(
        `ConcordTensionMeter threshold must be a positive integer (got ${String(t)})`,
      );
    }
    if (t <= prev) {
      throw new RangeError(
        `ConcordTensionMeter thresholds must be strictly ascending (got ${t} after ${prev})`,
      );
    }
    prev = t;
  }
}
