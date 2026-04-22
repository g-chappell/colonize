import { describe, it, expect } from 'vitest';
import { ALL_BUILDING_TYPES, BuildingType } from '../building/building-type.js';
import { TileType } from '../map/tile.js';
import { tileCost } from '../map/pathfind.js';
import {
  ALL_PLAYABLE_FACTION_IDS,
  FACTION_BONUSES,
  factionBuildingCostMultiplier,
  factionCanRedeemLegendaryBlueprint,
  factionColonyProductionMultiplier,
  factionCombatDamageMultiplier,
  factionGrantsFreeSoldierPerColonyPerTurn,
  factionHasOpenOceanStealth,
  factionPathfindFlags,
  factionRaidLootMultiplier,
  getFactionBonus,
  isPlayableFactionId,
  type PlayableFactionId,
} from './faction-bonus.js';

describe('PlayableFactionId registry', () => {
  it('covers the four MVP playable factions', () => {
    expect([...ALL_PLAYABLE_FACTION_IDS].sort()).toEqual([
      'bloodborne',
      'ironclad',
      'otk',
      'phantom',
    ]);
  });

  it('has unique string values', () => {
    expect(new Set(ALL_PLAYABLE_FACTION_IDS).size).toBe(ALL_PLAYABLE_FACTION_IDS.length);
  });

  it('every value is a non-empty kebab-case string', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});

describe('isPlayableFactionId', () => {
  it('accepts every registered id', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(isPlayableFactionId(id)).toBe(true);
    }
  });

  it('rejects non-registered strings and non-strings', () => {
    expect(isPlayableFactionId('')).toBe(false);
    expect(isPlayableFactionId('dominion')).toBe(false);
    expect(isPlayableFactionId('concord')).toBe(false);
    expect(isPlayableFactionId(null)).toBe(false);
    expect(isPlayableFactionId(undefined)).toBe(false);
    expect(isPlayableFactionId(42)).toBe(false);
    expect(isPlayableFactionId({})).toBe(false);
  });
});

describe('FACTION_BONUSES', () => {
  it('has an entry for every playable faction', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(FACTION_BONUSES[id]).toBeDefined();
    }
  });

  it('OTK carries Red Tide immunity and Legendary blueprint eligibility', () => {
    const otk = FACTION_BONUSES.otk;
    expect(otk.redTideImmunity).toBe(true);
    expect(otk.canRedeemLegendaryBlueprint).toBe(true);
  });

  it('OTK alone can redeem Legendary blueprints', () => {
    expect(FACTION_BONUSES.otk.canRedeemLegendaryBlueprint).toBe(true);
    expect(FACTION_BONUSES.ironclad.canRedeemLegendaryBlueprint).toBe(false);
    expect(FACTION_BONUSES.phantom.canRedeemLegendaryBlueprint).toBe(false);
    expect(FACTION_BONUSES.bloodborne.canRedeemLegendaryBlueprint).toBe(false);
  });

  it('OTK alone sails Red Tide unharmed', () => {
    expect(FACTION_BONUSES.otk.redTideImmunity).toBe(true);
    expect(FACTION_BONUSES.ironclad.redTideImmunity).toBe(false);
    expect(FACTION_BONUSES.phantom.redTideImmunity).toBe(false);
    expect(FACTION_BONUSES.bloodborne.redTideImmunity).toBe(false);
  });

  it('Ironclad carries +production and cheaper shipyards', () => {
    const ic = FACTION_BONUSES.ironclad;
    expect(ic.colonyProductionMultiplier).toBeGreaterThan(1);
    expect(ic.shipyardCostMultiplier).toBeLessThan(1);
  });

  it('Ironclad is the only faction with a non-neutral colony production multiplier', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      const expected = id === 'ironclad' ? 1.1 : 1;
      expect(FACTION_BONUSES[id].colonyProductionMultiplier).toBe(expected);
    }
  });

  it('Ironclad is the only faction with a non-neutral shipyard cost multiplier', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      const expected = id === 'ironclad' ? 0.8 : 1;
      expect(FACTION_BONUSES[id].shipyardCostMultiplier).toBe(expected);
    }
  });

  it('Phantom carries open-ocean stealth and bonus raid loot', () => {
    const phantom = FACTION_BONUSES.phantom;
    expect(phantom.openOceanStealth).toBe(true);
    expect(phantom.raidLootMultiplier).toBeGreaterThan(1);
  });

  it('Phantom is the only faction with open-ocean stealth', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(FACTION_BONUSES[id].openOceanStealth).toBe(id === 'phantom');
    }
  });

  it('Bloodborne carries +combat and a per-colony free soldier per turn', () => {
    const bb = FACTION_BONUSES.bloodborne;
    expect(bb.combatDamageMultiplier).toBeGreaterThan(1);
    expect(bb.freeSoldierPerColonyPerTurn).toBe(true);
  });

  it('Bloodborne is the only faction with a non-neutral combat damage multiplier', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      const expected = id === 'bloodborne' ? 1.15 : 1;
      expect(FACTION_BONUSES[id].combatDamageMultiplier).toBe(expected);
    }
  });

  it('Bloodborne is the only faction granting a per-turn free soldier per colony', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(FACTION_BONUSES[id].freeSoldierPerColonyPerTurn).toBe(id === 'bloodborne');
    }
  });

  it('every multiplier is finite and positive', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      const b = FACTION_BONUSES[id];
      for (const m of [
        b.colonyProductionMultiplier,
        b.shipyardCostMultiplier,
        b.raidLootMultiplier,
        b.combatDamageMultiplier,
      ]) {
        expect(Number.isFinite(m)).toBe(true);
        expect(m).toBeGreaterThan(0);
      }
    }
  });

  it('no faction carries more than two non-neutral fields (bonuses stay focused)', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      const b = FACTION_BONUSES[id];
      const nonNeutral = [
        b.redTideImmunity,
        b.canRedeemLegendaryBlueprint,
        b.colonyProductionMultiplier !== 1,
        b.shipyardCostMultiplier !== 1,
        b.openOceanStealth,
        b.raidLootMultiplier !== 1,
        b.combatDamageMultiplier !== 1,
        b.freeSoldierPerColonyPerTurn,
      ].filter(Boolean).length;
      expect(nonNeutral).toBeLessThanOrEqual(2);
    }
  });
});

