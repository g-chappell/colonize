import { describe, it, expect, beforeEach } from 'vitest';
import {
  BuildingType,
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
});
