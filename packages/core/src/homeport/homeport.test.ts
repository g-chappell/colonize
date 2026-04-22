import { describe, it, expect } from 'vitest';
import {
  HomePort,
  PRICE_SPREAD,
  MIN_MID_PRICE,
  MAX_MID_PRICE,
  PRICE_VOLUME_STEP,
  type HomePortJSON,
} from './homeport.js';

const seed = (overrides: Partial<ConstructorParameters<typeof HomePort>[0]> = {}) =>
  new HomePort({
    id: 'kraken-spire',
    faction: 'otk',
    basePrices: { timber: 10, fibre: 8, salvage: 18 },
    ...overrides,
  });

describe('HomePort construction', () => {
  it('exposes id, faction, and traded resources sorted', () => {
    const port = seed();
    expect(port.id).toBe('kraken-spire');
    expect(port.faction).toBe('otk');
    expect(port.tradedResources).toEqual(['fibre', 'salvage', 'timber']);
  });

  it('reports trades() membership', () => {
    const port = seed();
    expect(port.trades('timber')).toBe(true);
    expect(port.trades('forgework')).toBe(false);
  });

  it('defaults netVolume to zero everywhere', () => {
    const port = seed();
    expect(port.netVolume('timber')).toBe(0);
    expect(port.netVolume('salvage')).toBe(0);
  });

  it('accepts an explicit netVolume seed and drops zero entries', () => {
    const port = seed({ netVolume: { timber: 7, fibre: 0, salvage: -3 } });
    expect(port.netVolume('timber')).toBe(7);
    expect(port.netVolume('fibre')).toBe(0);
    expect(port.netVolume('salvage')).toBe(-3);
  });

  it.each([
    ['empty id', { id: '' }, TypeError],
    ['empty faction', { faction: '' }, TypeError],
    ['empty basePrices', { basePrices: {} }, RangeError],
    ['fractional price', { basePrices: { timber: 10.5 } }, RangeError],
    ['price below MIN_MID_PRICE', { basePrices: { timber: MIN_MID_PRICE - 1 } }, RangeError],
    ['price above MAX_MID_PRICE', { basePrices: { timber: MAX_MID_PRICE + 1 } }, RangeError],
    ['empty resource id', { basePrices: { '': 10 } }, TypeError],
  ])('rejects invalid construction (%s)', (_label, overrides, ctor) => {
    expect(() => seed(overrides)).toThrow(ctor);
  });

  it('rejects netVolume entries that reference an untraded resource', () => {
    expect(() => seed({ netVolume: { forgework: 5 } })).toThrow(RangeError);
  });

  it('rejects fractional netVolume entries', () => {
    expect(() => seed({ netVolume: { timber: 1.5 } })).toThrow(RangeError);
  });
});

describe('HomePort price queries', () => {
  it('basePrice returns the seed value', () => {
    const port = seed();
    expect(port.basePrice('timber')).toBe(10);
    expect(port.basePrice('salvage')).toBe(18);
  });

  it('midPrice equals basePrice when netVolume is zero', () => {
    const port = seed();
    expect(port.midPrice('timber')).toBe(10);
  });

  it('sellPrice = mid + SPREAD; buyBackPrice = mid - SPREAD', () => {
    const port = seed();
    expect(port.sellPrice('timber')).toBe(10 + PRICE_SPREAD);
    expect(port.buyBackPrice('timber')).toBe(10 - PRICE_SPREAD);
  });

  it('throws on price queries for an untraded resource', () => {
    const port = seed();
    expect(() => port.basePrice('forgework')).toThrow(RangeError);
    expect(() => port.midPrice('forgework')).toThrow(RangeError);
    expect(() => port.sellPrice('forgework')).toThrow(RangeError);
    expect(() => port.buyBackPrice('forgework')).toThrow(RangeError);
    expect(() => port.netVolume('forgework')).toThrow(RangeError);
  });
});

