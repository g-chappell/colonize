import { describe, expect, it } from 'vitest';
import { UnitType, type UnitJSON } from '@colonize/core';

import type { ProposedMove } from '../store/game';
import { decideMoveClick } from './move-intent';

const EMPTY_CARGO = { resources: {}, artifacts: [] } as const;
const roster: readonly UnitJSON[] = [
  {
    id: 'u1',
    faction: 'otk',
    position: { x: 3, y: 4 },
    type: UnitType.Sloop,
    movement: 4,
    cargo: EMPTY_CARGO,
  },
  {
    id: 'u2',
    faction: 'phantom',
    position: { x: 5, y: 6 },
    type: UnitType.Privateer,
    movement: 4,
    cargo: EMPTY_CARGO,
  },
];

function proposal(goal: { x: number; y: number }, unitId = 'u1'): ProposedMove {
  return {
    unitId,
    path: [{ x: 3, y: 4 }, { x: 4, y: 4 }, goal],
    cost: 2,
    reachable: 2,
  };
}

describe('decideMoveClick', () => {
  it('selects a newly clicked unit', () => {
    const intent = decideMoveClick({
      tile: { x: 5, y: 6 },
      units: roster,
      selectedUnitId: null,
      proposedMove: null,
    });
    expect(intent).toEqual({ kind: 'select', unitId: 'u2' });
  });

  it('switches selection when another unit is clicked', () => {
    const intent = decideMoveClick({
      tile: { x: 5, y: 6 },
      units: roster,
      selectedUnitId: 'u1',
      proposedMove: null,
    });
    expect(intent).toEqual({ kind: 'select', unitId: 'u2' });
  });

  it('cancels the proposal when the selected unit is re-clicked', () => {
    const intent = decideMoveClick({
      tile: { x: 3, y: 4 },
      units: roster,
      selectedUnitId: 'u1',
      proposedMove: proposal({ x: 5, y: 4 }),
    });
    expect(intent).toEqual({ kind: 'cancel-proposal' });
  });

  it('returns cancel-proposal (no-op shape) when clicking selected unit with no proposal', () => {
    const intent = decideMoveClick({
      tile: { x: 3, y: 4 },
      units: roster,
      selectedUnitId: 'u1',
      proposedMove: null,
    });
    expect(intent).toEqual({ kind: 'cancel-proposal' });
  });

  it('does nothing when clicking empty water with no selection', () => {
    const intent = decideMoveClick({
      tile: { x: 9, y: 9 },
      units: roster,
      selectedUnitId: null,
      proposedMove: null,
    });
    expect(intent).toEqual({ kind: 'none' });
  });

  it('proposes a path when clicking empty water with a unit selected', () => {
    const intent = decideMoveClick({
      tile: { x: 9, y: 9 },
      units: roster,
      selectedUnitId: 'u1',
      proposedMove: null,
    });
    expect(intent).toEqual({ kind: 'propose', destination: { x: 9, y: 9 } });
  });

  it('re-proposes when clicking a different tile than the existing proposal goal', () => {
    const intent = decideMoveClick({
      tile: { x: 7, y: 7 },
      units: roster,
      selectedUnitId: 'u1',
      proposedMove: proposal({ x: 5, y: 4 }),
    });
    expect(intent).toEqual({ kind: 'propose', destination: { x: 7, y: 7 } });
  });

  it('commits when clicking the same tile as the existing proposal goal', () => {
    const pending = proposal({ x: 5, y: 4 });
    const intent = decideMoveClick({
      tile: { x: 5, y: 4 },
      units: roster,
      selectedUnitId: 'u1',
      proposedMove: pending,
    });
    expect(intent).toEqual({ kind: 'commit', proposal: pending });
  });

  it('re-proposes when the proposal is for a different unit', () => {
    const stalePending = proposal({ x: 5, y: 4 }, 'u2');
    const intent = decideMoveClick({
      tile: { x: 5, y: 4 },
      units: roster,
      selectedUnitId: 'u1',
      proposedMove: stalePending,
    });
    expect(intent).toEqual({ kind: 'propose', destination: { x: 5, y: 4 } });
  });
});
