import { describe, it, expect } from 'vitest';
import { DiplomacyAction } from './diplomacy-action.js';
import {
  MAX_RELATIONS_SCORE,
  MIN_RELATIONS_SCORE,
  NEUTRAL_RELATIONS_SCORE,
  RelationsMatrix,
  type RelationsMatrixJSON,
} from './relations-matrix.js';

describe('RelationsMatrix construction', () => {
  it('defaults to empty', () => {
    const m = new RelationsMatrix();
    expect(m.toJSON()).toEqual({ entries: [] });
  });

  it('returns neutral score for a never-touched pair', () => {
    const m = new RelationsMatrix();
    expect(m.getScore('otk', 'ironclad')).toBe(NEUTRAL_RELATIONS_SCORE);
  });

  it('accepts seeded entries', () => {
    const m = new RelationsMatrix({
      entries: [{ a: 'otk', b: 'phantom', score: -40 }],
    });
    expect(m.getScore('otk', 'phantom')).toBe(-40);
  });

  it('rejects duplicate pair seeds regardless of ordering', () => {
    expect(
      () =>
        new RelationsMatrix({
          entries: [
            { a: 'otk', b: 'phantom', score: 10 },
            { a: 'phantom', b: 'otk', score: -10 },
          ],
        }),
    ).toThrow(/duplicate pair/);
  });

  it.each([
    ['score above max', { a: 'otk', b: 'phantom', score: 101 }],
    ['score below min', { a: 'otk', b: 'phantom', score: -101 }],
    ['self-pair', { a: 'otk', b: 'otk', score: 0 }],
    ['empty faction', { a: '', b: 'phantom', score: 0 }],
    ['non-integer score', { a: 'otk', b: 'phantom', score: 1.5 }],
  ])('rejects malformed seed entry (%s)', (_label, entry) => {
    expect(() => new RelationsMatrix({ entries: [entry] as never })).toThrow();
  });

  it('rejects a cooldown keyed by an unknown action', () => {
    expect(
      () =>
        new RelationsMatrix({
          entries: [
            {
              a: 'otk',
              b: 'phantom',
              score: 0,
              cooldowns: { 'unknown-action': 5 },
            },
          ],
        }),
    ).toThrow(/unknown DiplomacyAction/);
  });

  it('rejects cooldown expiry below 1', () => {
    expect(
      () =>
        new RelationsMatrix({
          entries: [
            {
              a: 'otk',
              b: 'phantom',
              score: 0,
              cooldowns: { [DiplomacyAction.DeclareWar]: 0 },
            },
          ],
        }),
    ).toThrow(RangeError);
  });
});

describe('RelationsMatrix.getScore', () => {
  it('is symmetric', () => {
    const m = new RelationsMatrix();
    m.setScore('otk', 'ironclad', 25);
    expect(m.getScore('otk', 'ironclad')).toBe(25);
    expect(m.getScore('ironclad', 'otk')).toBe(25);
  });

  it('rejects same-faction pairs', () => {
    const m = new RelationsMatrix();
    expect(() => m.getScore('otk', 'otk')).toThrow(RangeError);
  });

  it('rejects empty faction ids', () => {
    const m = new RelationsMatrix();
    expect(() => m.getScore('', 'otk')).toThrow(TypeError);
    expect(() => m.getScore('otk', '')).toThrow(TypeError);
  });
});

describe('RelationsMatrix.shiftScore', () => {
  it('updates the score symmetrically', () => {
    const m = new RelationsMatrix();
    m.shiftScore('otk', 'phantom', -15);
    expect(m.getScore('phantom', 'otk')).toBe(-15);
  });

  it('clamps to the max boundary', () => {
    const m = new RelationsMatrix();
    m.shiftScore('otk', 'phantom', 50);
    m.shiftScore('otk', 'phantom', 80);
    expect(m.getScore('otk', 'phantom')).toBe(MAX_RELATIONS_SCORE);
  });

  it('clamps to the min boundary', () => {
    const m = new RelationsMatrix();
    m.shiftScore('otk', 'phantom', -50);
    m.shiftScore('otk', 'phantom', -80);
    expect(m.getScore('otk', 'phantom')).toBe(MIN_RELATIONS_SCORE);
  });

  it('returns the resulting (clamped) score', () => {
    const m = new RelationsMatrix();
    const result = m.shiftScore('otk', 'phantom', 200);
    expect(result).toBe(MAX_RELATIONS_SCORE);
  });

  it('delta 0 does not create a pair entry', () => {
    const m = new RelationsMatrix();
    const result = m.shiftScore('otk', 'phantom', 0);
    expect(result).toBe(NEUTRAL_RELATIONS_SCORE);
    expect(m.getEntry('otk', 'phantom')).toBeNull();
  });

  it('rejects non-integer deltas', () => {
    const m = new RelationsMatrix();
    expect(() => m.shiftScore('otk', 'phantom', 1.5)).toThrow(RangeError);
  });
});

