// ChimesLedger — per-faction accumulator for Liberty Chimes and its
// Council-convocation event queue.
//
// One ledger per faction. The owner of the faction collection wraps a
// `Map<FactionId, ChimesLedger>` and calls `accumulate(rate)` during
// each per-turn production pass; the ledger records the threshold
// crossings and buffers them as deferred Council events so the UI
// scheduler can pop them when the player is idle (out of combat, out
// of a colony screen, out of a rumour resolution). "Deferred" here
// means FIFO: events cross in ascending-threshold order and drain in
// the same order regardless of how far the counter ran past the
// highest threshold in a single tick.
//
// Per CLAUDE.md: "Ship the entity's primitive; leave iteration /
// scheduling to the task that owns the collection." This module ships
// the ledger, threshold-crossing detection, and the deferred-event
// queue. It does NOT wire a `TurnManager` hook — the orchestrator
// that owns the colony collection calls `accumulate` from whichever
// phase best matches its turn-structure decisions (Start, End,
// WorldEvents — see TurnManager).
//
// The thresholds are a scalar seam per CLAUDE.md's "Scalar seams for
// pre-registry axis values": the default comes from
// `LIBERTY_CHIMES_THRESHOLDS`, but the constructor accepts an
// override so the Archive-Charter task that lands in TASK-066 can
// pass faction-specific ladders (or test-specific short ladders)
// without touching the primitive.

import { LIBERTY_CHIMES_THRESHOLDS } from './chimes-registry.js';

export interface CouncilEvent {
  readonly threshold: number;
}

export interface ChimesLedgerJSON {
  readonly chimes: number;
  readonly thresholds: readonly number[];
  readonly crossed: readonly number[];
  readonly pending: readonly CouncilEvent[];
}

export interface ChimesLedgerInit {
  readonly chimes?: number;
  readonly thresholds?: readonly number[];
  readonly crossed?: readonly number[];
  readonly pending?: readonly CouncilEvent[];
}

export class ChimesLedger {
  private _chimes: number;
  private readonly _thresholds: readonly number[];
  private readonly _crossed: Set<number>;
  private readonly _pending: CouncilEvent[];

  constructor(init: ChimesLedgerInit = {}) {
    const chimes = init.chimes ?? 0;
    if (!Number.isFinite(chimes) || chimes < 0) {
      throw new RangeError(
        `ChimesLedger chimes must be a non-negative finite number (got ${chimes})`,
      );
    }
    if (!Number.isInteger(chimes)) {
      throw new RangeError(`ChimesLedger chimes must be an integer (got ${chimes})`);
    }
    const thresholds = init.thresholds ?? LIBERTY_CHIMES_THRESHOLDS;
    validateThresholds(thresholds);
    this._thresholds = [...thresholds];
    this._chimes = chimes;
    this._crossed = new Set();
    if (init.crossed !== undefined) {
      if (!Array.isArray(init.crossed)) {
        throw new TypeError('ChimesLedger init.crossed must be an array');
      }
      for (const t of init.crossed) {
        if (!this._thresholds.includes(t)) {
          throw new RangeError(`ChimesLedger init.crossed contains unknown threshold ${t}`);
        }
        this._crossed.add(t);
      }
    }
    this._pending = [];
    if (init.pending !== undefined) {
      if (!Array.isArray(init.pending)) {
        throw new TypeError('ChimesLedger init.pending must be an array');
      }
      for (const ev of init.pending) {
        if (ev === null || typeof ev !== 'object') {
          throw new TypeError('ChimesLedger init.pending entry must be an object');
        }
        if (!this._thresholds.includes(ev.threshold)) {
          throw new RangeError(
            `ChimesLedger init.pending contains unknown threshold ${ev.threshold}`,
          );
        }
        this._pending.push({ threshold: ev.threshold });
      }
    }
  }

  get chimes(): number {
    return this._chimes;
  }

  get thresholds(): readonly number[] {
    return this._thresholds;
  }

