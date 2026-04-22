// Tithe formula — the per-turn coin levy the Rayon Concord demands
// from a faction with any colony presence.
//
// Pure function. Input is today's aggregate state (total population,
// per-turn revenue, current game year) plus the rate ladder; output is
// the integer coin amount the Concord expects this turn. The formula
// scales with game year so an early-campaign tithe is tractable and a
// late-campaign tithe becomes the pressure that either drives the
// player to declare Sovereignty (TASK-070) or sink under its weight.
//
// Scope intentionally narrow — the formula has no side effects, no
// state, no awareness of whether the tithe was paid. Payment +
// boycott bookkeeping lives on `ConcordTensionMeter` (per-faction
// accumulator) and on the orchestrator that owns the faction
// collection. See CLAUDE.md: "Ship the entity's primitive; leave
// iteration / scheduling to the task that owns the collection."

import { DEFAULT_TITHE_RATES, type TitheRates } from './concord-registry.js';

export interface TitheParams {
  // Total population across every colony owned by the tithed faction.
  readonly population: number;
  // Per-turn coin revenue booked by the tithed faction (trade + yields).
  readonly revenue: number;
  // Current game year. NW 2191 is year 0; each advance of the turn
  // calendar bumps this by some orchestrator-defined amount.
  readonly gameYear: number;
  // Optional override of the default rate ladder. A partial object is
  // merged over `DEFAULT_TITHE_RATES` so callers can tune one knob
  // (e.g. `{ revenueFraction: 0 }` for a population-only scenario).
  readonly rates?: Partial<TitheRates>;
}

export function calculateTithe(params: TitheParams): number {
  const { population, revenue, gameYear } = params;
  if (!Number.isFinite(population)) {
    throw new RangeError(`calculateTithe: population must be finite (got ${population})`);
  }
  if (!Number.isInteger(population) || population < 0) {
    throw new RangeError(
      `calculateTithe: population must be a non-negative integer (got ${population})`,
    );
  }
  if (!Number.isFinite(revenue) || revenue < 0) {
    throw new RangeError(
      `calculateTithe: revenue must be a non-negative finite number (got ${revenue})`,
    );
  }
  if (!Number.isFinite(gameYear) || !Number.isInteger(gameYear)) {
    throw new RangeError(`calculateTithe: gameYear must be an integer (got ${gameYear})`);
  }
  const merged: TitheRates = { ...DEFAULT_TITHE_RATES, ...(params.rates ?? {}) };
  validateRates(merged);
  const yearMult = yearMultiplier(gameYear, merged.yearAnchor, merged.yearScale);
  const base = merged.perCapita * population + merged.revenueFraction * revenue;
  const scaled = base * yearMult;
  return Math.max(0, Math.floor(scaled));
}

// Year multiplier = 1 + max(0, year - anchor) * yearScale.
// Clamped at 1 so pre-anchor years never shrink the tithe below the
// base formula (pre-NW-2191 is out of scope; the clamp keeps the
// formula safe when a test or a homebrew calendar slides the anchor).
export function yearMultiplier(gameYear: number, anchor: number, scale: number): number {
  const steps = Math.max(0, gameYear - anchor);
  return 1 + steps * scale;
}

function validateRates(rates: TitheRates): void {
  assertNonNegativeFinite('perCapita', rates.perCapita);
  assertNonNegativeFinite('revenueFraction', rates.revenueFraction);
  assertNonNegativeFinite('yearScale', rates.yearScale);
  if (!Number.isFinite(rates.yearAnchor) || !Number.isInteger(rates.yearAnchor)) {
    throw new RangeError(
      `calculateTithe rates.yearAnchor must be an integer (got ${rates.yearAnchor})`,
    );
  }
}

function assertNonNegativeFinite(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `calculateTithe rates.${label} must be a non-negative finite number (got ${value})`,
    );
  }
}
