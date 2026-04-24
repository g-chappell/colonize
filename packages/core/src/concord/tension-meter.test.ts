import { describe, it, expect } from 'vitest';
import {
  ConcordTensionMeter,
  type ConcordTensionMeterJSON,
  type ConcordUltimatumEvent,
} from './tension-meter.js';
import { CONCORD_TENSION_THRESHOLDS } from './concord-registry.js';

describe('ConcordTensionMeter construction', () => {
  it('defaults tension to 0 and no pending / crossed entries', () => {
    const meter = new ConcordTensionMeter();
    expect(meter.tension).toBe(0);
    expect(meter.crossedThresholds).toEqual([]);
    expect(meter.pendingEvents).toEqual([]);
    expect(meter.hasPendingEvents()).toBe(false);
    expect(meter.thresholds).toEqual(CONCORD_TENSION_THRESHOLDS);
  });

  it('accepts an initial tension below any threshold', () => {
    const meter = new ConcordTensionMeter({ tension: 10 });
    expect(meter.tension).toBe(10);
    expect(meter.crossedThresholds).toEqual([]);
    expect(meter.pendingEvents).toEqual([]);
  });

  it('accepts an override threshold ladder (scalar seam for test / future registry)', () => {
    const meter = new ConcordTensionMeter({ thresholds: [5, 15, 40] });
    expect(meter.thresholds).toEqual([5, 15, 40]);
  });

  it('rejects negative, non-finite, or non-integer tension values', () => {
    expect(() => new ConcordTensionMeter({ tension: -1 })).toThrow(RangeError);
    expect(() => new ConcordTensionMeter({ tension: Number.NaN })).toThrow(RangeError);
    expect(() => new ConcordTensionMeter({ tension: 1.5 })).toThrow(RangeError);
  });

  it('rejects empty or mis-ordered threshold ladders', () => {
    expect(() => new ConcordTensionMeter({ thresholds: [] })).toThrow(RangeError);
    expect(() => new ConcordTensionMeter({ thresholds: [50, 40] })).toThrow(RangeError);
    expect(() => new ConcordTensionMeter({ thresholds: [0] })).toThrow(RangeError);
    expect(() => new ConcordTensionMeter({ thresholds: [1.5] })).toThrow(RangeError);
  });

  it('rejects crossed entries that are not in the threshold ladder', () => {
    expect(() => new ConcordTensionMeter({ thresholds: [25, 75], crossed: [50] })).toThrow(
      RangeError,
    );
  });

  it('rejects pending events whose threshold is not in the ladder', () => {
    expect(
      () => new ConcordTensionMeter({ thresholds: [25], pending: [{ threshold: 17 }] }),
    ).toThrow(RangeError);
  });
});

describe('ConcordTensionMeter.raise', () => {
  it('increments the tension value', () => {
    const meter = new ConcordTensionMeter();
    meter.raise(7);
    meter.raise(3);
    expect(meter.tension).toBe(10);
  });

  it('is a no-op when amount is 0', () => {
    const meter = new ConcordTensionMeter({ tension: 10 });
    const events = meter.raise(0);
    expect(events).toEqual([]);
    expect(meter.tension).toBe(10);
  });

  it('rejects negative, non-finite, or non-integer amounts', () => {
    const meter = new ConcordTensionMeter();
    expect(() => meter.raise(-1)).toThrow(RangeError);
    expect(() => meter.raise(Number.NaN)).toThrow(RangeError);
    expect(() => meter.raise(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => meter.raise(2.5)).toThrow(RangeError);
  });

  it('fires no event when tension stays below the first threshold', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25] });
    expect(meter.raise(24)).toEqual([]);
    expect(meter.crossedThresholds).toEqual([]);
    expect(meter.pendingEvents).toEqual([]);
  });

  it('fires exactly one event on a single-threshold cross', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25, 75] });
    const events = meter.raise(30);
    expect(events).toEqual([{ threshold: 25 }]);
    expect(meter.crossedThresholds).toEqual([25]);
    expect(meter.pendingEvents).toEqual([{ threshold: 25 }]);
  });

  it('fires events exactly at the threshold value (>= semantics)', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25] });
    expect(meter.raise(25)).toEqual([{ threshold: 25 }]);
  });

  it('fires multiple events in ascending order when a single raise overshoots several thresholds', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25, 50, 75, 100] });
    const events = meter.raise(110);
    expect(events).toEqual([
      { threshold: 25 },
      { threshold: 50 },
      { threshold: 75 },
      { threshold: 100 },
    ]);
    expect(meter.crossedThresholds).toEqual([25, 50, 75, 100]);
  });

  it('does not re-fire a previously-crossed threshold', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25] });
    expect(meter.raise(30)).toEqual([{ threshold: 25 }]);
    expect(meter.raise(50)).toEqual([]);
    expect(meter.crossedThresholds).toEqual([25]);
    expect(meter.pendingEvents).toEqual([{ threshold: 25 }]);
  });

  it('enqueues pending events in FIFO order across multiple raises', () => {
    const meter = new ConcordTensionMeter({ thresholds: [10, 20, 40] });
    meter.raise(10);
    meter.raise(10);
    meter.raise(20);
    expect(meter.pendingEvents).toEqual([{ threshold: 10 }, { threshold: 20 }, { threshold: 40 }]);
  });
});

