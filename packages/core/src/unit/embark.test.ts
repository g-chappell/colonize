import { describe, it, expect } from 'vitest';
import { TileType } from '../map/tile.js';
import {
  DISEMBARKABLE_TILE_TYPES,
  DISEMBARK_MOVEMENT_COST,
  EMBARK_MOVEMENT_COST,
  canDisembark,
  canEmbark,
  type CarrierShip,
  type EmbarkableUnit,
} from './embark.js';
import { UnitType } from './unit-type.js';

function groundUnit(overrides: Partial<EmbarkableUnit> = {}): EmbarkableUnit {
  return {
    id: 'g-1',
    faction: 'otk',
    type: UnitType.Marines,
    position: { x: 3, y: 4 },
    movement: 1,
    ...overrides,
  };
}

function ship(overrides: Partial<CarrierShip> = {}): CarrierShip {
  return {
    id: 's-1',
    faction: 'otk',
    type: UnitType.Frigate,
    position: { x: 3, y: 4 },
    ...overrides,
  };
}

describe('canEmbark', () => {
  it('approves a friendly ground unit on the same tile as a ship with capacity', () => {
    const check = canEmbark({
      groundUnit: groundUnit(),
      ship: ship(),
      shipCapacity: 4,
      currentPassengerCount: 0,
    });
    expect(check.ok).toBe(true);
  });

  it('rejects when the unit and ship share an id', () => {
    const check = canEmbark({
      groundUnit: groundUnit({ id: 'same' }),
      ship: ship({ id: 'same' }),
      shipCapacity: 4,
      currentPassengerCount: 0,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/different units/) });
  });

  it('rejects a non-ground unit', () => {
    const check = canEmbark({
      groundUnit: groundUnit({ type: UnitType.Scout }),
      ship: ship(),
      shipCapacity: 4,
      currentPassengerCount: 0,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/ground unit/) });
  });

  it('rejects embarking onto a non-ship carrier', () => {
    const check = canEmbark({
      groundUnit: groundUnit(),
      ship: ship({ type: UnitType.Settler }),
      shipCapacity: 4,
      currentPassengerCount: 0,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/not a ship/) });
  });

  it('rejects a faction mismatch', () => {
    const check = canEmbark({
      groundUnit: groundUnit({ faction: 'phantom' }),
      ship: ship({ faction: 'otk' }),
      shipCapacity: 4,
      currentPassengerCount: 0,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/faction/) });
  });

  it('rejects when the unit is not on the ship tile', () => {
    const check = canEmbark({
      groundUnit: groundUnit({ position: { x: 2, y: 4 } }),
      ship: ship({ position: { x: 3, y: 4 } }),
      shipCapacity: 4,
      currentPassengerCount: 0,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/same tile/) });
  });

  it('rejects when the unit has no movement left', () => {
    const check = canEmbark({
      groundUnit: groundUnit({ movement: 0 }),
      ship: ship(),
      shipCapacity: 4,
      currentPassengerCount: 0,
    });
    expect(check).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/insufficient movement/),
    });
  });

  it('rejects when the ship is at capacity', () => {
    const check = canEmbark({
      groundUnit: groundUnit(),
      ship: ship(),
      shipCapacity: 3,
      currentPassengerCount: 3,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/full/) });
  });

  it('rejects a negative capacity or passenger count', () => {
    const badCap = canEmbark({
      groundUnit: groundUnit(),
      ship: ship(),
      shipCapacity: -1,
      currentPassengerCount: 0,
    });
    expect(badCap.ok).toBe(false);
    const badLoad = canEmbark({
      groundUnit: groundUnit(),
      ship: ship(),
      shipCapacity: 3,
      currentPassengerCount: -2,
    });
    expect(badLoad.ok).toBe(false);
  });

  it('EMBARK_MOVEMENT_COST is a positive integer', () => {
    expect(Number.isInteger(EMBARK_MOVEMENT_COST)).toBe(true);
    expect(EMBARK_MOVEMENT_COST).toBeGreaterThan(0);
  });
});

describe('canDisembark', () => {
  it('approves a friendly ground unit stepping onto an adjacent island', () => {
    const check = canDisembark({
      groundUnit: groundUnit(),
      ship: ship(),
      targetPosition: { x: 4, y: 4 },
      targetTile: TileType.Island,
    });
    expect(check.ok).toBe(true);
  });

  it('approves landing on the ship tile itself', () => {
    const check = canDisembark({
      groundUnit: groundUnit(),
      ship: ship({ position: { x: 3, y: 4 } }),
      targetPosition: { x: 3, y: 4 },
      targetTile: TileType.FloatingCity,
    });
    expect(check.ok).toBe(true);
  });

  it('rejects a non-adjacent target', () => {
    const check = canDisembark({
      groundUnit: groundUnit(),
      ship: ship({ position: { x: 0, y: 0 } }),
      targetPosition: { x: 5, y: 5 },
      targetTile: TileType.Island,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/adjacent/) });
  });

  it('rejects a non-landable tile', () => {
    const check = canDisembark({
      groundUnit: groundUnit(),
      ship: ship(),
      targetPosition: { x: 4, y: 4 },
      targetTile: TileType.Ocean,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/not landable/) });
  });

  it('rejects a faction mismatch', () => {
    const check = canDisembark({
      groundUnit: groundUnit({ faction: 'phantom' }),
      ship: ship({ faction: 'otk' }),
      targetPosition: { x: 4, y: 4 },
      targetTile: TileType.Island,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/faction/) });
  });

  it('rejects when the unit has no movement left', () => {
    const check = canDisembark({
      groundUnit: groundUnit({ movement: 0 }),
      ship: ship(),
      targetPosition: { x: 4, y: 4 },
      targetTile: TileType.Island,
    });
    expect(check).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/insufficient movement/),
    });
  });

  it('rejects a fractional target position', () => {
    const check = canDisembark({
      groundUnit: groundUnit(),
      ship: ship(),
      targetPosition: { x: 3.5, y: 4 },
      targetTile: TileType.Island,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/integer/) });
  });

  it('rejects embark/disembark on a non-ground carrier', () => {
    const check = canDisembark({
      groundUnit: groundUnit({ type: UnitType.Scout }),
      ship: ship(),
      targetPosition: { x: 4, y: 4 },
      targetTile: TileType.Island,
    });
    expect(check).toMatchObject({ ok: false, reason: expect.stringMatching(/ground unit/) });
  });

  it('DISEMBARKABLE_TILE_TYPES lists islands and floating cities', () => {
    expect(new Set(DISEMBARKABLE_TILE_TYPES)).toEqual(
      new Set([TileType.Island, TileType.FloatingCity]),
    );
  });

  it('DISEMBARK_MOVEMENT_COST is a positive integer', () => {
    expect(Number.isInteger(DISEMBARK_MOVEMENT_COST)).toBe(true);
    expect(DISEMBARK_MOVEMENT_COST).toBeGreaterThan(0);
  });
});
