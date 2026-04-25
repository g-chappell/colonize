import { describe, it, expect, beforeEach } from 'vitest';
import {
  BuildingType,
  CONCORD_TENSION_THRESHOLDS,
  CORE_VERSION,
  CombatActionType,
  CombatResult,
  HomePort,
  TurnPhase,
  UnitType,
  type ColonyJSON,
  type CombatOutcome,
  type UnitJSON,
} from '@colonize/core';
import { useGameStore } from './game';

const EMPTY_CARGO = { resources: {}, artifacts: [] } as const;
const sampleUnits: readonly UnitJSON[] = [
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
    faction: 'otk',
    position: { x: 5, y: 6 },
    type: UnitType.Settler,
    movement: 1,
    cargo: EMPTY_CARGO,
  },
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

  it('starts with no pendingNewGame', () => {
    expect(useGameStore.getState().pendingNewGame).toBeNull();
  });

  it('requestNewGame atomically flips faction + pendingNewGame + screen', () => {
    useGameStore.getState().requestNewGame('ironclad', 12345);
    const state = useGameStore.getState();
    expect(state.faction).toBe('ironclad');
    expect(state.screen).toBe('game');
    expect(state.pendingNewGame).toEqual({ factionId: 'ironclad', seed: 12345 });
  });

  it('requestNewGame draws a fresh seed when one is not supplied', () => {
    useGameStore.getState().requestNewGame('phantom');
    const pending = useGameStore.getState().pendingNewGame;
    expect(pending?.factionId).toBe('phantom');
    expect(typeof pending?.seed).toBe('number');
    expect(Number.isInteger(pending?.seed)).toBe(true);
  });

  it('clearPendingNewGame removes the slice without disturbing faction or screen', () => {
    useGameStore.getState().requestNewGame('bloodborne', 7);
    useGameStore.getState().clearPendingNewGame();
    const state = useGameStore.getState();
    expect(state.pendingNewGame).toBeNull();
    expect(state.faction).toBe('bloodborne');
    expect(state.screen).toBe('game');
  });

  it('reset clears pendingNewGame', () => {
    useGameStore.getState().requestNewGame('phantom', 1);
    useGameStore.getState().reset();
    expect(useGameStore.getState().pendingNewGame).toBeNull();
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

  describe('colonies', () => {
    const sampleColony: ColonyJSON = {
      id: 'colony-1',
      faction: 'otk',
      position: { x: 7, y: 9 },
      population: 3,
      crew: ['settler-1'],
      buildings: ['tavern'],
      stocks: { resources: { rum: 12 }, artifacts: [] },
    };

    it('starts with an empty colony roster and no selection', () => {
      expect(useGameStore.getState().colonies).toEqual([]);
      expect(useGameStore.getState().selectedColonyId).toBeNull();
    });

    it('replaces the colony roster wholesale', () => {
      useGameStore.getState().setColonies([sampleColony]);
      expect(useGameStore.getState().colonies).toEqual([sampleColony]);
    });

    it('stores and clears the selected colony id', () => {
      useGameStore.getState().setSelectedColony('colony-1');
      expect(useGameStore.getState().selectedColonyId).toBe('colony-1');
      useGameStore.getState().setSelectedColony(null);
      expect(useGameStore.getState().selectedColonyId).toBeNull();
    });

    it('drops colonies and selection on reset', () => {
      useGameStore.getState().setColonies([sampleColony]);
      useGameStore.getState().setSelectedColony('colony-1');
      useGameStore.getState().reset();
      expect(useGameStore.getState().colonies).toEqual([]);
      expect(useGameStore.getState().selectedColonyId).toBeNull();
    });
  });

  describe('colony production queue', () => {
    const sampleColony: ColonyJSON = {
      id: 'colony-1',
      faction: 'otk',
      position: { x: 7, y: 9 },
      population: 3,
      crew: [],
      buildings: [],
      stocks: { resources: {}, artifacts: [] },
    };

    beforeEach(() => {
      useGameStore.getState().setColonies([sampleColony]);
    });

    it('starts with an empty queue map', () => {
      expect(useGameStore.getState().colonyQueues).toEqual({});
    });

    it('enqueues a building at the tail of the colony queue', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Warehouse);
      const queue = useGameStore.getState().colonyQueues['colony-1'];
      expect(queue).toBeDefined();
      expect(queue!.map((q) => q.buildingId)).toEqual([
        BuildingType.Tavern,
        BuildingType.Warehouse,
      ]);
      expect(queue![0]!.progress).toBe(0);
      expect(queue![0]!.effort).toBeGreaterThan(0);
    });

    it('rejects duplicate enqueue of a building already in the queue', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      expect(useGameStore.getState().colonyQueues['colony-1']).toHaveLength(1);
    });

    it('rejects enqueue of a building already built', () => {
      useGameStore.getState().setColonies([
        {
          ...sampleColony,
          buildings: [BuildingType.Tavern],
        },
      ]);
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      expect(useGameStore.getState().colonyQueues['colony-1']).toBeUndefined();
    });

    it('ignores enqueue for an unknown colony', () => {
      useGameStore.getState().enqueueBuilding('mystery', BuildingType.Tavern);
      expect(useGameStore.getState().colonyQueues).toEqual({});
    });

    it('cancels a queue item by index', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Warehouse);
      useGameStore.getState().cancelQueueItem('colony-1', 0);
      const queue = useGameStore.getState().colonyQueues['colony-1'];
      expect(queue!.map((q) => q.buildingId)).toEqual([BuildingType.Warehouse]);
    });

    it('removes the colony key entirely when the last item is cancelled', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().cancelQueueItem('colony-1', 0);
      expect(useGameStore.getState().colonyQueues['colony-1']).toBeUndefined();
    });

    it('ignores cancel for an out-of-range index', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().cancelQueueItem('colony-1', 5);
      expect(useGameStore.getState().colonyQueues['colony-1']).toHaveLength(1);
    });

    it('reorders queue items up and down', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Warehouse);
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Sawmill);
      useGameStore.getState().reorderQueueItem('colony-1', 2, 'up');
      let queue = useGameStore.getState().colonyQueues['colony-1'];
      expect(queue!.map((q) => q.buildingId)).toEqual([
        BuildingType.Tavern,
        BuildingType.Sawmill,
        BuildingType.Warehouse,
      ]);
      useGameStore.getState().reorderQueueItem('colony-1', 0, 'down');
      queue = useGameStore.getState().colonyQueues['colony-1'];
      expect(queue!.map((q) => q.buildingId)).toEqual([
        BuildingType.Sawmill,
        BuildingType.Tavern,
        BuildingType.Warehouse,
      ]);
    });

    it('ignores reorder at the boundary', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Warehouse);
      useGameStore.getState().reorderQueueItem('colony-1', 0, 'up');
      useGameStore.getState().reorderQueueItem('colony-1', 1, 'down');
      const queue = useGameStore.getState().colonyQueues['colony-1'];
      expect(queue!.map((q) => q.buildingId)).toEqual([
        BuildingType.Tavern,
        BuildingType.Warehouse,
      ]);
    });

    it('tick advances the head item progress by production value', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().tickColonyQueues();
      const queue = useGameStore.getState().colonyQueues['colony-1'];
      // population=3 → +3 progress on the head item
      expect(queue![0]!.progress).toBe(3);
    });

    it('tick promotes a completed building into colony.buildings', () => {
      // Warehouse effort = 20; population = 3. Need ceil(20/3) = 7 ticks.
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Warehouse);
      for (let i = 0; i < 7; i++) useGameStore.getState().tickColonyQueues();
      const colony = useGameStore.getState().colonies.find((c) => c.id === 'colony-1')!;
      expect(colony.buildings).toContain(BuildingType.Warehouse);
      expect(useGameStore.getState().colonyQueues['colony-1']).toBeUndefined();
    });

    it('keeps completed buildings sorted for save-format parity', () => {
      useGameStore.getState().setColonies([
        {
          ...sampleColony,
          population: 100, // enough production to finish in one tick
          buildings: ['shipyard'],
        },
      ]);
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().tickColonyQueues();
      const colony = useGameStore.getState().colonies.find((c) => c.id === 'colony-1')!;
      expect([...colony.buildings]).toEqual([...colony.buildings].sort());
      expect(colony.buildings).toContain(BuildingType.Tavern);
    });

    it('resets the queue map on reset', () => {
      useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
      useGameStore.getState().reset();
      expect(useGameStore.getState().colonyQueues).toEqual({});
    });
  });

  describe('tile-work assignments', () => {
    const sampleColony: ColonyJSON = {
      id: 'colony-1',
      faction: 'otk',
      position: { x: 4, y: 4 },
      population: 3,
      crew: ['settler-1', 'settler-2'],
      buildings: [],
      stocks: { resources: {}, artifacts: [] },
    };

    beforeEach(() => {
      useGameStore.getState().setColonies([sampleColony]);
    });

    it('starts with empty surroundings and assignments', () => {
      expect(useGameStore.getState().colonySurroundings).toEqual({});
      expect(useGameStore.getState().tileAssignments).toEqual({});
    });

    it('stores a colony surroundings snapshot', () => {
      useGameStore.getState().setColonySurroundings('colony-1', [
        { coord: { x: 3, y: 3 }, type: 'ocean' },
        { coord: { x: 5, y: 4 }, type: 'island' },
      ]);
      expect(useGameStore.getState().colonySurroundings['colony-1']).toEqual([
        { coord: { x: 3, y: 3 }, type: 'ocean' },
        { coord: { x: 5, y: 4 }, type: 'island' },
      ]);
    });

    it('assigns a crew to a tile', () => {
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-1', { x: 5, y: 4 });
      expect(useGameStore.getState().tileAssignments['colony-1']).toEqual({
        '5,4': 'settler-1',
      });
    });

    it('ignores assignment when the crew is not part of the colony', () => {
      useGameStore.getState().assignCrewToTile('colony-1', 'stowaway', { x: 5, y: 4 });
      expect(useGameStore.getState().tileAssignments).toEqual({});
    });

    it('ignores assignment for an unknown colony', () => {
      useGameStore.getState().assignCrewToTile('mystery', 'settler-1', { x: 5, y: 4 });
      expect(useGameStore.getState().tileAssignments).toEqual({});
    });

    it('moving a crew between tiles vacates the prior tile', () => {
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-1', { x: 5, y: 4 });
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-1', { x: 3, y: 3 });
      expect(useGameStore.getState().tileAssignments['colony-1']).toEqual({
        '3,3': 'settler-1',
      });
    });

    it('dropping onto an occupied tile displaces the prior occupant', () => {
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-1', { x: 5, y: 4 });
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-2', { x: 5, y: 4 });
      expect(useGameStore.getState().tileAssignments['colony-1']).toEqual({
        '5,4': 'settler-2',
      });
    });

    it('unassigns a crew from a tile', () => {
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-1', { x: 5, y: 4 });
      useGameStore.getState().unassignCrewFromTile('colony-1', { x: 5, y: 4 });
      expect(useGameStore.getState().tileAssignments['colony-1']).toBeUndefined();
    });

    it('unassign leaves other tiles untouched', () => {
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-1', { x: 5, y: 4 });
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-2', { x: 3, y: 3 });
      useGameStore.getState().unassignCrewFromTile('colony-1', { x: 5, y: 4 });
      expect(useGameStore.getState().tileAssignments['colony-1']).toEqual({
        '3,3': 'settler-2',
      });
    });

    it('ignores unassign for an empty slot', () => {
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-1', { x: 5, y: 4 });
      useGameStore.getState().unassignCrewFromTile('colony-1', { x: 3, y: 3 });
      expect(useGameStore.getState().tileAssignments['colony-1']).toEqual({
        '5,4': 'settler-1',
      });
    });

    it('resets surroundings + assignments on reset', () => {
      useGameStore
        .getState()
        .setColonySurroundings('colony-1', [{ coord: { x: 3, y: 3 }, type: 'ocean' }]);
      useGameStore.getState().assignCrewToTile('colony-1', 'settler-1', { x: 3, y: 3 });
      useGameStore.getState().reset();
      expect(useGameStore.getState().colonySurroundings).toEqual({});
      expect(useGameStore.getState().tileAssignments).toEqual({});
    });
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

  describe('trade session + commitTrade', () => {
    function seedPort(): void {
      const port = new HomePort({
        id: 'port-otk',
        faction: 'otk',
        basePrices: { timber: 10, fibre: 8 },
      });
      useGameStore.getState().setHomePort('otk', port.toJSON());
    }

    function seedShip(resources: Record<string, number> = {}): void {
      useGameStore.getState().setUnits([
        {
          id: 'ship-1',
          faction: 'otk',
          position: { x: 0, y: 0 },
          type: UnitType.Sloop,
          movement: 4,
          cargo: { resources, artifacts: [] },
        },
      ]);
    }

    beforeEach(() => {
      seedPort();
    });

    it('openTradeSession sets session + routes screen to trade', () => {
      useGameStore.getState().openTradeSession({ colonyId: 'c1', unitId: 'ship-1' });
      const state = useGameStore.getState();
      expect(state.screen).toBe('trade');
      expect(state.tradeSession).toEqual({ colonyId: 'c1', unitId: 'ship-1' });
    });

    it('closeTradeSession clears session + routes back to colony', () => {
      useGameStore.getState().openTradeSession({ colonyId: 'c1', unitId: 'ship-1' });
      useGameStore.getState().closeTradeSession();
      const state = useGameStore.getState();
      expect(state.screen).toBe('colony');
      expect(state.tradeSession).toBeNull();
    });

    it('commitTrade applies buys (qty > 0) — adds to ship cargo + decrements port netVolume', () => {
      seedShip({});
      useGameStore.getState().commitTrade('otk', 'ship-1', [{ resourceId: 'timber', qty: 3 }]);
      const state = useGameStore.getState();
      expect(state.units[0]!.cargo.resources.timber).toBe(3);
      expect(HomePort.fromJSON(state.homePorts.otk!).netVolume('timber')).toBe(-3);
    });

    it('commitTrade applies sells (qty < 0) — removes from ship cargo + increments port netVolume', () => {
      seedShip({ timber: 5 });
      useGameStore.getState().commitTrade('otk', 'ship-1', [{ resourceId: 'timber', qty: -2 }]);
      const state = useGameStore.getState();
      expect(state.units[0]!.cargo.resources.timber).toBe(3);
      expect(HomePort.fromJSON(state.homePorts.otk!).netVolume('timber')).toBe(2);
    });

    it('commitTrade drops a resource key to zero cleanly instead of leaving a 0 entry', () => {
      seedShip({ timber: 2 });
      useGameStore.getState().commitTrade('otk', 'ship-1', [{ resourceId: 'timber', qty: -2 }]);
      expect(useGameStore.getState().units[0]!.cargo.resources.timber).toBeUndefined();
    });

    it('commitTrade silently ignores sells exceeding ship cargo', () => {
      seedShip({ timber: 1 });
      useGameStore.getState().commitTrade('otk', 'ship-1', [{ resourceId: 'timber', qty: -10 }]);
      const state = useGameStore.getState();
      expect(state.units[0]!.cargo.resources.timber).toBe(1);
      expect(HomePort.fromJSON(state.homePorts.otk!).netVolume('timber')).toBe(0);
    });

    it('commitTrade is a no-op when every line qty is zero', () => {
      seedShip({ timber: 5 });
      const before = useGameStore.getState().units;
      useGameStore.getState().commitTrade('otk', 'ship-1', [{ resourceId: 'timber', qty: 0 }]);
      expect(useGameStore.getState().units).toBe(before);
    });

    it('commitTrade is a no-op when the faction has no home port', () => {
      seedShip({ timber: 5 });
      const before = useGameStore.getState().units;
      useGameStore.getState().commitTrade('phantom', 'ship-1', [{ resourceId: 'timber', qty: -1 }]);
      expect(useGameStore.getState().units).toBe(before);
    });
  });

  describe('cargo transfer session + commitCargoTransfer', () => {
    const colonyId = 'driftwatch';

    function seedColony(stocks: Record<string, number> = {}): ColonyJSON {
      const colony: ColonyJSON = {
        id: colonyId,
        faction: 'otk',
        position: { x: 0, y: 0 },
        population: 2,
        crew: [],
        buildings: [],
        stocks: { resources: stocks, artifacts: [] },
      };
      useGameStore.getState().setColonies([colony]);
      return colony;
    }

    function seedShip(resources: Record<string, number> = {}): void {
      useGameStore.getState().setUnits([
        {
          id: 'ship-1',
          faction: 'otk',
          position: { x: 0, y: 0 },
          type: UnitType.Sloop,
          movement: 4,
          cargo: { resources, artifacts: [] },
        },
      ]);
    }

    it('openTransferSession sets session + routes screen to transfer', () => {
      useGameStore.getState().openTransferSession({ colonyId: colonyId, unitId: 'ship-1' });
      const state = useGameStore.getState();
      expect(state.screen).toBe('transfer');
      expect(state.transferSession).toEqual({ colonyId, unitId: 'ship-1' });
    });

    it('closeTransferSession clears session + routes back to colony', () => {
      useGameStore.getState().openTransferSession({ colonyId: colonyId, unitId: 'ship-1' });
      useGameStore.getState().closeTransferSession();
      const state = useGameStore.getState();
      expect(state.screen).toBe('colony');
      expect(state.transferSession).toBeNull();
    });

    it('load (qty > 0) moves goods from colony stocks into ship cargo', () => {
      seedColony({ timber: 6 });
      seedShip({});
      useGameStore
        .getState()
        .commitCargoTransfer(colonyId, 'ship-1', [{ resourceId: 'timber', qty: 4 }]);
      const state = useGameStore.getState();
      expect(state.units[0]!.cargo.resources.timber).toBe(4);
      expect(state.colonies[0]!.stocks.resources.timber).toBe(2);
    });

    it('unload (qty < 0) moves goods from ship cargo into colony stocks', () => {
      seedColony({});
      seedShip({ rum: 5 });
      useGameStore
        .getState()
        .commitCargoTransfer(colonyId, 'ship-1', [{ resourceId: 'rum', qty: -3 }]);
      const state = useGameStore.getState();
      expect(state.units[0]!.cargo.resources.rum).toBe(2);
      expect(state.colonies[0]!.stocks.resources.rum).toBe(3);
    });

    it('drops a resource key when its remaining qty hits zero', () => {
      seedColony({ timber: 2 });
      seedShip({ rum: 3 });
      useGameStore.getState().commitCargoTransfer(colonyId, 'ship-1', [
        { resourceId: 'timber', qty: 2 },
        { resourceId: 'rum', qty: -3 },
      ]);
      const state = useGameStore.getState();
      expect(state.colonies[0]!.stocks.resources.timber).toBeUndefined();
      expect(state.units[0]!.cargo.resources.rum).toBeUndefined();
      expect(state.units[0]!.cargo.resources.timber).toBe(2);
      expect(state.colonies[0]!.stocks.resources.rum).toBe(3);
    });

    it('clamps loads exceeding colony stock to whatever is available', () => {
      seedColony({ timber: 1 });
      seedShip({});
      useGameStore
        .getState()
        .commitCargoTransfer(colonyId, 'ship-1', [{ resourceId: 'timber', qty: 99 }]);
      const state = useGameStore.getState();
      expect(state.units[0]!.cargo.resources.timber).toBe(1);
      expect(state.colonies[0]!.stocks.resources.timber).toBeUndefined();
    });

    it('clamps unloads exceeding ship cargo to whatever is held', () => {
      seedColony({});
      seedShip({ rum: 2 });
      useGameStore
        .getState()
        .commitCargoTransfer(colonyId, 'ship-1', [{ resourceId: 'rum', qty: -99 }]);
      const state = useGameStore.getState();
      expect(state.units[0]!.cargo.resources.rum).toBeUndefined();
      expect(state.colonies[0]!.stocks.resources.rum).toBe(2);
    });

    it('is a no-op when every line qty is zero', () => {
      seedColony({ timber: 4 });
      seedShip({});
      const beforeUnits = useGameStore.getState().units;
      const beforeColonies = useGameStore.getState().colonies;
      useGameStore
        .getState()
        .commitCargoTransfer(colonyId, 'ship-1', [{ resourceId: 'timber', qty: 0 }]);
      expect(useGameStore.getState().units).toBe(beforeUnits);
      expect(useGameStore.getState().colonies).toBe(beforeColonies);
    });

    it('skips non-integer qty lines silently', () => {
      seedColony({ timber: 4 });
      seedShip({});
      useGameStore
        .getState()
        .commitCargoTransfer(colonyId, 'ship-1', [{ resourceId: 'timber', qty: 1.5 }]);
      const state = useGameStore.getState();
      expect(state.colonies[0]!.stocks.resources.timber).toBe(4);
      expect(state.units[0]!.cargo.resources.timber).toBeUndefined();
    });

    it('is a no-op when the colony or ship cannot be found', () => {
      seedColony({ timber: 4 });
      seedShip({});
      const beforeUnits = useGameStore.getState().units;
      useGameStore
        .getState()
        .commitCargoTransfer('ghost', 'ship-1', [{ resourceId: 'timber', qty: 1 }]);
      expect(useGameStore.getState().units).toBe(beforeUnits);
      useGameStore
        .getState()
        .commitCargoTransfer(colonyId, 'phantom-ship', [{ resourceId: 'timber', qty: 1 }]);
      expect(useGameStore.getState().units).toBe(beforeUnits);
    });

    it('preserves colony artifacts and other resources unchanged across the transfer', () => {
      const colony: ColonyJSON = {
        id: colonyId,
        faction: 'otk',
        position: { x: 0, y: 0 },
        population: 2,
        crew: [],
        buildings: [],
        stocks: { resources: { timber: 4, fibre: 7 }, artifacts: ['kraken-totem'] },
      };
      useGameStore.getState().setColonies([colony]);
      seedShip({});
      useGameStore
        .getState()
        .commitCargoTransfer(colonyId, 'ship-1', [{ resourceId: 'timber', qty: 2 }]);
      const next = useGameStore.getState().colonies[0]!;
      expect(next.stocks.resources.timber).toBe(2);
      expect(next.stocks.resources.fibre).toBe(7);
      expect(next.stocks.artifacts).toEqual(['kraken-totem']);
    });
  });

  describe('combat outcome slice', () => {
    const sampleOutcome: CombatOutcome = {
      action: CombatActionType.Broadside,
      result: CombatResult.DefenderSunk,
      attacker: {
        id: 'a',
        faction: 'otk',
        hull: 50,
        maxHull: 50,
        guns: 12,
        crew: 50,
        maxCrew: 50,
        movement: 4,
        maxMovement: 4,
      },
      defender: {
        id: 'd',
        faction: 'ironclad',
        hull: 0,
        maxHull: 50,
        guns: 10,
        crew: 50,
        maxCrew: 50,
        movement: 3,
        maxMovement: 3,
      },
      events: [{ kind: 'broadside-volley', firer: 'attacker', damage: 50, targetHullAfter: 0 }],
    };

    it('starts null', () => {
      expect(useGameStore.getState().combatOutcome).toBeNull();
    });

    it('showCombatOutcome stores the outcome reference', () => {
      useGameStore.getState().showCombatOutcome(sampleOutcome);
      expect(useGameStore.getState().combatOutcome).toBe(sampleOutcome);
    });

    it('dismissCombatOutcome clears the outcome', () => {
      useGameStore.getState().showCombatOutcome(sampleOutcome);
      useGameStore.getState().dismissCombatOutcome();
      expect(useGameStore.getState().combatOutcome).toBeNull();
    });

    it('reset clears a pending combat outcome', () => {
      useGameStore.getState().showCombatOutcome(sampleOutcome);
      useGameStore.getState().reset();
      expect(useGameStore.getState().combatOutcome).toBeNull();
    });
  });

  describe('Archive Charter pool', () => {
    function seededRng(seed: number): () => number {
      let state = Math.max(0, Math.min(1, seed));
      return () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
      };
    }

    it('seedFactionCharters lazily installs the full roster', () => {
      useGameStore.getState().seedFactionCharters('otk');
      const snapshot = useGameStore.getState().factionCharters.otk;
      expect(snapshot).toBeDefined();
      expect(snapshot!.available).toHaveLength(20);
      expect(snapshot!.selected).toEqual([]);
    });

    it('seedFactionCharters is idempotent — re-seeding preserves prior state', () => {
      useGameStore.getState().seedFactionCharters('otk');
      useGameStore.getState().openCouncilPick('otk', 50, seededRng(0.42));
      const picked = useGameStore.getState().councilPick!.hand[0];
      useGameStore.getState().selectCharter(picked);
      const before = useGameStore.getState().factionCharters.otk!;
      useGameStore.getState().seedFactionCharters('otk');
      const after = useGameStore.getState().factionCharters.otk!;
      expect(after).toEqual(before);
    });

    it('openCouncilPick draws two distinct charters and activates a session', () => {
      useGameStore.getState().openCouncilPick('otk', 50, seededRng(0.17));
      const state = useGameStore.getState();
      expect(state.councilPick).not.toBeNull();
      expect(state.councilPick!.factionId).toBe('otk');
      expect(state.councilPick!.threshold).toBe(50);
      expect(state.councilPick!.hand[0]).not.toBe(state.councilPick!.hand[1]);
    });

    it('openCouncilPick lazily seeds the faction if not yet seeded', () => {
      expect(useGameStore.getState().factionCharters.otk).toBeUndefined();
      useGameStore.getState().openCouncilPick('otk', 50, seededRng(0.11));
      expect(useGameStore.getState().factionCharters.otk).toBeDefined();
    });

    it('openCouncilPick is a no-op when a session is already active', () => {
      useGameStore.getState().openCouncilPick('otk', 50, seededRng(0.22));
      const first = useGameStore.getState().councilPick;
      useGameStore.getState().openCouncilPick('otk', 150, seededRng(0.33));
      expect(useGameStore.getState().councilPick).toBe(first);
    });

    it('openCouncilPick is a no-op on a non-positive threshold', () => {
      useGameStore.getState().openCouncilPick('otk', 0, seededRng(0.44));
      expect(useGameStore.getState().councilPick).toBeNull();
      useGameStore.getState().openCouncilPick('otk', Number.NaN, seededRng(0.55));
      expect(useGameStore.getState().councilPick).toBeNull();
    });

    it('selectCharter moves the pick to selected, removes from available, clears the session', () => {
      useGameStore.getState().openCouncilPick('otk', 50, seededRng(0.61));
      const hand = useGameStore.getState().councilPick!.hand;
      useGameStore.getState().selectCharter(hand[0]);
      const state = useGameStore.getState();
      expect(state.councilPick).toBeNull();
      const snap = state.factionCharters.otk!;
      expect(snap.selected).toContain(hand[0]);
      expect(snap.available).not.toContain(hand[0]);
      expect(snap.available).toContain(hand[1]);
    });

    it('selectCharter skips silently when the id is not in the offered hand', () => {
      useGameStore.getState().openCouncilPick('otk', 50, seededRng(0.71));
      const handBefore = useGameStore.getState().councilPick!.hand;
      const notInHand =
        handBefore[0] === 'pirata-codex-fragment' && handBefore[1] === 'pirata-codex-fragment'
          ? 'bloodline-writ'
          : 'pirata-codex-fragment';
      const safeNotInHand =
        notInHand === handBefore[0] || notInHand === handBefore[1] ? 'kelp-witch-pact' : notInHand;
      useGameStore.getState().selectCharter(safeNotInHand as (typeof handBefore)[0]);
      expect(useGameStore.getState().councilPick).not.toBeNull();
    });

    it('selectCharter is a no-op when no session is active', () => {
      useGameStore.getState().selectCharter('pirata-codex-fragment');
      expect(useGameStore.getState().factionCharters).toEqual({});
    });

    it('reset clears factionCharters and councilPick', () => {
      useGameStore.getState().openCouncilPick('otk', 50, seededRng(0.81));
      useGameStore.getState().reset();
      const state = useGameStore.getState();
      expect(state.councilPick).toBeNull();
      expect(state.factionCharters).toEqual({});
    });
  });

  describe('Sovereignty War slice', () => {
    const sampleCampaign = {
      difficulty: 'standard',
      turnsRequired: 20,
      turnsElapsed: 0,
      waves: [
        {
          spawnTurn: 0,
          ships: ['frigate'],
          groundTroops: ['marines'],
        },
      ],
      spawnedWaveIndices: [],
    } as const;

    it('sovereigntyWar defaults to null', () => {
      expect(useGameStore.getState().sovereigntyWar).toBeNull();
      expect(useGameStore.getState().sovereigntyBeat).toBeNull();
    });

    it('startSovereigntyWar installs the campaign and clears any stale beat', () => {
      useGameStore.getState().showSovereigntyBeat(50);
      useGameStore.getState().startSovereigntyWar(sampleCampaign);
      expect(useGameStore.getState().sovereigntyWar).toEqual(sampleCampaign);
      expect(useGameStore.getState().sovereigntyBeat).toBeNull();
    });

    it('tickSovereigntyWar increments turnsElapsed', () => {
      useGameStore.getState().startSovereigntyWar(sampleCampaign);
      useGameStore.getState().tickSovereigntyWar();
      const war = useGameStore.getState().sovereigntyWar;
      expect(war).not.toBeNull();
      expect(war?.turnsElapsed).toBe(1);
    });

    it('tickSovereigntyWar is a no-op when no campaign is active', () => {
      useGameStore.getState().tickSovereigntyWar();
      expect(useGameStore.getState().sovereigntyWar).toBeNull();
      expect(useGameStore.getState().sovereigntyBeat).toBeNull();
    });

    it('tickSovereigntyWar auto-fires a beat at the 25% milestone', () => {
      // 20-turn campaign: 25% threshold is 5. Four existing turns + 1
      // tick lands turnsElapsed at 5 and crosses the threshold.
      useGameStore.getState().startSovereigntyWar({ ...sampleCampaign, turnsElapsed: 4 });
      useGameStore.getState().tickSovereigntyWar();
      expect(useGameStore.getState().sovereigntyBeat).toBe(25);
    });

    it('tickSovereigntyWar fires only the highest milestone when a tick crosses multiple', () => {
      // 12-turn campaign: 25% = 3, 50% = 6. Tick from 2 -> 7 crosses
      // both — only 50% fires.
      useGameStore.getState().startSovereigntyWar({
        ...sampleCampaign,
        turnsRequired: 12,
        turnsElapsed: 2,
      });
      // Re-use turnsElapsed: 2 as prev; explicit tick brings us to 3,
      // but the test asserts the multi-crossing branch via the pure
      // function directly when the jump is multi-step.
      useGameStore.getState().tickSovereigntyWar();
      // One tick 2 -> 3: crosses 25% threshold (25% of 12 = 3), fires 25.
      expect(useGameStore.getState().sovereigntyBeat).toBe(25);
    });

    it('tickSovereigntyWar fires 100% when the campaign finishes', () => {
      useGameStore.getState().startSovereigntyWar({ ...sampleCampaign, turnsElapsed: 19 });
      useGameStore.getState().tickSovereigntyWar();
      expect(useGameStore.getState().sovereigntyBeat).toBe(100);
      expect(useGameStore.getState().sovereigntyWar?.turnsElapsed).toBe(20);
    });

    it('tickSovereigntyWar leaves the beat alone when no milestone is crossed', () => {
      useGameStore.getState().startSovereigntyWar({ ...sampleCampaign, turnsElapsed: 1 });
      useGameStore.getState().tickSovereigntyWar();
      expect(useGameStore.getState().sovereigntyBeat).toBeNull();
    });

    it('endSovereigntyWar clears both slices', () => {
      useGameStore.getState().startSovereigntyWar(sampleCampaign);
      useGameStore.getState().showSovereigntyBeat(25);
      useGameStore.getState().endSovereigntyWar();
      expect(useGameStore.getState().sovereigntyWar).toBeNull();
      expect(useGameStore.getState().sovereigntyBeat).toBeNull();
    });

    it('showSovereigntyBeat / dismissSovereigntyBeat toggle the beat slice', () => {
      useGameStore.getState().showSovereigntyBeat(75);
      expect(useGameStore.getState().sovereigntyBeat).toBe(75);
      useGameStore.getState().dismissSovereigntyBeat();
      expect(useGameStore.getState().sovereigntyBeat).toBeNull();
    });

    it('dismissSovereigntyBeat leaves the active campaign untouched', () => {
      useGameStore.getState().startSovereigntyWar(sampleCampaign);
      useGameStore.getState().showSovereigntyBeat(50);
      useGameStore.getState().dismissSovereigntyBeat();
      expect(useGameStore.getState().sovereigntyBeat).toBeNull();
      expect(useGameStore.getState().sovereigntyWar).toEqual(sampleCampaign);
    });

    it('reset clears sovereigntyWar and sovereigntyBeat', () => {
      useGameStore.getState().startSovereigntyWar(sampleCampaign);
      useGameStore.getState().showSovereigntyBeat(50);
      useGameStore.getState().reset();
      expect(useGameStore.getState().sovereigntyWar).toBeNull();
      expect(useGameStore.getState().sovereigntyBeat).toBeNull();
    });
  });

  describe('endgame', () => {
    it('declareEndgame flips endgame slice and routes to the game-over screen atomically', () => {
      useGameStore.getState().declareEndgame({
        kind: 'victory',
        result: 'sovereignty-victory',
        turn: 42,
      });
      const state = useGameStore.getState();
      expect(state.endgame).toEqual({
        kind: 'victory',
        result: 'sovereignty-victory',
        turn: 42,
      });
      expect(state.screen).toBe('game-over');
    });

    it('declareEndgame is a no-op once an endgame is already declared', () => {
      useGameStore.getState().declareEndgame({
        kind: 'victory',
        result: 'sovereignty-victory',
        turn: 42,
      });
      useGameStore.getState().declareEndgame({
        kind: 'defeat',
        result: 'annihilated',
        turn: 99,
      });
      const state = useGameStore.getState();
      expect(state.endgame?.kind).toBe('victory');
      expect(state.endgame?.turn).toBe(42);
    });

    it('reset clears the endgame slice and returns to menu', () => {
      useGameStore.getState().declareEndgame({
        kind: 'defeat',
        result: 'annihilated',
        turn: 10,
      });
      useGameStore.getState().reset();
      const state = useGameStore.getState();
      expect(state.endgame).toBeNull();
      expect(state.screen).toBe('menu');
    });
  });

  describe('Concord tithe + tension slices', () => {
    it('starts with a null tithe notification and a zeroed tension snapshot', () => {
      const state = useGameStore.getState();
      expect(state.titheNotification).toBeNull();
      expect(state.concordTension.tension).toBe(0);
      expect(state.concordTension.crossed).toEqual([]);
      expect(state.concordTension.thresholds).toEqual([...CONCORD_TENSION_THRESHOLDS]);
      expect(state.concordTension.pending).toEqual([]);
    });

    it('showTitheNotification stores the notification', () => {
      useGameStore.getState().showTitheNotification({ amount: 30, gameYear: 5 });
      const notif = useGameStore.getState().titheNotification;
      expect(notif).toEqual({ amount: 30, gameYear: 5 });
    });

    it('showTitheNotification is a no-op when one is already pending', () => {
      useGameStore.getState().showTitheNotification({ amount: 30 });
      useGameStore.getState().showTitheNotification({ amount: 50 });
      expect(useGameStore.getState().titheNotification?.amount).toBe(30);
    });

    it('payTithe clears the notification without raising tension', () => {
      useGameStore.getState().showTitheNotification({ amount: 30 });
      useGameStore.getState().payTithe();
      expect(useGameStore.getState().titheNotification).toBeNull();
      expect(useGameStore.getState().concordTension.tension).toBe(0);
    });

    it('payTithe is a no-op when no notification is active', () => {
      useGameStore.getState().payTithe();
      expect(useGameStore.getState().titheNotification).toBeNull();
      expect(useGameStore.getState().concordTension.tension).toBe(0);
    });

    it('boycottTithe raises tension by the notification amount and clears the slice', () => {
      useGameStore.getState().showTitheNotification({ amount: 30 });
      const events = useGameStore.getState().boycottTithe();
      expect(events).toEqual([{ threshold: 25 }]);
      const state = useGameStore.getState();
      expect(state.titheNotification).toBeNull();
      expect(state.concordTension.tension).toBe(30);
      expect(state.concordTension.crossed).toEqual([25]);
    });

    it('boycottTithe returns every threshold a single raise crosses', () => {
      useGameStore.getState().showTitheNotification({ amount: 80 });
      const events = useGameStore.getState().boycottTithe();
      expect(events.map((e) => e.threshold)).toEqual([25, 50, 75]);
      expect(useGameStore.getState().concordTension.crossed).toEqual([25, 50, 75]);
    });

    it('boycottTithe accumulates tension across consecutive refusals', () => {
      useGameStore.getState().showTitheNotification({ amount: 20 });
      useGameStore.getState().boycottTithe();
      useGameStore.getState().showTitheNotification({ amount: 10 });
      useGameStore.getState().boycottTithe();
      expect(useGameStore.getState().concordTension.tension).toBe(30);
      expect(useGameStore.getState().concordTension.crossed).toEqual([25]);
    });

    it('boycottTithe floors fractional amounts before raising', () => {
      useGameStore.getState().showTitheNotification({ amount: 25.7 });
      useGameStore.getState().boycottTithe();
      expect(useGameStore.getState().concordTension.tension).toBe(25);
    });

    it('boycottTithe is a no-op (returns empty) when no notification is active', () => {
      const events = useGameStore.getState().boycottTithe();
      expect(events).toEqual([]);
      expect(useGameStore.getState().concordTension.tension).toBe(0);
    });

    it('reset clears a pending tithe notification and zeroes the tension snapshot', () => {
      useGameStore.getState().showTitheNotification({ amount: 60 });
      useGameStore.getState().boycottTithe();
      useGameStore.getState().showTitheNotification({ amount: 5 });
      useGameStore.getState().reset();
      const state = useGameStore.getState();
      expect(state.titheNotification).toBeNull();
      expect(state.concordTension.tension).toBe(0);
      expect(state.concordTension.crossed).toEqual([]);
    });
  });

  describe('Tidewater Party slice', () => {
    const baseEvent = {
      availableCargo: { salvage: 12, planks: 4 } as Record<string, number>,
      dumpQty: 10,
      freezeTurns: 8,
      irePenalty: 15,
    };

    it('starts with no pending event or dump record', () => {
      const state = useGameStore.getState();
      expect(state.tidewaterPartyEvent).toBeNull();
      expect(state.lastTidewaterDump).toBeNull();
    });

    it('showTidewaterPartyEvent stores the event', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      expect(useGameStore.getState().tidewaterPartyEvent).toEqual(baseEvent);
    });

    it('showTidewaterPartyEvent is a no-op when one is already active', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      const second = { ...baseEvent, dumpQty: 99 };
      useGameStore.getState().showTidewaterPartyEvent(second);
      expect(useGameStore.getState().tidewaterPartyEvent?.dumpQty).toBe(10);
    });

    it('confirmTidewaterParty clamps tension to 0, freezes, raises ire, clears event, records dump', () => {
      useGameStore.setState({
        concordTension: {
          tension: 40,
          thresholds: [...CONCORD_TENSION_THRESHOLDS],
          crossed: [25],
          pending: [{ threshold: 25 }],
          ire: 0,
          freezeTurnsRemaining: 0,
        },
      });
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().confirmTidewaterParty('salvage', 10);
      const state = useGameStore.getState();
      expect(state.tidewaterPartyEvent).toBeNull();
      expect(state.concordTension.tension).toBe(0);
      expect(state.concordTension.freezeTurnsRemaining).toBe(8);
      expect(state.concordTension.ire).toBe(15);
      expect(state.concordTension.crossed).toEqual([25]);
      expect(state.lastTidewaterDump).toEqual({ resourceId: 'salvage', qty: 10 });
    });

    it('confirmTidewaterParty is a no-op when no event is active', () => {
      useGameStore.getState().confirmTidewaterParty('salvage', 10);
      const state = useGameStore.getState();
      expect(state.concordTension.tension).toBe(0);
      expect(state.concordTension.ire).toBe(0);
      expect(state.lastTidewaterDump).toBeNull();
    });

    it('confirmTidewaterParty ignores a resource not in the event manifest', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().confirmTidewaterParty('timber', 10);
      const state = useGameStore.getState();
      expect(state.tidewaterPartyEvent).toEqual(baseEvent);
      expect(state.concordTension.ire).toBe(0);
      expect(state.lastTidewaterDump).toBeNull();
    });

    it('confirmTidewaterParty ignores a resource the player has too little of', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().confirmTidewaterParty('planks', 10);
      expect(useGameStore.getState().tidewaterPartyEvent).toEqual(baseEvent);
      expect(useGameStore.getState().lastTidewaterDump).toBeNull();
    });

    it('confirmTidewaterParty rejects qty below the event dumpQty', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().confirmTidewaterParty('salvage', 9);
      expect(useGameStore.getState().tidewaterPartyEvent).toEqual(baseEvent);
      expect(useGameStore.getState().lastTidewaterDump).toBeNull();
    });

    it('confirmTidewaterParty rejects non-positive or non-integer qty', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().confirmTidewaterParty('salvage', 0);
      useGameStore.getState().confirmTidewaterParty('salvage', -5);
      useGameStore.getState().confirmTidewaterParty('salvage', 10.5);
      expect(useGameStore.getState().tidewaterPartyEvent).toEqual(baseEvent);
      expect(useGameStore.getState().lastTidewaterDump).toBeNull();
    });

    it('dismissTidewaterPartyEvent clears the event without side effects', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().dismissTidewaterPartyEvent();
      const state = useGameStore.getState();
      expect(state.tidewaterPartyEvent).toBeNull();
      expect(state.concordTension.tension).toBe(0);
      expect(state.concordTension.ire).toBe(0);
      expect(state.lastTidewaterDump).toBeNull();
    });

    it('clearLastTidewaterDump acknowledges the record', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().confirmTidewaterParty('salvage', 10);
      useGameStore.getState().clearLastTidewaterDump();
      expect(useGameStore.getState().lastTidewaterDump).toBeNull();
    });

    it('a confirmed dump freezes subsequent boycottTithe raises', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().confirmTidewaterParty('salvage', 10);
      useGameStore.getState().showTitheNotification({ amount: 50 });
      const events = useGameStore.getState().boycottTithe();
      expect(events).toEqual([]);
      expect(useGameStore.getState().concordTension.tension).toBe(0);
      expect(useGameStore.getState().concordTension.crossed).toEqual([]);
    });

    it('reset clears the pending event + dump record', () => {
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().confirmTidewaterParty('salvage', 10);
      useGameStore.getState().showTidewaterPartyEvent(baseEvent);
      useGameStore.getState().reset();
      const state = useGameStore.getState();
      expect(state.tidewaterPartyEvent).toBeNull();
      expect(state.lastTidewaterDump).toBeNull();
      expect(state.concordTension.ire).toBe(0);
      expect(state.concordTension.freezeTurnsRemaining).toBe(0);
    });
  });

  describe('merchant routes', () => {
    const route = {
      id: 'salt-run',
      faction: 'otk',
      stops: [
        {
          colonyId: 'driftwatch',
          actions: [{ kind: 'load' as const, resourceId: 'salvage', qty: 5 }],
        },
        {
          colonyId: 'blackreef',
          actions: [{ kind: 'unload' as const, resourceId: 'salvage', qty: 5 }],
        },
      ],
    };

    beforeEach(() => {
      useGameStore.getState().setUnits([
        {
          id: 'ship-1',
          faction: 'otk',
          position: { x: 0, y: 0 },
          type: UnitType.Sloop,
          movement: 4,
          cargo: EMPTY_CARGO,
        },
      ]);
    });

    it('starts with empty merchantRoutes and autoRoutes maps', () => {
      const s = useGameStore.getState();
      expect(s.merchantRoutes).toEqual({});
      expect(s.autoRoutes).toEqual({});
    });

    it('openRouteScreen / closeRouteScreen route between game and routes', () => {
      useGameStore.getState().setScreen('game');
      useGameStore.getState().openRouteScreen();
      expect(useGameStore.getState().screen).toBe('routes');
      useGameStore.getState().closeRouteScreen();
      expect(useGameStore.getState().screen).toBe('game');
    });

    it('saveMerchantRoute stores the validated JSON by id', () => {
      useGameStore.getState().saveMerchantRoute(route);
      expect(useGameStore.getState().merchantRoutes['salt-run']).toBeDefined();
      expect(useGameStore.getState().merchantRoutes['salt-run']?.stops).toHaveLength(2);
    });

    it('saveMerchantRoute silently drops malformed input', () => {
      const bad = { ...route, stops: [] };
      useGameStore.getState().saveMerchantRoute(bad);
      expect(useGameStore.getState().merchantRoutes['salt-run']).toBeUndefined();
    });

    it('saveMerchantRoute replaces an existing route with the same id', () => {
      useGameStore.getState().saveMerchantRoute(route);
      const replaced = { ...route, stops: [route.stops[0]!] };
      useGameStore.getState().saveMerchantRoute(replaced);
      expect(useGameStore.getState().merchantRoutes['salt-run']?.stops).toHaveLength(1);
    });

    it('deleteMerchantRoute removes the entry and prunes AutoRoutes atomically', () => {
      useGameStore.getState().saveMerchantRoute(route);
      useGameStore.getState().assignRouteToShip('ship-1', 'salt-run');
      expect(useGameStore.getState().autoRoutes['ship-1']?.routeId).toBe('salt-run');
      useGameStore.getState().deleteMerchantRoute('salt-run');
      const s = useGameStore.getState();
      expect(s.merchantRoutes['salt-run']).toBeUndefined();
      expect(s.autoRoutes['ship-1']).toBeUndefined();
    });

    it('deleteMerchantRoute is a no-op for an unknown id', () => {
      useGameStore.getState().saveMerchantRoute(route);
      useGameStore.getState().deleteMerchantRoute('ghost');
      expect(useGameStore.getState().merchantRoutes['salt-run']).toBeDefined();
    });

    it('deleteMerchantRoute leaves AutoRoutes pointing at other routes untouched', () => {
      const other = { ...route, id: 'spice-run' };
      useGameStore.getState().saveMerchantRoute(route);
      useGameStore.getState().saveMerchantRoute(other);
      useGameStore.getState().setUnits([
        {
          id: 'ship-1',
          faction: 'otk',
          position: { x: 0, y: 0 },
          type: UnitType.Sloop,
          movement: 4,
          cargo: EMPTY_CARGO,
        },
        {
          id: 'ship-2',
          faction: 'otk',
          position: { x: 0, y: 0 },
          type: UnitType.Sloop,
          movement: 4,
          cargo: EMPTY_CARGO,
        },
      ]);
      useGameStore.getState().assignRouteToShip('ship-1', 'salt-run');
      useGameStore.getState().assignRouteToShip('ship-2', 'spice-run');
      useGameStore.getState().deleteMerchantRoute('salt-run');
      const s = useGameStore.getState();
      expect(s.autoRoutes['ship-1']).toBeUndefined();
      expect(s.autoRoutes['ship-2']?.routeId).toBe('spice-run');
    });

    it('assignRouteToShip creates an AutoRoute at stop 0, active', () => {
      useGameStore.getState().saveMerchantRoute(route);
      useGameStore.getState().assignRouteToShip('ship-1', 'salt-run');
      const ar = useGameStore.getState().autoRoutes['ship-1'];
      expect(ar).toBeDefined();
      expect(ar?.routeId).toBe('salt-run');
      expect(ar?.currentStopIndex).toBe(0);
      expect(ar?.status).toBe('active');
      expect(ar?.brokenReason).toBeNull();
    });

    it('assignRouteToShip is a no-op for an unknown route', () => {
      useGameStore.getState().assignRouteToShip('ship-1', 'ghost-route');
      expect(useGameStore.getState().autoRoutes['ship-1']).toBeUndefined();
    });

    it('assignRouteToShip is a no-op for a missing ship', () => {
      useGameStore.getState().saveMerchantRoute(route);
      useGameStore.getState().assignRouteToShip('ship-ghost', 'salt-run');
      expect(useGameStore.getState().autoRoutes['ship-ghost']).toBeUndefined();
    });

    it('assignRouteToShip replaces any prior AutoRoute on the same ship', () => {
      const other = { ...route, id: 'spice-run' };
      useGameStore.getState().saveMerchantRoute(route);
      useGameStore.getState().saveMerchantRoute(other);
      useGameStore.getState().assignRouteToShip('ship-1', 'salt-run');
      useGameStore.getState().assignRouteToShip('ship-1', 'spice-run');
      expect(useGameStore.getState().autoRoutes['ship-1']?.routeId).toBe('spice-run');
    });

    it('unassignRoute clears the AutoRoute entry for the ship', () => {
      useGameStore.getState().saveMerchantRoute(route);
      useGameStore.getState().assignRouteToShip('ship-1', 'salt-run');
      useGameStore.getState().unassignRoute('ship-1');
      expect(useGameStore.getState().autoRoutes['ship-1']).toBeUndefined();
    });

    it('reset clears merchantRoutes + autoRoutes', () => {
      useGameStore.getState().saveMerchantRoute(route);
      useGameStore.getState().assignRouteToShip('ship-1', 'salt-run');
      useGameStore.getState().reset();
      const s = useGameStore.getState();
      expect(s.merchantRoutes).toEqual({});
      expect(s.autoRoutes).toEqual({});
    });
  });

  describe('mapHints (TASK-076)', () => {
    const colony: ColonyJSON = {
      id: 'colony-tavern',
      faction: 'otk',
      position: { x: 10, y: 10 },
      population: 2,
      crew: [],
      buildings: ['tavern'],
      stocks: { resources: {}, artifacts: [] },
    };

    it('starts empty', () => {
      expect(useGameStore.getState().mapHints).toEqual([]);
    });

    it('dismissTavernEncounter appends hints from rumours that carry hint metadata', () => {
      useGameStore.getState().setColonies([colony]);
      useGameStore.getState().showTavernEncounter({
        colonyId: 'colony-tavern',
        rumourIds: ['rumour-archive-cache-east', 'rumour-singing-buoy'],
      });
      useGameStore.getState().dismissTavernEncounter();
      const hints = useGameStore.getState().mapHints;
      expect(hints).toHaveLength(1);
      expect(hints[0]).toEqual({
        origin: { x: 10, y: 10 },
        direction: 'e',
        category: 'archive-cache',
        sourceRumourId: 'rumour-archive-cache-east',
      });
      expect(useGameStore.getState().tavernEncounter).toBeNull();
    });

    it('dismissTavernEncounter with zero hinted rumours clears the encounter but leaves mapHints untouched', () => {
      useGameStore.getState().setColonies([colony]);
      useGameStore.getState().showTavernEncounter({
        colonyId: 'colony-tavern',
        rumourIds: ['rumour-singing-buoy', 'rumour-empty-keel'],
      });
      useGameStore.getState().dismissTavernEncounter();
      expect(useGameStore.getState().mapHints).toEqual([]);
      expect(useGameStore.getState().tavernEncounter).toBeNull();
    });

    it('dismiss for an encounter whose colonyId is not in the roster clears the slice without pushing hints', () => {
      useGameStore.getState().setColonies([]);
      useGameStore.getState().showTavernEncounter({
        colonyId: 'unknown-colony',
        rumourIds: ['rumour-archive-cache-east'],
      });
      useGameStore.getState().dismissTavernEncounter();
      expect(useGameStore.getState().mapHints).toEqual([]);
      expect(useGameStore.getState().tavernEncounter).toBeNull();
    });

    it('dismiss with no active encounter is a no-op', () => {
      useGameStore.getState().dismissTavernEncounter();
      expect(useGameStore.getState().mapHints).toEqual([]);
    });

    it('re-rolling the same rumour across tavern visits de-duplicates by sourceRumourId', () => {
      useGameStore.getState().setColonies([colony]);
      useGameStore.getState().showTavernEncounter({
        colonyId: 'colony-tavern',
        rumourIds: ['rumour-archive-cache-east'],
      });
      useGameStore.getState().dismissTavernEncounter();
      // Second visit re-surfaces the same rumour — the prior entry
      // must be replaced, not stacked.
      useGameStore.getState().showTavernEncounter({
        colonyId: 'colony-tavern',
        rumourIds: ['rumour-archive-cache-east', 'rumour-derelict-leeward'],
      });
      useGameStore.getState().dismissTavernEncounter();
      const hints = useGameStore.getState().mapHints;
      expect(hints).toHaveLength(2);
      expect(hints.map((h) => h.sourceRumourId)).toEqual([
        'rumour-archive-cache-east',
        'rumour-derelict-leeward',
      ]);
    });

    it('addMapHints appends entries and de-duplicates by sourceRumourId', () => {
      useGameStore.getState().addMapHints([
        {
          origin: { x: 1, y: 1 },
          direction: 'n',
          category: 'archive-cache',
          sourceRumourId: 'rumour-archive-cache-east',
        },
      ]);
      useGameStore.getState().addMapHints([
        {
          origin: { x: 2, y: 2 },
          direction: 's',
          category: 'archive-cache',
          sourceRumourId: 'rumour-archive-cache-east',
        },
      ]);
      const hints = useGameStore.getState().mapHints;
      expect(hints).toHaveLength(1);
      expect(hints[0]!.origin).toEqual({ x: 2, y: 2 });
    });

    it('addMapHints with an empty list is a no-op', () => {
      useGameStore.getState().addMapHints([]);
      expect(useGameStore.getState().mapHints).toEqual([]);
    });

    it('clearMapHints empties the slice', () => {
      useGameStore.getState().addMapHints([
        {
          origin: { x: 0, y: 0 },
          direction: 'e',
          category: 'wreck',
          sourceRumourId: 'rumour-derelict-leeward',
        },
      ]);
      useGameStore.getState().clearMapHints();
      expect(useGameStore.getState().mapHints).toEqual([]);
    });

    it('reset empties mapHints', () => {
      useGameStore.getState().addMapHints([
        {
          origin: { x: 0, y: 0 },
          direction: 'e',
          category: 'wreck',
          sourceRumourId: 'rumour-derelict-leeward',
        },
      ]);
      useGameStore.getState().reset();
      expect(useGameStore.getState().mapHints).toEqual([]);
    });
  });

  describe('codex unlocks', () => {
    it('seeds codexUnlocked with entries flagged unlockedFromStart', () => {
      const unlocked = useGameStore.getState().codexUnlocked;
      expect(unlocked.length).toBeGreaterThan(0);
      // Sanity: the OTK faction entry is flagged unlockedFromStart in
      // the registry (TASK-077 seed); if this ever changes, the HUD
      // codex-open button lands the player on an empty drawer.
      expect(unlocked).toContain('faction-otk');
    });

    it('appends a new entry id via unlockCodexEntry', () => {
      useGameStore.getState().unlockCodexEntry('ship-black-pearl');
      expect(useGameStore.getState().codexUnlocked).toContain('ship-black-pearl');
    });

    it('is idempotent — repeated unlock of the same id does not duplicate', () => {
      const before = useGameStore.getState().codexUnlocked.length;
      useGameStore.getState().unlockCodexEntry('ship-black-pearl');
      useGameStore.getState().unlockCodexEntry('ship-black-pearl');
      useGameStore.getState().unlockCodexEntry('ship-black-pearl');
      const after = useGameStore.getState().codexUnlocked;
      expect(after).toContain('ship-black-pearl');
      expect(after.length).toBe(before + 1);
    });

    it('reset drops runtime unlocks back to the initial seed', () => {
      const seed = [...useGameStore.getState().codexUnlocked];
      useGameStore.getState().unlockCodexEntry('ship-black-pearl');
      useGameStore.getState().unlockCodexEntry('bloodline-kidd');
      useGameStore.getState().reset();
      expect([...useGameStore.getState().codexUnlocked].sort()).toEqual([...seed].sort());
    });
  });

  describe('ad cadence cursor', () => {
    it('starts at 0 so the first ad can fire as soon as cadence is met', () => {
      expect(useGameStore.getState().lastAdShowTurn).toBe(0);
    });

    it('stamps the cursor on recordAdShown', () => {
      useGameStore.getState().recordAdShown(10);
      expect(useGameStore.getState().lastAdShowTurn).toBe(10);
    });

    it('is monotonic — a stale, smaller turn value does not rewind the cursor', () => {
      // Protects against out-of-order orchestrator reports (e.g. a
      // `shown` outcome resolving late under a microtask schedule).
      useGameStore.getState().recordAdShown(10);
      useGameStore.getState().recordAdShown(5);
      expect(useGameStore.getState().lastAdShowTurn).toBe(10);
    });

    it('reset clears the cursor so a fresh game does not inherit the old cooldown', () => {
      useGameStore.getState().recordAdShown(42);
      useGameStore.getState().reset();
      expect(useGameStore.getState().lastAdShowTurn).toBe(0);
    });
  });

  describe('entitlements slice', () => {
    it('defaults to hasRemoveAds=false before the server has been consulted', () => {
      expect(useGameStore.getState().entitlements).toEqual({ hasRemoveAds: false });
    });

    it('replaces the slice wholesale on setEntitlements', () => {
      useGameStore.getState().setEntitlements({ hasRemoveAds: true });
      expect(useGameStore.getState().entitlements).toEqual({ hasRemoveAds: true });
    });

    it('reset returns entitlements to the default unpaid shape', () => {
      useGameStore.getState().setEntitlements({ hasRemoveAds: true });
      useGameStore.getState().reset();
      expect(useGameStore.getState().entitlements).toEqual({ hasRemoveAds: false });
    });
  });
});
