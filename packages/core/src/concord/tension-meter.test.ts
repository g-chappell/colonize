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
    expect(meter.pendingEvents).toEqual([
      { threshold: 10 },
      { threshold: 20 },
      { threshold: 40 },
    ]);
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

describe('ConcordTensionMeter save-format round-trip', () => {
  it('toJSON captures tension, thresholds, crossed (sorted asc), pending (FIFO order)', () => {
    const meter = new ConcordTensionMeter({ thresholds: [10, 25, 60] });
    meter.raise(30);
    const json = meter.toJSON();
    expect(json).toEqual({
      tension: 30,
      thresholds: [10, 25, 60],
      crossed: [10, 25],
      pending: [{ threshold: 10 }, { threshold: 25 }],
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
    expect(() =>
      ConcordTensionMeter.fromJSON(null as unknown as ConcordTensionMeterJSON),
    ).toThrow(TypeError);
  });
});
