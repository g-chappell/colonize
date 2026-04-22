// Concord tithe + tension — rule-relevant defaults.
//
// Two pieces of rule-relevant state live here:
//
//   1. The default tithe-formula rates (per-capita coin draw, revenue
//      fraction, per-year scale, anchor year). Every input to
//      `calculateTithe` can be overridden per-call — the defaults just
//      pin a starting ladder for tests and single-faction callers.
//
//   2. The ascending ultimatum ladder at which the Concord escalates a
//      tension-bearing faction (warning → demand → threat → ultimatum).
//      The `ConcordTensionMeter` crosses these values monotonically and
//      queues one `ConcordUltimatumEvent` per crossing, drained FIFO by
//      the orchestrator that owns the faction collection.
//
// Per CLAUDE.md, the scalar seams in this file are pre-registry axis
// values (see "Scalar seams for pre-registry axis values"): the tithe
// formula takes every rate as an optional argument, and the tension
// meter accepts an override threshold ladder. When a real Concord
// difficulty registry lands it will supply per-game-mode overrides
// without touching the primitives.

export interface TitheRates {
  // Coins levied per colony-population point per turn, before year scaling.
  readonly perCapita: number;
  // Fraction of per-turn revenue levied, before year scaling.
  readonly revenueFraction: number;
  // Additive increase to the year multiplier per game year past the anchor.
  readonly yearScale: number;
  // Game year at which the year multiplier equals 1. Years below this
  // clamp to 1 — the Concord tithe never shrinks below the base formula.
  readonly yearAnchor: number;
}

export const DEFAULT_TITHE_RATES: TitheRates = {
  perCapita: 1,
  revenueFraction: 0.1,
  yearScale: 0.05,
  yearAnchor: 0,
};

// Ascending tension thresholds. The four tiers map to the four
// Concord-reaction beats called out in the EPIC-10 narrative:
//   25  — warning ("a Concord herald reminds you of the tithe")
//   50  — demand  ("a formal ledger arrives; next refusal will be noted")
//   75  — threat  ("Concord sympathisers withdraw from your ports")
//   100 — ultimatum ("the Concord will levy by force if defied")
// The orchestrator maps the threshold value back to its tier via the
// index in `CONCORD_TENSION_THRESHOLDS`; the primitive stays numeric so
// an override ladder (test-short, per-difficulty, per-faction) plugs in
// cleanly without a parallel enum.
export const CONCORD_TENSION_THRESHOLDS: readonly number[] = [25, 50, 75, 100];

export function isConcordTensionThreshold(value: number): boolean {
  return CONCORD_TENSION_THRESHOLDS.includes(value);
}
