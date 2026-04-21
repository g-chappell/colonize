import { UnitType } from '@colonize/core';
import type { FactionId } from '@colonize/core';
import type { PlayableFaction } from '../store/game';

// Pre-art-epic placeholder visuals: each unit type renders as a tinted
// shape with a one-letter glyph. A future art-epic task will swap this
// for a real sprite atlas; consumers only depend on UnitVisualSpec, so
// the swap stays local. Pattern parallels the inline-SVG heraldry
// approach used for menu chrome (CLAUDE.md).

export type UnitShape = 'circle' | 'square' | 'diamond';

export interface UnitVisualSpec {
  // Rendered glyph (1–2 chars) painted on top of the body shape.
  readonly label: string;
  // Body shape; the renderer picks the matching Phaser primitive.
  readonly shape: UnitShape;
}

// Visuals for each UnitType. `shape` differentiates land units (circle)
// from warships (square) and Settlers (diamond) so the silhouettes are
// readable at small zooms even before the art ships.
export const UNIT_VISUAL_SPECS: Readonly<Record<UnitType, UnitVisualSpec>> = {
  [UnitType.Scout]: { label: 'S', shape: 'circle' },
  [UnitType.Settler]: { label: 'C', shape: 'diamond' },
  [UnitType.Sloop]: { label: 'L', shape: 'square' },
  [UnitType.Brig]: { label: 'B', shape: 'square' },
  [UnitType.Frigate]: { label: 'F', shape: 'square' },
  [UnitType.ShipOfTheLine]: { label: 'X', shape: 'square' },
  [UnitType.Privateer]: { label: 'P', shape: 'square' },
};

export function visualForUnitType(type: UnitType): UnitVisualSpec {
  return UNIT_VISUAL_SPECS[type];
}

// Faction tints, packed as 24-bit RGB integers to match Phaser's
// `setFillStyle(color)` argument shape. NPC / unknown factions fall
// back to a desaturated steel grey.
export const FACTION_COLORS: Readonly<Record<PlayableFaction, number>> = {
  otk: 0x2d6e8e,
  ironclad: 0x6b6b6b,
  phantom: 0x6a4fa0,
  bloodborne: 0xa8302d,
};

export const NEUTRAL_FACTION_COLOR = 0x4a4a4a;
export const SELECTION_RING_COLOR = 0xf2c44a;

const PLAYABLE_FACTION_IDS: readonly string[] = Object.keys(FACTION_COLORS);

export function colorForFaction(faction: FactionId): number {
  if (PLAYABLE_FACTION_IDS.includes(faction)) {
    return FACTION_COLORS[faction as PlayableFaction];
  }
  return NEUTRAL_FACTION_COLOR;
}

// Sprite body diameter / side as a fraction of one rendered tile. The
// scene multiplies this by the rendered tile size; pulling it out as a
// constant keeps the sibling free of TILE_SIZE coupling.
export const UNIT_BODY_SCALE = 0.6;
export const SELECTION_RING_SCALE = 0.85;
