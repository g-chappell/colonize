// Pure-sibling helpers for GameOverScreen (CLAUDE.md "pure-sibling
// module pattern" applied to a React surface): extract the stat
// derivation so tests can exercise it with plain JSON inputs instead
// of rendering the component and walking the DOM.

import type { ColonyJSON, FactionChartersJSON, UnitJSON } from '@colonize/core';

export interface GameOverStats {
  readonly turnsPlayed: number;
  readonly colonyCount: number;
  readonly fleetCount: number;
  readonly charterCount: number;
}

export interface GameOverStatsInputs {
  // Turn the endgame fired on (1-indexed, from EndgameOutcome.turn).
  readonly turn: number;
  // Faction the player was controlling — used to filter the global
  // unit roster to the player's own ships.
  readonly playerFaction: string;
  readonly colonies: readonly ColonyJSON[];
  readonly units: readonly UnitJSON[];
  readonly factionCharters: Readonly<Record<string, FactionChartersJSON>>;
}

// Collapse the store slices the game-over screen cares about into the
// concrete rows it renders. Negative or non-finite turn values collapse
// to 0 so a malformed save can't render a "Turns played: -3" row —
// defence in depth at the UI boundary (same reason as the store
// boundary's clamp-and-skip rule).
export function computeGameOverStats(inputs: GameOverStatsInputs): GameOverStats {
  const turn = Number.isFinite(inputs.turn) && inputs.turn > 0 ? Math.floor(inputs.turn) : 0;
  const colonyCount = inputs.colonies.filter((c) => c.faction === inputs.playerFaction).length;
  const fleetCount = inputs.units.filter((u) => u.faction === inputs.playerFaction).length;
  const charters = inputs.factionCharters[inputs.playerFaction];
  const charterCount = charters ? charters.selected.length : 0;
  return { turnsPlayed: turn, colonyCount, fleetCount, charterCount };
}
