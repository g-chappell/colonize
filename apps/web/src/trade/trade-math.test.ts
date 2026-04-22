import { describe, expect, it } from 'vitest';
import { HomePort } from '@colonize/core';
import { computeTradeLine, computeTradeTotals } from './trade-math';

function makePort(): HomePort {
  return new HomePort({
    id: 'port-driftwatch',
    faction: 'otk',
    basePrices: {
      timber: 10,
      fibre: 8,
      provisions: 12,
    },
  });
}

describe('computeTradeLine', () => {
  it('prices a buy at the sell-price side of the spread', () => {
    const port = makePort();
    const line = computeTradeLine(port, 'timber', 3);
    expect(line.unitPrice).toBe(port.sellPrice('timber'));
    expect(line.lineTotal).toBe(-3 * port.sellPrice('timber'));
  });

  it('prices a sell at the buy-back side of the spread', () => {
    const port = makePort();
    const line = computeTradeLine(port, 'timber', -4);
    expect(line.unitPrice).toBe(port.buyBackPrice('timber'));
    expect(line.lineTotal).toBe(4 * port.buyBackPrice('timber'));
  });

  it('prices a zero line at the mid-price', () => {
    const port = makePort();
    const line = computeTradeLine(port, 'timber', 0);
    expect(line.unitPrice).toBe(port.midPrice('timber'));
    expect(line.lineTotal).toBe(0);
  });

  it('rejects non-integer qty', () => {
    const port = makePort();
    expect(() => computeTradeLine(port, 'timber', 1.5)).toThrow(/integer/);
  });

  it('rejects untraded resource', () => {
    const port = makePort();
    expect(() => computeTradeLine(port, 'salvage', 1)).toThrow(/not traded/);
  });
});

describe('computeTradeTotals', () => {
  it('emits one line per traded resource in tradedResources order', () => {
    const port = makePort();
    const totals = computeTradeTotals(port, {});
    expect(totals.lines.map((l) => l.resourceId)).toEqual(port.tradedResources);
    expect(totals.netCoin).toBe(0);
  });

  it('sums line totals — sell revenue positive, buy cost negative', () => {
    const port = makePort();
    const totals = computeTradeTotals(port, {
      timber: -5,
      fibre: 3,
    });
    const expected = 5 * port.buyBackPrice('timber') + -3 * port.sellPrice('fibre');
    expect(totals.netCoin).toBe(expected);
  });

  it('treats missing resource keys as qty 0', () => {
    const port = makePort();
    const totals = computeTradeTotals(port, { timber: 2 });
    const fibre = totals.lines.find((l) => l.resourceId === 'fibre');
    const provisions = totals.lines.find((l) => l.resourceId === 'provisions');
    expect(fibre?.qty).toBe(0);
    expect(provisions?.qty).toBe(0);
  });
});
