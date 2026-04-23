import { describe, expect, it } from 'vitest';
import {
  ArchiveCharterId,
  UnitType,
  type ColonyJSON,
  type UnitJSON,
  type FactionChartersJSON,
} from '@colonize/core';
import { computeGameOverStats } from './gameover-stats.js';

const EMPTY_CARGO = { resources: {}, artifacts: [] } as const;

function makeUnit(id: string, faction: string): UnitJSON {
  return {
    id,
    faction,
    position: { x: 0, y: 0 },
    type: UnitType.Sloop,
    movement: 4,
    cargo: EMPTY_CARGO,
  };
}

function makeColony(id: string, faction: string): ColonyJSON {
  return {
    id,
    faction,
    position: { x: 0, y: 0 },
    population: 1,
    crew: [],
    buildings: [],
    stocks: { resources: {}, artifacts: [] },
  };
}

describe('computeGameOverStats', () => {
  it('filters colonies and units by player faction', () => {
    const stats = computeGameOverStats({
      turn: 25,
      playerFaction: 'otk',
      colonies: [makeColony('c1', 'otk'), makeColony('c2', 'ironclad')],
      units: [makeUnit('u1', 'otk'), makeUnit('u2', 'otk'), makeUnit('u3', 'phantom')],
      factionCharters: {},
    });
    expect(stats).toEqual({ turnsPlayed: 25, colonyCount: 1, fleetCount: 2, charterCount: 0 });
  });

  it('counts selected charters for the player faction only', () => {
    const factionCharters: Record<string, FactionChartersJSON> = {
      otk: {
        available: [ArchiveCharterId.BladeOathParchment, ArchiveCharterId.BloodlineWrit],
        selected: [ArchiveCharterId.PirataCodexFragment, ArchiveCharterId.CorsairMarque],
      },
      ironclad: {
        available: [],
        selected: [ArchiveCharterId.ForgeMasterAccord],
      },
    };
    const stats = computeGameOverStats({
      turn: 40,
      playerFaction: 'otk',
      colonies: [],
      units: [],
      factionCharters,
    });
    expect(stats.charterCount).toBe(2);
  });

  it('returns 0 charter count when the faction has no charters seeded', () => {
    const stats = computeGameOverStats({
      turn: 3,
      playerFaction: 'otk',
      colonies: [],
      units: [],
      factionCharters: {},
    });
    expect(stats.charterCount).toBe(0);
  });

  it('clamps malformed turn values to zero', () => {
    expect(
      computeGameOverStats({
        turn: -5,
        playerFaction: 'otk',
        colonies: [],
        units: [],
        factionCharters: {},
      }).turnsPlayed,
    ).toBe(0);
    expect(
      computeGameOverStats({
        turn: Number.NaN,
        playerFaction: 'otk',
        colonies: [],
        units: [],
        factionCharters: {},
      }).turnsPlayed,
    ).toBe(0);
  });
});
