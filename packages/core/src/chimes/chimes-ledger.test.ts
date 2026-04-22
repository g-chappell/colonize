import { describe, it, expect } from 'vitest';
import { ChimesLedger, type ChimesLedgerJSON, type CouncilEvent } from './chimes-ledger.js';
import { LIBERTY_CHIMES_THRESHOLDS } from './chimes-registry.js';

describe('ChimesLedger construction', () => {
  it('defaults chimes to 0 and no pending / crossed entries', () => {
    const led = new ChimesLedger();
    expect(led.chimes).toBe(0);
    expect(led.crossedThresholds).toEqual([]);
    expect(led.pendingEvents).toEqual([]);
    expect(led.hasPendingEvents()).toBe(false);
    expect(led.thresholds).toEqual(LIBERTY_CHIMES_THRESHOLDS);
  });

  it('accepts an initial chime count below any threshold', () => {
    const led = new ChimesLedger({ chimes: 10 });
    expect(led.chimes).toBe(10);
    expect(led.crossedThresholds).toEqual([]);
    expect(led.pendingEvents).toEqual([]);
  });

  it('accepts an override threshold ladder (scalar seam for test / future registry)', () => {
    const led = new ChimesLedger({ thresholds: [10, 25, 60] });
    expect(led.thresholds).toEqual([10, 25, 60]);
  });

  it('rejects negative, non-finite, or non-integer chime counts', () => {
    expect(() => new ChimesLedger({ chimes: -1 })).toThrow(RangeError);
    expect(() => new ChimesLedger({ chimes: Number.NaN })).toThrow(RangeError);
    expect(() => new ChimesLedger({ chimes: 1.5 })).toThrow(RangeError);
  });

  it('rejects empty or mis-ordered threshold ladders', () => {
    expect(() => new ChimesLedger({ thresholds: [] })).toThrow(RangeError);
    expect(() => new ChimesLedger({ thresholds: [50, 40] })).toThrow(RangeError);
    expect(() => new ChimesLedger({ thresholds: [0] })).toThrow(RangeError);
    expect(() => new ChimesLedger({ thresholds: [1.5] })).toThrow(RangeError);
  });

  it('rejects crossed entries that are not in the threshold ladder', () => {
    expect(() => new ChimesLedger({ thresholds: [50, 100], crossed: [75] })).toThrow(RangeError);
  });

  it('rejects pending events whose threshold is not in the ladder', () => {
    expect(() => new ChimesLedger({ thresholds: [50], pending: [{ threshold: 42 }] })).toThrow(
      RangeError,
    );
  });
});

