import { getTavernRumour, type TavernRumourEntry } from '@colonize/content';
import { useGameStore } from '../store/game';
import styles from './TavernModal.module.css';

// Self-mounting tavern encounter (slice-driven overlay per CLAUDE.md).
// Mounts while `tavernEncounter !== null`. The opener — today the
// "Visit Tavern" button on the colony overlay — fills the slice with
// a colony id + a pre-rolled list of rumour ids. The player walks
// away by clicking "Leave the tavern", which clears the slice.
export function TavernModal(): JSX.Element | null {
  const encounter = useGameStore((s) => s.tavernEncounter);
  const dismiss = useGameStore((s) => s.dismissTavernEncounter);

  if (!encounter) return null;

  const rumours = encounter.rumourIds.map((id) => getTavernRumour(id));

  return (
    <div className={styles.backdrop} data-testid="tavern-encounter">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Tavern: ${encounter.colonyId}`}
        data-testid="tavern-encounter-panel"
      >
        <header className={styles.header}>
          <p className={styles.place} data-testid="tavern-encounter-place">
            {encounter.colonyId} · Tavern
          </p>
          <h2 className={styles.title} data-testid="tavern-encounter-title">
            Lamplit Hall
          </h2>
          <p className={styles.ambience} data-testid="tavern-encounter-ambience">
            Salt-stained boards, a cracked bell, the low chord of half-drunk songs. The rumour-mill
            is open for business.
          </p>
        </header>

        {rumours.length === 0 ? (
          <p className={styles.empty} data-testid="tavern-encounter-empty">
            No rumours doing the rounds tonight. Try the rum.
          </p>
        ) : (
          <ul className={styles.rumours} data-testid="tavern-encounter-rumours">
            {rumours.map((rumour) => (
              <RumourCard key={rumour.id} rumour={rumour} />
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.dismiss}
            onClick={dismiss}
            data-testid="tavern-encounter-dismiss"
            autoFocus
          >
            Leave the tavern
          </button>
        </div>
      </div>
    </div>
  );
}

interface RumourCardProps {
  readonly rumour: TavernRumourEntry;
}

function RumourCard({ rumour }: RumourCardProps): JSX.Element {
  return (
    <li
      className={styles.card}
      data-testid={`tavern-encounter-rumour-${rumour.id}`}
      data-register={rumour.register}
    >
      <h3 className={styles.headline} data-testid={`tavern-encounter-headline-${rumour.id}`}>
        {rumour.headline}
      </h3>
      <p className={styles.body} data-testid={`tavern-encounter-body-${rumour.id}`}>
        {rumour.body}
      </p>
    </li>
  );
}
