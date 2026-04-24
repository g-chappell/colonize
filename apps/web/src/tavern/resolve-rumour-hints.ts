import type { Coord, MapHint } from '@colonize/core';
import { collectTavernRumourHints, type TavernRumourId } from '@colonize/content';

// Turn a tavern's rumour roll into `MapHint` values pinned to the
// colony that surfaced them. Pure — the store action composes this
// with the encounter slice + colony-position lookup. Rumours that
// carry no hint metadata are silently skipped. The output order
// mirrors the rumour-id order so the UI can render leads in the same
// order the tavern presented them.
export function resolveTavernHints(
  origin: Coord,
  rumourIds: readonly TavernRumourId[],
): readonly MapHint[] {
  return collectTavernRumourHints(rumourIds).map(({ rumourId, hint }) => ({
    origin: { x: origin.x, y: origin.y },
    direction: hint.direction,
    category: hint.category,
    sourceRumourId: rumourId,
  }));
}
