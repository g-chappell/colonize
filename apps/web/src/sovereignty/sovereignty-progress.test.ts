import { describe, expect, it } from 'vitest';
import type { ConcordFleetCampaignJSON } from '@colonize/core';
import {
  SOVEREIGNTY_MILESTONES,
  getSovereigntyBeat,
  sovereigntyMilestoneCrossed,
  sovereigntyProgressFraction,
} from './sovereignty-progress';

function makeCampaign(turnsElapsed: number, turnsRequired: number): ConcordFleetCampaignJSON {
  return {
    difficulty: 'standard',
    turnsRequired,
    turnsElapsed,
    waves: [
      {
        spawnTurn: 0,
        ships: ['frigate'],
        groundTroops: ['marines'],
      },
    ],
    spawnedWaveIndices: [],
  };
}

describe('sovereigntyProgressFraction', () => {
  it('returns 0 when turnsElapsed is 0', () => {
    expect(sovereigntyProgressFraction(makeCampaign(0, 20))).toBe(0);
  });

  it('returns the elapsed / required ratio inside the range', () => {
    expect(sovereigntyProgressFraction(makeCampaign(5, 20))).toBe(0.25);
    expect(sovereigntyProgressFraction(makeCampaign(10, 20))).toBe(0.5);
  });

  it('clamps to 1 when turnsElapsed exceeds turnsRequired', () => {
    expect(sovereigntyProgressFraction(makeCampaign(25, 20))).toBe(1);
  });

  it('returns 0 when turnsRequired is zero (defensive)', () => {
    expect(sovereigntyProgressFraction(makeCampaign(0, 0))).toBe(0);
  });
});

describe('sovereigntyMilestoneCrossed', () => {
  it('returns null when turnsRequired is not positive', () => {
    expect(sovereigntyMilestoneCrossed(0, 1, 0)).toBeNull();
  });

  it('returns null when next does not exceed prev', () => {
    expect(sovereigntyMilestoneCrossed(5, 5, 20)).toBeNull();
    expect(sovereigntyMilestoneCrossed(6, 5, 20)).toBeNull();
  });

  it('fires 25% when the tick crosses one-quarter of the campaign', () => {
    // 20-turn campaign: 25% threshold is 5. Going 4 -> 5 crosses it.
    expect(sovereigntyMilestoneCrossed(4, 5, 20)).toBe(25);
  });

  it('fires 50% when the midpoint is crossed', () => {
    expect(sovereigntyMilestoneCrossed(9, 10, 20)).toBe(50);
  });

  it('fires 75% when the three-quarter mark is crossed', () => {
    expect(sovereigntyMilestoneCrossed(14, 15, 20)).toBe(75);
  });

  it('fires 100% when the campaign finishes', () => {
    expect(sovereigntyMilestoneCrossed(19, 20, 20)).toBe(100);
  });

  it('returns null when the tick crosses no milestone', () => {
    expect(sovereigntyMilestoneCrossed(1, 2, 20)).toBeNull();
  });

  it('prefers the highest milestone when one tick crosses multiple (short campaigns)', () => {
    // 12-turn Pacified campaign: 25% = 3, 50% = 6. A tick from 2 -> 7
    // crosses BOTH. We fire only 50% to avoid stacking modals.
    expect(sovereigntyMilestoneCrossed(2, 7, 12)).toBe(50);
  });

  it('returns 100% when a single large jump crosses everything', () => {
    expect(sovereigntyMilestoneCrossed(0, 20, 20)).toBe(100);
  });
});

describe('getSovereigntyBeat', () => {
  it('has an entry for every exposed milestone', () => {
    for (const m of SOVEREIGNTY_MILESTONES) {
      const beat = getSovereigntyBeat(m);
      expect(beat.milestone).toBe(m);
      expect(beat.title.length).toBeGreaterThan(0);
      expect(beat.flavour.length).toBeGreaterThan(0);
    }
  });

  it('returns distinct titles across milestones', () => {
    const titles = new Set(SOVEREIGNTY_MILESTONES.map((m) => getSovereigntyBeat(m).title));
    expect(titles.size).toBe(SOVEREIGNTY_MILESTONES.length);
  });
});
