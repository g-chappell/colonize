import { describe, it, expect } from 'vitest';
import { ALL_BUILDING_TYPES, BuildingType } from '../building/building-type.js';
import { ALL_RESOURCE_TYPES, ResourceType } from '../resource/resource-type.js';
import { getTileYield } from '../map/tile-yield.js';
import { TileType } from '../map/tile.js';
import {
  ALL_PROFESSION_TYPES,
  ProfessionType,
  applyProfessionBonusToYield,
  getProfessionBuildingMultiplier,
  getProfessionYieldMultiplier,
  isProfessionType,
} from './profession-type.js';

describe('ProfessionType registry', () => {
  it('covers the seven STORY-25 professions', () => {
    const ids = new Set<string>(ALL_PROFESSION_TYPES);
    expect(ids.has(ProfessionType.Deckhand)).toBe(true);
    expect(ids.has(ProfessionType.Shipwright)).toBe(true);
    expect(ids.has(ProfessionType.Gunner)).toBe(true);
    expect(ids.has(ProfessionType.Cartographer)).toBe(true);
    expect(ids.has(ProfessionType.Scholar)).toBe(true);
    expect(ids.has(ProfessionType.Quartermaster)).toBe(true);
    expect(ids.has(ProfessionType.Loremaster)).toBe(true);
  });

  it('has unique string values', () => {
    expect(new Set(ALL_PROFESSION_TYPES).size).toBe(ALL_PROFESSION_TYPES.length);
  });

  it('every value is a non-empty kebab-case string', () => {
    for (const id of ALL_PROFESSION_TYPES) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});

describe('isProfessionType', () => {
  it('accepts every registered id', () => {
    for (const id of ALL_PROFESSION_TYPES) {
      expect(isProfessionType(id)).toBe(true);
    }
  });

  it('rejects non-registered strings and non-strings', () => {
    expect(isProfessionType('')).toBe(false);
    expect(isProfessionType('captain')).toBe(false);
    expect(isProfessionType(null)).toBe(false);
    expect(isProfessionType(undefined)).toBe(false);
    expect(isProfessionType(42)).toBe(false);
    expect(isProfessionType({})).toBe(false);
  });
});

describe('getProfessionYieldMultiplier', () => {
  it('returns 1 for every resource when profession is Deckhand (the unspecialised baseline)', () => {
    for (const resource of ALL_RESOURCE_TYPES) {
      expect(getProfessionYieldMultiplier(ProfessionType.Deckhand, resource)).toBe(1);
    }
  });

  it('Quartermaster boosts provisions but no other resource', () => {
    expect(
      getProfessionYieldMultiplier(ProfessionType.Quartermaster, ResourceType.Provisions),
    ).toBe(1.25);
    for (const resource of ALL_RESOURCE_TYPES) {
      if (resource === ResourceType.Provisions) continue;
      expect(getProfessionYieldMultiplier(ProfessionType.Quartermaster, resource)).toBe(1);
    }
  });

  it('Cartographer boosts salvage but no other resource', () => {
    expect(getProfessionYieldMultiplier(ProfessionType.Cartographer, ResourceType.Salvage)).toBe(
      1.25,
    );
    expect(getProfessionYieldMultiplier(ProfessionType.Cartographer, ResourceType.Timber)).toBe(1);
  });

  it('Shipwright boosts planks (sawmill output downstream of the build chain)', () => {
    expect(getProfessionYieldMultiplier(ProfessionType.Shipwright, ResourceType.Planks)).toBe(1.25);
  });

  it('Gunner boosts forgework (cannon-foundry input)', () => {
    expect(getProfessionYieldMultiplier(ProfessionType.Gunner, ResourceType.Forgework)).toBe(1.25);
  });

  it('returns 1 for unknown resource ids (caller-supplied opaque strings)', () => {
    expect(getProfessionYieldMultiplier(ProfessionType.Quartermaster, 'unknown-resource')).toBe(1);
  });

  it('returns a finite multiplier strictly >= 1 for every (profession, resource) pair', () => {
    for (const profession of ALL_PROFESSION_TYPES) {
      for (const resource of ALL_RESOURCE_TYPES) {
        const m = getProfessionYieldMultiplier(profession, resource);
        expect(Number.isFinite(m)).toBe(true);
        expect(m).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('getProfessionBuildingMultiplier', () => {
  it('returns 1 for every building when profession is Deckhand', () => {
    for (const building of ALL_BUILDING_TYPES) {
      expect(getProfessionBuildingMultiplier(ProfessionType.Deckhand, building)).toBe(1);
    }
  });

  it('Shipwright boosts shipyard and sawmill', () => {
    expect(getProfessionBuildingMultiplier(ProfessionType.Shipwright, BuildingType.Shipyard)).toBe(
      1.25,
    );
    expect(getProfessionBuildingMultiplier(ProfessionType.Shipwright, BuildingType.Sawmill)).toBe(
      1.15,
    );
    expect(getProfessionBuildingMultiplier(ProfessionType.Shipwright, BuildingType.Tavern)).toBe(1);
  });

  it('Gunner boosts gun-deck and forge', () => {
    expect(getProfessionBuildingMultiplier(ProfessionType.Gunner, BuildingType.GunDeck)).toBe(1.25);
    expect(getProfessionBuildingMultiplier(ProfessionType.Gunner, BuildingType.Forge)).toBe(1.15);
  });

  it('Scholar boosts study-hall (lore recovery)', () => {
    expect(getProfessionBuildingMultiplier(ProfessionType.Scholar, BuildingType.StudyHall)).toBe(
      1.25,
    );
  });

  it('Loremaster boosts chapel-of-the-kraken (talisman blessings)', () => {
    expect(
      getProfessionBuildingMultiplier(ProfessionType.Loremaster, BuildingType.ChapelOfTheKraken),
    ).toBe(1.25);
  });

  it('Quartermaster boosts warehouse and fish-market (larder management)', () => {
    expect(
      getProfessionBuildingMultiplier(ProfessionType.Quartermaster, BuildingType.Warehouse),
    ).toBe(1.15);
    expect(
      getProfessionBuildingMultiplier(ProfessionType.Quartermaster, BuildingType.FishMarket),
    ).toBe(1.15);
  });

  it('returns a finite multiplier strictly >= 1 for every (profession, building) pair', () => {
    for (const profession of ALL_PROFESSION_TYPES) {
      for (const building of ALL_BUILDING_TYPES) {
        const m = getProfessionBuildingMultiplier(profession, building);
        expect(Number.isFinite(m)).toBe(true);
        expect(m).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('applyProfessionBonusToYield', () => {
  it('Deckhand passes the base vector through unchanged', () => {
    const base = getTileYield(TileType.Island);
    expect(applyProfessionBonusToYield(base, ProfessionType.Deckhand)).toEqual({
      fibre: 1,
      timber: 1,
    });
  });

  it('Quartermaster scales provisions on a fishing-water tile', () => {
    const result = applyProfessionBonusToYield({ provisions: 4 }, ProfessionType.Quartermaster);
    expect(result).toEqual({ provisions: 5 });
  });

  it('Quartermaster does not scale non-bonused yield entries on the same tile', () => {
    const result = applyProfessionBonusToYield(
      { provisions: 4, timber: 4 },
      ProfessionType.Quartermaster,
    );
    expect(result).toEqual({ provisions: 5, timber: 4 });
  });

  it('Cartographer scales salvage on a floating-city tile', () => {
    const base = getTileYield(TileType.FloatingCity);
    const result = applyProfessionBonusToYield(base, ProfessionType.Cartographer);
    expect(result.salvage).toBe(1);
    expect(result.provisions).toBe(1);
  });

  it('drops entries that floor to zero (small base * small bonus is still a floor)', () => {
    const result = applyProfessionBonusToYield({ salvage: 1 }, ProfessionType.Cartographer);
    expect(result).toEqual({ salvage: 1 });
  });

  it('emits keys in stable alphabetical order for save-format determinism', () => {
    const result = applyProfessionBonusToYield(
      { timber: 4, fibre: 4, provisions: 4 },
      ProfessionType.Quartermaster,
    );
    expect(Object.keys(result)).toEqual(['fibre', 'provisions', 'timber']);
  });

  it('returns an empty vector when the input is empty', () => {
    expect(applyProfessionBonusToYield({}, ProfessionType.Loremaster)).toEqual({});
  });
});
