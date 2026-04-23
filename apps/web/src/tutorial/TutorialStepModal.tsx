import { useEffect, useState } from 'react';
import { getTutorialStep } from '@colonize/content';
import { useGameStore } from '../store/game';
import styles from './TutorialStepModal.module.css';

// Mounts while `tutorialStep !== null`. The store records the step id;
// we look up the authored copy + optional target from @colonize/content
// and render the callout. Two dismiss paths: "Got it" clears the
// current step (tutorial continues to the next), "Skip tutorial"
// disables the engine entirely.
export function TutorialStepModal(): JSX.Element | null {
  const stepId = useGameStore((s) => s.tutorialStep);
  const dismiss = useGameStore((s) => s.dismissTutorialStep);
  const skip = useGameStore((s) => s.skipTutorial);
  const targetTestId = stepId ? (getTutorialStep(stepId).targetTestId ?? null) : null;
  const targetRect = useTargetRect(targetTestId);

  if (!stepId) return null;
  const step = getTutorialStep(stepId);

  return (
    <div className={styles.root} data-testid="tutorial-step">
      {targetRect && (
        <>
          <div
            className={styles.highlight}
            style={highlightStyle(targetRect)}
            data-testid="tutorial-step-highlight"
          />
          <ArrowIndicator rect={targetRect} />
        </>
      )}
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="false"
        aria-label={`Tutorial: ${step.title}`}
        data-testid="tutorial-step-panel"
      >
        <h2 className={styles.title} data-testid="tutorial-step-title">
          {step.title}
        </h2>
        <p className={styles.body} data-testid="tutorial-step-body">
          {step.body}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            onClick={dismiss}
            data-testid="tutorial-step-next"
            autoFocus
          >
            Got it
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.skip}`}
            onClick={skip}
            data-testid="tutorial-step-skip"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

interface TargetRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

// Tracks the bounding rect of the element with `data-testid={testId}`.
// Re-measures on window resize so the highlight stays aligned if the
// HUD reflows. Returns null when no testId is requested or when the
// target is not present in the DOM (e.g. framing steps, or tests that
// don't mount the HUD).
function useTargetRect(testId: string | null): TargetRect | null {
  const [rect, setRect] = useState<TargetRect | null>(null);
  useEffect(() => {
    if (!testId) {
      setRect(null);
      return;
    }
    if (typeof document === 'undefined') return;
    const measure = (): void => {
      const el = document.querySelector(`[data-testid="${testId}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [testId]);
  return rect;
}

function highlightStyle(rect: TargetRect): React.CSSProperties {
  const pad = 6;
  return {
    left: `${rect.left - pad}px`,
    top: `${rect.top - pad}px`,
    width: `${rect.width + pad * 2}px`,
    height: `${rect.height + pad * 2}px`,
  };
}

// Bobbing arrow above the target rect, pointing down at it. Rendered
// separately from the highlight so the bob animation runs independent
// of the pulse.
function ArrowIndicator({ rect }: { rect: TargetRect }): JSX.Element {
  const style: React.CSSProperties = {
    left: `${rect.left + rect.width / 2 - 12}px`,
    top: `${rect.top - 32}px`,
  };
  return (
    <svg
      className={styles.arrow}
      style={style}
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-testid="tutorial-step-arrow"
    >
      <path
        d="M12 20 L4 8 L9 8 L9 2 L15 2 L15 8 L20 8 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
