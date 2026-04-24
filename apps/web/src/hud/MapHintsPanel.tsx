import type { Direction, MapHint, MapHintCategory } from '@colonize/core';
import { useGameStore } from '../store/game';
import styles from './MapHintsPanel.module.css';

// Directional chevron glyphs, one per 8-way compass heading. Matches
// the Direction constants in @colonize/core/map/direction.ts.
const DIRECTION_GLYPHS: Readonly<Record<Direction, string>> = {
  n: '↑',
  ne: '↗',
  e: '→',
  se: '↘',
  s: '↓',
  sw: '↙',
  w: '←',
  nw: '↖',
};

const DIRECTION_LABELS: Readonly<Record<Direction, string>> = {
  n: 'north',
  ne: 'north-east',
  e: 'east',
  se: 'south-east',
  s: 'south',
  sw: 'south-west',
  w: 'west',
  nw: 'north-west',
};

const CATEGORY_LABELS: Readonly<Record<MapHintCategory, string>> = {
  'archive-cache': 'Archive cache',
  wreck: 'Legendary wreck',
};

// Self-mounting HUD panel that surfaces the active map-hint leads
// emitted by tavern dismissals (TASK-076). Mounts only while at
// least one lead is present — a silent panel when the tavern is
// cold. Pure read-only view; the store owns the list.
export function MapHintsPanel(): JSX.Element | null {
  const hints = useGameStore((s) => s.mapHints);
  if (hints.length === 0) return null;
  return (
    <section className={styles.panel} aria-label="Active leads" data-testid="map-hints-panel">
      <h2 className={styles.title}>Leads</h2>
      <ul className={styles.list}>
        {hints.map((hint) => (
          <MapHintRow key={hint.sourceRumourId} hint={hint} />
        ))}
      </ul>
    </section>
  );
}

interface MapHintRowProps {
  readonly hint: MapHint;
}

function MapHintRow({ hint }: MapHintRowProps): JSX.Element {
  const glyph = DIRECTION_GLYPHS[hint.direction];
  const directionLabel = DIRECTION_LABELS[hint.direction];
  const categoryLabel = CATEGORY_LABELS[hint.category];
  return (
    <li
      className={styles.row}
      data-testid={`map-hint-${hint.sourceRumourId}`}
      data-category={hint.category}
    >
      <span className={styles.chevron} aria-label={directionLabel} data-direction={hint.direction}>
        {glyph}
      </span>
      <span className={styles.body}>
        <span className={styles.category}>{categoryLabel}</span>
        <span className={styles.hint}>roughly to the {directionLabel}</span>
      </span>
    </li>
  );
}
