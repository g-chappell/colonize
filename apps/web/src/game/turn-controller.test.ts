import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TurnPhase } from '@colonize/core';
import { bus } from '../bus';
import { useGameStore } from '../store/game';
import { turnController } from './turn-controller';

describe('turnController', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    turnController.reset();
  });

  afterEach(() => {
    bus.clear();
  });

  it('initialises the store on PlayerAction of turn 1', () => {
    expect(turnController.getManager().phase).toBe(TurnPhase.PlayerAction);
    expect(turnController.getManager().turn).toBe(1);
    expect(useGameStore.getState().phase).toBe(TurnPhase.PlayerAction);
    expect(useGameStore.getState().currentTurn).toBe(0);
  });

  it('enters the AI phase synchronously on endPlayerTurn', () => {
    turnController.endPlayerTurn();
    expect(turnController.getManager().phase).toBe(TurnPhase.AI);
    expect(useGameStore.getState().phase).toBe(TurnPhase.AI);
  });

  it('returns to PlayerAction and increments the turn once the microtask flushes', async () => {
    turnController.endPlayerTurn();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(turnController.getManager().phase).toBe(TurnPhase.PlayerAction);
    expect(turnController.getManager().turn).toBe(2);
    expect(useGameStore.getState().currentTurn).toBe(1);
  });

  it('emits turn:advanced with the post-cycle turn count', async () => {
    const received: number[] = [];
    bus.on('turn:advanced', ({ turn }) => received.push(turn));
    turnController.endPlayerTurn();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(received).toEqual([1]);
  });

  it('ignores repeated end-turn requests while the AI phase is in flight', async () => {
    turnController.endPlayerTurn();
    // Second call lands while we're still in AI — must be a no-op, not
    // a double-advance that skips a turn.
    turnController.endPlayerTurn();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(useGameStore.getState().currentTurn).toBe(1);
    expect(useGameStore.getState().phase).toBe(TurnPhase.PlayerAction);
  });

  it('reset() rewinds the manager and the mirrored store state', async () => {
    turnController.endPlayerTurn();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(useGameStore.getState().currentTurn).toBe(1);
    turnController.reset();
    expect(turnController.getManager().turn).toBe(1);
    expect(turnController.getManager().phase).toBe(TurnPhase.PlayerAction);
    expect(useGameStore.getState().currentTurn).toBe(0);
    expect(useGameStore.getState().phase).toBe(TurnPhase.PlayerAction);
  });
});
