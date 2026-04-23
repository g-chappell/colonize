// Endgame engine — pure per-turn check that decides whether the run
// has ended in victory or defeat. The orchestrator (turn-controller on
// the web side) calls `checkEndgame` once per turn with a snapshot of
// the relevant game state; when it returns a non-null outcome the
// orchestrator freezes play by routing to the `'game-over'` terminal
// screen. This primitive ships the rule; wiring (when to check, who to
// tell, which factions to filter) belongs to the caller per the
// "ship the entity's primitive; leave iteration / scheduling to the
// task that owns the collection" rule.
//
// Save-format-bound discriminators follow the string-literal const-
// object pattern so reloaded-mid-endgame state round-trips cleanly
// through zustand / any future save migration. Consumers branch over
// the union with an exhaustive switch so adding a new result surfaces
// at compile time in every reader.

export const EndgameKind = {
  Victory: 'victory',
  Defeat: 'defeat',
} as const;

export type EndgameKind = (typeof EndgameKind)[keyof typeof EndgameKind];

export const ALL_ENDGAME_KINDS: readonly EndgameKind[] = Object.values(EndgameKind);

export function isEndgameKind(value: unknown): value is EndgameKind {
  return typeof value === 'string' && (ALL_ENDGAME_KINDS as readonly string[]).includes(value);
}

export const EndgameResult = {
  SovereigntyVictory: 'sovereignty-victory',
  Annihilated: 'annihilated',
} as const;

export type EndgameResult = (typeof EndgameResult)[keyof typeof EndgameResult];

export const ALL_ENDGAME_RESULTS: readonly EndgameResult[] = Object.values(EndgameResult);

export function isEndgameResult(value: unknown): value is EndgameResult {
  return typeof value === 'string' && (ALL_ENDGAME_RESULTS as readonly string[]).includes(value);
}

export interface EndgameOutcome {
  readonly kind: EndgameKind;
  readonly result: EndgameResult;
  readonly turn: number;
}

export interface EndgameCheckInputs {
  readonly turn: number;
  readonly colonyCount: number;
  readonly fleetCount: number;
  readonly sovereigntyWarVictorious: boolean;
}

// Decide whether the run has ended. Returns `null` while the game is
// still in progress. Victory takes precedence over defeat so a player
// that wins the Sovereignty War on the same turn their last colony
// falls still sees the victory epilogue — the endgame fires once and
// the first trigger wins.
export function checkEndgame(inputs: EndgameCheckInputs): EndgameOutcome | null {
  if (
    inputs === null ||
    typeof inputs !== 'object' ||
    !Number.isInteger(inputs.turn) ||
    inputs.turn < 1
  ) {
    throw new TypeError('checkEndgame: turn must be a positive integer');
  }
  if (!Number.isInteger(inputs.colonyCount) || inputs.colonyCount < 0) {
    throw new RangeError('checkEndgame: colonyCount must be a non-negative integer');
  }
  if (!Number.isInteger(inputs.fleetCount) || inputs.fleetCount < 0) {
    throw new RangeError('checkEndgame: fleetCount must be a non-negative integer');
  }
  if (inputs.sovereigntyWarVictorious) {
    return {
      kind: EndgameKind.Victory,
      result: EndgameResult.SovereigntyVictory,
      turn: inputs.turn,
    };
  }
  if (inputs.colonyCount === 0 && inputs.fleetCount === 0) {
    return { kind: EndgameKind.Defeat, result: EndgameResult.Annihilated, turn: inputs.turn };
  }
  return null;
}

// Derive the kind from the result so consumers that only store the
// result (e.g. a save-load that lost the redundant kind field) can
// reconstruct the pair. Adding a new result without updating this
// switch surfaces as a compile error.
export function endgameKindForResult(result: EndgameResult): EndgameKind {
  switch (result) {
    case EndgameResult.SovereigntyVictory:
      return EndgameKind.Victory;
    case EndgameResult.Annihilated:
      return EndgameKind.Defeat;
  }
}
