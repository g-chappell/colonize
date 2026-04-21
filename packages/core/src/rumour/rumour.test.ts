import { describe, it, expect } from 'vitest';
import {
  ALL_RUMOUR_KINDS,
  ALL_RUMOUR_OUTCOME_CATEGORIES,
  isRumourKind,
  isRumourOutcomeCategory,
  LEGENDARY_WRECK_BLUEPRINT_FACTION,
  outcomeCategoryForKind,
  RumourKind,
  RumourOutcomeCategory,
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

describe('RumourOutcomeCategory', () => {
  it('exposes the four outcome categories from the design spec', () => {
    expect(ALL_RUMOUR_OUTCOME_CATEGORIES).toHaveLength(4);
    expect(new Set(ALL_RUMOUR_OUTCOME_CATEGORIES)).toEqual(
      new Set(['ArchiveCache', 'LegendaryWreck', 'KrakenShrine', 'FataMorganaMirage']),
    );
  });

  it.each(ALL_RUMOUR_OUTCOME_CATEGORIES)('isRumourOutcomeCategory accepts %s', (c) => {
    expect(isRumourOutcomeCategory(c)).toBe(true);
  });

  it.each(['', 'treasure', 42, null, undefined, {}])(
    'isRumourOutcomeCategory rejects %s',
    (bad) => {
      expect(isRumourOutcomeCategory(bad)).toBe(false);
    },
  );

  it('maps each RumourKind to exactly one category', () => {
    expect(outcomeCategoryForKind(RumourKind.Treasure)).toBe(RumourOutcomeCategory.ArchiveCache);
    expect(outcomeCategoryForKind(RumourKind.Derelict)).toBe(RumourOutcomeCategory.LegendaryWreck);
    expect(outcomeCategoryForKind(RumourKind.Encounter)).toBe(RumourOutcomeCategory.KrakenShrine);
    expect(outcomeCategoryForKind(RumourKind.Mirage)).toBe(RumourOutcomeCategory.FataMorganaMirage);
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

  it('exposes the outcome category derived from kind', () => {
    expect(makeTile({ kind: RumourKind.Treasure }).outcomeCategory).toBe(
      RumourOutcomeCategory.ArchiveCache,
    );
    expect(makeTile({ kind: RumourKind.Derelict }).outcomeCategory).toBe(
      RumourOutcomeCategory.LegendaryWreck,
    );
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

  it('Treasure resolves to an ArchiveCache with libertyChimes in [5,15]', () => {
    const out: RumourOutcome = makeTile({ kind: RumourKind.Treasure }).resolve(rng);
    expect(out.category).toBe(RumourOutcomeCategory.ArchiveCache);
    if (out.category === 'ArchiveCache') {
      expect(out.libertyChimes).toBeGreaterThanOrEqual(5);
      expect(out.libertyChimes).toBeLessThanOrEqual(15);
      expect(Number.isInteger(out.libertyChimes)).toBe(true);
    }
  });

  it('Derelict for OTK resolves to a Legendary blueprint reward', () => {
    const out = makeTile({ kind: RumourKind.Derelict }).resolve(rng, {
      faction: LEGENDARY_WRECK_BLUEPRINT_FACTION,
    });
    expect(out.category).toBe(RumourOutcomeCategory.LegendaryWreck);
    if (out.category === 'LegendaryWreck') {
      expect(out.reward.kind).toBe('legendary-blueprint');
    }
  });

  it('Derelict for a non-OTK faction resolves to a salvage reward in [2,5]', () => {
    const out = makeTile({ kind: RumourKind.Derelict }).resolve(rng, { faction: 'phantom' });
    expect(out.category).toBe(RumourOutcomeCategory.LegendaryWreck);
    if (out.category === 'LegendaryWreck' && out.reward.kind === 'salvage') {
      expect(out.reward.amount).toBeGreaterThanOrEqual(2);
      expect(out.reward.amount).toBeLessThanOrEqual(5);
      expect(Number.isInteger(out.reward.amount)).toBe(true);
    } else {
      throw new Error('expected salvage reward for non-OTK faction');
    }
  });

  it('Derelict without a faction also resolves to salvage (non-blueprint default)', () => {
    const out = makeTile({ kind: RumourKind.Derelict }).resolve(rng);
    expect(out.category).toBe(RumourOutcomeCategory.LegendaryWreck);
    if (out.category === 'LegendaryWreck') {
      expect(out.reward.kind).toBe('salvage');
    }
  });

  it('Encounter resolves to a KrakenShrine with a positive reputation delta in [1,3]', () => {
    const out = makeTile({ kind: RumourKind.Encounter }).resolve(rng);
    expect(out.category).toBe(RumourOutcomeCategory.KrakenShrine);
    if (out.category === 'KrakenShrine') {
      expect(out.reputationDelta).toBeGreaterThanOrEqual(1);
      expect(out.reputationDelta).toBeLessThanOrEqual(3);
      expect(Number.isInteger(out.reputationDelta)).toBe(true);
    }
  });

  it('Mirage resolves to a FataMorganaMirage with a nothing/bonus/hazard variant', () => {
    const out = makeTile({ kind: RumourKind.Mirage }).resolve(rng);
    expect(out.category).toBe(RumourOutcomeCategory.FataMorganaMirage);
    if (out.category === 'FataMorganaMirage') {
      expect(['nothing', 'bonus', 'hazard']).toContain(out.variant);
    }
  });

  it('Mirage variant partitions the [0,1) RNG range into three roughly equal thirds', () => {
    const nothing = makeTile({ kind: RumourKind.Mirage, id: 'a' }).resolve(() => 0.0);
    const bonus = makeTile({ kind: RumourKind.Mirage, id: 'b' }).resolve(() => 0.5);
    const hazard = makeTile({ kind: RumourKind.Mirage, id: 'c' }).resolve(() => 0.9);
    expect(nothing.category === 'FataMorganaMirage' && nothing.variant).toBe('nothing');
    expect(bonus.category === 'FataMorganaMirage' && bonus.variant).toBe('bonus');
    expect(hazard.category === 'FataMorganaMirage' && hazard.variant).toBe('hazard');
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

  it('is deterministic for a given rng sequence and faction', () => {
    const seq = [0.1, 0.9, 0.42];
    const mk = () => {
      let i = 0;
      return () => seq[i++ % seq.length]!;
    };
    const a = makeTile({ kind: RumourKind.Treasure }).resolve(mk(), { faction: 'phantom' });
    const b = makeTile({ kind: RumourKind.Treasure }).resolve(mk(), { faction: 'phantom' });
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
