import type { Coord, UnitJSON } from '@colonize/core';

import type { ProposedMove } from '../store/game';

// Pure decision helper for click-to-move. GameScene forwards the raw
// click tile + current store snapshot to `decideMoveClick` and routes
// the returned intent to the matching scene side-effect (select unit,
// render path preview, run sprite tween). All decision logic lives
// here so the state machine stays unit-testable without Phaser
// (CLAUDE.md: pure-sibling module pattern for game code).

export type MoveClickIntent =
  // Click landed on an unselected unit — make it the new selection.
  // The store's `setSelectedUnit` action also clears any in-flight
  // proposed move (see store/game.ts).
  | { readonly kind: 'select'; readonly unitId: string }
  // Click landed on the already-selected unit. Serves as a cancel
  // gesture: if a proposal is pending, wipe it; otherwise no-op.
  | { readonly kind: 'cancel-proposal' }
  // Click landed on an empty tile with a selected unit. The current
  // proposal (if any) points to a different tile or doesn't exist
  // yet — propose a fresh path to this destination.
  | { readonly kind: 'propose'; readonly destination: Coord }
  // Click landed on an empty tile that matches the current proposal's
  // goal — the player has confirmed the move.
  | { readonly kind: 'commit'; readonly proposal: ProposedMove }
  // Click did nothing (empty tile with no selection, or reduced to a
  // no-op by earlier rules).
  | { readonly kind: 'none' };

export interface MoveClickContext {
  readonly tile: Coord;
  readonly units: readonly UnitJSON[];
  readonly selectedUnitId: string | null;
  readonly proposedMove: ProposedMove | null;
}

// Returns the intent for the given click, without any side-effects.
// Rules (in precedence order):
//   1. Click on a unit that isn't currently selected → 'select'.
//   2. Click on the already-selected unit → 'cancel-proposal' (idempotent
//      when no proposal exists).
//   3. Click on empty water with no selection → 'none'.
//   4. Click on empty water, proposal exists and its goal is this
//      tile → 'commit'.
//   5. Otherwise (empty water, unit selected, either no proposal or
//      proposal points elsewhere) → 'propose'.
export function decideMoveClick(ctx: MoveClickContext): MoveClickIntent {
  const clickedUnit = pickUnitAtTile(ctx.tile, ctx.units);
  if (clickedUnit) {
    if (clickedUnit.id === ctx.selectedUnitId) {
      return { kind: 'cancel-proposal' };
    }
    return { kind: 'select', unitId: clickedUnit.id };
  }
  if (!ctx.selectedUnitId) {
    return { kind: 'none' };
  }
  const proposal = ctx.proposedMove;
  if (proposal && proposal.unitId === ctx.selectedUnitId && goalMatches(proposal, ctx.tile)) {
    return { kind: 'commit', proposal };
  }
  return { kind: 'propose', destination: { x: ctx.tile.x, y: ctx.tile.y } };
}

function pickUnitAtTile(tile: Coord, units: readonly UnitJSON[]): UnitJSON | null {
  for (const unit of units) {
    if (unit.position.x === tile.x && unit.position.y === tile.y) {
      return unit;
    }
  }
  return null;
}

function goalMatches(proposal: ProposedMove, tile: Coord): boolean {
  if (proposal.path.length === 0) return false;
  const goal = proposal.path[proposal.path.length - 1]!;
  return goal.x === tile.x && goal.y === tile.y;
}
