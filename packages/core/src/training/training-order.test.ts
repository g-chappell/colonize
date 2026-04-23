import { describe, it, expect } from 'vitest';
import { ProfessionType } from '../profession/profession-type.js';
import { TrainingOrder, type TrainingOrderJSON } from './training-order.js';

describe('TrainingOrder construction', () => {
  it('accepts a valid (crewId, target, turnsRemaining) triple', () => {
    const order = new TrainingOrder({
      crewId: 'crew-1',
      target: ProfessionType.Shipwright,
      turnsRemaining: 3,
    });
    expect(order.crewId).toBe('crew-1');
    expect(order.target).toBe(ProfessionType.Shipwright);
    expect(order.turnsRemaining).toBe(3);
    expect(order.isComplete).toBe(false);
  });

  it('rejects an empty crewId', () => {
    expect(
      () =>
        new TrainingOrder({
          crewId: '',
          target: ProfessionType.Shipwright,
          turnsRemaining: 3,
        }),
    ).toThrow(TypeError);
  });

  it('rejects a non-string crewId', () => {
    expect(
      () =>
        new TrainingOrder({
          // @ts-expect-error runtime guard
          crewId: 42,
          target: ProfessionType.Shipwright,
          turnsRemaining: 3,
        }),
    ).toThrow(TypeError);
  });

  it('rejects an unknown profession target', () => {
    expect(
      () =>
        new TrainingOrder({
          crewId: 'crew-1',
          target: 'stowaway' as ProfessionType,
          turnsRemaining: 3,
        }),
    ).toThrow(TypeError);
  });

  it('rejects Deckhand as a target (baseline is not a training outcome)', () => {
    expect(
      () =>
        new TrainingOrder({
          crewId: 'crew-1',
          target: ProfessionType.Deckhand,
          turnsRemaining: 3,
        }),
    ).toThrow(RangeError);
  });

  it('rejects a negative or non-integer turnsRemaining', () => {
    expect(
      () =>
        new TrainingOrder({
          crewId: 'crew-1',
          target: ProfessionType.Shipwright,
          turnsRemaining: -1,
        }),
    ).toThrow(RangeError);
    expect(
      () =>
        new TrainingOrder({
          crewId: 'crew-1',
          target: ProfessionType.Shipwright,
          turnsRemaining: 1.5,
        }),
    ).toThrow(RangeError);
    expect(
      () =>
        new TrainingOrder({
          crewId: 'crew-1',
          target: ProfessionType.Shipwright,
          turnsRemaining: Number.POSITIVE_INFINITY,
        }),
    ).toThrow(RangeError);
  });

  it('accepts turnsRemaining: 0 (already-complete order)', () => {
    const order = new TrainingOrder({
      crewId: 'crew-1',
      target: ProfessionType.Scholar,
      turnsRemaining: 0,
    });
    expect(order.isComplete).toBe(true);
  });
});

describe('TrainingOrder.tick', () => {
  it('decrements turnsRemaining by one per call', () => {
    const order = new TrainingOrder({
      crewId: 'crew-1',
      target: ProfessionType.Gunner,
      turnsRemaining: 2,
    });
    order.tick();
    expect(order.turnsRemaining).toBe(1);
    order.tick();
    expect(order.turnsRemaining).toBe(0);
    expect(order.isComplete).toBe(true);
  });

  it('throws when already complete (forces orchestrator to apply outcome first)', () => {
    const order = TrainingOrder.instant('crew-1', ProfessionType.Scholar);
    expect(order.isComplete).toBe(true);
    expect(() => order.tick()).toThrow();
  });
});

describe('TrainingOrder.instant (captured-crew 1-shot conversion)', () => {
  it('returns an already-complete order', () => {
    const order = TrainingOrder.instant('crew-7', ProfessionType.Loremaster);
    expect(order.crewId).toBe('crew-7');
    expect(order.target).toBe(ProfessionType.Loremaster);
    expect(order.turnsRemaining).toBe(0);
    expect(order.isComplete).toBe(true);
  });

  it('rejects Deckhand for the instant path too', () => {
    expect(() => TrainingOrder.instant('crew-7', ProfessionType.Deckhand)).toThrow(RangeError);
  });
});

describe('TrainingOrder toJSON / fromJSON', () => {
  it('round-trips a fresh order', () => {
    const order = new TrainingOrder({
      crewId: 'crew-1',
      target: ProfessionType.Cartographer,
      turnsRemaining: 3,
    });
    const json = order.toJSON();
    expect(json).toEqual({
      crewId: 'crew-1',
      target: 'cartographer',
      turnsRemaining: 3,
    });
    const restored = TrainingOrder.fromJSON(json);
    expect(restored.crewId).toBe(order.crewId);
    expect(restored.target).toBe(order.target);
    expect(restored.turnsRemaining).toBe(order.turnsRemaining);
  });

  it('round-trips after a tick (mid-training save)', () => {
    const order = new TrainingOrder({
      crewId: 'crew-1',
      target: ProfessionType.Quartermaster,
      turnsRemaining: 5,
    });
    order.tick();
    order.tick();
    const restored = TrainingOrder.fromJSON(order.toJSON());
    expect(restored.turnsRemaining).toBe(3);
  });

  it('fromJSON validates the same invariants as the constructor', () => {
    expect(() =>
      TrainingOrder.fromJSON({
        crewId: '',
        target: 'scholar',
        turnsRemaining: 1,
      } as TrainingOrderJSON),
    ).toThrow(TypeError);
    expect(() =>
      TrainingOrder.fromJSON({
        crewId: 'crew-1',
        target: 'deckhand',
        turnsRemaining: 1,
      } as TrainingOrderJSON),
    ).toThrow(RangeError);
    expect(() =>
      TrainingOrder.fromJSON({
        crewId: 'crew-1',
        target: 'scholar',
        turnsRemaining: -3,
      } as TrainingOrderJSON),
    ).toThrow(RangeError);
  });
});
