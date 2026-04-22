import { describe, it, expect } from 'vitest';

import {
  CONCORD_CAMPAIGN_DIFFICULTIES,
  getConcordCampaignDifficulty,
  isConcordCampaignDifficultyId,
  type ConcordCampaignDifficulty,
} from './concord-campaign.js';
import { isGroundClassId, isShipClassId } from './units.js';

describe('CONCORD_CAMPAIGN_DIFFICULTIES invariants', () => {
  it('contains the three expected tiers in ascending pressure order', () => {
    expect(CONCORD_CAMPAIGN_DIFFICULTIES.map((d) => d.id)).toEqual([
      'pacified',
      'standard',
      'brutal',
    ]);
  });

  it('has distinct ids', () => {
    const ids = CONCORD_CAMPAIGN_DIFFICULTIES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every wave lists only valid ship class ids', () => {
    for (const diff of CONCORD_CAMPAIGN_DIFFICULTIES) {
      for (const wave of diff.waves) {
        for (const id of wave.ships) {
          expect(isShipClassId(id)).toBe(true);
        }
      }
    }
  });

  it('every wave lists only valid ground class ids', () => {
    for (const diff of CONCORD_CAMPAIGN_DIFFICULTIES) {
      for (const wave of diff.waves) {
        for (const id of wave.groundTroops) {
          expect(isGroundClassId(id)).toBe(true);
        }
      }
    }
  });

  it('every wave spawns at least one ship or ground unit', () => {
    for (const diff of CONCORD_CAMPAIGN_DIFFICULTIES) {
      for (const wave of diff.waves) {
        expect(wave.ships.length + wave.groundTroops.length).toBeGreaterThan(0);
      }
    }
  });

  it('wave schedules are non-empty and spawnTurn is non-decreasing', () => {
    for (const diff of CONCORD_CAMPAIGN_DIFFICULTIES) {
      expect(diff.waves.length).toBeGreaterThan(0);
      let prev = -Infinity;
      for (const wave of diff.waves) {
        expect(wave.spawnTurn).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(wave.spawnTurn)).toBe(true);
        expect(wave.spawnTurn).toBeGreaterThanOrEqual(prev);
        prev = wave.spawnTurn;
      }
    }
  });

  it('every wave arrives strictly before the difficulty turnsRequired', () => {
    for (const diff of CONCORD_CAMPAIGN_DIFFICULTIES) {
      for (const wave of diff.waves) {
        expect(wave.spawnTurn).toBeLessThan(diff.turnsRequired);
      }
    }
  });

  it('turnsRequired is a positive integer and increases across the tier order', () => {
    let prev = 0;
    for (const diff of CONCORD_CAMPAIGN_DIFFICULTIES) {
      expect(diff.turnsRequired).toBeGreaterThan(0);
      expect(Number.isInteger(diff.turnsRequired)).toBe(true);
      expect(diff.turnsRequired).toBeGreaterThan(prev);
      prev = diff.turnsRequired;
    }
  });

  it('total deployed-unit count rises monotonically across tiers', () => {
    const sizes = CONCORD_CAMPAIGN_DIFFICULTIES.map(totalDeployedUnits);
    let prev = -Infinity;
    for (const size of sizes) {
      expect(size).toBeGreaterThan(prev);
      prev = size;
    }
  });

  it('name / summary / description are non-empty', () => {
    for (const diff of CONCORD_CAMPAIGN_DIFFICULTIES) {
      expect(diff.name.length).toBeGreaterThan(0);
      expect(diff.summary.length).toBeGreaterThan(0);
      expect(diff.description.length).toBeGreaterThan(0);
    }
  });
});

describe('isConcordCampaignDifficultyId', () => {
  it('accepts known ids', () => {
    expect(isConcordCampaignDifficultyId('pacified')).toBe(true);
    expect(isConcordCampaignDifficultyId('standard')).toBe(true);
    expect(isConcordCampaignDifficultyId('brutal')).toBe(true);
  });

  it('rejects unknown / non-string input', () => {
    expect(isConcordCampaignDifficultyId('casual')).toBe(false);
    expect(isConcordCampaignDifficultyId('')).toBe(false);
    expect(isConcordCampaignDifficultyId(42)).toBe(false);
    expect(isConcordCampaignDifficultyId(null)).toBe(false);
    expect(isConcordCampaignDifficultyId(undefined)).toBe(false);
  });
});

describe('getConcordCampaignDifficulty', () => {
  it('returns the entry for a known id', () => {
    expect(getConcordCampaignDifficulty('standard').turnsRequired).toBe(20);
  });

  it('throws for an unknown id', () => {
    expect(() => getConcordCampaignDifficulty('casual' as unknown as 'pacified')).toThrow(
      TypeError,
    );
  });
});

function totalDeployedUnits(diff: ConcordCampaignDifficulty): number {
  return diff.waves.reduce((acc, wave) => acc + wave.ships.length + wave.groundTroops.length, 0);
}
