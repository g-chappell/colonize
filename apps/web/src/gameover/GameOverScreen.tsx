import { getEpilogue, getFaction } from '@colonize/content';
import { useGameStore } from '../store/game';
import { computeGameOverStats } from './gameover-stats.js';
import styles from './GameOverScreen.module.css';

// Terminal screen per CLAUDE.md's terminal/overlay distinction —
// mounts alone (no GameCanvas / Hud underneath) when `screen ===
// 'game-over'`. Triggered by `declareEndgame` from the turn-
// controller's TurnPhase.End exit hook; dismissed via the "Return to
// menu" button which calls `reset()` to clear every slice and route
// back to the main menu.
export function GameOverScreen(): JSX.Element | null {
  const endgame = useGameStore((s) => s.endgame);
  const faction = useGameStore((s) => s.faction);
  const colonies = useGameStore((s) => s.colonies);
  const units = useGameStore((s) => s.units);
  const factionCharters = useGameStore((s) => s.factionCharters);
  const reset = useGameStore((s) => s.reset);

  // Defensive: a rogue `setScreen('game-over')` with no outcome is a
  // caller bug, not a user path — render nothing rather than an empty
  // epilogue pane, and let the caller figure out why.
  if (!endgame) return null;

  const factionEntry = getFaction(faction);
  const epilogue = getEpilogue(faction, endgame.result);
  const stats = computeGameOverStats({
    turn: endgame.turn,
    playerFaction: faction,
    colonies,
    units,
    factionCharters,
  });
  const heading = endgame.kind === 'victory' ? 'Victory' : 'Defeat';

  return (
    <main
      className={styles.screen}
      data-testid="game-over-screen"
      data-outcome-kind={endgame.kind}
      data-outcome-result={endgame.result}
    >
      <p className={styles.faction} data-testid="game-over-faction">
        {factionEntry.name}
      </p>
      <h1
        className={`${styles.heading} ${
          endgame.kind === 'victory' ? styles.headingVictory : styles.headingDefeat
        }`}
        data-testid="game-over-heading"
      >
        {heading}
      </h1>
      <h2 className={styles.title} data-testid="game-over-title">
        {epilogue.title}
      </h2>
      <p className={styles.body} data-testid="game-over-body">
        {epilogue.body}
      </p>
      <dl className={styles.stats} data-testid="game-over-stats">
        <div className={styles.stat}>
          <dt>Turns played</dt>
          <dd data-testid="game-over-stat-turns">{stats.turnsPlayed}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Colonies</dt>
          <dd data-testid="game-over-stat-colonies">{stats.colonyCount}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Fleet</dt>
          <dd data-testid="game-over-stat-fleet">{stats.fleetCount}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Charters</dt>
          <dd data-testid="game-over-stat-charters">{stats.charterCount}</dd>
        </div>
      </dl>
      <button
        type="button"
        className={styles.button}
        onClick={reset}
        data-testid="game-over-replay"
        autoFocus
      >
        Return to menu
      </button>
    </main>
  );
}
