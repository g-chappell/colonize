import { describe, it, expect } from 'vitest';
import { HOMEPORT_STARTING_PRICES, getHomePortStartingPrices } from './homeport-prices.js';
import { FACTIONS } from './factions.js';
import { RESOURCES } from './resources.js';

// Mirror of MIN_MID_PRICE / MAX_MID_PRICE in @colonize/core's HomePort
// (content cannot import core). If core's bounds change, update both
// here and in homeport.ts in the same PR.
const MIN_MID_PRICE = 2;
const MAX_MID_PRICE = 99;

describe('HOMEPORT_STARTING_PRICES table', () => {
  it('has an entry for every playable faction', () => {
    const factionIds = FACTIONS.map((f) => f.id).sort();
    const tableIds = Object.keys(HOMEPORT_STARTING_PRICES).sort();
    expect(tableIds).toEqual(factionIds);
  });

  it('every faction prices every resource id', () => {
    const resourceIds = RESOURCES.map((r) => r.id).sort();
    for (const factionId of Object.keys(HOMEPORT_STARTING_PRICES)) {
      const table = HOMEPORT_STARTING_PRICES[factionId as keyof typeof HOMEPORT_STARTING_PRICES];
      const priced = Object.keys(table).sort();
      expect(priced).toEqual(resourceIds);
    }
  });

  it('every price is an integer in [MIN_MID_PRICE, MAX_MID_PRICE]', () => {
    for (const table of Object.values(HOMEPORT_STARTING_PRICES)) {
      for (const price of Object.values(table)) {
        expect(Number.isInteger(price)).toBe(true);
        expect(price).toBeGreaterThanOrEqual(MIN_MID_PRICE);
        expect(price).toBeLessThanOrEqual(MAX_MID_PRICE);
      }
    }
  });
});

describe('getHomePortStartingPrices', () => {
  it('returns the table for a known faction', () => {
    const table = getHomePortStartingPrices('otk');
    expect(table.timber).toBeGreaterThan(0);
    expect(table.salvage).toBeGreaterThan(0);
  });

  it('throws for an unknown faction id', () => {
    expect(() => getHomePortStartingPrices('unknown' as 'otk')).toThrow(Error);
  });
});
