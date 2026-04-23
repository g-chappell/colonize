import { useGameStore } from '../store/game';
import styles from './MainMenu.module.css';

interface MenuItem {
  id: 'new-game' | 'continue' | 'settings' | 'codex' | 'quit';
  label: string;
  disabled?: boolean;
  onSelect?: () => void;
}

export function MainMenu(): JSX.Element {
  const setScreen = useGameStore((s) => s.setScreen);

  const items: MenuItem[] = [
    {
      id: 'new-game',
      label: 'New Game',
      onSelect: () => setScreen('prologue'),
    },
    { id: 'continue', label: 'Continue', disabled: true },
    { id: 'settings', label: 'Settings' },
    { id: 'codex', label: 'Codex' },
    { id: 'quit', label: 'Quit' },
  ];

  return (
    <main className={styles.menu} data-testid="main-menu">
      <Heraldry />
      <h1 className={styles.title}>Colonize</h1>
      <p className={styles.era}>NW 2191 · Early Liberty Era</p>
      <p className={styles.motto}>Hic sunt dracones.</p>
      <ul className={styles.items} data-testid="main-menu-items">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.item}
              onClick={item.onSelect}
              disabled={item.disabled ?? false}
              data-testid={`main-menu-${item.id}`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Heraldry(): JSX.Element {
  return (
    <svg
      className={styles.heraldry}
      viewBox="0 0 320 140"
      role="img"
      aria-label="Order of the Kraken heraldry: paired dragons flanking a shield"
      data-testid="main-menu-heraldry"
    >
      <g fill="none" stroke="#d6b466" strokeWidth="2" strokeLinejoin="round">
        <Dragon transform="translate(20 20)" />
        <Dragon transform="translate(300 20) scale(-1 1)" />
        <path
          d="M160 22 L200 40 L200 90 Q200 116 160 128 Q120 116 120 90 L120 40 Z"
          fill="#0c1e2b"
        />
        <path d="M160 40 Q172 60 160 110 Q148 60 160 40 Z" fill="#d6b466" />
      </g>
    </svg>
  );
}

function Dragon({ transform }: { transform: string }): JSX.Element {
  return (
    <g transform={transform}>
      <path d="M0 80 Q20 60 40 70 Q55 40 80 50 Q95 30 110 50 Q105 65 95 70 Q80 80 60 80 Q35 85 0 80 Z" />
      <path d="M95 50 L100 42 L105 50 Z" fill="#d6b466" />
      <circle cx="100" cy="52" r="1.5" fill="#d6b466" />
    </g>
  );
}
