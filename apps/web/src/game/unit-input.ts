import type { UnitJSON } from '@colonize/core';

import { renderedTileSize } from './tile-atlas';

// Pure helpers extracted from GameScene so click-to-select logic is
// unit-testable without mounting Phaser. The scene supplies its own
// world coordinates (via Phaser.Input.Pointer) and the current unit
// roster; everything else is plain arithmetic + a roster scan.

export function worldToTile(worldX: number, worldY: number): { x: number; y: number } {
  const size = renderedTileSize();
  return {
    x: Math.floor(worldX / size),
    y: Math.floor(worldY / size),
  };
}

export function isTileInBounds(
  tile: { x: number; y: number },
  mapWidth: number,
  mapHeight: number,
): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < mapWidth && tile.y < mapHeight;
}

// Returns the *first* matching unit's id at the given tile, or null.
// Co-located units are deferred to a future stack-picker UI; the first
// hit is deterministic given the roster's order.
export function pickUnitIdAtTile(
  tile: { x: number; y: number },
  units: readonly UnitJSON[],
): string | null {
  for (const unit of units) {
    if (unit.position.x === tile.x && unit.position.y === tile.y) {
      return unit.id;
    }
  }
  return null;
}

// Lookup by id; null when missing (the selected unit may have been
// removed by a turn resolution between selection and a subsequent
// render).
export function findUnitById(unitId: string | null, units: readonly UnitJSON[]): UnitJSON | null {
  if (unitId === null) return null;
  return units.find((u) => u.id === unitId) ?? null;
}
