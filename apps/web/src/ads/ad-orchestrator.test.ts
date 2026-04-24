import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bus } from '../bus';
import { useGameStore } from '../store/game';
import { BaseAdManager, type AdOutcome, type AdShowRequest } from './ad-manager';
import { initAdOrchestrator, type AdOrchestrator } from './ad-orchestrator';

class FakeAdManager extends BaseAdManager {
  readonly backend = 'web' as const;
  showCalls: AdShowRequest[] = [];
  nextOutcome: AdOutcome = { kind: 'shown', rewarded: false };
  protected async init(): Promise<void> {
    // No-op.
  }
  protected async serve(request: AdShowRequest): Promise<AdOutcome> {
    this.showCalls.push(request);
    return this.nextOutcome;
  }
}

// Helper: emit a `turn:advanced` bus event and let the orchestrator's
// microtask-queued handler resolve before the next assertion. Callers
// pass the turn number; the helper mirrors it into the store so the
// handler's store-read sees the same value (turn-controller.ts emits
// after it has already synced the store).
async function emitTurnAdvanced(turn: number): Promise<void> {
  useGameStore.setState({ currentTurn: turn });
  bus.emit('turn:advanced', { turn });
  // Two microtask drains: the first lets the bus handler fire, the
  // second lets the awaited `adManager.show()` promise resolve before
  // we read `showCalls` / store state.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('initAdOrchestrator', () => {
  let orchestrator: AdOrchestrator;
  let adManager: FakeAdManager;

  beforeEach(async () => {
    useGameStore.getState().reset();
    useGameStore.setState({ screen: 'game' });
    bus.clear();
    adManager = new FakeAdManager();
    orchestrator = await initAdOrchestrator({ adManager, cadenceN: 10 });
  });

  afterEach(() => {
    orchestrator.teardown();
    bus.clear();
    useGameStore.getState().reset();
  });

  it('initialises the injected ad manager', () => {
    expect(adManager.isInitialized()).toBe(true);
    expect(orchestrator.adManager).toBe(adManager);
  });

  it('does not show an ad before N turn-advances have elapsed', async () => {
    for (let t = 1; t <= 9; t++) {
      await emitTurnAdvanced(t);
    }
    expect(adManager.showCalls).toHaveLength(0);
    expect(useGameStore.getState().lastAdShowTurn).toBe(0);
  });

  it('shows an interstitial on the N-th turn and stamps lastAdShowTurn', async () => {
    await emitTurnAdvanced(10);
    expect(adManager.showCalls).toEqual([{ format: 'interstitial', placement: 'turn-end' }]);
    expect(useGameStore.getState().lastAdShowTurn).toBe(10);
  });

  it('re-arms after a show: the next ad fires N turns later', async () => {
    await emitTurnAdvanced(10);
    for (let t = 11; t <= 19; t++) {
      await emitTurnAdvanced(t);
    }
    expect(adManager.showCalls).toHaveLength(1);
    await emitTurnAdvanced(20);
    expect(adManager.showCalls).toHaveLength(2);
    expect(useGameStore.getState().lastAdShowTurn).toBe(20);
  });

  it('leaves lastAdShowTurn alone when the backend returns skipped/unavailable', async () => {
    // Emulates the web backend's "no ad network provisioned yet" path —
    // the cadence must not latch forward on a no-op show, so the next
    // turn re-attempts.
    adManager.nextOutcome = { kind: 'skipped', reason: 'unavailable' };
    await emitTurnAdvanced(10);
    expect(adManager.showCalls).toHaveLength(1);
    expect(useGameStore.getState().lastAdShowTurn).toBe(0);
    // Next turn re-attempts rather than waiting for another full N.
    await emitTurnAdvanced(11);
    expect(adManager.showCalls).toHaveLength(2);
  });

  it('skips show entirely when a Sovereignty War is active', async () => {
    useGameStore.setState({
      sovereigntyWar: {
        id: 'campaign-1',
        difficulty: 'standard',
        turnStarted: 1,
        turnsElapsed: 0,
        turnsRequired: 20,
        waves: [],
        pendingWaves: [],
      } as unknown as Parameters<typeof useGameStore.setState>[0] extends {
        sovereigntyWar?: infer T;
      }
        ? T
        : never,
    });
    await emitTurnAdvanced(10);
    expect(adManager.showCalls).toHaveLength(0);
    expect(useGameStore.getState().lastAdShowTurn).toBe(0);
  });

  it('skips show while a tutorial step is mounted', async () => {
    useGameStore.setState({ tutorialStep: 'welcome' });
    await emitTurnAdvanced(10);
    expect(adManager.showCalls).toHaveLength(0);
  });

  it('skips show while the combat overlay is mounted', async () => {
    useGameStore.setState({
      combatOutcome: {
        result: 'attacker-victory',
        events: [],
      } as unknown as Parameters<typeof useGameStore.setState>[0] extends {
        combatOutcome?: infer T;
      }
        ? T
        : never,
    });
    await emitTurnAdvanced(10);
    expect(adManager.showCalls).toHaveLength(0);
  });

  it('skips show while any transient narrative modal is mounted', async () => {
    // Picking tavernEncounter as the representative — the pure-sibling
    // test covers every slice under this flag; here we just prove the
    // wiring passes the snapshot through.
    useGameStore.setState({
      tavernEncounter: { colonyId: 'c1' } as unknown as Parameters<
        typeof useGameStore.setState
      >[0] extends { tavernEncounter?: infer T }
        ? T
        : never,
    });
    await emitTurnAdvanced(10);
    expect(adManager.showCalls).toHaveLength(0);
  });

  it('teardown unsubscribes the bus handler', async () => {
    orchestrator.teardown();
    await emitTurnAdvanced(10);
    expect(adManager.showCalls).toHaveLength(0);
  });

  it('teardown is idempotent', () => {
    orchestrator.teardown();
    expect(() => orchestrator.teardown()).not.toThrow();
  });
});
