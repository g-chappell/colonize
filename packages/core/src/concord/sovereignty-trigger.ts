// Sovereignty trigger — predicate for the "Declare Sovereignty" player
// action that unlocks the Concord Fleet endgame (EPIC-10 / TASK-070).
//
// Pure function. Input is the faction's current state (game year,
// accumulated Concord tension, charters secured) plus the per-game gate
// thresholds; output is a predicate telling the UI whether the
// Declare-Sovereignty action should be enabled, and a reason code
// describing which branch opened or closed the gate.
//
// The gate is: game year must be at least `minimumYear` AND either
// (a) Concord tension has reached `tensionThreshold` (the Concord are
// threatening anyway — strike first) OR (b) the faction has accumulated
// at least `charterThreshold` Archive Charters (political legitimacy
// route). Either branch suffices; both together still resolve to
// `'armed'`.
//
// Per CLAUDE.md "Scalar seams for pre-registry axis values": thresholds
// are supplied by the caller. A per-difficulty Concord registry (when
// it lands) will pick the numbers; the primitive stays stateless so
// tests and alternative calendars can tune each knob independently.
// The default ladder documented here is the MVP single-player baseline
// described in the EPIC-10 brief.
//
// Per CLAUDE.md "Ship the entity's primitive; leave iteration /
// scheduling to the task that owns the collection": this module does
// NOT observe the tension meter, enumerate the faction roster, or wire
// a TurnManager hook. Callers pull the scalar inputs from whatever
// collection owns them (faction register, charters bag, calendar) and
// feed them in.

export type SovereigntyTriggerStatus =
  // Game year has not yet passed the minimum year gate.
  | 'locked-year'
  // Year gate met, but neither tension nor charters have reached their
  // respective thresholds. Action stays hidden / disabled.
  | 'pending-pressure'
  // Year gate met and at least one of the tension / charter clauses is
  // satisfied. Declare-Sovereignty is available.
  | 'armed';

export interface SovereigntyTriggerInputs {
  // Current game year. NW 2191 is year 0; callers map from the
  // calendar of their choice — the predicate only reads the integer.
  readonly gameYear: number;
  // Current accumulated Concord tension (whatever the orchestrator's
  // `ConcordTensionMeter.tension` reads). Non-negative integer.
  readonly tension: number;
  // Number of Archive Charters the faction has acquired (whatever
  // `FactionCharters.selected.length` reads for this faction).
  // Non-negative integer.
  readonly charterCount: number;
}

export interface SovereigntyTriggerThresholds {
  // Game-year gate. Before this year, the action is hard-locked — no
  // amount of tension or charters opens the Sovereignty path.
  readonly minimumYear: number;
  // Tension value at which the "strike first" branch arms the action.
  // Typically the ultimatum-tier value from `CONCORD_TENSION_THRESHOLDS`.
  readonly tensionThreshold: number;
  // Charter count at which the "political legitimacy" branch arms the
  // action.
  readonly charterThreshold: number;
}

// MVP baseline — game year 10 + tension at the ultimatum tier (100) or
// at least three charters in the pouch. Mirror the ultimatum tier of
// `CONCORD_TENSION_THRESHOLDS` so the trigger fires on the same event
// the Concord themselves fire on by default.
export const DEFAULT_SOVEREIGNTY_TRIGGER_THRESHOLDS: SovereigntyTriggerThresholds = {
  minimumYear: 10,
  tensionThreshold: 100,
  charterThreshold: 3,
};

export function sovereigntyTriggerStatus(
  inputs: SovereigntyTriggerInputs,
  thresholds: SovereigntyTriggerThresholds = DEFAULT_SOVEREIGNTY_TRIGGER_THRESHOLDS,
): SovereigntyTriggerStatus {
  validateInputs(inputs);
  validateThresholds(thresholds);
  if (inputs.gameYear < thresholds.minimumYear) return 'locked-year';
  if (inputs.tension >= thresholds.tensionThreshold) return 'armed';
  if (inputs.charterCount >= thresholds.charterThreshold) return 'armed';
  return 'pending-pressure';
}

export function canDeclareSovereignty(
  inputs: SovereigntyTriggerInputs,
  thresholds: SovereigntyTriggerThresholds = DEFAULT_SOVEREIGNTY_TRIGGER_THRESHOLDS,
): boolean {
  return sovereigntyTriggerStatus(inputs, thresholds) === 'armed';
}

function validateInputs(inputs: SovereigntyTriggerInputs): void {
  assertInteger('gameYear', inputs.gameYear);
  assertNonNegativeInteger('tension', inputs.tension);
  assertNonNegativeInteger('charterCount', inputs.charterCount);
}

function validateThresholds(thresholds: SovereigntyTriggerThresholds): void {
  assertInteger('minimumYear', thresholds.minimumYear);
  assertNonNegativeInteger('tensionThreshold', thresholds.tensionThreshold);
  assertNonNegativeInteger('charterThreshold', thresholds.charterThreshold);
}

function assertInteger(label: string, value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new RangeError(`sovereigntyTriggerStatus: ${label} must be an integer (got ${value})`);
  }
}

function assertNonNegativeInteger(label: string, value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `sovereigntyTriggerStatus: ${label} must be a non-negative integer (got ${value})`,
    );
  }
}
