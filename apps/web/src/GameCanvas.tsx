import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { bus } from './bus';
import { SCENE_KEYS } from './game/asset-keys';
import {
  buildNewGameSetup,
  DEFAULT_NEW_GAME_HEIGHT,
  DEFAULT_NEW_GAME_WIDTH,
} from './game/new-game';
import { useGameStore, type PendingNewGame } from './store/game';

// Phaser's module init touches the canvas 2D context, which jsdom
// (used by vitest) does not implement. We import Phaser dynamically
// inside the effect so unit tests that render GameCanvas do not
// trigger Phaser's browser-only startup. `canMountPhaser` then guards
// against the jsdom canvas stub returning null.
function canMountPhaser(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  try {
    return typeof canvas.getContext === 'function' && canvas.getContext('2d') !== null;
  } catch {
    return false;
  }
}

export function GameCanvas(): JSX.Element {
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!parentRef.current || !canMountPhaser()) return;

    let destroyed = false;
    let gameInstance: Phaser.Game | null = null;
    let bootReady = false;
    let pendingStarted = false;
    const busUnsubscribes: Array<() => void> = [];

    // Colony-open routing lives here (not inside GameScene) because the
    // overlay is a React screen and the screen slice is owned by the
    // zustand store. GameScene emits the bus event; this effect routes
    // the open. Subscribed for the full GameCanvas lifetime so the
    // event fires regardless of which Phaser scene is active.
    busUnsubscribes.push(
      bus.on('colony:selected', ({ colonyId }) => {
        const state = useGameStore.getState();
        state.setSelectedColony(colonyId);
        if (colonyId !== null) state.setScreen('colony');
      }),
    );

    // Codex unlocks — gameplay orchestrators (rumour resolution,
    // legendary-ship discovery, faction first-contact) emit the bus
    // event; the store action dedupes so a double-fire does not grow
    // the unlocked array twice.
    busUnsubscribes.push(
      bus.on('codex:entry-unlocked', ({ entryId }) => {
        useGameStore.getState().unlockCodexEntry(entryId);
      }),
    );

    // The new-game wire-up: BootScene's preload is async, so we pair
    // the boot:complete bus event with the pendingNewGame store slice.
    // Whichever resolves last triggers tryStart; tryStart guards against
    // double-fire so a re-fire of either signal does not re-seed the
    // game.
    const tryStart = (): void => {
      if (pendingStarted || destroyed || !gameInstance || !bootReady) return;
      const pending = useGameStore.getState().pendingNewGame;
      if (!pending) return;
      pendingStarted = true;
      seedAndStartGame(gameInstance, pending);
    };

    busUnsubscribes.push(
      bus.on('boot:complete', () => {
        bootReady = true;
        tryStart();
      }),
    );
    busUnsubscribes.push(
      useGameStore.subscribe((state, prev) => {
        if (state.pendingNewGame === prev.pendingNewGame) return;
        if (state.pendingNewGame) tryStart();
        else pendingStarted = false;
      }),
    );

    void import('./game').then(({ createGame }) => {
      if (destroyed || !parentRef.current) return;
      gameInstance = createGame({ parent: parentRef.current });
      busUnsubscribes.push(
        bus.on('game:pause', () => gameInstance?.scene.pause(SCENE_KEYS.game)),
        bus.on('game:resume', () => gameInstance?.scene.resume(SCENE_KEYS.game)),
      );
      tryStart();
    });

    return () => {
      destroyed = true;
      for (const unsub of busUnsubscribes) unsub();
      gameInstance?.destroy(true);
    };
  }, []);

  return <div ref={parentRef} className="game-canvas" data-testid="game-canvas" />;
}

// Threads `pendingNewGame` inputs through `buildNewGameSetup`, writes
// the seeded roster (units + home port) to the store, starts GameScene
// with the generated map + visibility, and clears the pending slice.
// Lives next to GameCanvas's effect because it is the React/Phaser
// integration point — `gameInstance` is only in scope here.
function seedAndStartGame(game: Phaser.Game, pending: PendingNewGame): void {
  // Dynamic-import keeps Phaser-touching modules out of the test graph
  // — same rationale as the createGame import above.
  void import('./game').then(({ startGameScene }) => {
    const setup = buildNewGameSetup({
      seed: pending.seed,
      factionId: pending.factionId,
      width: DEFAULT_NEW_GAME_WIDTH,
      height: DEFAULT_NEW_GAME_HEIGHT,
    });
    const store = useGameStore.getState();
    store.setUnits(setup.units);
    store.setHomePort(pending.factionId, setup.homePort);
    startGameScene(game, setup.map, {
      cameraFocus: setup.cameraFocus,
      visibility: setup.visibility,
    });
    store.clearPendingNewGame();
  });
}
