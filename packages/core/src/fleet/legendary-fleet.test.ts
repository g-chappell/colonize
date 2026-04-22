import { describe, it, expect } from 'vitest';
import { LegendaryFleet, type LegendaryFleetJSON } from './legendary-fleet.js';

describe('LegendaryFleet construction', () => {
  it('defaults to empty discovered and redeemed sets', () => {
    const f = new LegendaryFleet();
    expect(f.discovered).toEqual([]);
    expect(f.redeemed).toEqual([]);
  });

  it('accepts discovered and redeemed in init', () => {
    const f = new LegendaryFleet({
      discovered: ['black-pearl', 'whydah'],
      redeemed: ['black-pearl'],
    });
    expect(f.discovered).toEqual(['black-pearl', 'whydah']);
    expect(f.redeemed).toEqual(['black-pearl']);
  });

  it('init redeemed entries are promoted to discovered', () => {
    const f = new LegendaryFleet({ redeemed: ['flying-dutchman'] });
    expect(f.hasDiscovered('flying-dutchman')).toBe(true);
    expect(f.hasRedeemed('flying-dutchman')).toBe(true);
  });

  it('rejects non-array init fields', () => {
    expect(
      () => new LegendaryFleet({ discovered: 'revenge' as unknown as readonly string[] }),
    ).toThrow(TypeError);
    expect(
      () => new LegendaryFleet({ redeemed: 'revenge' as unknown as readonly string[] }),
    ).toThrow(TypeError);
  });

  it('rejects empty-string ids in init', () => {
    expect(() => new LegendaryFleet({ discovered: [''] })).toThrow(TypeError);
    expect(() => new LegendaryFleet({ redeemed: [''] })).toThrow(TypeError);
  });
});

describe('LegendaryFleet.discover', () => {
  it('marks a ship as discovered', () => {
    const f = new LegendaryFleet();
    f.discover('queen-annes-revenge');
    expect(f.hasDiscovered('queen-annes-revenge')).toBe(true);
    expect(f.hasRedeemed('queen-annes-revenge')).toBe(false);
  });

  it('is idempotent — re-discovering the same id is a no-op', () => {
    const f = new LegendaryFleet();
    f.discover('ranger');
    f.discover('ranger');
    expect(f.discovered).toEqual(['ranger']);
  });

  it('rejects empty-string ids', () => {
    const f = new LegendaryFleet();
    expect(() => f.discover('')).toThrow(TypeError);
  });
});

describe('LegendaryFleet.redeem', () => {
  it('marks a ship as redeemed and implicitly discovered', () => {
    const f = new LegendaryFleet();
    f.redeem('flying-dutchman');
    expect(f.hasDiscovered('flying-dutchman')).toBe(true);
    expect(f.hasRedeemed('flying-dutchman')).toBe(true);
  });

  it('does not require prior discovery (orchestration decides)', () => {
    const f = new LegendaryFleet();
    expect(() => f.redeem('whydah')).not.toThrow();
  });

  it('is idempotent — re-redeeming the same id is a no-op', () => {
    const f = new LegendaryFleet();
    f.redeem('ranger');
    f.redeem('ranger');
    expect(f.redeemed).toEqual(['ranger']);
  });

  it('rejects empty-string ids', () => {
    const f = new LegendaryFleet();
    expect(() => f.redeem('')).toThrow(TypeError);
  });
});

describe('LegendaryFleet.isBuildable', () => {
  it('returns false for undiscovered ships', () => {
    const f = new LegendaryFleet();
    expect(f.isBuildable('black-pearl')).toBe(false);
  });

  it('returns false for discovered-only (not redeemed) ships', () => {
    const f = new LegendaryFleet();
    f.discover('black-pearl');
    expect(f.isBuildable('black-pearl')).toBe(false);
  });

  it('returns true once the blueprint has been redeemed', () => {
    const f = new LegendaryFleet();
    f.redeem('black-pearl');
    expect(f.isBuildable('black-pearl')).toBe(true);
  });
});

describe('LegendaryFleet serialization', () => {
  it('toJSON sorts both collections alphabetically', () => {
    const f = new LegendaryFleet();
    f.discover('whydah');
    f.discover('black-pearl');
    f.discover('ranger');
    f.redeem('revenge');
    f.redeem('queen-annes-revenge');
    const json = f.toJSON();
    expect(json.discovered).toEqual([
      'black-pearl',
      'queen-annes-revenge',
      'ranger',
      'revenge',
      'whydah',
    ]);
    expect(json.redeemed).toEqual(['queen-annes-revenge', 'revenge']);
  });

  it('produces byte-identical JSON regardless of mutation order', () => {
    const a = new LegendaryFleet();
    a.discover('whydah');
    a.discover('black-pearl');
    a.redeem('ranger');
    const b = new LegendaryFleet();
    b.redeem('ranger');
    b.discover('black-pearl');
    b.discover('whydah');
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it('round-trips through JSON', () => {
    const original = new LegendaryFleet({
      discovered: ['black-pearl', 'whydah', 'ranger'],
      redeemed: ['black-pearl'],
    });
    const json: LegendaryFleetJSON = original.toJSON();
    const restored = LegendaryFleet.fromJSON(json);
    expect(restored.discovered).toEqual(original.discovered);
    expect(restored.redeemed).toEqual(original.redeemed);
  });

  it('fromJSON rejects malformed input', () => {
    expect(() => LegendaryFleet.fromJSON(null as unknown as LegendaryFleetJSON)).toThrow(TypeError);
    expect(() =>
      LegendaryFleet.fromJSON({
        discovered: 'nope' as unknown as readonly string[],
        redeemed: [],
      }),
    ).toThrow(TypeError);
    expect(() =>
      LegendaryFleet.fromJSON({
        discovered: [],
        redeemed: 'nope' as unknown as readonly string[],
      }),
    ).toThrow(TypeError);
  });
});
