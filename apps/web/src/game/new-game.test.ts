import { describe, it, expect } from 'vitest';
import { TileType, UnitType, getUnitTypeDefinition } from '@colonize/core';

import { DEFAULT_NEW_GAME_HEIGHT, DEFAULT_NEW_GAME_WIDTH, buildNewGameSetup } from './new-game';

const baseOpts = {
  seed: 42,
  factionId: 'otk' as const,
  width: DEFAULT_NEW_GAME_WIDTH,
  height: DEFAULT_NEW_GAME_HEIGHT,
};

describe('buildNewGameSetup', () => {
  it('returns a map of the requested dimensions', () => {
    const setup = buildNewGameSetup(baseOpts);
    expect(setup.map.width).toBe(DEFAULT_NEW_GAME_WIDTH);
    expect(setup.map.height).toBe(DEFAULT_NEW_GAME_HEIGHT);
  });

  it('is deterministic for a given seed', () => {
    const a = buildNewGameSetup(baseOpts);
    const b = buildNewGameSetup(baseOpts);
    expect(a.cameraFocus).toEqual(b.cameraFocus);
    expect(a.units).toEqual(b.units);
    expect(a.homePort).toEqual(b.homePort);
  });

  it('seeds exactly one starter founding-ship at the faction start', () => {
    const setup = buildNewGameSetup(baseOpts);
    expect(setup.units).toHaveLength(1);
    const starter = setup.units[0]!;
    expect(starter.faction).toBe('otk');
    expect(starter.type).toBe(UnitType.FoundingShip);
    expect(starter.position).toEqual(setup.cameraFocus);
  });

  it('places the starter unit on a sailable water tile', () => {
    const setup = buildNewGameSetup(baseOpts);
    const tile = setup.map.get(setup.cameraFocus.x, setup.cameraFocus.y);
    expect([TileType.Ocean, TileType.RayonPassage, TileType.FloatingCity]).toContain(tile);
  });

  it('reveals a sight-radius patch around the starter unit and the corridor', () => {
    const setup = buildNewGameSetup(baseOpts);
    const radius = getUnitTypeDefinition(UnitType.FoundingShip).sightRadius;
    const { x, y } = setup.cameraFocus;
    expect(setup.visibility.get(x, y)).toBe('visible');
    expect(setup.visibility.get(x + radius, y)).not.toBe('unseen');
  });

  it('seeds a home port with non-empty starting base prices for the faction', () => {
    const setup = buildNewGameSetup(baseOpts);
    expect(setup.homePort.faction).toBe('otk');
    expect(Object.keys(setup.homePort.basePrices).length).toBeGreaterThan(0);
    expect(Object.values(setup.homePort.netVolume)).toEqual([]);
  });

  it('different seeds produce different starts', () => {
    const a = buildNewGameSetup({ ...baseOpts, seed: 1 });
    const b = buildNewGameSetup({ ...baseOpts, seed: 2 });
    expect(a.cameraFocus).not.toEqual(b.cameraFocus);
  });
});