describe('RelationsMatrix.setScore', () => {
  it('rejects out-of-range scores', () => {
    const m = new RelationsMatrix();
    expect(() => m.setScore('otk', 'phantom', 101)).toThrow(RangeError);
    expect(() => m.setScore('otk', 'phantom', -101)).toThrow(RangeError);
  });

  it('accepts exactly the boundary values', () => {
    const m = new RelationsMatrix();
    m.setScore('otk', 'phantom', MAX_RELATIONS_SCORE);
    expect(m.getScore('otk', 'phantom')).toBe(MAX_RELATIONS_SCORE);
    m.setScore('otk', 'phantom', MIN_RELATIONS_SCORE);
    expect(m.getScore('otk', 'phantom')).toBe(MIN_RELATIONS_SCORE);
  });
});

describe('RelationsMatrix cooldowns', () => {
  it('records and clears cooldowns', () => {
    const m = new RelationsMatrix();
    m.setCooldown('otk', 'phantom', DiplomacyAction.DeclareWar, 8);
    expect(m.getCooldownExpiry('otk', 'phantom', DiplomacyAction.DeclareWar)).toBe(8);
    m.clearCooldown('otk', 'phantom', DiplomacyAction.DeclareWar);
    expect(m.getCooldownExpiry('otk', 'phantom', DiplomacyAction.DeclareWar)).toBeNull();
  });

  it('is active while currentTurn < expiresOnTurn', () => {
    const m = new RelationsMatrix();
    m.setCooldown('otk', 'phantom', DiplomacyAction.ProposePeace, 10);
    expect(m.isOnCooldown('otk', 'phantom', DiplomacyAction.ProposePeace, 9)).toBe(true);
    expect(m.isOnCooldown('otk', 'phantom', DiplomacyAction.ProposePeace, 10)).toBe(false);
    expect(m.isOnCooldown('otk', 'phantom', DiplomacyAction.ProposePeace, 11)).toBe(false);
  });

  it('is symmetric between (a,b) and (b,a)', () => {
    const m = new RelationsMatrix();
    m.setCooldown('otk', 'phantom', DiplomacyAction.GiftResources, 4);
    expect(m.getCooldownExpiry('phantom', 'otk', DiplomacyAction.GiftResources)).toBe(4);
  });

  it('clearing a non-existent cooldown is a no-op', () => {
    const m = new RelationsMatrix();
    expect(() => m.clearCooldown('otk', 'phantom', DiplomacyAction.Denounce)).not.toThrow();
  });

  it('rejects non-positive expiresOnTurn', () => {
    const m = new RelationsMatrix();
    expect(() => m.setCooldown('otk', 'phantom', DiplomacyAction.DeclareWar, 0)).toThrow(
      RangeError,
    );
    expect(() => m.setCooldown('otk', 'phantom', DiplomacyAction.DeclareWar, -1)).toThrow(
      RangeError,
    );
  });

  it('rejects unknown action identifiers', () => {
    const m = new RelationsMatrix();
    expect(() => m.setCooldown('otk', 'phantom', 'unknown' as never, 5)).toThrow(TypeError);
  });

  it('isOnCooldown rejects non-positive currentTurn', () => {
    const m = new RelationsMatrix();
    m.setCooldown('otk', 'phantom', DiplomacyAction.DeclareWar, 5);
    expect(() => m.isOnCooldown('otk', 'phantom', DiplomacyAction.DeclareWar, 0)).toThrow(
      RangeError,
    );
  });
});

