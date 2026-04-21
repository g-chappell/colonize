import { describe, it, expect, beforeEach } from 'vitest';
import { CORE_VERSION, TurnPhase } from '@colonize/core';
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

  it('defaults to the main menu screen', () => {
    expect(useGameStore.getState().screen).toBe('menu');
  });

  it('allows switching the active screen', () => {
    useGameStore.getState().setScreen('faction-select');
    expect(useGameStore.getState().screen).toBe('faction-select');
  });

  it('restores the default screen on reset', () => {
    useGameStore.getState().setScreen('game');
    useGameStore.getState().reset();
    expect(useGameStore.getState().screen).toBe('menu');
  });

  it('starts with no remembered camera view', () => {
    expect(useGameStore.getState().cameraView).toBeNull();
  });

  it('stores a camera view when GameScene reports one', () => {
    useGameStore.getState().setCameraView({ scrollX: 100, scrollY: 200, zoom: 1.5 });
    expect(useGameStore.getState().cameraView).toEqual({
      scrollX: 100,
      scrollY: 200,
      zoom: 1.5,
    });
  });

  it('clears the camera view explicitly', () => {
    useGameStore.getState().setCameraView({ scrollX: 1, scrollY: 2, zoom: 1 });
    useGameStore.getState().clearCameraView();
    expect(useGameStore.getState().cameraView).toBeNull();
  });

  it('drops the camera view on reset (per-game memory only)', () => {
    useGameStore.getState().setCameraView({ scrollX: 50, scrollY: 60, zoom: 2 });
    useGameStore.getState().reset();
    expect(useGameStore.getState().cameraView).toBeNull();
  });

  it('starts on the PlayerAction phase', () => {
    expect(useGameStore.getState().phase).toBe(TurnPhase.PlayerAction);
  });

  it('stores the current turn phase', () => {
    useGameStore.getState().setPhase(TurnPhase.AI);
    expect(useGameStore.getState().phase).toBe(TurnPhase.AI);
  });

  it('restores the default phase on reset', () => {
    useGameStore.getState().setPhase(TurnPhase.WorldEvents);
    useGameStore.getState().reset();
    expect(useGameStore.getState().phase).toBe(TurnPhase.PlayerAction);
  });
});
