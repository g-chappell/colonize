// colony-fortification — pure helper translating a colony's building
// list into the visual cue (stroke color + width) the Phaser colony
// container should render.
//
// Per CLAUDE.md "Pure-sibling module pattern for Phaser game code":
// every branch + tier-lookup lives here so the unit tests run without
// Phaser in the import graph. game-scene.ts imports this and applies
// the returned style to the colony body's strokeStyle.
//
// Highest fortification tier wins (the buildings are an upgrade
// ladder, not stacking) — same rule as @colonize/core's
// getFortificationDefenderBonus, but expressed in the visual axis
// (color + thickness) rather than the combat-multiplier axis. Kept as
// a sibling helper rather than re-using the core function so this
// module owns its own test surface and survives a future re-tune of
// either axis without cross-coupling.

import { BuildingType, isBuildingType } from '@colonize/core';
import type { ColonyJSON } from '@colonize/core';

export const COLONY_BASE_STROKE_COLOR = 0xd6b466;
export const COLONY_BASE_STROKE_WIDTH = 2;

export const COLONY_STOCKADE_STROKE_COLOR = 0xa6824a;
export const COLONY_STOCKADE_STROKE_WIDTH = 3;

export const COLONY_BASTION_STROKE_COLOR = 0xc9c1a8;
export const COLONY_BASTION_STROKE_WIDTH = 4;

export const COLONY_CITADEL_STROKE_COLOR = 0xf2e6b2;
export const COLONY_CITADEL_STROKE_WIDTH = 5;

export type ColonyFortificationTier = 'none' | 'stockade' | 'bastion' | 'citadel';

export interface ColonyFortificationVisual {
  readonly tier: ColonyFortificationTier;
  readonly strokeColor: number;
  readonly strokeWidth: number;
}

const NONE: ColonyFortificationVisual = {
  tier: 'none',
  strokeColor: COLONY_BASE_STROKE_COLOR,
  strokeWidth: COLONY_BASE_STROKE_WIDTH,
};

const STOCKADE: ColonyFortificationVisual = {
  tier: 'stockade',
  strokeColor: COLONY_STOCKADE_STROKE_COLOR,
  strokeWidth: COLONY_STOCKADE_STROKE_WIDTH,
};

const BASTION: ColonyFortificationVisual = {
  tier: 'bastion',
  strokeColor: COLONY_BASTION_STROKE_COLOR,
  strokeWidth: COLONY_BASTION_STROKE_WIDTH,
};

const CITADEL: ColonyFortificationVisual = {
  tier: 'citadel',
  strokeColor: COLONY_CITADEL_STROKE_COLOR,
  strokeWidth: COLONY_CITADEL_STROKE_WIDTH,
};

export function getColonyFortificationVisual(colony: ColonyJSON): ColonyFortificationVisual {
  const owned = new Set<string>();
  for (const id of colony.buildings) {
    if (isBuildingType(id)) owned.add(id);
  }
  if (owned.has(BuildingType.Citadel)) return CITADEL;
  if (owned.has(BuildingType.Bastion)) return BASTION;
  if (owned.has(BuildingType.Stockade)) return STOCKADE;
  return NONE;
}
