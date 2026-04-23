import { describe, expect, it } from 'vitest';
import { isResourceEntryId } from './resources.js';
import {
  BLACK_MARKET_BUY_CHIMES_PER_UNIT_FLOOR,
  BLACK_MARKET_OFFERINGS,
  BLACK_MARKET_SELL_CHIMES_PER_UNIT_CEILING,
  getBlackMarketOffering,
  isBlackMarketOfferingId,
  isBlackMarketTalismanOffer,
  type BlackMarketOfferingId,
} from './black-market.js';

describe('BLACK_MARKET_OFFERINGS', () => {
  it('covers the three offering kinds — buy, sell, and a single Talisman', () => {
    const buys = BLACK_MARKET_OFFERINGS.filter((o) => o.kind === 'buy');
    const sells = BLACK_MARKET_OFFERINGS.filter((o) => o.kind === 'sell');
    const talismans = BLACK_MARKET_OFFERINGS.filter((o) => o.kind === 'talisman');
    expect(buys.length).toBeGreaterThan(0);
    expect(sells.length).toBeGreaterThan(0);
    expect(talismans).toHaveLength(1);
  });

  it('has unique offering ids', () => {
    const ids = BLACK_MARKET_OFFERINGS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pitch copy is non-empty for every offering', () => {
    for (const offer of BLACK_MARKET_OFFERINGS) {
      expect(offer.pitch.length).toBeGreaterThan(0);
    }
  });

  it('every buy/sell offer names a known resource with a positive quantity + price', () => {
    for (const offer of BLACK_MARKET_OFFERINGS) {
      if (offer.kind === 'talisman') continue;
      expect(isResourceEntryId(offer.resourceId)).toBe(true);
      expect(offer.quantity).toBeGreaterThan(0);
      expect(Number.isInteger(offer.quantity)).toBe(true);
      expect(offer.priceChimes).toBeGreaterThan(0);
      expect(Number.isInteger(offer.priceChimes)).toBe(true);
    }
  });

  it('buy offers sit above the fair-market Chime-per-unit floor (markup)', () => {
    // Blackwater sells rare goods to the player at a premium — every
    // buy offer must clear the fair-market floor to read as "odd and
    // costly" rather than a bargain.
    for (const offer of BLACK_MARKET_OFFERINGS) {
      if (offer.kind !== 'buy') continue;
      const perUnit = offer.priceChimes / offer.quantity;
      expect(perUnit).toBeGreaterThanOrEqual(BLACK_MARKET_BUY_CHIMES_PER_UNIT_FLOOR);
    }
  });

  it('sell offers sit below the fair-market Chime-per-unit ceiling (discount)', () => {
    // Blackwater buys the player's goods at a discount — every sell
    // offer's per-unit Chime price must sit under the ceiling.
    for (const offer of BLACK_MARKET_OFFERINGS) {
      if (offer.kind !== 'sell') continue;
      const perUnit = offer.priceChimes / offer.quantity;
      expect(perUnit).toBeLessThanOrEqual(BLACK_MARKET_SELL_CHIMES_PER_UNIT_CEILING);
    }
  });

  it('buy offers are priced strictly higher than sell offers (no arbitrage)', () => {
    // Taking a sell offer and immediately re-buying must be a losing
    // trade — the Collective exists to profit off the gap.
    for (const buy of BLACK_MARKET_OFFERINGS) {
      if (buy.kind !== 'buy') continue;
      const buyPerUnit = buy.priceChimes / buy.quantity;
      for (const sell of BLACK_MARKET_OFFERINGS) {
        if (sell.kind !== 'sell') continue;
        const sellPerUnit = sell.priceChimes / sell.quantity;
        expect(buyPerUnit).toBeGreaterThan(sellPerUnit);
      }
    }
  });

  it('Kraken Talisman is the most expensive single offering in the catalogue', () => {
    const talisman = BLACK_MARKET_OFFERINGS.find(isBlackMarketTalismanOffer);
    expect(talisman).toBeDefined();
    for (const offer of BLACK_MARKET_OFFERINGS) {
      if (offer === talisman) continue;
      expect(talisman!.priceChimes).toBeGreaterThan(offer.priceChimes);
    }
  });

  it('Kraken Talisman pitch mentions the inscription motif', () => {
    const talisman = BLACK_MARKET_OFFERINGS.find(isBlackMarketTalismanOffer);
    expect(talisman?.pitch).toMatch(/Kraken/i);
  });
});

describe('getBlackMarketOffering', () => {
  it('returns the matching entry for every catalogue id', () => {
    for (const offer of BLACK_MARKET_OFFERINGS) {
      expect(getBlackMarketOffering(offer.id).id).toBe(offer.id);
    }
  });

  it('throws for an unknown id', () => {
    expect(() => getBlackMarketOffering('buy-not-a-real-thing' as BlackMarketOfferingId)).toThrow();
  });
});

describe('isBlackMarketOfferingId', () => {
  it('returns true for every catalogue id', () => {
    for (const offer of BLACK_MARKET_OFFERINGS) {
      expect(isBlackMarketOfferingId(offer.id)).toBe(true);
    }
  });

  it('returns false for unknowns and non-strings', () => {
    expect(isBlackMarketOfferingId('TALISMAN-KRAKEN')).toBe(false);
    expect(isBlackMarketOfferingId('talisman')).toBe(false);
    expect(isBlackMarketOfferingId(null)).toBe(false);
    expect(isBlackMarketOfferingId(undefined)).toBe(false);
    expect(isBlackMarketOfferingId(0)).toBe(false);
  });
});