describe('RelationsMatrix.getEntry', () => {
  it('returns null for a never-touched pair', () => {
    const m = new RelationsMatrix();
    expect(m.getEntry('otk', 'phantom')).toBeNull();
  });

  it('returns the canonical entry for a touched pair', () => {
    const m = new RelationsMatrix();
    m.shiftScore('phantom', 'otk', -20);
    m.setCooldown('phantom', 'otk', DiplomacyAction.DeclareWar, 3);
    const entry = m.getEntry('otk', 'phantom');
    expect(entry).toEqual({
      a: 'otk',
      b: 'phantom',
      score: -20,
      cooldowns: { [DiplomacyAction.DeclareWar]: 3 },
    });
  });

  it('omits cooldowns when none set', () => {
    const m = new RelationsMatrix();
    m.shiftScore('otk', 'phantom', 10);
    const entry = m.getEntry('otk', 'phantom');
    expect(entry).toEqual({ a: 'otk', b: 'phantom', score: 10 });
    expect(entry && 'cooldowns' in entry).toBe(false);
  });
});

describe('RelationsMatrix serialization', () => {
  it('sorts entries by canonical pair key', () => {
    const m = new RelationsMatrix();
    m.shiftScore('phantom', 'otk', -10);
    m.shiftScore('bloodborne', 'ironclad', 20);
    m.shiftScore('otk', 'ironclad', 5);
    const entries = m.toJSON().entries;
    expect(entries.map((e) => `${e.a}|${e.b}`)).toEqual([
      'bloodborne|ironclad',
      'ironclad|otk',
      'otk|phantom',
    ]);
  });

  it('produces byte-identical JSON regardless of mutation order', () => {
    const a = new RelationsMatrix();
    a.shiftScore('otk', 'phantom', -10);
    a.shiftScore('otk', 'ironclad', 5);
    a.setCooldown('otk', 'phantom', DiplomacyAction.DeclareWar, 7);
    a.setCooldown('otk', 'phantom', DiplomacyAction.GiftResources, 3);

    const b = new RelationsMatrix();
    b.shiftScore('otk', 'ironclad', 5);
    b.setCooldown('phantom', 'otk', DiplomacyAction.GiftResources, 3);
    b.shiftScore('phantom', 'otk', -10);
    b.setCooldown('phantom', 'otk', DiplomacyAction.DeclareWar, 7);

    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it('sorts cooldown keys within each entry', () => {
    const m = new RelationsMatrix();
    m.setCooldown('otk', 'phantom', DiplomacyAction.ShareIntel, 4);
    m.setCooldown('otk', 'phantom', DiplomacyAction.DeclareWar, 10);
    m.setCooldown('otk', 'phantom', DiplomacyAction.GiftResources, 2);
    const entry = m.toJSON().entries[0]!;
    expect(Object.keys(entry.cooldowns ?? {})).toEqual([
      DiplomacyAction.DeclareWar,
      DiplomacyAction.GiftResources,
      DiplomacyAction.ShareIntel,
    ]);
  });

  it('round-trips through JSON', () => {
    const original = new RelationsMatrix();
    original.shiftScore('otk', 'phantom', -25);
    original.shiftScore('otk', 'ironclad', 40);
    original.setCooldown('otk', 'phantom', DiplomacyAction.DeclareWar, 9);
    const json: RelationsMatrixJSON = original.toJSON();
    const restored = RelationsMatrix.fromJSON(json);
    expect(JSON.stringify(restored.toJSON())).toBe(JSON.stringify(json));
    expect(restored.getScore('otk', 'phantom')).toBe(-25);
    expect(restored.getCooldownExpiry('otk', 'phantom', DiplomacyAction.DeclareWar)).toBe(9);
  });

  it('fromJSON rejects malformed input', () => {
    expect(() => RelationsMatrix.fromJSON(null as unknown as RelationsMatrixJSON)).toThrow(
      TypeError,
    );
    expect(() =>
      RelationsMatrix.fromJSON({ entries: 'nope' as unknown as readonly never[] }),
    ).toThrow(TypeError);
  });
});
