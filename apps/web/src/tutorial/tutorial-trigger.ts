import type { TutorialStep, TutorialStepId } from '@colonize/content';

// Pure-sibling to TutorialStepModal + the turn-controller hook. Given
// the current turn, the set of steps already fired, and the authored
// step list, returns the next step that should fire now — or null if no
// step is pending. Centralising the selection in a pure function keeps
// the tutorial policy testable without touching the store or the DOM.
//
// Selection rules:
//   - A step is eligible when its `triggerTurn <= currentTurn` AND its
//     id is not in `fired`.
//   - Among eligible steps, the earliest-authored one wins (iteration
//     order). This mirrors how the step list is read left-to-right by
//     any future authoring tool and keeps deterministic firing even if
//     two steps share the same trigger turn.
//   - At most one step fires per trigger invocation. The orchestrator
//     re-calls this function on each turn tick; if multiple steps were
//     skipped (save reload, tutorial toggled on mid-game), they will
//     drain one turn at a time — which is the right pacing for the
//     player anyway, not a burst of stacked modals.
export function nextTutorialStep(
  currentTurn: number,
  fired: ReadonlySet<TutorialStepId>,
  steps: readonly TutorialStep[],
): TutorialStep | null {
  if (!Number.isFinite(currentTurn)) return null;
  for (const step of steps) {
    if (step.triggerTurn <= currentTurn && !fired.has(step.id)) {
      return step;
    }
  }
  return null;
}
