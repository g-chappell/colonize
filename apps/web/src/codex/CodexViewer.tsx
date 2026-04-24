import {
  CODEX_ENTRIES,
  codexCategoryLabel,
  type CodexCanonTier,
  type CodexEntry,
} from '@colonize/content';
import { useGameStore } from '../store/game';
import { countUnlockedEntries, groupUnlockedCodexEntries } from './codex-math';
import styles from './CodexViewer.module.css';

// Mounts while `screen === 'codex'`. Renders a right-anchored side-
// drawer over the game-stage, grouping every unlocked Codex entry by
// category. Entries whose canon is marked unresolved (`canonTier:
// 'open'`) render with a fragmentary / torn-parchment treatment;
// locked entries are not rendered.
export function CodexViewer(): JSX.Element {
  const setScreen = useGameStore((s) => s.setScreen);
  const unlocked = useGameStore((s) => s.codexUnlocked);
  const groups = groupUnlockedCodexEntries(CODEX_ENTRIES, unlocked);
  const count = countUnlockedEntries(CODEX_ENTRIES, unlocked);

  return (
    <div className={styles.backdrop} data-testid="codex-viewer">
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Codex"
        data-testid="codex-viewer-panel"
      >
        <header className={styles.header}>
          <h2 className={styles.title}>Codex</h2>
          <span className={styles.count} data-testid="codex-viewer-count">
            {count} {count === 1 ? 'entry' : 'entries'}
          </span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setScreen('game')}
            data-testid="codex-viewer-close"
          >
            Close
          </button>
        </header>
        {groups.map((group) => (
          <section key={group.category} data-testid={`codex-section-${group.category}`}>
            <h3 className={styles.categoryHeading}>{codexCategoryLabel(group.category)}</h3>
            {group.entries.length === 0 ? (
              <p className={styles.emptyHint} data-testid={`codex-section-${group.category}-empty`}>
                No entries recovered yet.
              </p>
            ) : (
              <ul className={styles.entryList}>
                {group.entries.map((entry) => (
                  <CodexEntryCard key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </aside>
    </div>
  );
}

function CodexEntryCard({ entry }: { readonly entry: CodexEntry }): JSX.Element {
  const isFragmentary = entry.canonTier === 'open';
  const entryClass = isFragmentary ? `${styles.entry} ${styles.entryFragmentary}` : styles.entry;
  const bodyClass = isFragmentary
    ? `${styles.entryBody} ${styles.entryBodyBlurred}`
    : styles.entryBody;
  return (
    <li className={entryClass} data-testid={`codex-entry-${entry.id}`}>
      <div className={styles.entryHead}>
        <h4 className={styles.entryTitle}>{entry.title}</h4>
        <span className={styles.entryTier} data-testid={`codex-entry-${entry.id}-tier`}>
          {tierLabel(entry.canonTier)}
        </span>
      </div>
      <p className={styles.entrySummary}>{entry.summary}</p>
      <p className={bodyClass} data-testid={`codex-entry-${entry.id}-body`}>
        {entry.body}
      </p>
      {isFragmentary ? (
        <p
          className={styles.fragmentaryNote}
          data-testid={`codex-entry-${entry.id}-fragmentary-note`}
        >
          Canon unresolved — fragment recovered.
        </p>
      ) : null}
    </li>
  );
}

function tierLabel(tier: CodexCanonTier): string {
  switch (tier) {
    case 'established':
      return 'Canon';
    case 'draft':
      return 'Draft';
    case 'open':
      return 'Fragment';
  }
}
