// Pure cargo-transfer line generation. Given a ship's cargo and a
// colony's stockpile, emit one stable row per resource that exists on
// either side, sorted alphabetically so the slider list is stable
// across re-renders. Sibling-module shape mirrors trade-math: not
// strictly required by the Phaser-isolation rule, but keeps slider
// math testable without mounting the React tree.

import type { CargoHoldJSON, ResourceId } from '@colonize/core';

export interface TransferRow {
  readonly resourceId: ResourceId;
  // Quantity currently held by the ship.
  readonly shipQty: number;
  // Quantity currently in the colony stockpile.
  readonly colonyQty: number;
}

// Return one row per resource present in either the ship cargo or the
// colony stocks. Rows are sorted alphabetically by resource id so the
// slider list does not reorder when a transfer drops a key from one
// side or the other.
export function computeTransferRows(
  shipCargo: CargoHoldJSON,
  colonyStocks: CargoHoldJSON,
): readonly TransferRow[] {
  const ids = new Set<string>();
  for (const id of Object.keys(shipCargo.resources)) ids.add(id);
  for (const id of Object.keys(colonyStocks.resources)) ids.add(id);
  const rows: TransferRow[] = [];
  for (const id of [...ids].sort()) {
    rows.push({
      resourceId: id,
      shipQty: shipCargo.resources[id] ?? 0,
      colonyQty: colonyStocks.resources[id] ?? 0,
    });
  }
  return rows;
}
