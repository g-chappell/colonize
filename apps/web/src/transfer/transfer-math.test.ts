import { describe, it, expect } from 'vitest';
import type { CargoHoldJSON } from '@colonize/core';
import { computeTransferRows } from './transfer-math';

const empty: CargoHoldJSON = { resources: {}, artifacts: [] };

describe('computeTransferRows', () => {
  it('returns no rows when both sides are empty', () => {
    expect(computeTransferRows(empty, empty)).toEqual([]);
  });

  it('emits one row per resource present on either side', () => {
    const ship: CargoHoldJSON = { resources: { timber: 4 }, artifacts: [] };
    const colony: CargoHoldJSON = { resources: { fibre: 2 }, artifacts: [] };
    const rows = computeTransferRows(ship, colony);
    expect(rows).toEqual([
      { resourceId: 'fibre', shipQty: 0, colonyQty: 2 },
      { resourceId: 'timber', shipQty: 4, colonyQty: 0 },
    ]);
  });

  it('combines quantities when both sides hold the same resource', () => {
    const ship: CargoHoldJSON = { resources: { rum: 3 }, artifacts: [] };
    const colony: CargoHoldJSON = { resources: { rum: 7 }, artifacts: [] };
    expect(computeTransferRows(ship, colony)).toEqual([
      { resourceId: 'rum', shipQty: 3, colonyQty: 7 },
    ]);
  });

  it('sorts rows alphabetically regardless of insertion order', () => {
    const ship: CargoHoldJSON = { resources: { zucchini: 1, apple: 2 }, artifacts: [] };
    const colony: CargoHoldJSON = { resources: { mango: 3, apple: 5 }, artifacts: [] };
    const rows = computeTransferRows(ship, colony);
    expect(rows.map((r) => r.resourceId)).toEqual(['apple', 'mango', 'zucchini']);
    expect(rows.find((r) => r.resourceId === 'apple')).toEqual({
      resourceId: 'apple',
      shipQty: 2,
      colonyQty: 5,
    });
  });

  it('treats artifacts as out-of-scope (resource rows only)', () => {
    const ship: CargoHoldJSON = { resources: {}, artifacts: ['kraken-totem'] };
    const colony: CargoHoldJSON = { resources: {}, artifacts: ['salt-charm'] };
    expect(computeTransferRows(ship, colony)).toEqual([]);
  });
});
