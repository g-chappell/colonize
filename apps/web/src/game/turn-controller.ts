import { ALL_TURN_PHASES, TurnManager, TurnPhase, checkEndgame } from '@colonize/core';
import { bus } from '../bus';
import { useGameStore } from '../store/game';

// One TurnManager instance shared between React (HUD) and the Phaser
// game scene. The instance is constructed once at module load. Phase
// transitions are mirrored into the zustand store via enter-hooks so
// React components can render the "AI thinking…" indicator and the
// year display straight off of store state without subscribing to
// TurnManager directly.
//
// `endPlayerTurn()` kicks off a full PlayerAction → AI → WorldEvents
// → End → Start → PlayerAction cycle. The first advance is synchronous
// so the UI reliably renders an 'ai' frame; the remaining advances are
// queued on a microtask so React gets a chance to paint before the
// loop closes back to PlayerAction. This is a stand-in for a real AI
// scheduler — when AI logic lands, the microtask body becomes the
// place where AI resolvers plug in.

export interface TurnController {
  getManager(): TurnManager;
  endPlayerTurn(): void;
  reset(): void;
}

function bindManagerToStore(manager: TurnManager): () => void {
  const unsubs: Array<() => void> = [];
  for (const phase of ALL_TURN_PHASES) {
    unsubs.push(
      manager.on(phase, 'enter', (ctx) => {
        useGameStore.setState({ phase: ctx.phase, currentTurn: ctx.turn - 1 });
      }),
    );
  }
  // Victory/loss check on End-exit: the turn-cycle has finished resolving
  // and the store slices (colonies, units, sovereigntyWar) reflect the
  // end-of-turn state. `declareEndgame` is itself idempotent (no-op once
  // an outcome is already set), so repeated triggers from a stalled-
  // re-enter scenario are harmless.
  unsubs.push(
    manager.on(TurnPhase.End, 'exit', (ctx) => {
      const state = useGameStore.getState();
      if (state.endgame !== null) return;
      const war = state.sovereigntyWar;
      const outcome = checkEndgame({
        turn: ctx.turn,
        colonyCount: state.colonies.filter((c) => c.faction === state.faction).length,
        fleetCount: state.units.filter((u) => u.faction === state.faction).length,
        sovereigntyWarVictorious: war !== null && war.turnsElapsed >= war.turnsRequired,
      });
      if (outcome) useGameStore.getState().declareEndgame(outcome);
    }),
  );
  return () => {
    for (const u of unsubs) u();
  };
}

function createManager(): TurnManager {
  return new TurnManager({ turn: 1, phase: TurnPhase.PlayerAction });
}

function syncInitialStore(): void {
  useGameStore.setState({ phase: TurnPhase.PlayerAction, currentTurn: 0 });
}

function buildController(): TurnController {
  let manager = createManager();
  let unbind = bindManagerToStore(manager);
  syncInitialStore();

  return {
    getManager: () => manager,
    endPlayerTurn(): void {
      if (manager.phase !== TurnPhase.PlayerAction) return;
      manager.advance();
      queueMicrotask(() => {
        manager.advance();
        manager.advance();
        manager.advance();
        manager.advance();
        // Production queues tick once the cycle closes so the fresh
        // turn number in the store and the tick-derived buildings
        // update together. TASK-041 owns this wiring; a later roster
        // task will re-home the tick into a phase hook on the
        // TurnManager itself.
        useGameStore.getState().tickColonyQueues();
        bus.emit('turn:advanced', { turn: useGameStore.getState().currentTurn });
      });
    },
    reset(): void {
      unbind();
      manager = createManager();
      unbind = bindManagerToStore(manager);
      syncInitialStore();
    },
  };
}

export const turnController: TurnController = buildController();