describe('HomePort price ↔ volume coupling', () => {
  it('player sales drop the mid-price (every PRICE_VOLUME_STEP units shifts by 1)', () => {
    const port = seed();
    port.recordPlayerSale('timber', PRICE_VOLUME_STEP);
    expect(port.midPrice('timber')).toBe(10 - 1);
    port.recordPlayerSale('timber', PRICE_VOLUME_STEP);
    expect(port.midPrice('timber')).toBe(10 - 2);
  });

  it('player purchases raise the mid-price', () => {
    const port = seed();
    port.recordPlayerPurchase('timber', PRICE_VOLUME_STEP);
    expect(port.midPrice('timber')).toBe(10 + 1);
    port.recordPlayerPurchase('timber', PRICE_VOLUME_STEP);
    expect(port.midPrice('timber')).toBe(10 + 2);
  });

  it('volume below one PRICE_VOLUME_STEP does not yet shift the mid-price', () => {
    const port = seed();
    port.recordPlayerSale('timber', PRICE_VOLUME_STEP - 1);
    expect(port.midPrice('timber')).toBe(10);
  });

  it('a sale + offsetting purchase clears netVolume back to zero', () => {
    const port = seed();
    port.recordPlayerSale('timber', 7);
    port.recordPlayerPurchase('timber', 7);
    expect(port.netVolume('timber')).toBe(0);
    expect(port.midPrice('timber')).toBe(10);
  });

  it('mid-price is bounded below by MIN_MID_PRICE no matter the volume', () => {
    const port = seed();
    port.recordPlayerSale('timber', PRICE_VOLUME_STEP * 1000);
    expect(port.midPrice('timber')).toBe(MIN_MID_PRICE);
    expect(port.buyBackPrice('timber')).toBe(MIN_MID_PRICE - PRICE_SPREAD);
  });

  it('mid-price is bounded above by MAX_MID_PRICE no matter the volume', () => {
    const port = seed();
    port.recordPlayerPurchase('timber', PRICE_VOLUME_STEP * 1000);
    expect(port.midPrice('timber')).toBe(MAX_MID_PRICE);
    expect(port.sellPrice('timber')).toBe(MAX_MID_PRICE + PRICE_SPREAD);
  });

  it('buyBack < sell by 2 * SPREAD at every volume', () => {
    const port = seed();
    for (const volume of [-50, -7, -1, 0, 1, 7, 50, 1000]) {
      const target = (port as unknown as { _netVolume: Map<string, number> })._netVolume;
      target.clear();
      if (volume !== 0) target.set('timber', volume);
      const sell = port.sellPrice('timber');
      const buyBack = port.buyBackPrice('timber');
      expect(sell - buyBack).toBe(2 * PRICE_SPREAD);
      expect(buyBack).toBeLessThan(sell);
    }
  });
});

describe('HomePort.recordPlayerSale / recordPlayerPurchase', () => {
  it.each([
    ['zero qty', 0],
    ['negative qty', -1],
    ['fractional qty', 1.5],
  ])('recordPlayerSale rejects invalid qty (%s)', (_label, qty) => {
    const port = seed();
    expect(() => port.recordPlayerSale('timber', qty)).toThrow(RangeError);
  });

  it.each([
    ['zero qty', 0],
    ['negative qty', -1],
    ['fractional qty', 1.5],
  ])('recordPlayerPurchase rejects invalid qty (%s)', (_label, qty) => {
    const port = seed();
    expect(() => port.recordPlayerPurchase('timber', qty)).toThrow(RangeError);
  });

  it('rejects mutation on an untraded resource', () => {
    const port = seed();
    expect(() => port.recordPlayerSale('forgework', 1)).toThrow(RangeError);
    expect(() => port.recordPlayerPurchase('forgework', 1)).toThrow(RangeError);
  });
});

describe('HomePort.toJSON / fromJSON', () => {
  it('round-trips a typical port', () => {
    const port = seed({ netVolume: { timber: 7, salvage: -3 } });
    const json = port.toJSON();
    const revived = HomePort.fromJSON(json);
    expect(revived.id).toBe(port.id);
    expect(revived.faction).toBe(port.faction);
    expect(revived.basePrice('timber')).toBe(10);
    expect(revived.netVolume('timber')).toBe(7);
    expect(revived.netVolume('salvage')).toBe(-3);
    expect(revived.midPrice('timber')).toBe(port.midPrice('timber'));
  });

  it('toJSON emits sorted basePrices and netVolume keys (determinism)', () => {
    const a = new HomePort({
      id: 'p',
      faction: 'otk',
      basePrices: { timber: 10, fibre: 8 },
    });
    a.recordPlayerSale('timber', 3);
    a.recordPlayerSale('fibre', 2);
    const b = new HomePort({
      id: 'p',
      faction: 'otk',
      basePrices: { fibre: 8, timber: 10 },
    });
    b.recordPlayerSale('fibre', 2);
    b.recordPlayerSale('timber', 3);
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it('toJSON output is JSON-serialisable and lossless', () => {
    const port = seed({ netVolume: { timber: 4, salvage: -2 } });
    const text = JSON.stringify(port.toJSON());
    const revived = HomePort.fromJSON(JSON.parse(text) as HomePortJSON);
    expect(revived.toJSON()).toEqual(port.toJSON());
  });

  it('fromJSON rejects a non-object payload', () => {
    expect(() => HomePort.fromJSON(null as unknown as HomePortJSON)).toThrow(TypeError);
  });

  it('fromJSON rejects malformed basePrices', () => {
    const bad = {
      id: 'p',
      faction: 'otk',
      basePrices: null,
      netVolume: {},
    } as unknown as HomePortJSON;
    expect(() => HomePort.fromJSON(bad)).toThrow(TypeError);
  });

  it('fromJSON rejects malformed netVolume', () => {
    const bad = {
      id: 'p',
      faction: 'otk',
      basePrices: { timber: 10 },
      netVolume: null,
    } as unknown as HomePortJSON;
    expect(() => HomePort.fromJSON(bad)).toThrow(TypeError);
  });

  it('revived port is independent of the source', () => {
    const a = seed();
    const b = HomePort.fromJSON(a.toJSON());
    a.recordPlayerSale('timber', PRICE_VOLUME_STEP * 4);
    expect(b.netVolume('timber')).toBe(0);
    expect(b.midPrice('timber')).toBe(10);
  });
});
