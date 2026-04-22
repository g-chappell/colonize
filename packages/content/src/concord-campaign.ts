// Concord Fleet campaign difficulty registry — the pre-scheduled wave
// catalogue consumed by the core-side `ConcordFleetCampaign` when a
// faction declares Sovereignty (EPIC-10 / TASK-070).
//
// Three tiers. The orchestrator picks one at Sovereignty-declare time
// (player-facing difficulty, possibly faction-bonus-modified) and
// feeds the entry into a new `ConcordFleetCampaign` instance. The
// engine owns the campaign state machine; this module owns the tuned
// numbers + tone copy.
//
// Content never imports core — the wave shape is mirrored here with
// concrete `ShipClassId` / `GroundClassId` values from `./units.js`.
// The invariant test in `concord-campaign.test.ts` pins the
// ascending-spawnTurn + rising-pressure expectations so drift between
// the mirrored shape and the core primitive's validator is caught at
// CI, matching the BUILDINGS / TILE_YIELDS / ship-class pattern.

import type { GroundClassId, ShipClassId } from './units.js';

export type ConcordCampaignDifficultyId = 'pacified' | 'standard' | 'brutal';

export interface ConcordCampaignWave {
  // Campaign-relative turn at which the wave arrives.
  readonly spawnTurn: number;
  // Surface ships delivered on this wave — escalating ship class as
  // the campaign drags on (frigate → ship-of-the-line).
  readonly ships: readonly ShipClassId[];
  // Ground troops delivered on this wave for island landings. Mixed
  // rock-paper-scissors loadouts force the player to field a balanced
  // defence.
  readonly groundTroops: readonly GroundClassId[];
}

export interface ConcordCampaignDifficulty {
  readonly id: ConcordCampaignDifficultyId;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  // Number of campaign turns the faction must survive before the
  // Concord withdraw and Sovereignty is secured.
  readonly turnsRequired: number;
  // Ascending-spawnTurn schedule of landing waves. Each difficulty's
  // last wave arrives before its `turnsRequired` so the final phase of
  // the campaign is "survive with what you've fought through", not
  // "race to spawn the final fleet".
  readonly waves: readonly ConcordCampaignWave[];
}

// Easy tier. Short campaign (12 turns), lighter waves — a first-time
// player who declared Sovereignty on a whim can still come out the
// other side.
const PACIFIED: ConcordCampaignDifficulty = {
  id: 'pacified',
  name: 'Pacified',
  summary: 'A token punitive squadron. Survive twelve turns.',
  description:
    'The Concord dispatches a half-hearted squadron — two brigs and a press of marines. A disciplined defence holds them off inside a season.',
  turnsRequired: 12,
  waves: [
    { spawnTurn: 0, ships: ['brig', 'brig'], groundTroops: ['marines'] },
    { spawnTurn: 4, ships: ['frigate'], groundTroops: ['marines', 'pikemen'] },
    { spawnTurn: 8, ships: ['frigate', 'brig'], groundTroops: ['dragoons', 'marines'] },
  ],
};

// Baseline tier. Matches the EPIC-10 reference campaign length in the
// narrative brief. Frigate-heavy mid waves, ship-of-the-line finisher.
const STANDARD: ConcordCampaignDifficulty = {
  id: 'standard',
  name: 'Standard',
  summary: 'A full Concord fleet. Survive twenty turns.',
  description:
    'A proper Concord column — frigates in escort, ship-of-the-line as flag, mixed regulars on the landing barges. Twenty turns is the narrative benchmark.',
  turnsRequired: 20,
  waves: [
    { spawnTurn: 0, ships: ['frigate', 'brig'], groundTroops: ['marines', 'marines'] },
    { spawnTurn: 4, ships: ['frigate', 'frigate'], groundTroops: ['marines', 'pikemen'] },
    { spawnTurn: 8, ships: ['ship-of-the-line'], groundTroops: ['dragoons', 'pikemen', 'marines'] },
    {
      spawnTurn: 12,
      ships: ['frigate', 'frigate', 'brig'],
      groundTroops: ['dragoons', 'marines', 'pikemen'],
    },
    {
      spawnTurn: 16,
      ships: ['ship-of-the-line', 'frigate'],
      groundTroops: ['marines', 'marines', 'dragoons', 'pikemen'],
    },
  ],
};

// Hard tier. Long campaign (30 turns), heavy waves from the outset,
// two ship-of-the-line appearances. The "I know what I'm doing" test.
const BRUTAL: ConcordCampaignDifficulty = {
  id: 'brutal',
  name: 'Brutal',
  summary: 'A punitive armada. Survive thirty turns.',
  description:
    'The full weight of the Concord: two lines-of-battle, packed landing fleets, and the tithe-officers who came to watch. Thirty turns. No quarter expected.',
  turnsRequired: 30,
  waves: [
    { spawnTurn: 0, ships: ['frigate', 'frigate'], groundTroops: ['marines', 'pikemen'] },
    {
      spawnTurn: 4,
      ships: ['ship-of-the-line', 'brig'],
      groundTroops: ['marines', 'dragoons', 'pikemen'],
    },
    {
      spawnTurn: 8,
      ships: ['frigate', 'frigate', 'frigate'],
      groundTroops: ['marines', 'marines', 'dragoons'],
    },
    {
      spawnTurn: 12,
      ships: ['ship-of-the-line', 'frigate'],
      groundTroops: ['dragoons', 'marines', 'pikemen', 'marines'],
    },
    {
      spawnTurn: 16,
      ships: ['ship-of-the-line', 'frigate', 'brig'],
      groundTroops: ['marines', 'marines', 'dragoons', 'pikemen'],
    },
    {
      spawnTurn: 20,
      ships: ['ship-of-the-line', 'ship-of-the-line'],
      groundTroops: ['dragoons', 'dragoons', 'marines', 'marines', 'pikemen'],
    },
    {
      spawnTurn: 24,
      ships: ['ship-of-the-line', 'frigate', 'frigate'],
      groundTroops: ['marines', 'marines', 'pikemen', 'pikemen', 'dragoons'],
    },
  ],
};

export const CONCORD_CAMPAIGN_DIFFICULTIES: readonly ConcordCampaignDifficulty[] = [
  PACIFIED,
  STANDARD,
  BRUTAL,
];

const CONCORD_CAMPAIGN_DIFFICULTY_IDS: readonly string[] = CONCORD_CAMPAIGN_DIFFICULTIES.map(
  (d) => d.id,
);

export function isConcordCampaignDifficultyId(
  value: unknown,
): value is ConcordCampaignDifficultyId {
  return typeof value === 'string' && CONCORD_CAMPAIGN_DIFFICULTY_IDS.includes(value);
}

export function getConcordCampaignDifficulty(
  id: ConcordCampaignDifficultyId,
): ConcordCampaignDifficulty {
  if (!isConcordCampaignDifficultyId(id)) {
    throw new TypeError(`getConcordCampaignDifficulty: not a valid id: ${String(id)}`);
  }
  const found = CONCORD_CAMPAIGN_DIFFICULTIES.find((d) => d.id === id);
  if (!found) {
    throw new Error(`getConcordCampaignDifficulty: missing entry for ${id}`);
  }
  return found;
}
