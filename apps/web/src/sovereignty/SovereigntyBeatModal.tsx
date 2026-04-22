import { useGameStore } from '../store/game';
import { getSovereigntyBeat } from './sovereignty-progress';
import styles from './SovereigntyBeatModal.module.css';

// Mounts while `sovereigntyBeat !== null`. Slice-driven self-mounting
// overlay per CLAUDE.md — does NOT add a Screen literal, appears
// wherever the player was when `tickSovereigntyWar` crossed a
// milestone. The dismiss action clears the beat slice only; the
// active campaign (if any) continues running.
export function SovereigntyBeatModal(): JSX.Element | null {
  const milestone = useGameStore((s) => s.sovereigntyBeat);
  const dismiss = useGameStore((s) => s.dismissSovereigntyBeat);

  if (milestone === null) return null;

  const beat = getSovereigntyBeat(milestone);

  return (
    <div className={styles.backdrop} data-testid="sovereignty-beat">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Sovereignty War beat: ${beat.title}`}
        data-testid="sovereignty-beat-panel"
      >
        <span className={styles.milestone} data-testid="sovereignty-beat-milestone">
          {milestone}% — Sovereignty War
        </span>
        <h2 className={styles.title} data-testid="sovereignty-beat-title">
          {beat.title}
        </h2>
        <p className={styles.flavour} data-testid="sovereignty-beat-flavour">
          {beat.flavour}
        </p>
        <button
          type="button"
          className={styles.dismiss}
          onClick={dismiss}
          data-testid="sovereignty-beat-dismiss"
          autoFocus
        >
          Hold the line
        </button>
      </div>
    </div>
  );
}
