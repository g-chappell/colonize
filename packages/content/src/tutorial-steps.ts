// Tutorial campaign step registry — the scripted "learn the ropes"
// sequence fired on specific turns when the player opts in to tutorial
// guidance at new-game time (TASK-079).
//
// This file holds the *engine-facing* step shape and a minimal bootstrap
// set (welcome + the two most critical HUD callouts) so the trigger +
// step-engine can be validated end-to-end. Full step authoring — 12-15
// steps in Mr Jackson's voice, with narrative framing — lands in
// TASK-080 and only needs to extend `TUTORIAL_STEPS`.

export type TutorialStepId = 'welcome' | 'end-turn' | 'menu' | 'complete';

export interface TutorialStep {
  readonly id: TutorialStepId;
  // Game turn on which this step fires (1-indexed, matches
  // TurnManager.turn). A step fires once per tutorial run; once fired
  // it never re-fires even on manual reopen.
  readonly triggerTurn: number;
  readonly title: string;
  readonly body: string;
  // Optional HUD `data-testid` of the element the highlight arrow
  // should point at. When omitted, the modal shows without a callout
  // arrow (used for framing / "you're done" steps).
  readonly targetTestId?: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    triggerTurn: 1,
    title: 'Welcome aboard',
    body: 'These waters are yours to read. Take your time — the Kraken does not rush.',
  },
  {
    id: 'end-turn',
    triggerTurn: 2,
    title: 'Ending a turn',
    body: 'When your orders are given, press End Turn to let the season pass.',
    targetTestId: 'hud-end-turn',
  },
  {
    id: 'menu',
    triggerTurn: 3,
    title: 'Pause and settings',
    body: 'The menu button pauses the campaign and opens save, settings, and quit.',
    targetTestId: 'hud-menu-button',
  },
  {
    id: 'complete',
    triggerTurn: 4,
    title: 'You have the helm',
    body: 'That is the whole tutor. Further guidance will come as new systems open.',
  },
];

const TUTORIAL_STEP_IDS: readonly string[] = TUTORIAL_STEPS.map((s) => s.id);

export function isTutorialStepId(value: unknown): value is TutorialStepId {
  return typeof value === 'string' && TUTORIAL_STEP_IDS.includes(value);
}

export function getTutorialStep(id: TutorialStepId): TutorialStep {
  if (!isTutorialStepId(id)) {
    throw new TypeError(`getTutorialStep: not a valid id: ${String(id)}`);
  }
  const found = TUTORIAL_STEPS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`getTutorialStep: missing entry for ${id}`);
  }
  return found;
}
