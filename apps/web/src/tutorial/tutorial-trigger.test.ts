import { describe, expect, it } from 'vitest';
import type { TutorialStep, TutorialStepId } from '@colonize/content';
import { nextTutorialStep } from './tutorial-trigger';

const STEPS: readonly TutorialStep[] = [
  { id: 'welcome' as TutorialStepId, triggerTurn: 1, title: 'w', body: 'wb' },
  { id: 'end-turn' as TutorialStepId, triggerTurn: 2, title: 'e', body: 'eb' },
  { id: 'menu' as TutorialStepId, triggerTurn: 3, title: 'm', body: 'mb' },
];

describe('nextTutorialStep', () => {
  it('returns the earliest pending step whose triggerTurn has been reached', () => {
    const step = nextTutorialStep(1, new Set(), STEPS);
    expect(step?.id).toBe('welcome');
  });

  it('returns null when no step has been reached yet', () => {
    expect(nextTutorialStep(0, new Set(), STEPS)).toBeNull();
  });

  it('skips steps already in the fired set', () => {
    const fired = new Set<TutorialStepId>(['welcome' as TutorialStepId]);
    const step = nextTutorialStep(2, fired, STEPS);
    expect(step?.id).toBe('end-turn');
  });

  it('returns null once every reached step has fired', () => {
    const fired = new Set<TutorialStepId>([
      'welcome' as TutorialStepId,
      'end-turn' as TutorialStepId,
    ]);
    expect(nextTutorialStep(2, fired, STEPS)).toBeNull();
  });

  it('drains one step per call when multiple are pending (save-reload case)', () => {
    // A tutorial that was paused past turn 3 with nothing yet fired —
    // the orchestrator should fire welcome first, then end-turn, then
    // menu on subsequent calls, not all three at once.
    const fired = new Set<TutorialStepId>();
    const first = nextTutorialStep(5, fired, STEPS);
    expect(first?.id).toBe('welcome');
    fired.add(first!.id);
    const second = nextTutorialStep(5, fired, STEPS);
    expect(second?.id).toBe('end-turn');
    fired.add(second!.id);
    const third = nextTutorialStep(5, fired, STEPS);
    expect(third?.id).toBe('menu');
    fired.add(third!.id);
    expect(nextTutorialStep(5, fired, STEPS)).toBeNull();
  });

  it('returns null when currentTurn is not finite', () => {
    expect(nextTutorialStep(Number.NaN, new Set(), STEPS)).toBeNull();
    expect(nextTutorialStep(Number.POSITIVE_INFINITY, new Set(), STEPS)).toBeNull();
  });

  it('returns null for an empty step list', () => {
    expect(nextTutorialStep(10, new Set(), [])).toBeNull();
  });
});
