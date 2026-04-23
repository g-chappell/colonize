import { describe, it, expect } from 'vitest';
import { AbyssalAction } from './abyssal-action.js';
import { AbyssalStance, DEFAULT_ABYSSAL_STANCE } from './stance.js';
import { AbyssalStanceTracker, type AbyssalStanceTrackerJSON } from './stance-tracker.js';

describe('AbyssalStanceTracker — defaults', () => {
  it('starts at DEFAULT_ABYSSAL_STANCE (Tolerate)', () => {
    const t = new AbyssalStanceTracker();
    expect(t.stance).toBe(DEFAULT_ABYSSAL_STANCE);
    expect(t.stance).toBe(AbyssalStance.Tolerate);
  });

  it('starts with all affinity counters at 0', () => {
    const t = new AbyssalStanceTracker();
    for (const s of Object.values(AbyssalStance)) {
      expect(t.affinity[s]).toBe(0);
    }
  });

  it('starts with empty history', () => {
    const t = new AbyssalStanceTracker();
    expect(t.history).toEqual([]);
  });
});

describe('AbyssalStanceTracker — applyAction', () => {
  it('returns the new dominant stance', () => {
    const t = new AbyssalStanceTracker();
    const after = t.applyAction(AbyssalAction.Plunder);
    expect(after).toBe(AbyssalStance.Plunder);
    expect(t.stance).toBe(AbyssalStance.Plunder);
  });

  it('increments the corresponding stance counter', () => {
    const t = new AbyssalStanceTracker();
    t.applyAction(AbyssalAction.Offering);
    t.applyAction(AbyssalAction.Offering);
    expect(t.affinity[AbyssalStance.Venerate]).toBe(2);
    expect(t.affinity[AbyssalStance.Plunder]).toBe(0);
  });

  it('records each action in history (FIFO)', () => {
    const t = new AbyssalStanceTracker();
    t.applyAction(AbyssalAction.Offering);
    t.applyAction(AbyssalAction.Plunder);
    t.applyAction(AbyssalAction.Patrol);
    expect(t.history).toEqual([
      AbyssalAction.Offering,
      AbyssalAction.Plunder,
      AbyssalAction.Patrol,
    ]);
  });

  it('shifts to the dominant stance once a counter overtakes the rest', () => {
    const t = new AbyssalStanceTracker();
    // Tie 1-1 with default Tolerate keeps incumbent (Tolerate).
    t.applyAction(AbyssalAction.PassThrough);
    t.applyAction(AbyssalAction.Plunder);
    expect(t.stance).toBe(AbyssalStance.Tolerate);
    // Plunder overtakes.
    t.applyAction(AbyssalAction.Plunder);
    expect(t.stance).toBe(AbyssalStance.Plunder);
  });

  it('keeps the incumbent stance when multiple counters tie at the top', () => {
    const t = new AbyssalStanceTracker();
    t.applyAction(AbyssalAction.Offering);
    expect(t.stance).toBe(AbyssalStance.Venerate);
    // Plunder ties Venerate at 1-1; incumbent (Venerate) stays.
    t.applyAction(AbyssalAction.Plunder);
    expect(t.stance).toBe(AbyssalStance.Venerate);
    // Plunder takes the lead.
    t.applyAction(AbyssalAction.Plunder);
    expect(t.stance).toBe(AbyssalStance.Plunder);
  });

  it('rejects unknown action values at runtime', () => {
    const t = new AbyssalStanceTracker();
    expect(() => t.applyAction('wreck' as AbyssalAction)).toThrow(TypeError);
  });
});

describe('AbyssalStanceTracker — defensive copies', () => {
  it('mutating the affinity getter result does not change the tracker', () => {
    const t = new AbyssalStanceTracker();
    t.applyAction(AbyssalAction.Offering);
    const snap = t.affinity as Record<AbyssalStance, number>;
    snap[AbyssalStance.Venerate] = 999;
    expect(t.affinity[AbyssalStance.Venerate]).toBe(1);
  });

  it('mutating the history getter result does not change the tracker', () => {
    const t = new AbyssalStanceTracker();
    t.applyAction(AbyssalAction.Plunder);
    const snap = t.history as AbyssalAction[];
    snap.push(AbyssalAction.Offering);
    expect(t.history).toEqual([AbyssalAction.Plunder]);
  });
});

describe('AbyssalStanceTracker — round-trip', () => {
  it('toJSON/fromJSON preserves stance, affinity and history', () => {
    const original = new AbyssalStanceTracker();
    original.applyAction(AbyssalAction.Offering);
    original.applyAction(AbyssalAction.Plunder);
    original.applyAction(AbyssalAction.Plunder);
    expect(original.stance).toBe(AbyssalStance.Plunder);

    const json: AbyssalStanceTrackerJSON = JSON.parse(
      JSON.stringify(original.toJSON()),
    ) as AbyssalStanceTrackerJSON;
    const restored = AbyssalStanceTracker.fromJSON(json);

    expect(restored.stance).toBe(original.stance);
    expect(restored.affinity).toEqual(original.affinity);
    expect(restored.history).toEqual(original.history);

    // After restore, applying another Plunder grows the existing total.
    restored.applyAction(AbyssalAction.Plunder);
    expect(restored.affinity[AbyssalStance.Plunder]).toBe(3);
  });

  it('rejects fromJSON with unknown stance', () => {
    expect(() =>
      AbyssalStanceTracker.fromJSON({
        stance: 'worship',
        affinity: { venerate: 0, tolerate: 0, plunder: 0, guard: 0 },
        history: [],
      } as unknown as AbyssalStanceTrackerJSON),
    ).toThrow(TypeError);
  });

  it('rejects fromJSON with unknown action in history', () => {
    expect(() =>
      AbyssalStanceTracker.fromJSON({
        stance: AbyssalStance.Tolerate,
        affinity: { venerate: 0, tolerate: 0, plunder: 0, guard: 0 },
        history: ['burn-incense'],
      } as unknown as AbyssalStanceTrackerJSON),
    ).toThrow(RangeError);
  });

  it('rejects fromJSON with negative affinity counter', () => {
    expect(() =>
      AbyssalStanceTracker.fromJSON({
        stance: AbyssalStance.Tolerate,
        affinity: { venerate: -1, tolerate: 0, plunder: 0, guard: 0 },
        history: [],
      } as unknown as AbyssalStanceTrackerJSON),
    ).toThrow(RangeError);
  });
});

describe('AbyssalStanceTracker — init validation', () => {
  it('accepts a non-default starting stance', () => {
    const t = new AbyssalStanceTracker({ stance: AbyssalStance.Venerate });
    expect(t.stance).toBe(AbyssalStance.Venerate);
  });

  it('accepts a partial affinity init and zeroes the rest', () => {
    const t = new AbyssalStanceTracker({
      stance: AbyssalStance.Plunder,
      affinity: { plunder: 5 },
    });
    expect(t.affinity[AbyssalStance.Plunder]).toBe(5);
    expect(t.affinity[AbyssalStance.Venerate]).toBe(0);
    expect(t.affinity[AbyssalStance.Tolerate]).toBe(0);
    expect(t.affinity[AbyssalStance.Guard]).toBe(0);
  });

  it('rejects non-integer affinity counters', () => {
    expect(
      () =>
        new AbyssalStanceTracker({
          affinity: { venerate: 1.5 },
        }),
    ).toThrow(RangeError);
  });
});