describe('getFactionBonus', () => {
  it('returns the registry entry for every playable faction id', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(getFactionBonus(id)).toBe(FACTION_BONUSES[id]);
    }
  });
});

describe('factionPathfindFlags', () => {
  it('adds redTideImmunity for OTK when base is empty', () => {
    expect(factionPathfindFlags('otk')).toEqual({ redTideImmunity: true });
  });

  it('returns the base unchanged for non-OTK factions', () => {
    expect(factionPathfindFlags('ironclad')).toEqual({});
    expect(factionPathfindFlags('phantom')).toEqual({});
    expect(factionPathfindFlags('bloodborne')).toEqual({});
  });

  it('ORs OTK immunity into a base that already sets wind/current', () => {
    const base = { redTideImmunity: false } as const;
    const out = factionPathfindFlags('otk', base);
    expect(out.redTideImmunity).toBe(true);
  });

  it('preserves non-redTide base flags for non-OTK factions', () => {
    const base = { redTideImmunity: true } as const;
    const out = factionPathfindFlags('ironclad', base);
    expect(out.redTideImmunity).toBe(true);
  });

  it('plugs into tileCost to make Red Tide traversable for OTK', () => {
    const otkFlags = factionPathfindFlags('otk');
    const iconFlags = factionPathfindFlags('ironclad');
    expect(tileCost(TileType.RedTide, otkFlags)).toBe(1);
    expect(tileCost(TileType.RedTide, iconFlags)).toBe(Infinity);
  });
});

describe('factionColonyProductionMultiplier', () => {
  it('returns 1.1 for Ironclad and 1 for everyone else', () => {
    expect(factionColonyProductionMultiplier('otk')).toBe(1);
    expect(factionColonyProductionMultiplier('ironclad')).toBe(1.1);
    expect(factionColonyProductionMultiplier('phantom')).toBe(1);
    expect(factionColonyProductionMultiplier('bloodborne')).toBe(1);
  });
});

describe('factionBuildingCostMultiplier', () => {
  it('applies the Ironclad discount only to the Shipyard', () => {
    expect(factionBuildingCostMultiplier('ironclad', BuildingType.Shipyard)).toBe(0.8);
    expect(factionBuildingCostMultiplier('ironclad', BuildingType.Tavern)).toBe(1);
    expect(factionBuildingCostMultiplier('ironclad', BuildingType.Forge)).toBe(1);
  });

  it('returns 1 for every (faction, building) pair other than Ironclad+Shipyard', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      for (const building of ALL_BUILDING_TYPES) {
        const m = factionBuildingCostMultiplier(id, building);
        const isIroncladShipyard = id === 'ironclad' && building === BuildingType.Shipyard;
        expect(m).toBe(isIroncladShipyard ? 0.8 : 1);
      }
    }
  });
});

describe('factionCombatDamageMultiplier', () => {
  it('returns 1.15 for Bloodborne and 1 for everyone else', () => {
    expect(factionCombatDamageMultiplier('bloodborne')).toBe(1.15);
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      if (id === 'bloodborne') continue;
      expect(factionCombatDamageMultiplier(id)).toBe(1);
    }
  });
});

describe('factionRaidLootMultiplier', () => {
  it('returns 1.5 for Phantom and 1 for everyone else', () => {
    expect(factionRaidLootMultiplier('phantom')).toBe(1.5);
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      if (id === 'phantom') continue;
      expect(factionRaidLootMultiplier(id)).toBe(1);
    }
  });
});

describe('factionHasOpenOceanStealth', () => {
  it('returns true only for Phantom', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(factionHasOpenOceanStealth(id)).toBe(id === 'phantom');
    }
  });
});

describe('factionCanRedeemLegendaryBlueprint', () => {
  it('returns true only for OTK', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(factionCanRedeemLegendaryBlueprint(id)).toBe(id === 'otk');
    }
  });
});

describe('factionGrantsFreeSoldierPerColonyPerTurn', () => {
  it('returns true only for Bloodborne', () => {
    for (const id of ALL_PLAYABLE_FACTION_IDS) {
      expect(factionGrantsFreeSoldierPerColonyPerTurn(id)).toBe(id === 'bloodborne');
    }
  });
});

describe('PlayableFactionId drift guard (core side)', () => {
  // Mirror of content/src/factions.test.ts — the two unions are declared
  // separately because content <-> core can't import each other. This test
  // and its content-side sibling jointly pin the canonical MVP set.
  it('matches the canonical MVP set (bloodborne, ironclad, otk, phantom)', () => {
    const canonical: readonly PlayableFactionId[] = ['bloodborne', 'ironclad', 'otk', 'phantom'];
    expect([...ALL_PLAYABLE_FACTION_IDS].sort()).toEqual(canonical);
  });
});
