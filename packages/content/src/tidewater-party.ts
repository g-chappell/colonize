// Tidewater Party — defaults + flavour for the boycott-event modal
// (STORY-40 / TASK-069).
//
// The Tidewater Party is a one-shot, player-initiated event: the
// player dumps a fixed quantity of a chosen good into Barataria Bay,
// the Concord tension meter clamps to 0 for M turns (the reprieve
// window), and the permanent `ire` counter rises by a flat penalty.
// The flavour copy is single-tier — the event always reads as the
// same theatrical act regardless of the player's current tension
// level — so a bare `TidewaterPartyFlavour` constant suffices; no
// getter / tiering table like the tithe modal uses.
//
// The numeric defaults live here (rather than in @colonize/core)
// because they are balance knobs, not rule-of-the-world invariants:
// a future difficulty registry will rescale them without touching the
// `ConcordTensionMeter` primitive.
//
// Canon register: salt-and-rum. The Barataria Bay dateline ties the
// event to the same pirate-harbour voice that opens the prologue
// diary — the player is staging a defiant beat in a place the canon
// already names as "marked contingent" territory.

import type { ToneRegister } from './palette.js';

// Fixed quantity of cargo dumped per Tidewater Party.
export const TIDEWATER_PARTY_DUMP_QTY = 10;

// Turns the Concord tension meter stays pinned at 0 after a dump.
// Chosen so the reprieve spans roughly one in-game "season" at the
// current turn-to-year ratio — long enough that the player can run a
// trade loop without a tithe interruption, short enough that the
// Concord ultimatum cadence is not trivially stalled.
export const TIDEWATER_PARTY_FREEZE_TURNS = 8;

// Permanent raise to the Concord `ire` counter per dump. Ire feeds
// post-MVP difficulty knobs (Concord campaign cadence, encounter
// table weighting); it is the long-term cost the player pays for the
// short-term reprieve. Tuned so a player who leans on the event every
// time it is available still reaches the ire ceiling at a predictable
// cadence.
export const TIDEWATER_PARTY_IRE_PENALTY = 15;

export interface TidewaterPartyFlavour {
  readonly heading: string;
  readonly dateline: string;
  readonly summary: string;
  readonly chooseGoodLabel: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly consequenceSummary: string;
  readonly register: ToneRegister;
}

export const TIDEWATER_PARTY_FLAVOUR: TidewaterPartyFlavour = {
  heading: 'Tidewater Party at Barataria Bay',
  dateline: 'Barataria Bay · past the last Concord buoy',
  summary:
    'You anchor at the boundary marker, break open the hold, and pitch the cargo to the tidewater. The herald will hear of it by morning. The Concord will grind its ledger.',
  chooseGoodLabel: 'Choose a good to dump',
  confirmLabel: 'Dump the cargo',
  cancelLabel: 'Belay the order',
  consequenceSummary:
    'Tension pinned at zero for a season; Concord ire rises — a mark the ledger will not forget.',
  register: 'salt-and-rum',
};

export function getTidewaterPartyFlavour(): TidewaterPartyFlavour {
  return TIDEWATER_PARTY_FLAVOUR;
}
