// FactionBonus — centralised per-faction mechanical bonus registry.
//
// Scope locked to the four MVP playable factions (Order of the Kraken,
// Ironclad Syndicate, Phantom Corsairs, Bloodborne Legion) and the bonus
// surfaces named in the faction-select flavour copy that content owns:
//
//   - OTK         — Red Tide traversal + Legendary Ship blueprint redemption.
//   - Ironclad    — +10% colony production, -20% shipyard cost.
//   - Phantom     — stealth on open ocean, +50% raid loot.
//   - Bloodborne  — +15% combat damage, one free soldier per colony per turn.
//
// Each bonus is exposed through a scalar / flag helper so consumers that
// already accept a scalar seam (pathfind's `redTideImmunity` flag, colony
// production multipliers, combat damage multipliers) can query by faction
// id without this module reaching into their internals. Per CLAUDE.md
// "Scalar seams for pre-registry axis values": future wiring tasks
// (colony-production executor, combat orchestrator, raid action) call
// these helpers; this module ships only the registry + lookups, not the
// per-turn iteration that applies them.
//
// Duplication note: `PlayableFactionId` is also declared in
// `@colonize/content/factions.ts`. Per CLAUDE.md's
// "Rule-relevant stats live in `@colonize/core`; descriptive / flavour
// stats live in `@colonize/content`", the mechanical values live here
// (core can't import content and vice versa) and the drift guard is two
// sibling tests — one in each package — asserting the canonical MVP set.

import { BuildingType } from '../building/building-type.js';
import type { PathfindFlags } from '../map/pathfind.js';

export type PlayableFactionId = 'otk' | 'ironclad' | 'phantom' | 'bloodborne';

export const ALL_PLAYABLE_FACTION_IDS: readonly PlayableFactionId[] = [
  'otk',
  'ironclad',
  'phantom',
  'bloodborne',
];

export function isPlayableFactionId(value: unknown): value is PlayableFactionId {
  return (
    typeof value === 'string' && (ALL_PLAYABLE_FACTION_IDS as readonly string[]).includes(value)
  );
}

export interface FactionBonus {
  readonly redTideImmunity: boolean;
  readonly canRedeemLegendaryBlueprint: boolean;
  readonly colonyProductionMultiplier: number;
  readonly shipyardCostMultiplier: number;
  readonly openOceanStealth: boolean;
  readonly raidLootMultiplier: number;
  readonly combatDamageMultiplier: number;
  readonly freeSoldierPerColonyPerTurn: boolean;
}

const NEUTRAL_BONUS: FactionBonus = {
  redTideImmunity: false,
  canRedeemLegendaryBlueprint: false,
  colonyProductionMultiplier: 1,
  shipyardCostMultiplier: 1,
  openOceanStealth: false,
  raidLootMultiplier: 1,
  combatDamageMultiplier: 1,
  freeSoldierPerColonyPerTurn: false,
};

export const FACTION_BONUSES: Readonly<Record<PlayableFactionId, FactionBonus>> = {
  otk: {
    ...NEUTRAL_BONUS,
    redTideImmunity: true,
    canRedeemLegendaryBlueprint: true,
  },
  ironclad: {
    ...NEUTRAL_BONUS,
    colonyProductionMultiplier: 1.1,
    shipyardCostMultiplier: 0.8,
  },
  phantom: {
    ...NEUTRAL_BONUS,
    openOceanStealth: true,
    raidLootMultiplier: 1.5,
  },
  bloodborne: {
    ...NEUTRAL_BONUS,
    combatDamageMultiplier: 1.15,
    freeSoldierPerColonyPerTurn: true,
  },
};

export function getFactionBonus(id: PlayableFactionId): FactionBonus {
  switch (id) {
    case 'otk':
    case 'ironclad':
    case 'phantom':
    case 'bloodborne':
      return FACTION_BONUSES[id];
  }
}

// Produce `PathfindFlags` that OR the faction's Red Tide immunity into a
// caller-supplied base. When the faction grants immunity, the returned flags
// always have `redTideImmunity: true`; otherwise the base is returned
// unchanged (respecting `exactOptionalPropertyTypes` — an absent key and
// an explicit `undefined` are different shapes).
export function factionPathfindFlags(
  id: PlayableFactionId,
  base: PathfindFlags = {},
): PathfindFlags {
  const bonus = getFactionBonus(id);
  if (!bonus.redTideImmunity) return base;
  return { ...base, redTideImmunity: true };
}

export function factionColonyProductionMultiplier(id: PlayableFactionId): number {
  return getFactionBonus(id).colonyProductionMultiplier;
}

// Scalar cost multiplier applied by a faction-adjusted shipyard-build path.
// Returns 1 for every building other than Shipyard; the Shipyard discount is
// the only building-specific price bonus in the MVP roster, so callers can
// multiply per-resource cost amounts by this scalar without branching on
// `BuildingType` themselves.
export function factionBuildingCostMultiplier(
  id: PlayableFactionId,
  building: BuildingType,
): number {
  const bonus = getFactionBonus(id);
  return building === BuildingType.Shipyard ? bonus.shipyardCostMultiplier : 1;
}

export function factionCombatDamageMultiplier(id: PlayableFactionId): number {
  return getFactionBonus(id).combatDamageMultiplier;
}

export function factionRaidLootMultiplier(id: PlayableFactionId): number {
  return getFactionBonus(id).raidLootMultiplier;
}

export function factionHasOpenOceanStealth(id: PlayableFactionId): boolean {
  return getFactionBonus(id).openOceanStealth;
}

export function factionCanRedeemLegendaryBlueprint(id: PlayableFactionId): boolean {
  return getFactionBonus(id).canRedeemLegendaryBlueprint;
}

export function factionGrantsFreeSoldierPerColonyPerTurn(id: PlayableFactionId): boolean {
  return getFactionBonus(id).freeSoldierPerColonyPerTurn;
}