describe('ConcordTensionMeter.consumeNextEvent', () => {
  it('returns undefined when the queue is empty', () => {
    const meter = new ConcordTensionMeter();
    expect(meter.consumeNextEvent()).toBeUndefined();
  });

  it('drains events in FIFO order', () => {
    const meter = new ConcordTensionMeter({ thresholds: [10, 20, 30] });
    meter.raise(30);
    expect(meter.consumeNextEvent()).toEqual({ threshold: 10 });
    expect(meter.consumeNextEvent()).toEqual({ threshold: 20 });
    expect(meter.consumeNextEvent()).toEqual({ threshold: 30 });
    expect(meter.consumeNextEvent()).toBeUndefined();
    expect(meter.hasPendingEvents()).toBe(false);
  });

  it('leaves crossedThresholds intact — consumption is a scheduler concern, not a threshold reset', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25] });
    meter.raise(25);
    meter.consumeNextEvent();
    expect(meter.crossedThresholds).toEqual([25]);
    // further raises do not re-fire
    expect(meter.raise(50)).toEqual([]);
  });

  it('defers across turns — queued events survive multiple raise() calls before drain', () => {
    const meter = new ConcordTensionMeter({ thresholds: [10, 20] });
    meter.raise(10);
    meter.raise(5);
    meter.raise(10);
    expect(meter.pendingEvents).toEqual([{ threshold: 10 }, { threshold: 20 }]);
    const first = meter.consumeNextEvent();
    expect(first).toEqual({ threshold: 10 });
    expect(meter.pendingEvents).toEqual([{ threshold: 20 }]);
  });
});

describe('ConcordTensionMeter pendingEvents snapshot', () => {
  it('returns a copy — mutating the returned array does not affect the meter', () => {
    const meter = new ConcordTensionMeter({ thresholds: [10] });
    meter.raise(10);
    const snapshot = meter.pendingEvents as ConcordUltimatumEvent[];
    snapshot.pop();
    expect(meter.pendingEvents).toEqual([{ threshold: 10 }]);
  });
});

describe('ConcordTensionMeter.triggerTidewaterParty', () => {
  it('clamps tension to 0, installs the freeze window, and bumps ire', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25, 50], tension: 40 });
    meter.triggerTidewaterParty({ freezeTurns: 6, irePenalty: 15 });
    expect(meter.tension).toBe(0);
    expect(meter.freezeTurnsRemaining).toBe(6);
    expect(meter.isTensionFrozen).toBe(true);
    expect(meter.ire).toBe(15);
  });

  it('preserves already-crossed thresholds — the Concord remembers', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25, 50] });
    meter.raise(30);
    expect(meter.crossedThresholds).toEqual([25]);
    meter.triggerTidewaterParty({ freezeTurns: 4, irePenalty: 10 });
    expect(meter.crossedThresholds).toEqual([25]);
    // ...and does not re-fire the threshold once the freeze ends.
    meter.tickFreeze();
    meter.tickFreeze();
    meter.tickFreeze();
    meter.tickFreeze();
    expect(meter.raise(30)).toEqual([]);
  });

  it('accumulates ire across multiple dumps', () => {
    const meter = new ConcordTensionMeter();
    meter.triggerTidewaterParty({ freezeTurns: 4, irePenalty: 10 });
    meter.triggerTidewaterParty({ freezeTurns: 2, irePenalty: 7 });
    expect(meter.ire).toBe(17);
  });

  it('a second dump overwrites the freeze window (does not compound)', () => {
    const meter = new ConcordTensionMeter();
    meter.triggerTidewaterParty({ freezeTurns: 8, irePenalty: 10 });
    meter.triggerTidewaterParty({ freezeTurns: 3, irePenalty: 10 });
    expect(meter.freezeTurnsRemaining).toBe(3);
  });

  it('rejects negative / non-integer freezeTurns and irePenalty', () => {
    const meter = new ConcordTensionMeter();
    expect(() => meter.triggerTidewaterParty({ freezeTurns: -1, irePenalty: 5 })).toThrow(
      RangeError,
    );
    expect(() => meter.triggerTidewaterParty({ freezeTurns: 1.5, irePenalty: 5 })).toThrow(
      RangeError,
    );
    expect(() => meter.triggerTidewaterParty({ freezeTurns: 5, irePenalty: -3 })).toThrow(
      RangeError,
    );
    expect(() => meter.triggerTidewaterParty({ freezeTurns: 5, irePenalty: Number.NaN })).toThrow(
      RangeError,
    );
  });

  it('freezeTurns of 0 is a legal no-reprieve dump (ire still rises)', () => {
    const meter = new ConcordTensionMeter({ tension: 20 });
    meter.triggerTidewaterParty({ freezeTurns: 0, irePenalty: 5 });
    expect(meter.tension).toBe(0);
    expect(meter.freezeTurnsRemaining).toBe(0);
    expect(meter.isTensionFrozen).toBe(false);
    expect(meter.ire).toBe(5);
    // raise still works immediately
    expect(meter.raise(25)).toEqual([{ threshold: 25 }]);
  });
});

