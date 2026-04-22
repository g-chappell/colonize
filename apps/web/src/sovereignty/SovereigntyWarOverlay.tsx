import { useGameStore } from '../store/game';
import { sovereigntyProgressFraction } from './sovereignty-progress';
import styles from './SovereigntyWarOverlay.module.css';

// Mounts while `sovereigntyWar !== null`. Paints a red vignette over
// the whole game stage AND a progress banner above the AI-thinking
// chip showing `turnsElapsed / turnsRequired` plus a fill bar. The
// overlay stays click-through (every layer is pointer-events: none)
// so Phaser still receives map clicks beneath.
export function SovereigntyWarOverlay(): JSX.Element | null {
  const campaign = useGameStore((s) => s.sovereigntyWar);
  if (!campaign) return null;

  const fraction = sovereigntyProgressFraction(campaign);
  const percent = Math.round(fraction * 100);
  const fillWidth = `${(fraction * 100).toFixed(1)}%`;

  return (
    <div className={styles.root} data-testid="sovereignty-war-overlay">
      <div className={styles.tint} data-testid="sovereignty-war-tint" aria-hidden="true" />
      <div
        className={styles.banner}
        role="status"
        aria-label="Sovereignty War progress"
        data-testid="sovereignty-war-banner"
      >
        <span className={styles.title}>Sovereignty War</span>
        <span className={styles.turns} data-testid="sovereignty-war-turns">
          <span className={styles.turnsValue}>{campaign.turnsElapsed}</span>
          <span> / {campaign.turnsRequired} turns</span>
        </span>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={campaign.turnsRequired}
          aria-valuenow={Math.min(campaign.turnsElapsed, campaign.turnsRequired)}
          data-testid="sovereignty-war-track"
        >
          <div
            className={styles.fill}
            style={{ width: fillWidth }}
            data-testid="sovereignty-war-fill"
          />
        </div>
        <span className={styles.percent} data-testid="sovereignty-war-percent">
          {percent}%
        </span>
      </div>
    </div>
  );
}
