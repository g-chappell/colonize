import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BuildingType,
  TurnPhase,
  UnitType,
  type ColonyJSON,
  type ConcordFleetCampaignJSON,
  type UnitJSON,
} from '@colonize/core';
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

  it('ticks colony production queues once per full turn cycle', async () => {
    const colony: ColonyJSON = {
      id: 'colony-1',
      faction: 'otk',
      position: { x: 0, y: 0 },
      population: 2,
      crew: [],
      buildings: [],
      stocks: { resources: {}, artifacts: [] },
    };
    useGameStore.getState().setColonies([colony]);
    useGameStore.getState().enqueueBuilding('colony-1', BuildingType.Tavern);
    turnController.endPlayerTurn();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const queue = useGameStore.getState().colonyQueues['colony-1'];
    // population=2 → head item progress = 2 after a single cycle.
    expect(queue![0]!.progress).toBe(2);
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

  describe('endgame check on TurnPhase.End exit', () => {
    const EMPTY_CARGO = { resources: {}, artifacts: [] } as const;
    function makeShip(id: string, faction: string): UnitJSON {
      return {
        id,
        faction,
        position: { x: 0, y: 0 },
        type: UnitType.Sloop,
        movement: 4,
        cargo: EMPTY_CARGO,
      };
    }
    function makeColony(id: string, faction: string): ColonyJSON {
      return {
        id,
        faction,
        position: { x: 0, y: 0 },
        population: 1,
        crew: [],
        buildings: [],
        stocks: { resources: {}, artifacts: [] },
      };
    }

    it('declares sovereignty-victory when the campaign finishes during the turn', async () => {
      const campaign: ConcordFleetCampaignJSON = {
        difficulty: 'standard',
        turnsRequired: 1,
        turnsElapsed: 1,
        waves: [{ spawnTurn: 0, ships: ['frigate'], groundTroops: [] }],
        spawnedWaveIndices: [0],
      };
      useGameStore.setState({
        faction: 'otk',
        units: [makeShip('u1', 'otk')],
        colonies: [makeColony('c1', 'otk')],
        sovereigntyWar: campaign,
      });
      turnController.endPlayerTurn();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const state = useGameStore.getState();
      expect(state.endgame?.kind).toBe('victory');
      expect(state.endgame?.result).toBe('sovereignty-victory');
      expect(state.screen).toBe('game-over');
    });

    it('declares annihilated when the player has no colonies and no ships', async () => {
      useGameStore.setState({
        faction: 'ironclad',
        units: [],
        colonies: [],
      });
      turnController.endPlayerTurn();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const state = useGameStore.getState();
      expect(state.endgame?.kind).toBe('defeat');
      expect(state.endgame?.result).toBe('annihilated');
      expect(state.screen).toBe('game-over');
    });

    it('does not declare endgame when the player still has ships or colonies', async () => {
      useGameStore.setState({
        faction: 'otk',
        units: [makeShip('u1', 'otk')],
        colonies: [],
      });
      turnController.endPlayerTurn();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const state = useGameStore.getState();
      expect(state.endgame).toBeNull();
      expect(state.screen).toBe('menu');
    });

    it('only fires once — a second end-turn after declaration does not overwrite', async () => {
      useGameStore.setState({ faction: 'otk', units: [], colonies: [] });
      turnController.endPlayerTurn();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const firstOutcome = useGameStore.getState().endgame;
      expect(firstOutcome?.kind).toBe('defeat');
      // Seed a sovereignty win for a would-be second fire.
      useGameStore.setState({
        sovereigntyWar: {
          difficulty: 'standard',
          turnsRequired: 1,
          turnsElapsed: 5,
          waves: [{ spawnTurn: 0, ships: ['frigate'], groundTroops: [] }],
          spawnedWaveIndices: [0],
        },
      });
      turnController.endPlayerTurn();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(useGameStore.getState().endgame).toBe(firstOutcome);
    });
  });
});
