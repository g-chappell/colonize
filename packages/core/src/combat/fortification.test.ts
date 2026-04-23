import { describe, it, expect } from 'vitest';
import { BuildingType } from '../building/building-type.js';
import {
  FORTIFICATION_NEUTRAL_BONUS,
  FORTIFICATION_TIER_BONUS,
  FORTIFICATION_TIERS_DESCENDING,
  getFortificationDefenderBonus,
  isFortificationTier,
} from './fortification.js';

describe('FORTIFICATION_TIERS_DESCENDING', () => {
  it('lists exactly the three fortification tiers', () => {
    expect(FORTIFICATION_TIERS_DESCENDING.length).toBe(3);
    expect(new Set(FORTIFICATION_TIERS_DESCENDING).size).toBe(3);
  });

  it('every entry resolves through isFortificationTier', () => {
    for (const tier of FORTIFICATION_TIERS_DESCENDING) {
      expect(isFortificationTier(tier)).toBe(true);
    }
  });

  it('orders Citadel → Bastion → Stockade so highest-tier-wins lookups stop early', () => {
    expect(FORTIFICATION_TIERS_DESCENDING[0]).toBe(BuildingType.Citadel);
    expect(FORTIFICATION_TIERS_DESCENDING[2]).toBe(BuildingType.Stockade);
  });
});

describe('FORTIFICATION_TIER_BONUS', () => {
  it('every tier multiplier exceeds the neutral baseline', () => {
    for (const tier of FORTIFICATION_TIERS_DESCENDING) {
      expect(FORTIFICATION_TIER_BONUS[tier]).toBeGreaterThan(FORTIFICATION_NEUTRAL_BONUS);
    }
  });

  it('multipliers ascend Stockade < Bastion < Citadel (design-intent ladder)', () => {
    const stockade = FORTIFICATION_TIER_BONUS[BuildingType.Stockade];
    const bastion = FORTIFICATION_TIER_BONUS[BuildingType.Bastion];
    const citadel = FORTIFICATION_TIER_BONUS[BuildingType.Citadel];
    expect(stockade).toBeLessThan(bastion);
    expect(bastion).toBeLessThan(citadel);
  });

  it('FORTIFICATION_NEUTRAL_BONUS is exactly 1.0 (multiplicative identity)', () => {
    expect(FORTIFICATION_NEUTRAL_BONUS).toBe(1);
  });
});

describe('isFortificationTier', () => {
  it('recognises every fortification building', () => {
    expect(isFortificationTier(BuildingType.Stockade)).toBe(true);
    expect(isFortificationTier(BuildingType.Bastion)).toBe(true);
    expect(isFortificationTier(BuildingType.Citadel)).toBe(true);
  });

  it('rejects non-fortification buildings', () => {
    expect(isFortificationTier(BuildingType.Tavern)).toBe(false);
    expect(isFortificationTier(BuildingType.Watchtower)).toBe(false);
    expect(isFortificationTier(BuildingType.Barracks)).toBe(false);
    expect(isFortificationTier(BuildingType.Shipyard)).toBe(false);
    expect(isFortificationTier(BuildingType.GunDeck)).toBe(false);
  });
});

describe('getFortificationDefenderBonus', () => {
  it('returns the neutral baseline for an empty building set', () => {
    expect(getFortificationDefenderBonus([])).toBe(FORTIFICATION_NEUTRAL_BONUS);
  });

  it('returns the neutral baseline when no fortifications are present', () => {
    expect(getFortificationDefenderBonus([BuildingType.Tavern, BuildingType.Forge])).toBe(
      FORTIFICATION_NEUTRAL_BONUS,
    );
  });

  it('returns the Stockade multiplier when only a Stockade is present', () => {
    expect(getFortificationDefenderBonus([BuildingType.Stockade])).toBe(
      FORTIFICATION_TIER_BONUS[BuildingType.Stockade],
    );
  });

  it('returns the Bastion multiplier when both Stockade and Bastion are present (highest tier wins)', () => {
    expect(getFortificationDefenderBonus([BuildingType.Stockade, BuildingType.Bastion])).toBe(
      FORTIFICATION_TIER_BONUS[BuildingType.Bastion],
    );
  });

  it('returns the Citadel multiplier when all three tiers are present (highest tier wins)', () => {
    expect(
      getFortificationDefenderBonus([
        BuildingType.Stockade,
        BuildingType.Bastion,
        BuildingType.Citadel,
      ]),
    ).toBe(FORTIFICATION_TIER_BONUS[BuildingType.Citadel]);
  });

  it('ignores irrelevant buildings interleaved with fortifications', () => {
    expect(
      getFortificationDefenderBonus([
        BuildingType.Tavern,
        BuildingType.Bastion,
        BuildingType.Forge,
      ]),
    ).toBe(FORTIFICATION_TIER_BONUS[BuildingType.Bastion]);
  });

  it('accepts a Set without copying call-site code', () => {
    const buildings = new Set<BuildingType>([BuildingType.Citadel]);
    expect(getFortificationDefenderBonus(buildings)).toBe(
      FORTIFICATION_TIER_BONUS[BuildingType.Citadel],
    );
  });

  it('is idempotent across duplicate entries', () => {
    expect(
      getFortificationDefenderBonus([
        BuildingType.Bastion,
        BuildingType.Bastion,
        BuildingType.Bastion,
      ]),
    ).toBe(FORTIFICATION_TIER_BONUS[BuildingType.Bastion]);
  });
});
