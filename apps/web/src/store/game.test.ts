import { describe, it, expect, beforeEach } from 'vitest';
import { CORE_VERSION } from '@colonize/core';
import { useGameStore } from './game';

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('seeds gameVersion from packages/core', () => {
    expect(useGameStore.getState().gameVersion).toBe(CORE_VERSION);
  });

  it('starts on turn 0', () => {
    expect(useGameStore.getState().currentTurn).toBe(0);
  });

  it('advances the turn by one', () => {
    useGameStore.getState().advanceTurn();
    useGameStore.getState().advanceTurn();
    expect(useGameStore.getState().currentTurn).toBe(2);
  });

  it('sets the turn directly', () => {
    useGameStore.getState().setCurrentTurn(42);
    expect(useGameStore.getState().currentTurn).toBe(42);
  });

  it('resets to initial state', () => {
    useGameStore.getState().setCurrentTurn(99);
    useGameStore.getState().reset();
    expect(useGameStore.getState().currentTurn).toBe(0);
    expect(useGameStore.getState().gameVersion).toBe(CORE_VERSION);
  });

  it('defaults to the Order of the Kraken', () => {
    expect(useGameStore.getState().faction).toBe('otk');
  });

  it('allows switching the active faction', () => {
    useGameStore.getState().setFaction('ironclad');
    expect(useGameStore.getState().faction).toBe('ironclad');
  });

  it('restores the default faction on reset', () => {
    useGameStore.getState().setFaction('phantom');
    useGameStore.getState().reset();
    expect(useGameStore.getState().faction).toBe('otk');
  });
});