describe('ConcordTensionMeter freeze + raise interaction', () => {
  it('raise is a no-op while the freeze window is active', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25, 50] });
    meter.triggerTidewaterParty({ freezeTurns: 3, irePenalty: 10 });
    const events = meter.raise(80);
    expect(events).toEqual([]);
    expect(meter.tension).toBe(0);
    expect(meter.crossedThresholds).toEqual([]);
    expect(meter.pendingEvents).toEqual([]);
  });

  it('raise resumes once the freeze window expires via tickFreeze', () => {
    const meter = new ConcordTensionMeter({ thresholds: [25] });
    meter.triggerTidewaterParty({ freezeTurns: 2, irePenalty: 10 });
    meter.tickFreeze();
    expect(meter.freezeTurnsRemaining).toBe(1);
    expect(meter.raise(30)).toEqual([]);
    meter.tickFreeze();
    expect(meter.freezeTurnsRemaining).toBe(0);
    expect(meter.isTensionFrozen).toBe(false);
    expect(meter.raise(30)).toEqual([{ threshold: 25 }]);
  });

  it('tickFreeze is a no-op while already unfrozen', () => {
    const meter = new ConcordTensionMeter();
    meter.tickFreeze();
    meter.tickFreeze();
    expect(meter.freezeTurnsRemaining).toBe(0);
  });
});

describe('ConcordTensionMeter save-format round-trip', () => {
  it('toJSON captures tension, thresholds, crossed (sorted asc), pending (FIFO order), ire, freezeTurnsRemaining', () => {
    const meter = new ConcordTensionMeter({ thresholds: [10, 25, 60] });
    meter.raise(30);
    const json = meter.toJSON();
    expect(json).toEqual({
      tension: 30,
      thresholds: [10, 25, 60],
      crossed: [10, 25],
      pending: [{ threshold: 10 }, { threshold: 25 }],
      ire: 0,
      freezeTurnsRemaining: 0,
    });
  });

  it('fromJSON restores the meter exactly', () => {
    const data: ConcordTensionMeterJSON = {
      tension: 60,
      thresholds: [25, 50, 75, 100],
      crossed: [25, 50],
      pending: [{ threshold: 25 }, { threshold: 50 }],
    };
    const meter = ConcordTensionMeter.fromJSON(data);
    expect(meter.tension).toBe(60);
    expect(meter.thresholds).toEqual([25, 50, 75, 100]);
    expect(meter.crossedThresholds).toEqual([25, 50]);
    expect(meter.pendingEvents).toEqual([{ threshold: 25 }, { threshold: 50 }]);
    // Back-compat: pre-TASK-069 saves omit the Tidewater fields; fromJSON defaults them to 0.
    expect(meter.ire).toBe(0);
    expect(meter.freezeTurnsRemaining).toBe(0);
  });

  it('fromJSON round-trips the Tidewater fields when present', () => {
    const data: ConcordTensionMeterJSON = {
      tension: 0,
      thresholds: [25, 50],
      crossed: [25],
      pending: [],
      ire: 22,
      freezeTurnsRemaining: 5,
    };
    const meter = ConcordTensionMeter.fromJSON(data);
    expect(meter.ire).toBe(22);
    expect(meter.freezeTurnsRemaining).toBe(5);
    expect(meter.isTensionFrozen).toBe(true);
    expect(meter.crossedThresholds).toEqual([25]);
  });

  it('round-trips cleanly through JSON.stringify / JSON.parse', () => {
    const meter = new ConcordTensionMeter();
    meter.raise(CONCORD_TENSION_THRESHOLDS[0]! + CONCORD_TENSION_THRESHOLDS[1]!);
    const wire = JSON.parse(JSON.stringify(meter.toJSON())) as ConcordTensionMeterJSON;
    const restored = ConcordTensionMeter.fromJSON(wire);
    expect(restored.toJSON()).toEqual(meter.toJSON());
  });

  it('emits identical JSON for two meters that reached the same state via different raise orders', () => {
    const a = new ConcordTensionMeter({ thresholds: [10, 20] });
    a.raise(5);
    a.raise(5);
    a.raise(10);
    const b = new ConcordTensionMeter({ thresholds: [10, 20] });
    b.raise(20);
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it('rejects non-object JSON payloads', () => {
    expect(() => ConcordTensionMeter.fromJSON(null as unknown as ConcordTensionMeterJSON)).toThrow(
      TypeError,
    );
  });
});