describe('ChimesLedger.accumulate', () => {
  it('increments the chime count', () => {
    const led = new ChimesLedger();
    led.accumulate(8);
    led.accumulate(4);
    expect(led.chimes).toBe(12);
  });

  it('is a no-op when amount is 0', () => {
    const led = new ChimesLedger({ chimes: 10 });
    const events = led.accumulate(0);
    expect(events).toEqual([]);
    expect(led.chimes).toBe(10);
  });

  it('rejects negative, non-finite, or non-integer amounts', () => {
    const led = new ChimesLedger();
    expect(() => led.accumulate(-1)).toThrow(RangeError);
    expect(() => led.accumulate(Number.NaN)).toThrow(RangeError);
    expect(() => led.accumulate(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => led.accumulate(2.5)).toThrow(RangeError);
  });

  it('fires no event when total stays below the first threshold', () => {
    const led = new ChimesLedger({ thresholds: [50] });
    expect(led.accumulate(49)).toEqual([]);
    expect(led.crossedThresholds).toEqual([]);
    expect(led.pendingEvents).toEqual([]);
  });

  it('fires exactly one event on the single-threshold cross', () => {
    const led = new ChimesLedger({ thresholds: [50, 150] });
    const events = led.accumulate(60);
    expect(events).toEqual([{ threshold: 50 }]);
    expect(led.crossedThresholds).toEqual([50]);
    expect(led.pendingEvents).toEqual([{ threshold: 50 }]);
  });

  it('fires events exactly at the threshold value (>= semantics)', () => {
    const led = new ChimesLedger({ thresholds: [50] });
    const events = led.accumulate(50);
    expect(events).toEqual([{ threshold: 50 }]);
  });

  it('fires multiple events in ascending order when a single tick overshoots several thresholds', () => {
    const led = new ChimesLedger({ thresholds: [50, 150, 300] });
    const events = led.accumulate(400);
    expect(events).toEqual([{ threshold: 50 }, { threshold: 150 }, { threshold: 300 }]);
    expect(led.crossedThresholds).toEqual([50, 150, 300]);
  });

  it('does not re-fire a previously-crossed threshold', () => {
    const led = new ChimesLedger({ thresholds: [50] });
    expect(led.accumulate(60)).toEqual([{ threshold: 50 }]);
    expect(led.accumulate(100)).toEqual([]);
    expect(led.crossedThresholds).toEqual([50]);
    expect(led.pendingEvents).toEqual([{ threshold: 50 }]);
  });

  it('enqueues pending events in FIFO order across multiple ticks', () => {
    const led = new ChimesLedger({ thresholds: [10, 20, 40] });
    led.accumulate(10);
    led.accumulate(10);
    led.accumulate(20);
    expect(led.pendingEvents).toEqual([{ threshold: 10 }, { threshold: 20 }, { threshold: 40 }]);
  });
});

describe('ChimesLedger.consumeNextEvent', () => {
  it('returns undefined when the queue is empty', () => {
    const led = new ChimesLedger();
    expect(led.consumeNextEvent()).toBeUndefined();
  });

  it('drains events in FIFO order', () => {
    const led = new ChimesLedger({ thresholds: [10, 20, 30] });
    led.accumulate(30);
    expect(led.consumeNextEvent()).toEqual({ threshold: 10 });
    expect(led.consumeNextEvent()).toEqual({ threshold: 20 });
    expect(led.consumeNextEvent()).toEqual({ threshold: 30 });
    expect(led.consumeNextEvent()).toBeUndefined();
    expect(led.hasPendingEvents()).toBe(false);
  });

  it('leaves crossedThresholds intact — consumption is a scheduler concern, not a threshold reset', () => {
    const led = new ChimesLedger({ thresholds: [50] });
    led.accumulate(50);
    led.consumeNextEvent();
    expect(led.crossedThresholds).toEqual([50]);
    // further accumulation does not re-fire
    expect(led.accumulate(100)).toEqual([]);
  });

  it('defers across turns — queued events survive multiple accumulate() calls before drain', () => {
    const led = new ChimesLedger({ thresholds: [10, 20] });
    led.accumulate(10); // crosses 10
    led.accumulate(5); // no new crossing
    led.accumulate(10); // crosses 20 (now at 25)
    expect(led.pendingEvents).toEqual([{ threshold: 10 }, { threshold: 20 }]);
    const first = led.consumeNextEvent();
    expect(first).toEqual({ threshold: 10 });
    expect(led.pendingEvents).toEqual([{ threshold: 20 }]);
  });
});

describe('ChimesLedger pendingEvents snapshot', () => {
  it('returns a copy — mutating the returned array does not affect the ledger', () => {
    const led = new ChimesLedger({ thresholds: [10] });
    led.accumulate(10);
    const snapshot = led.pendingEvents as CouncilEvent[];
    snapshot.pop();
    expect(led.pendingEvents).toEqual([{ threshold: 10 }]);
  });
});

describe('ChimesLedger save-format round-trip', () => {
  it('toJSON captures chimes, thresholds, crossed (sorted asc), pending (FIFO order)', () => {
    const led = new ChimesLedger({ thresholds: [10, 25, 60] });
    led.accumulate(30);
    const json = led.toJSON();
    expect(json).toEqual({
      chimes: 30,
      thresholds: [10, 25, 60],
      crossed: [10, 25],
      pending: [{ threshold: 10 }, { threshold: 25 }],
    });
  });

  it('fromJSON restores the ledger exactly', () => {
    const data: ChimesLedgerJSON = {
      chimes: 200,
      thresholds: [50, 150, 300, 500],
      crossed: [50, 150],
      pending: [{ threshold: 50 }, { threshold: 150 }],
    };
    const led = ChimesLedger.fromJSON(data);
    expect(led.chimes).toBe(200);
    expect(led.thresholds).toEqual([50, 150, 300, 500]);
    expect(led.crossedThresholds).toEqual([50, 150]);
    expect(led.pendingEvents).toEqual([{ threshold: 50 }, { threshold: 150 }]);
  });

  it('round-trips cleanly through JSON.stringify / JSON.parse', () => {
    const led = new ChimesLedger();
    led.accumulate(LIBERTY_CHIMES_THRESHOLDS[0]! + LIBERTY_CHIMES_THRESHOLDS[1]!);
    const wire = JSON.parse(JSON.stringify(led.toJSON())) as ChimesLedgerJSON;
    const restored = ChimesLedger.fromJSON(wire);
    expect(restored.toJSON()).toEqual(led.toJSON());
  });

  it('emits identical JSON for two ledgers that reached the same state via different accumulation orders', () => {
    const a = new ChimesLedger({ thresholds: [10, 20] });
    a.accumulate(5);
    a.accumulate(5);
    a.accumulate(10);
    const b = new ChimesLedger({ thresholds: [10, 20] });
    b.accumulate(20);
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it('rejects non-object JSON payloads', () => {
    expect(() => ChimesLedger.fromJSON(null as unknown as ChimesLedgerJSON)).toThrow(TypeError);
  });
});
