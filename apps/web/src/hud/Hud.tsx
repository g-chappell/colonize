import { TurnPhase } from '@colonize/core';
import { turnController } from '../game/turn-controller';
import { FACTION_NAMES, useGameStore } from '../store/game';
import styles from './Hud.module.css';

const NW_EPOCH_YEAR = 2191;

const RESOURCE_SLOTS = [
  { key: 'salt', label: 'Salt' },
  { key: 'rum', label: 'Rum' },
  { key: 'iron', label: 'Iron' },
] as const;

export function Hud(): JSX.Element {
  return (
    <div className={styles.hud} data-testid="hud">
      <div className={styles.topLeft}>
        <YearDisplay />
        <FactionChip />
      </div>
      <div className={styles.topCenter}>
        <AiThinkingIndicator />
      </div>
      <div className={styles.topRight}>
        <ResourceBar />
      </div>
      <div className={styles.bottomRight}>
        <EndTurnButton />
      </div>
    </div>
  );
}

export function YearDisplay(): JSX.Element {
  const turn = useGameStore((s) => s.currentTurn);
  return (
    <div className={styles.year} data-testid="hud-year">
      <span className={styles.yearLabel}>NW</span>
      <span className={styles.yearValue}>{NW_EPOCH_YEAR + turn}</span>
    </div>
  );
}

export function FactionChip(): JSX.Element {
  const faction = useGameStore((s) => s.faction);
  return (
    <div className={styles.factionChip} data-testid="hud-faction">
      {FACTION_NAMES[faction]}
    </div>
  );
}

export function ResourceBar(): JSX.Element {
  return (
    <ul className={styles.resourceBar} data-testid="hud-resources">
      {RESOURCE_SLOTS.map((slot) => (
        <li key={slot.key} className={styles.resource}>
          <span className={styles.resourceLabel}>{slot.label}</span>
          <span className={styles.resourceValue}>—</span>
        </li>
      ))}
    </ul>
  );
}

export function AiThinkingIndicator(): JSX.Element | null {
  const phase = useGameStore((s) => s.phase);
  if (phase !== TurnPhase.AI) return null;
  return (
    <div className={styles.aiThinking} data-testid="hud-ai-thinking" role="status">
      AI thinking…
    </div>
  );
}

export function EndTurnButton(): JSX.Element {
  const phase = useGameStore((s) => s.phase);
  const disabled = phase !== TurnPhase.PlayerAction;
  const handleClick = (): void => {
    turnController.endPlayerTurn();
  };
  return (
    <button
      type="button"
      className={styles.endTurn}
      onClick={handleClick}
      disabled={disabled}
      data-testid="hud-end-turn"
    >
      End Turn
    </button>
  );
}
