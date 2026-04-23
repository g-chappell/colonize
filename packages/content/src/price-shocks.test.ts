import { describe, it, expect } from 'vitest';
import {
  PRICE_SHOCKS,
  getPriceShock,
  isPriceShockId,
  listPriceShocksForResource,
} from './price-shocks.js';
import { RESOURCES } from './resources.js';
import { PALETTE_BY_REGISTER } from './palette.js';

// Core's PRICE_VOLUME_STEP (keep in sync with packages/core/src/homeport/homeport.ts).
// Each shock's |volumeDelta| must be an integer multiple of this so it
// shifts the mid-price cleanly — tested as a relational invariant
// rather than pinning individual magnitudes.
const PRICE_VOLUME_STEP = 5;

describe('PRICE_SHOCKS table', () => {
  it('is non-empty', () => {
    expect(PRICE_SHOCKS.length).toBeGreaterThan(0);
  });

  it('ids are unique', () => {
    const ids = PRICE_SHOCKS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every shock references a known ResourceEntryId', () => {
    const resourceIds = new Set(RESOURCES.map((r) => r.id));
    for (const shock of PRICE_SHOCKS) {
      expect(resourceIds.has(shock.resourceId)).toBe(true);
    }
  });

  it('every resource is covered by at least one shock', () => {
    for (const resource of RESOURCES) {
      const entries = listPriceShocksForResource(resource.id);
      expect(entries.length).toBeGreaterThan(0);
    }
  });

  it('every resource has at least one spike AND at least one crash', () => {
    for (const resource of RESOURCES) {
      const entries = listPriceShocksForResource(resource.id);
      expect(entries.some((e) => e.direction === 'spike')).toBe(true);
      expect(entries.some((e) => e.direction === 'crash')).toBe(true);
    }
  });

  it('direction label matches volumeDelta sign (crash > 0, spike < 0)', () => {
    for (const shock of PRICE_SHOCKS) {
      if (shock.direction === 'crash') {
        expect(shock.volumeDelta).toBeGreaterThan(0);
      } else {
        expect(shock.volumeDelta).toBeLessThan(0);
      }
    }
  });

  it('every volumeDelta is a non-zero integer multiple of PRICE_VOLUME_STEP', () => {
    for (const shock of PRICE_SHOCKS) {
      expect(Number.isInteger(shock.volumeDelta)).toBe(true);
      expect(shock.volumeDelta).not.toBe(0);
      expect(Math.abs(shock.volumeDelta) % PRICE_VOLUME_STEP).toBe(0);
    }
  });

  it('flavour copy is non-empty', () => {
    for (const shock of PRICE_SHOCKS) {
      expect(shock.flavour.trim().length).toBeGreaterThan(0);
    }
  });

  it('every register tag is a known ToneRegister', () => {
    const registers = new Set(Object.keys(PALETTE_BY_REGISTER));
    for (const shock of PRICE_SHOCKS) {
      expect(registers.has(shock.register)).toBe(true);
    }
  });
});

describe('getPriceShock / isPriceShockId', () => {
  it('retrieves a known shock by id', () => {
    const first = PRICE_SHOCKS[0]!;
    expect(getPriceShock(first.id)).toBe(first);
    expect(isPriceShockId(first.id)).toBe(true);
  });

  it('rejects an unknown id', () => {
    expect(() => getPriceShock('no-such-shock')).toThrow();
    expect(isPriceShockId('no-such-shock')).toBe(false);
    expect(isPriceShockId(42)).toBe(false);
  });
});

describe('listPriceShocksForResource', () => {
  it('returns only entries for the requested resource', () => {
    for (const resource of RESOURCES) {
      const entries = listPriceShocksForResource(resource.id);
      for (const e of entries) {
        expect(e.resourceId).toBe(resource.id);
      }
    }
  });

  it('returns an empty list when a valid id happens to have no shocks', () => {
    // Type is ResourceEntryId but the function defensively filters;
    // pass a plausible-shaped id not present in the table to verify
    // no over-match happens.
    const synthetic = 'does-not-exist' as unknown as Parameters<
      typeof listPriceShocksForResource
    >[0];
    expect(listPriceShocksForResource(synthetic)).toEqual([]);
  });
});
