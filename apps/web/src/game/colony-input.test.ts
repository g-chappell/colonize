import { describe, expect, it } from 'vitest';
import type { ColonyJSON } from '@colonize/core';
import { pickColonyIdAtTile } from './colony-input';

const colonies: readonly ColonyJSON[] = [
  {
    id: 'driftwatch',
    faction: 'otk',
    position: { x: 4, y: 5 },
    population: 1,
    crew: [],
    buildings: [],
    stocks: { resources: {}, artifacts: [] },
  },
  {
    id: 'sablecove',
    faction: 'ironclad',
    position: { x: 9, y: 2 },
    population: 1,
    crew: [],
    buildings: [],
    stocks: { resources: {}, artifacts: [] },
  },
];

describe('pickColonyIdAtTile', () => {
  it('returns the colony id at a matching tile', () => {
    expect(pickColonyIdAtTile({ x: 4, y: 5 }, colonies)).toBe('driftwatch');
    expect(pickColonyIdAtTile({ x: 9, y: 2 }, colonies)).toBe('sablecove');
  });

  it('returns null when no colony occupies the tile', () => {
    expect(pickColonyIdAtTile({ x: 0, y: 0 }, colonies)).toBeNull();
  });

  it('returns null on an empty roster', () => {
    expect(pickColonyIdAtTile({ x: 4, y: 5 }, [])).toBeNull();
  });

  it('returns the first matching id when duplicates somehow share a tile', () => {
    const dupe: ColonyJSON = {
      id: 'shadow',
      faction: 'phantom',
      position: { x: 4, y: 5 },
      population: 1,
      crew: [],
      buildings: [],
      stocks: { resources: {}, artifacts: [] },
    };
    expect(pickColonyIdAtTile({ x: 4, y: 5 }, [...colonies, dupe])).toBe('driftwatch');
  });
});
