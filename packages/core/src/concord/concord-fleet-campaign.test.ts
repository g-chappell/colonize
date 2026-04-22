import { describe, it, expect } from 'vitest';

import {
  ConcordFleetCampaign,
  type ConcordFleetCampaignInit,
  type ConcordFleetCampaignJSON,
  type ConcordFleetWave,
} from './concord-fleet-campaign.js';

function makeWave(overrides: Partial<ConcordFleetWave> & { spawnTurn: number }): ConcordFleetWave {
  return {
    spawnTurn: overrides.spawnTurn,
    ships: overrides.ships ?? ['frigate'],
    groundTroops: overrides.groundTroops ?? ['marines'],
  };
}

function makeCampaign(overrides: Partial<ConcordFleetCampaignInit> = {}): ConcordFleetCampaign {
  return new ConcordFleetCampaign({
    difficulty: 'standard',
    turnsRequired: 10,
    waves: [
      makeWave({ spawnTurn: 0 }),
      makeWave({ spawnTurn: 4, ships: ['frigate', 'brig'] }),
      makeWave({
        spawnTurn: 8,
        ships: ['ship-of-the-line'],
        groundTroops: ['marines', 'dragoons'],
      }),
    ],
    ...overrides,
  });
}

describe('ConcordFleetCampaign construction', () => {
  it('defaults turnsElapsed to 0 and spawnedWaveIndices to empty', () => {
    const c = makeCampaign();
    expect(c.turnsElapsed).toBe(0);
    expect(c.spawnedWaveIndices).toEqual([]);
  });

  it('exposes readonly copies of the wave schedule', () => {
    const c = makeCampaign();
    const waves = c.waves;
    expect(waves).toHaveLength(3);
    expect(waves[0]!.spawnTurn).toBe(0);
    // Mutation of the returned snapshot must not change internal state.
    (waves as ConcordFleetWave[]).splice(0);
    expect(c.waves).toHaveLength(3);
  });

  it('accepts pre-populated spawnedWaveIndices', () => {
    const c = makeCampaign({ spawnedWaveIndices: [0, 2] });
    expect(c.spawnedWaveIndices).toEqual([0, 2]);
    expect(c.hasSpawnedWave(0)).toBe(true);
    expect(c.hasSpawnedWave(1)).toBe(false);
    expect(c.hasSpawnedWave(2)).toBe(true);
  });

  it('rejects empty difficulty', () => {
    expect(() => makeCampaign({ difficulty: '' })).toThrow(TypeError);
  });

  it('rejects turnsRequired of 0 or less', () => {
    expect(() => makeCampaign({ turnsRequired: 0 })).toThrow(RangeError);
    expect(() => makeCampaign({ turnsRequired: -1 })).toThrow(RangeError);
  });

  it('rejects non-integer turnsElapsed', () => {
    expect(() => makeCampaign({ turnsElapsed: 1.5 })).toThrow(RangeError);
  });

  it('rejects empty wave schedule', () => {
    expect(() => makeCampaign({ waves: [] })).toThrow(RangeError);
  });

  it('rejects wave with negative spawnTurn', () => {
    expect(() => makeCampaign({ waves: [makeWave({ spawnTurn: -1 })] })).toThrow(RangeError);
  });

  it('rejects non-ascending spawnTurn schedule', () => {
    expect(() =>
      makeCampaign({
        waves: [makeWave({ spawnTurn: 3 }), makeWave({ spawnTurn: 1 })],
      }),
    ).toThrow(RangeError);
  });

  it('allows duplicate spawnTurn values (both waves land the same turn)', () => {
    const c = makeCampaign({
      waves: [makeWave({ spawnTurn: 2 }), makeWave({ spawnTurn: 2 })],
    });
    expect(c.waves).toHaveLength(2);
  });

  it('rejects a wave with no ships and no ground troops', () => {
    expect(() =>
      makeCampaign({ waves: [makeWave({ spawnTurn: 0, ships: [], groundTroops: [] })] }),
    ).toThrow(RangeError);
  });

  it('rejects a wave whose ship id is the empty string', () => {
    expect(() => makeCampaign({ waves: [makeWave({ spawnTurn: 0, ships: [''] })] })).toThrow(
      TypeError,
    );
  });

  it('rejects spawnedWaveIndices entry that is out of range', () => {
    expect(() => makeCampaign({ spawnedWaveIndices: [5] })).toThrow(RangeError);
  });

  it('rejects spawnedWaveIndices entry that is non-integer', () => {
    expect(() => makeCampaign({ spawnedWaveIndices: [1.5] })).toThrow(RangeError);
  });
});

