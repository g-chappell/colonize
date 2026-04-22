import { describe, it, expect } from 'vitest';
import { ALL_ARCHIVE_CHARTER_IDS, ArchiveCharterId } from './charter-registry.js';
import { FactionCharters } from './faction-charters.js';

describe('FactionCharters construction', () => {
  it('defaults to every charter available and nothing selected', () => {
    const fc = new FactionCharters();
    expect(fc.available).toEqual([...ALL_ARCHIVE_CHARTER_IDS].sort());
    expect(fc.selected).toEqual([]);
  });

  it('accepts an explicit available subset', () => {
    const fc = new FactionCharters({
      available: [ArchiveCharterId.PirataCodexFragment, ArchiveCharterId.BloodlineWrit],
    });
    expect(fc.available).toEqual(
      [ArchiveCharterId.PirataCodexFragment, ArchiveCharterId.BloodlineWrit].sort(),
    );
  });

  it('moves selected ids out of the available pool on load', () => {
    const fc = new FactionCharters({ selected: [ArchiveCharterId.PirataCodexFragment] });
    expect(fc.hasSelected(ArchiveCharterId.PirataCodexFragment)).toBe(true);
    expect(fc.isAvailable(ArchiveCharterId.PirataCodexFragment)).toBe(false);
  });

  it('rejects unknown charter ids in init', () => {
    expect(() => new FactionCharters({ available: ['ghost' as ArchiveCharterId] })).toThrow(
      RangeError,
    );
    expect(() => new FactionCharters({ selected: ['ghost' as ArchiveCharterId] })).toThrow(
      RangeError,
    );
  });

  it('rejects duplicate selected ids on load', () => {
    expect(
      () =>
        new FactionCharters({
          selected: [ArchiveCharterId.PirataCodexFragment, ArchiveCharterId.PirataCodexFragment],
        }),
    ).toThrow(RangeError);
  });
});

describe('FactionCharters.pick', () => {
  it('moves a charter from available to selected', () => {
    const fc = new FactionCharters();
    fc.pick(ArchiveCharterId.PirataCodexFragment);
    expect(fc.isAvailable(ArchiveCharterId.PirataCodexFragment)).toBe(false);
    expect(fc.hasSelected(ArchiveCharterId.PirataCodexFragment)).toBe(true);
    expect(fc.selected[0]).toBe(ArchiveCharterId.PirataCodexFragment);
  });

  it('preserves pick order in selected', () => {
    const fc = new FactionCharters();
    fc.pick(ArchiveCharterId.BloodlineWrit);
    fc.pick(ArchiveCharterId.PirataCodexFragment);
    fc.pick(ArchiveCharterId.FreePortCompact);
    expect(fc.selected).toEqual([
      ArchiveCharterId.BloodlineWrit,
      ArchiveCharterId.PirataCodexFragment,
      ArchiveCharterId.FreePortCompact,
    ]);
  });

  it('throws if the charter is not available', () => {
    const fc = new FactionCharters({ available: [ArchiveCharterId.PirataCodexFragment] });
    expect(() => fc.pick(ArchiveCharterId.BloodlineWrit)).toThrow(RangeError);
  });

  it('throws if the charter id is not valid', () => {
    const fc = new FactionCharters();
    expect(() => fc.pick('ghost' as ArchiveCharterId)).toThrow(TypeError);
  });

  it('throws on picking the same charter twice', () => {
    const fc = new FactionCharters();
    fc.pick(ArchiveCharterId.PirataCodexFragment);
    expect(() => fc.pick(ArchiveCharterId.PirataCodexFragment)).toThrow(RangeError);
  });
});

describe('FactionCharters.drawHand', () => {
  it('returns two distinct ids from the available pool', () => {
    const pool: readonly ArchiveCharterId[] = [
      ArchiveCharterId.PirataCodexFragment,
      ArchiveCharterId.BloodlineWrit,
      ArchiveCharterId.FreePortCompact,
    ];
    const hand = FactionCharters.drawHand(pool, seededRng(0.42));
    expect(hand).toHaveLength(2);
    expect(hand[0]).not.toBe(hand[1]);
    expect(pool).toContain(hand[0]);
    expect(pool).toContain(hand[1]);
  });

  it('is deterministic given a seeded rng', () => {
    const pool = [...ALL_ARCHIVE_CHARTER_IDS];
    const a = FactionCharters.drawHand(pool, seededRng(0.13));
    const b = FactionCharters.drawHand(pool, seededRng(0.13));
    expect(a).toEqual(b);
  });

  it('throws when fewer than two charters are available', () => {
    expect(() => FactionCharters.drawHand([ArchiveCharterId.PirataCodexFragment])).toThrow(
      RangeError,
    );
    expect(() => FactionCharters.drawHand([])).toThrow(RangeError);
  });

  it('defaults rng to Math.random', () => {
    const pool: readonly ArchiveCharterId[] = [
      ArchiveCharterId.PirataCodexFragment,
      ArchiveCharterId.BloodlineWrit,
    ];
    const hand = FactionCharters.drawHand(pool);
    expect(pool).toContain(hand[0]);
    expect(pool).toContain(hand[1]);
    expect(hand[0]).not.toBe(hand[1]);
  });
});

describe('FactionCharters.toJSON / fromJSON', () => {
  it('round-trips through JSON', () => {
    const fc = new FactionCharters();
    fc.pick(ArchiveCharterId.PirataCodexFragment);
    fc.pick(ArchiveCharterId.BloodlineWrit);
    const copy = FactionCharters.fromJSON(fc.toJSON());
    expect(copy.available).toEqual(fc.available);
    expect(copy.selected).toEqual(fc.selected);
  });

  it('emits available in alphabetical order for determinism', () => {
    const fc = new FactionCharters({
      available: [
        ArchiveCharterId.TribunalCharter,
        ArchiveCharterId.PirataCodexFragment,
        ArchiveCharterId.BloodlineWrit,
      ],
    });
    const json = fc.toJSON();
    expect(json.available).toEqual([
      ArchiveCharterId.BloodlineWrit,
      ArchiveCharterId.PirataCodexFragment,
      ArchiveCharterId.TribunalCharter,
    ]);
  });

  it('preserves selected pick-order across round-trip', () => {
    const fc = new FactionCharters();
    fc.pick(ArchiveCharterId.TribunalCharter);
    fc.pick(ArchiveCharterId.PirataCodexFragment);
    fc.pick(ArchiveCharterId.BloodlineWrit);
    const copy = FactionCharters.fromJSON(fc.toJSON());
    expect(copy.selected).toEqual([
      ArchiveCharterId.TribunalCharter,
      ArchiveCharterId.PirataCodexFragment,
      ArchiveCharterId.BloodlineWrit,
    ]);
  });
});

function seededRng(seed: number): () => number {
  // Simple LCG — deterministic, good enough for test determinism.
  let state = Math.max(0, Math.min(1, seed));
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}
