import { describe, it, expect, beforeEach } from 'vitest';
import { CORE_VERSION, TurnPhase, UnitType, type UnitJSON } from '@colonize/core';
import { useGameStore } from './game';

const sampleUnits: readonly UnitJSON[] = [
  { id: 'u1', faction: 'otk', position: { x: 3, y: 4 }, type: UnitType.Sloop, movement: 4 },
  { id: 'u2', faction: 'otk', position: { x: 5, y: 6 }, type: UnitType.Settler, movement: 1 },
];

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

  it('starts with an empty unit roster and no selection', () => {
    expect(useGameStore.getState().units).toEqual([]);
    expect(useGameStore.getState().selectedUnitId).toBeNull();
  });

  it('replaces the unit roster wholesale', () => {
    useGameStore.getState().setUnits(sampleUnits);
    expect(useGameStore.getState().units).toEqual(sampleUnits);
  });

  it('stores and clears the selected unit id', () => {
    useGameStore.getState().setSelectedUnit('u1');
    expect(useGameStore.getState().selectedUnitId).toBe('u1');
    useGameStore.getState().setSelectedUnit(null);
    expect(useGameStore.getState().selectedUnitId).toBeNull();
  });

  it('drops units and selection on reset', () => {
    useGameStore.getState().setUnits(sampleUnits);
    useGameStore.getState().setSelectedUnit('u1');
    useGameStore.getState().reset();
    expect(useGameStore.getState().units).toEqual([]);
    expect(useGameStore.getState().selectedUnitId).toBeNull();
  });

  it('starts with no proposed move', () => {
    expect(useGameStore.getState().proposedMove).toBeNull();
  });

  it('stores and clears a proposed move', () => {
    const proposal = {
      unitId: 'u1',
      path: [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
      ],
      cost: 1,
      reachable: 1,
    };
    useGameStore.getState().setProposedMove(proposal);
    expect(useGameStore.getState().proposedMove).toEqual(proposal);
    useGameStore.getState().setProposedMove(null);
    expect(useGameStore.getState().proposedMove).toBeNull();
  });

  it('clears the proposed move when selection changes to a different unit', () => {
    useGameStore.getState().setUnits(sampleUnits);
    useGameStore.getState().setSelectedUnit('u1');
    useGameStore.getState().setProposedMove({
      unitId: 'u1',
      path: [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
      ],
      cost: 1,
      reachable: 1,
    });
    useGameStore.getState().setSelectedUnit('u2');
    expect(useGameStore.getState().proposedMove).toBeNull();
  });

  it('keeps the proposed move when the same unit is re-selected', () => {
    useGameStore.getState().setUnits(sampleUnits);
    useGameStore.getState().setSelectedUnit('u1');
    const proposal = {
      unitId: 'u1',
      path: [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
      ],
      cost: 1,
      reachable: 1,
    };
    useGameStore.getState().setProposedMove(proposal);
    useGameStore.getState().setSelectedUnit('u1');
    expect(useGameStore.getState().proposedMove).toEqual(proposal);
  });

  it('commits a move by updating the unit and clearing the proposal', () => {
    useGameStore.getState().setUnits(sampleUnits);
    useGameStore.getState().setSelectedUnit('u1');
    useGameStore.getState().setProposedMove({
      unitId: 'u1',
      path: [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
      ],
      cost: 1,
      reachable: 1,
    });
    useGameStore.getState().commitMove('u1', { x: 4, y: 4 }, 1);
    const moved = useGameStore.getState().units.find((u) => u.id === 'u1');
    expect(moved?.position).toEqual({ x: 4, y: 4 });
    expect(moved?.movement).toBe(3);
    const other = useGameStore.getState().units.find((u) => u.id === 'u2');
    expect(other?.position).toEqual({ x: 5, y: 6 });
    expect(useGameStore.getState().proposedMove).toBeNull();
  });

  it('clamps spent movement to zero (never negative)', () => {
    useGameStore.getState().setUnits(sampleUnits);
    useGameStore.getState().commitMove('u2', { x: 6, y: 6 }, 5);
    const moved = useGameStore.getState().units.find((u) => u.id === 'u2');
    expect(moved?.movement).toBe(0);
  });

  it('drops the proposed move on reset', () => {
    useGameStore.getState().setProposedMove({
      unitId: 'u1',
      path: [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
      ],
      cost: 1,
      reachable: 1,
    });
    useGameStore.getState().reset();
    expect(useGameStore.getState().proposedMove).toBeNull();
  });

  describe('settings', () => {
    it('seeds default audio volumes matching audio-state.ts', () => {
      const { settings } = useGameStore.getState();
      expect(settings.sfxVolume).toBe(0.8);
      expect(settings.bgmVolume).toBe(0.5);
      expect(settings.muted).toBe(false);
    });

    it('writes the sfx bus volume', () => {
      useGameStore.getState().setAudioVolume('sfx', 0.3);
      expect(useGameStore.getState().settings.sfxVolume).toBeCloseTo(0.3, 5);
      expect(useGameStore.getState().settings.bgmVolume).toBe(0.5);
    });

    it('writes the bgm bus volume independently', () => {
      useGameStore.getState().setAudioVolume('bgm', 0.1);
      expect(useGameStore.getState().settings.bgmVolume).toBeCloseTo(0.1, 5);
      expect(useGameStore.getState().settings.sfxVolume).toBe(0.8);
    });

    it('clamps volume into [0, 1]', () => {
      useGameStore.getState().setAudioVolume('sfx', -0.5);
      expect(useGameStore.getState().settings.sfxVolume).toBe(0);
      useGameStore.getState().setAudioVolume('bgm', 42);
      expect(useGameStore.getState().settings.bgmVolume).toBe(1);
    });

    it('rejects non-finite volume inputs as zero', () => {
      useGameStore.getState().setAudioVolume('sfx', Number.NaN);
      expect(useGameStore.getState().settings.sfxVolume).toBe(0);
    });

    it('toggles the muted flag', () => {
      useGameStore.getState().setAudioMuted(true);
      expect(useGameStore.getState().settings.muted).toBe(true);
      useGameStore.getState().setAudioMuted(false);
      expect(useGameStore.getState().settings.muted).toBe(false);
    });

    it('restores default settings on reset', () => {
      useGameStore.getState().setAudioVolume('sfx', 0.1);
      useGameStore.getState().setAudioMuted(true);
      useGameStore.getState().reset();
      expect(useGameStore.getState().settings).toEqual({
        sfxVolume: 0.8,
        bgmVolume: 0.5,
        muted: false,
      });
    });
  });
});