describe('ConcordFleetCampaign.tick', () => {
  it('increments turnsElapsed by one per call', () => {
    const c = makeCampaign();
    c.tick();
    c.tick();
    c.tick();
    expect(c.turnsElapsed).toBe(3);
  });
});

describe('ConcordFleetCampaign.pendingWaves', () => {
  it('returns no waves before any tick when first wave is at spawnTurn 0', () => {
    const c = makeCampaign();
    expect(c.pendingWaves().map((p) => p.index)).toEqual([0]);
  });

  it('returns wave 0 at construction when its spawnTurn is 0', () => {
    const c = makeCampaign();
    const pending = c.pendingWaves();
    expect(pending.map((p) => p.index)).toEqual([0]);
  });

  it('excludes waves whose spawnTurn has not yet arrived', () => {
    const c = makeCampaign();
    expect(c.pendingWaves().map((p) => p.index)).toEqual([0]);
    c.tick();
    c.tick();
    c.tick();
    expect(c.pendingWaves().map((p) => p.index)).toEqual([0]);
    c.tick();
    expect(c.pendingWaves().map((p) => p.index)).toEqual([0, 1]);
  });

  it('excludes waves that have already been marked spawned', () => {
    const c = makeCampaign();
    c.markWaveSpawned(0);
    expect(c.pendingWaves()).toEqual([]);
    for (let i = 0; i < 4; i++) c.tick();
    expect(c.pendingWaves().map((p) => p.index)).toEqual([1]);
  });

  it('returns deep-copied wave data (mutating the return does not affect internals)', () => {
    const c = makeCampaign();
    const pending = c.pendingWaves();
    (pending[0]!.wave.ships as string[]).push('corruption');
    expect(c.waves[0]!.ships).toEqual(['frigate']);
  });
});

describe('ConcordFleetCampaign.markWaveSpawned', () => {
  it('is idempotent', () => {
    const c = makeCampaign();
    c.markWaveSpawned(0);
    c.markWaveSpawned(0);
    expect(c.spawnedWaveIndices).toEqual([0]);
  });

  it('rejects out-of-range index', () => {
    const c = makeCampaign();
    expect(() => c.markWaveSpawned(99)).toThrow(RangeError);
  });

  it('rejects negative index', () => {
    const c = makeCampaign();
    expect(() => c.markWaveSpawned(-1)).toThrow(RangeError);
  });
});

describe('ConcordFleetCampaign.outcome', () => {
  it('reports in-progress until turnsElapsed reaches turnsRequired', () => {
    const c = makeCampaign({ turnsRequired: 3 });
    expect(c.outcome()).toBe('in-progress');
    expect(c.isVictorious()).toBe(false);
    c.tick();
    c.tick();
    expect(c.outcome()).toBe('in-progress');
    c.tick();
    expect(c.outcome()).toBe('victory');
    expect(c.isVictorious()).toBe(true);
  });

  it('stays victorious on further ticks', () => {
    const c = makeCampaign({ turnsRequired: 1 });
    c.tick();
    c.tick();
    expect(c.isVictorious()).toBe(true);
  });
});

describe('ConcordFleetCampaign save-format round-trip', () => {
  it('serializes and deserializes identity', () => {
    const c = makeCampaign();
    c.tick();
    c.tick();
    c.markWaveSpawned(0);
    const json = c.toJSON();
    const restored = ConcordFleetCampaign.fromJSON(json);
    expect(restored.toJSON()).toEqual(json);
  });

  it('sorts spawnedWaveIndices ascending regardless of mark order', () => {
    const c = makeCampaign();
    c.markWaveSpawned(2);
    c.markWaveSpawned(0);
    c.markWaveSpawned(1);
    const json = c.toJSON();
    expect(json.spawnedWaveIndices).toEqual([0, 1, 2]);
  });

  it('produces byte-identical JSON for two identical states reached in different orders', () => {
    const a = makeCampaign();
    a.markWaveSpawned(0);
    a.markWaveSpawned(2);
    a.tick();

    const b = makeCampaign();
    b.tick();
    b.markWaveSpawned(2);
    b.markWaveSpawned(0);

    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it('fromJSON rejects non-object input', () => {
    expect(() =>
      ConcordFleetCampaign.fromJSON(null as unknown as ConcordFleetCampaignJSON),
    ).toThrow(TypeError);
  });

  it('fromJSON rejects malformed waves array', () => {
    expect(() =>
      ConcordFleetCampaign.fromJSON({
        difficulty: 'standard',
        turnsRequired: 5,
        turnsElapsed: 0,
        waves: 'not-an-array',
        spawnedWaveIndices: [],
      } as unknown as ConcordFleetCampaignJSON),
    ).toThrow(TypeError);
  });
});
