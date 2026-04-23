import type { PlayableFactionId } from './factions.js';

// Mirrors `EndgameResult` in packages/core/src/endgame/endgame.ts.
// Duplicated rather than imported because the workspace dependency
// direction forbids content → core imports. A test in this workspace
// pins the ids + combinatorial completeness (4 factions × N results)
// so adding a new result in core surfaces here as a missing-entry
// failure on the next CI run.
export type EndgameResultId = 'sovereignty-victory' | 'annihilated';

export const ALL_ENDGAME_RESULT_IDS: readonly EndgameResultId[] = [
  'sovereignty-victory',
  'annihilated',
];

export interface EpilogueEntry {
  readonly factionId: PlayableFactionId;
  readonly result: EndgameResultId;
  readonly title: string;
  readonly body: string;
}

export const EPILOGUES: readonly EpilogueEntry[] = [
  // Order of the Kraken — victory
  {
    factionId: 'otk',
    result: 'sovereignty-victory',
    title: 'The Abyss Answers',
    body: "The Concord's banners sink with the last of their flagships. From the Crimson Tide your ships return bearing salt-crusted oaths fulfilled — the bloodline kept, the prophecy steered, and somewhere far below, something older stirs and is pleased.",
  },
  // Order of the Kraken — defeat
  {
    factionId: 'otk',
    result: 'annihilated',
    title: 'The Tide Withdrew',
    body: 'The oaths sang on empty water. Your last sail slipped beneath the swell and the bloodline went silent — not broken, merely resting, waiting on a future tide that did not come in this age.',
  },
  // Ironclad Syndicate — victory
  {
    factionId: 'ironclad',
    result: 'sovereignty-victory',
    title: 'The Ledger Closes Black',
    body: 'The Concord paid its final invoice in broken hulls and burnt colours. The Syndicate forges hum through the night and the account books balance in your favour; every flag now buys its iron from you.',
  },
  // Ironclad Syndicate — defeat
  {
    factionId: 'ironclad',
    result: 'annihilated',
    title: 'Foundries Cold',
    body: "The forges stand silent and the ledgers close in red. Rivals pick over the Syndicate's patents while your last accountants bolt for the horizon; iron outlives the dynasty that sold it.",
  },
  // Phantom Corsairs — victory
  {
    factionId: 'phantom',
    result: 'sovereignty-victory',
    title: 'No Flag, No Chain',
    body: 'The Concord chased phantoms into fog and found only the weight of their own anchors. From nowhere in particular your crews raise a cup to nothing in particular — the lanes of order run thin enough now to sail free forever.',
  },
  // Phantom Corsairs — defeat
  {
    factionId: 'phantom',
    result: 'annihilated',
    title: 'The Fog Lifted',
    body: "A flagless ship leaves no wake to mourn. The lanes of order closed tight around your last hiding place; the stories the taverns tell will be good ones — but they'll be stories now, not sails.",
  },
  // Bloodborne Legion — victory
  {
    factionId: 'bloodborne',
    result: 'sovereignty-victory',
    title: 'One Volley. One Breach. One Banner.',
    body: "The Concord's rearguard broke on the Legion pike and the muster rolls overflowed with new ranks. Where your boarding-fist fell the Dominion banner follows — and today the banner is your own.",
  },
  // Bloodborne Legion — defeat
  {
    factionId: 'bloodborne',
    result: 'annihilated',
    title: 'The Muster Rolls Ran Empty',
    body: 'The last pike fell into red surf and no new hand took it up. The disciplined line held until it did not; the Dominion mourns its fist, and the tide washes the field clean of banners.',
  },
];

export function getEpilogue(factionId: PlayableFactionId, result: EndgameResultId): EpilogueEntry {
  const found = EPILOGUES.find((e) => e.factionId === factionId && e.result === result);
  if (!found) {
    throw new Error(`Unknown epilogue for faction=${factionId} result=${result}`);
  }
  return found;
}
