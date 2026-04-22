import type { ColonyJSON } from '@colonize/core';

// Pure helpers extracted from GameScene so colony click-detection is
// unit-testable without mounting Phaser. The scene supplies a tile
// coord (already translated from world via `worldToTile`) and the
// current colony roster; this module returns the matching id or null.
//
// Tie-breaking: the *first* matching colony in roster order. Multiple
// colonies on the same tile is invalid game state (founding rejects
// occupied tiles in TASK-038's `canFoundColonyAt`), so the tie-break
// is defensive — it only matters if a save migration ever produces
// duplicates, in which case the leading id wins.

export function pickColonyIdAtTile(
  tile: { x: number; y: number },
  colonies: readonly ColonyJSON[],
): string | null {
  for (const colony of colonies) {
    if (colony.position.x === tile.x && colony.position.y === tile.y) {
      return colony.id;
    }
  }
  return null;
}