  // Sorted ascending — `_crossed` is a Set whose insertion order is the
  // order thresholds were crossed, but threshold values are naturally
  // ordered and both UI and save-format readers want ascending.
  get crossedThresholds(): readonly number[] {
    return [...this._crossed].sort((a, b) => a - b);
  }

  // FIFO snapshot of deferred Council events. The orchestrator reads
  // this to decide whether to surface a Council UI; the list persists
  // across turns until each event is consumed.
  get pendingEvents(): readonly CouncilEvent[] {
    return this._pending.map((ev) => ({ threshold: ev.threshold }));
  }

  hasPendingEvents(): boolean {
    return this._pending.length > 0;
  }

  // Accumulate `amount` chimes, detect any newly-crossed thresholds,
  // enqueue one CouncilEvent per crossing (ascending-threshold order),
  // and return the freshly-enqueued events for immediate observation.
  // The scheduler MAY ignore the returned array and walk `pendingEvents`
  // instead — both are safe because the two views agree.
  accumulate(amount: number): readonly CouncilEvent[] {
    if (!Number.isFinite(amount)) {
      throw new RangeError(`ChimesLedger.accumulate amount must be finite (got ${amount})`);
    }
    if (!Number.isInteger(amount)) {
      throw new RangeError(`ChimesLedger.accumulate amount must be an integer (got ${amount})`);
    }
    if (amount < 0) {
      throw new RangeError(`ChimesLedger.accumulate amount must be non-negative (got ${amount})`);
    }
    if (amount === 0) return [];
    const previous = this._chimes;
    this._chimes = previous + amount;
    const newlyCrossed: CouncilEvent[] = [];
    for (const threshold of this._thresholds) {
      if (this._crossed.has(threshold)) continue;
      if (this._chimes < threshold) break;
      this._crossed.add(threshold);
      const event: CouncilEvent = { threshold };
      this._pending.push(event);
      newlyCrossed.push(event);
    }
    return newlyCrossed;
  }

  // FIFO pop of the next deferred event. Returns `undefined` when the
  // queue is empty — callers pattern this as a drain loop.
  consumeNextEvent(): CouncilEvent | undefined {
    return this._pending.shift();
  }

  toJSON(): ChimesLedgerJSON {
    return {
      chimes: this._chimes,
      thresholds: [...this._thresholds],
      crossed: [...this._crossed].sort((a, b) => a - b),
      pending: this._pending.map((ev) => ({ threshold: ev.threshold })),
    };
  }

  static fromJSON(data: ChimesLedgerJSON): ChimesLedger {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('ChimesLedgerJSON must be an object');
    }
    if (!Array.isArray(data.thresholds)) {
      throw new TypeError('ChimesLedgerJSON.thresholds must be an array');
    }
    if (!Array.isArray(data.crossed)) {
      throw new TypeError('ChimesLedgerJSON.crossed must be an array');
    }
    if (!Array.isArray(data.pending)) {
      throw new TypeError('ChimesLedgerJSON.pending must be an array');
    }
    return new ChimesLedger({
      chimes: data.chimes,
      thresholds: data.thresholds,
      crossed: data.crossed,
      pending: data.pending,
    });
  }
}

function validateThresholds(thresholds: readonly number[]): void {
  if (!Array.isArray(thresholds)) {
    throw new TypeError('ChimesLedger thresholds must be an array');
  }
  if (thresholds.length === 0) {
    throw new RangeError('ChimesLedger thresholds must be non-empty');
  }
  let prev = -Infinity;
  for (const t of thresholds) {
    if (!Number.isFinite(t) || !Number.isInteger(t) || t <= 0) {
      throw new RangeError(`ChimesLedger threshold must be a positive integer (got ${String(t)})`);
    }
    if (t <= prev) {
      throw new RangeError(
        `ChimesLedger thresholds must be strictly ascending (got ${t} after ${prev})`,
      );
    }
    prev = t;
  }
}
