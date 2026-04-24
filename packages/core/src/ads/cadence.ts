// Ad cadence — pure primitive for deciding when to show an interstitial
// between turns. The orchestrator (apps/web/src/ads/ad-orchestrator.ts)
// calls `shouldShowInterstitial` once per turn-advance with a snapshot of
// the live counters, evaluates the in-shell guard (modal open, war in
// progress, ...) separately via `evaluateAdGuard`, and only dispatches to
// the AdManager when both clear. This module does not know the store
// shape and does not import anything from the shell — it ships the rule;
// the orchestrator wires it up.
//
// `GameLength` is the player-facing run-length knob; `cadenceForGameLength`
// maps each preset to an N. The Standard preset's default (10) matches the
// task brief; Short compresses cadence so compressed playtime still sees
// ~1 interstitial per in-game year (12 turns), Long loosens it so a
// 200-turn endgame path does not drown in ads.

export const GameLength = {
  Short: 'short',
  Standard: 'standard',
  Long: 'long',
} as const;

export type GameLength = (typeof GameLength)[keyof typeof GameLength];

export const ALL_GAME_LENGTHS: readonly GameLength[] = Object.values(GameLength);

export function isGameLength(value: unknown): value is GameLength {
  return typeof value === 'string' && (ALL_GAME_LENGTHS as readonly string[]).includes(value);
}

export const DEFAULT_GAME_LENGTH: GameLength = GameLength.Standard;
export const DEFAULT_AD_CADENCE_TURNS = 10;

export const AD_CADENCE_BY_GAME_LENGTH: Readonly<Record<GameLength, number>> = {
  short: 6,
  standard: DEFAULT_AD_CADENCE_TURNS,
  long: 15,
} as const;

export function cadenceForGameLength(length: GameLength): number {
  return AD_CADENCE_BY_GAME_LENGTH[length];
}

export interface AdCadenceInputs {
  readonly currentTurn: number;
  readonly lastAdShowTurn: number;
  readonly cadenceN: number;
}

// Returns true when at least `cadenceN` turns have elapsed since the last
// interstitial. `lastAdShowTurn: 0` means "no ad ever shown" (matches the
// store default) — with cadenceN=10 the first ad fires on turn 10. Ties
// trigger: the check is >=, not >.
export function shouldShowInterstitial(inputs: AdCadenceInputs): boolean {
  if (inputs === null || typeof inputs !== 'object') {
    throw new TypeError('shouldShowInterstitial: inputs must be an object');
  }
  if (!Number.isInteger(inputs.currentTurn) || inputs.currentTurn < 0) {
    throw new RangeError('shouldShowInterstitial: currentTurn must be a non-negative integer');
  }
  if (!Number.isInteger(inputs.lastAdShowTurn) || inputs.lastAdShowTurn < 0) {
    throw new RangeError('shouldShowInterstitial: lastAdShowTurn must be a non-negative integer');
  }
  if (!Number.isInteger(inputs.cadenceN) || inputs.cadenceN < 1) {
    throw new RangeError('shouldShowInterstitial: cadenceN must be a positive integer');
  }
  return inputs.currentTurn - inputs.lastAdShowTurn >= inputs.cadenceN;
}
