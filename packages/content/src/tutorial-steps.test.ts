import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_STEPS,
  getTutorialStep,
  isTutorialStepId,
  type TutorialStep,
} from './tutorial-steps.js';

describe('TUTORIAL_STEPS', () => {
  it('has at least one step', () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('trigger turns are positive integers', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(Number.isInteger(step.triggerTurn)).toBe(true);
      expect(step.triggerTurn).toBeGreaterThan(0);
    }
  });

  it('trigger turns are non-decreasing across the authored ordering', () => {
    let prev = 0;
    for (const step of TUTORIAL_STEPS) {
      expect(step.triggerTurn).toBeGreaterThanOrEqual(prev);
      prev = step.triggerTurn;
    }
  });

  it('every step has non-empty title and body copy', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('every targetTestId (when present) follows the hud- prefix convention', () => {
    const steps: readonly TutorialStep[] = TUTORIAL_STEPS;
    for (const step of steps) {
      if (step.targetTestId !== undefined) {
        expect(step.targetTestId.trim().length).toBeGreaterThan(0);
        expect(step.targetTestId).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    }
  });
});

describe('isTutorialStepId', () => {
  it('accepts every authored id', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(isTutorialStepId(step.id)).toBe(true);
    }
  });

  it('rejects unknown strings and non-strings', () => {
    expect(isTutorialStepId('not-a-real-step')).toBe(false);
    expect(isTutorialStepId('')).toBe(false);
    expect(isTutorialStepId(42)).toBe(false);
    expect(isTutorialStepId(null)).toBe(false);
  });
});

describe('getTutorialStep', () => {
  it('returns the authored entry for every id', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(getTutorialStep(step.id)).toBe(step);
    }
  });

  it('throws on an unknown id', () => {
    expect(() => getTutorialStep('bogus' as never)).toThrow();
  });
});
