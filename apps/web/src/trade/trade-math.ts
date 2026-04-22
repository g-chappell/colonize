// Pure trade-preview math. Given a HomePort + a per-resource proposed
// quantity (positive = player buys from port, negative = player sells
// to port), compute the unit price that applies to each line and the
// running coin delta for the whole cart. Linear estimate — price drift
// within a single confirmed trade is not simulated, because the spread
// is small enough that slippage would just add noise to the displayed
// "will I profit" number.
//
// Lives as a sibling of TradeScreen.tsx for symmetry with camera-controls
// / fog-overlay-state — not strictly required (React tests don't suffer
// Phaser's module-load probes), but keeps arithmetic decisions testable
// without mounting a component.

import type { HomePort, ResourceId } from '@colonize/core';

export type TradeQuantities = Readonly<Record<ResourceId, number>>;

export interface TradeLine {
  readonly resourceId: ResourceId;
  readonly qty: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

export interface TradeTotals {
  readonly lines: readonly TradeLine[];
  readonly netCoin: number;
}

// Per-line unit price and line total in coin. Sign convention:
//   qty > 0 → player buys qty from port at sellPrice; lineTotal < 0 (cost)
//   qty < 0 → player sells |qty| to port at buyBackPrice; lineTotal > 0 (revenue)
//   qty = 0 → priced at midPrice (spread midpoint), lineTotal = 0
export function computeTradeLine(port: HomePort, resourceId: ResourceId, qty: number): TradeLine {
  if (!Number.isInteger(qty)) {
    throw new RangeError(`computeTradeLine: qty must be an integer (got ${qty})`);
  }
  if (!port.trades(resourceId)) {
    throw new RangeError(`computeTradeLine: resource "${resourceId}" not traded at this port`);
  }
  let unitPrice: number;
  if (qty > 0) {
    unitPrice = port.sellPrice(resourceId);
  } else if (qty < 0) {
    unitPrice = port.buyBackPrice(resourceId);
  } else {
    unitPrice = port.midPrice(resourceId);
  }
  const lineTotal = qty > 0 ? -qty * unitPrice : qty < 0 ? -qty * unitPrice : 0;
  return { resourceId, qty, unitPrice, lineTotal };
}

// Sum lines across every traded resource, even zero-qty ones — the UI
// renders a row per tradable resource, and a stable line-set simplifies
// slider rendering. Lines are returned sorted by resourceId to match
// HomePort.tradedResources' ordering.
export function computeTradeTotals(port: HomePort, quantities: TradeQuantities): TradeTotals {
  const lines: TradeLine[] = [];
  let netCoin = 0;
  for (const resourceId of port.tradedResources) {
    const qty = quantities[resourceId] ?? 0;
    const line = computeTradeLine(port, resourceId, qty);
    lines.push(line);
    netCoin += line.lineTotal;
  }
  return { lines, netCoin };
}
