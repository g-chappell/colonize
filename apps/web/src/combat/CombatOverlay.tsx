import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/game';
import {
  activeBeat,
  buildCombatTimeline,
  cinematicDurationMs,
  describeResult,
  revealedBeats,
  type CombatBeat,
} from './cinematic-state';
import styles from './CombatOverlay.module.css';

const FRAME_INTERVAL_MS = 50;

// Self-mounting overlay (RumourRevealModal pattern). Renders nothing
// until `combatOutcome !== null`. The orchestrator that wires
// `resolveCombat` to ship engagements (a future task) calls
// `showCombatOutcome(outcome)` to open the overlay; the player
// dismisses via the Continue button.
export function CombatOverlay(): JSX.Element | null {
  const outcome = useGameStore((s) => s.combatOutcome);
  const dismiss = useGameStore((s) => s.dismissCombatOutcome);

  const beats = useMemo(() => (outcome ? buildCombatTimeline(outcome) : []), [outcome]);
  const totalMs = useMemo(() => cinematicDurationMs(beats), [beats]);

  const [elapsed, setElapsed] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const startRef = useRef<number | null>(null);

  // Reset playback when a new outcome opens. Keyed on the outcome
  // identity so showing a second engagement after dismissing the first
  // restarts the cinematic from t=0.
  useEffect(() => {
    setElapsed(0);
    setSkipped(false);
    startRef.current = null;
  }, [outcome]);

  // Drive the elapsed-time counter while the cinematic is playing.
  // Uses a 50ms interval (rather than rAF) so tests can advance time
  // deterministically with vi.useFakeTimers without coupling to the
  // browser's animation frame cadence.
  useEffect(() => {
    if (!outcome || skipped || elapsed >= totalMs) return undefined;
    const id = window.setInterval(() => {
      setElapsed((prev) => {
        if (startRef.current === null) startRef.current = Date.now() - prev;
        const next = Date.now() - startRef.current;
        return next >= totalMs ? totalMs : next;
      });
    }, FRAME_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [outcome, skipped, elapsed, totalMs]);

  if (!outcome) return null;

  const finished = skipped || elapsed >= totalMs;
  const visibleElapsed = finished ? totalMs : elapsed;
  const current = activeBeat(beats, visibleElapsed);
  const visibleLog = finished ? beats : revealedBeats(beats, visibleElapsed);
  const focus = finished ? null : (current?.focus ?? null);

  return (
    <div className={styles.backdrop} data-testid="combat-overlay">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Combat resolution"
        data-testid="combat-overlay-panel"
      >
        <h2 className={styles.title} data-testid="combat-overlay-title">
          Engagement
        </h2>
        <div className={styles.cinematic} data-testid="combat-overlay-cinematic">
          <div
            className={`${styles.ship} ${focus === 'attacker' ? styles.shipActive : ''}`}
            data-testid="combat-overlay-attacker"
            data-active={focus === 'attacker'}
            aria-label="Attacker"
          />
          <div
            className={`${styles.ship} ${styles.shipDefender} ${
              focus === 'defender' ? styles.shipActive : ''
            }`}
            data-testid="combat-overlay-defender"
            data-active={focus === 'defender'}
            aria-label="Defender"
          />
          {!finished && current ? (
            <span className={styles.beatLabel} data-testid="combat-overlay-beat-label">
              {beatLabel(current, beats.length)}
            </span>
          ) : null}
        </div>
        <ul className={styles.log} data-testid="combat-overlay-log">
          {visibleLog.map((beat) => (
            <li
              key={beat.index}
              className={styles.logItem}
              data-testid={`combat-overlay-log-item-${beat.index}`}
            >
              {beat.description}
            </li>
          ))}
        </ul>
        {finished ? (
          <p className={styles.result} data-testid="combat-overlay-result">
            {describeResult(outcome.result)}
          </p>
        ) : null}
        <div className={styles.actions}>
          {finished ? (
            <button
              type="button"
              className={styles.button}
              onClick={dismiss}
              data-testid="combat-overlay-continue"
              autoFocus
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className={styles.button}
              onClick={() => setSkipped(true)}
              data-testid="combat-overlay-skip"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function beatLabel(beat: CombatBeat, total: number): string {
  return `Step ${beat.index + 1} / ${total}`;
}
