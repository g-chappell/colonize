import { FACTIONS, type FactionEntry, type PlayableFactionId } from '@colonize/content';
import { useGameStore } from '../store/game';
import styles from './FactionSelect.module.css';

export function FactionSelect(): JSX.Element {
  const setFaction = useGameStore((s) => s.setFaction);
  const setScreen = useGameStore((s) => s.setScreen);

  const select = (id: PlayableFactionId): void => {
    setFaction(id);
    setScreen('game');
  };

  return (
    <main className={styles.screen} data-testid="faction-select">
      <h1 className={styles.title}>Choose your faction</h1>
      <p className={styles.subtitle}>NW 2191 · Early Liberty Era</p>
      <ul className={styles.grid} data-testid="faction-select-grid">
        {FACTIONS.map((faction) => (
          <li key={faction.id}>
            <button
              type="button"
              className={styles.card}
              onClick={() => select(faction.id)}
              data-testid={`faction-card-${faction.id}`}
            >
              <Crest faction={faction} />
              <h2 className={styles.name}>{faction.name}</h2>
              <p className={styles.tagline}>{faction.tagline}</p>
              <p className={styles.lore}>{faction.lore}</p>
              <p className={styles.bonus}>{faction.bonus}</p>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={styles.back}
        onClick={() => setScreen('menu')}
        data-testid="faction-select-back"
      >
        Back
      </button>
    </main>
  );
}

function Crest({ faction }: { faction: FactionEntry }): JSX.Element {
  const { crestColor, id, name } = faction;
  return (
    <svg
      className={styles.crest}
      viewBox="0 0 120 90"
      role="img"
      aria-label={`${name} crest`}
      data-testid={`faction-crest-${id}`}
    >
      <defs>
        <path
          id={`crest-shield-${id}`}
          d="M60 8 L100 22 L100 54 Q100 76 60 84 Q20 76 20 54 L20 22 Z"
        />
      </defs>
      <use href={`#crest-shield-${id}`} fill="#0c1e2b" stroke={crestColor} strokeWidth="2" />
      <CrestSigil factionId={id} color={crestColor} />
    </svg>
  );
}

function CrestSigil({
  factionId,
  color,
}: {
  factionId: PlayableFactionId;
  color: `#${string}`;
}): JSX.Element {
  const stroke = { stroke: color, fill: 'none', strokeWidth: 2, strokeLinejoin: 'round' as const };
  if (factionId === 'otk') {
    return (
      <g {...stroke}>
        <path d="M60 28 Q52 40 44 44 Q52 48 56 58 Q52 66 44 70" />
        <path d="M60 28 Q68 40 76 44 Q68 48 64 58 Q68 66 76 70" />
        <circle cx="60" cy="46" r="2.5" fill={color} />
      </g>
    );
  }
  if (factionId === 'ironclad') {
    return (
      <g {...stroke}>
        <rect x="40" y="32" width="40" height="26" />
        <path d="M44 32 L44 28 M52 32 L52 28 M60 32 L60 28 M68 32 L68 28 M76 32 L76 28" />
        <path d="M44 58 L44 62 M60 58 L60 62 M76 58 L76 62" />
        <path d="M60 46 L60 32" />
      </g>
    );
  }
  if (factionId === 'phantom') {
    return (
      <g {...stroke}>
        <path d="M38 36 Q60 24 82 36" />
        <path d="M38 36 L60 58 L82 36" />
        <circle cx="50" cy="46" r="1.5" fill={color} />
        <circle cx="70" cy="46" r="1.5" fill={color} />
      </g>
    );
  }
  return (
    <g {...stroke}>
      <path d="M60 28 L60 72" />
      <path d="M40 50 L80 50" />
      <path d="M60 28 L50 38 M60 28 L70 38" />
      <circle cx="60" cy="50" r="3" fill={color} />
    </g>
  );
}
