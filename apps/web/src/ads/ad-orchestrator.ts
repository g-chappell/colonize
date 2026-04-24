// Ad orchestrator — subscribes to the bus's `turn:advanced` event and
// drives the per-N-turn interstitial cadence for the web shell. The pure
// decision sibling (`ad-orchestrator-pure.ts`) owns all of the math and
// guard-snapshot construction; this file is the thin wiring layer that
// shuttles store state into the pure sibling and dispatches the
// resulting action to the `AdManager` abstraction from TASK-084.
//
// Initialisation is async (the ad-manager factory is lazy — it dynamic-
// imports the AdMob plugin on native shells) so `initAdOrchestrator`
// returns a Promise that resolves to a teardown. The app-level mount
// should kick the init off in a fire-and-forget effect; the teardown
// unsubscribes the bus handler on unmount.
//
// Cadence defaults to Standard (N=10) from `cadenceForGameLength`. A
// future settings-side task that exposes game-length selection will
// route its current value through the `cadenceN` option here; for now
// the orchestrator accepts an override so tests can pin N explicitly.

import { DEFAULT_GAME_LENGTH, cadenceForGameLength, type GameLength } from '@colonize/core';

import { bus } from '../bus';
import { useGameStore } from '../store/game';
import { createAdManager, type AdManager } from './ad-manager';
import {
  decideTurnEndAdAction,
  deriveAdGuardFlags,
  type AdOrchestratorSnapshot,
} from './ad-orchestrator-pure';

export interface AdOrchestratorOptions {
  // Dependency-injection seam for tests. Production callers omit this
  // and let `createAdManager()` pick the right backend.
  readonly adManager?: AdManager;
  // Explicit cadence override. If omitted, the orchestrator resolves N
  // from `gameLength` (default Standard = 10).
  readonly cadenceN?: number;
  readonly gameLength?: GameLength;
}

export type AdOrchestrator = {
  readonly adManager: AdManager;
  // Unsubscribe the bus listener. Idempotent — safe to call twice.
  teardown(): void;
};

function snapshotFromStore(): AdOrchestratorSnapshot {
  const s = useGameStore.getState();
  return {
    sovereigntyWar: s.sovereigntyWar,
    combatOutcome: s.combatOutcome,
    tutorialStep: s.tutorialStep,
    rumourReveal: s.rumourReveal,
    councilPick: s.councilPick,
    blackMarketEncounter: s.blackMarketEncounter,
    tavernEncounter: s.tavernEncounter,
    sovereigntyBeat: s.sovereigntyBeat,
    titheNotification: s.titheNotification,
    tidewaterPartyEvent: s.tidewaterPartyEvent,
    entitlements: { hasRemoveAds: s.entitlements.hasRemoveAds },
  };
}

export async function initAdOrchestrator(
  options: AdOrchestratorOptions = {},
): Promise<AdOrchestrator> {
  const adManager = options.adManager ?? (await createAdManager());
  await adManager.initialize();
  const cadenceN =
    options.cadenceN ?? cadenceForGameLength(options.gameLength ?? DEFAULT_GAME_LENGTH);

  const unsubscribe = bus.on('turn:advanced', (payload) => {
    // The bus handler must not throw — a thrown error would leave the
    // bus in a half-emitted state for every subsequent subscriber. The
    // pure decision siblings are total; the only throw-capable path is
    // `adManager.show()`, and BaseAdManager already catches its own
    // backend errors into a `skipped/error` outcome.
    void handleTurnAdvanced({
      adManager,
      cadenceN,
      currentTurn: payload.turn,
    });
  });

  let torn = false;
  return {
    adManager,
    teardown(): void {
      if (torn) return;
      torn = true;
      unsubscribe();
    },
  };
}

async function handleTurnAdvanced(input: {
  adManager: AdManager;
  cadenceN: number;
  currentTurn: number;
}): Promise<void> {
  const snapshot = snapshotFromStore();
  const flags = deriveAdGuardFlags(snapshot);
  const decision = decideTurnEndAdAction({
    currentTurn: input.currentTurn,
    lastAdShowTurn: useGameStore.getState().lastAdShowTurn,
    cadenceN: input.cadenceN,
    flags,
  });
  if (decision.action !== 'show') return;

  // Mirror the decision on the AdManager's guard flag so any show() that
  // races past our check still short-circuits inside the base class
  // (belt-and-braces per ads-guard.ts's orchestrator contract).
  input.adManager.setGuarded(false);
  const outcome = await input.adManager.show({
    format: 'interstitial',
    placement: 'turn-end',
  });
  if (outcome.kind === 'shown') {
    useGameStore.getState().recordAdShown(input.currentTurn);
  }
}
