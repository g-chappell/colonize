import { describe, it, expect } from 'vitest';
import {
  ALL_RUMOUR_KINDS,
  isRumourKind,
  RumourKind,
  RumourTile,
  type RumourOutcome,
  type RumourTileJSON,
} from './rumour.js';

function makeTile(overrides: Partial<{ id: string; x: number; y: number; kind: RumourKind }> = {}) {
  return new RumourTile({
    id: overrides.id ?? 'r-1',
    position: { x: overrides.x ?? 3, y: overrides.y ?? 4 },
    kind: overrides.kind ?? RumourKind.Treasure,
  });
}

describe('RumourKind', () => {
  it('exposes four kinds', () => {
    expect(ALL_RUMOUR_KINDS).toHaveLength(4);
    expect(new Set(ALL_RUMOUR_KINDS)).toEqual(
      new Set(['treasure', 'derelict', 'mirage', 'encounter']),
    );
  });

  it.each(ALL_RUMOUR_KINDS)('isRumourKind accepts %s', (kind) => {
    expect(isRumourKind(kind)).toBe(true);
  });

  it.each(['', 'gold', 42, null, undefined, {}])('isRumourKind rejects %s', (bad) => {
    expect(isRumourKind(bad)).toBe(false);
  });
});

describe('RumourTile construction', () => {
  it('stores id, position, kind, and defaults resolved to false', () => {
    const t = makeTile({ id: 'r-7', x: 10, y: 11, kind: RumourKind.Derelict });
    expect(t.id).toBe('r-7');
    expect(t.position).toEqual({ x: 10, y: 11 });
    expect(t.kind).toBe(RumourKind.Derelict);
    expect(t.resolved).toBe(false);
  });

  it('returns a defensive copy of position', () => {
    const t = makeTile({ x: 1, y: 2 });
    const p = t.position;
    expect(p).toEqual({ x: 1, y: 2 });
    expect(p).not.toBe(t.position);
  });

  it('rejects an empty id', () => {
    expect(
      () => new RumourTile({ id: '', position: { x: 0, y: 0 }, kind: RumourKind.Mirage }),
    ).toThrow(TypeError);
  });

  it('rejects an unknown kind', () => {
    expect(
      () =>
        new RumourTile({
          id: 'r',
          position: { x: 0, y: 0 },
          kind: 'bogus' as unknown as RumourKind,
        }),
    ).toThrow(TypeError);
  });

  it('rejects a non-integer position', () => {
    expect(
      () =>
        new RumourTile({
          id: 'r',
          position: { x: 1.5, y: 0 },
          kind: RumourKind.Treasure,
        }),
    ).toThrow(TypeError);
  });
});

describe('RumourTile.resolve', () => {
  const rng = () => 0.5;

  it('Treasure resolves to a gold outcome with amount in [20,100]', () => {
    const out: RumourOutcome = makeTile({ kind: RumourKind.Treasure }).resolve(rng);
    expect(out.type).toBe('gold');
    if (out.type === 'gold') {
      expect(out.amount).toBeGreaterThanOrEqual(20);
      expect(out.amount).toBeLessThanOrEqual(100);
      expect(Number.isInteger(out.amount)).toBe(true);
    }
  });

  it('Derelict resolves to a salvage outcome with amount in [1,5]', () => {
    const out = makeTile({ kind: RumourKind.Derelict }).resolve(rng);
    expect(out.type).toBe('salvage');
    if (out.type === 'salvage') {
      expect(out.amount).toBeGreaterThanOrEqual(1);
      expect(out.amount).toBeLessThanOrEqual(5);
      expect(Number.isInteger(out.amount)).toBe(true);
    }
  });

  it('Mirage resolves to nothing', () => {
    expect(makeTile({ kind: RumourKind.Mirage }).resolve(rng)).toEqual({ type: 'nothing' });
  });

  it('Encounter resolves to encounter', () => {
    expect(makeTile({ kind: RumourKind.Encounter }).resolve(rng)).toEqual({ type: 'encounter' });
  });

  it('flips resolved to true after resolve', () => {
    const t = makeTile();
    expect(t.resolved).toBe(false);
    t.resolve(rng);
    expect(t.resolved).toBe(true);
  });

  it('throws when resolved twice', () => {
    const t = makeTile();
    t.resolve(rng);
    expect(() => t.resolve(rng)).toThrow(/already been resolved/);
  });

  it('is deterministic for a given rng sequence', () => {
    const seq = [0.1, 0.9, 0.42];
    const mk = () => {
      let i = 0;
      return () => seq[i++ % seq.length]!;
    };
    const a = makeTile({ kind: RumourKind.Treasure }).resolve(mk());
    const b = makeTile({ kind: RumourKind.Treasure }).resolve(mk());
    expect(a).toEqual(b);
  });

  it('rejects a non-function rng', () => {
    expect(() => makeTile().resolve(null as unknown as () => number)).toThrow(TypeError);
  });
});

describe('RumourTile JSON round-trip', () => {
  it('survives toJSON/fromJSON lossless for an unresolved tile', () => {
    const original = makeTile({ id: 'r-x', x: 7, y: 8, kind: RumourKind.Encounter });
    const revived = RumourTile.fromJSON(original.toJSON());
    expect(revived.toJSON()).toEqual(original.toJSON());
  });

  it('preserves the resolved flag across round-trip', () => {
    const t = makeTile();
    t.resolve(() => 0.25);
    const revived = RumourTile.fromJSON(t.toJSON());
    expect(revived.resolved).toBe(true);
    expect(() => revived.resolve(() => 0)).toThrow();
  });

  it('rejects a non-object payload', () => {
    expect(() => RumourTile.fromJSON(null as unknown as RumourTileJSON)).toThrow(TypeError);
  });
});
