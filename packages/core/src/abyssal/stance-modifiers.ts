// Stance-driven probability modifiers for the two named Abyssal events.
//
// The orchestrator that fires these events (the world-event scheduler
// and the Pale Watch encounter system, neither yet on the board) reads
// a base rate from its own registry, then multiplies by the per-stance
// modifier here. Multipliers are pure scalars — no clamping, no base-
// rate decisions — so the consumer keeps control of probability bounds
// and the modifier table can be tuned in TASK-073's balance pass without
// touching the consumer.
//
// Two consumers, two tables:
//
//   Kraken-stir — "did the Kraken hear us?" Plunder maximally provokes;
//   Venerate calms; Guard's military presence vexes the Kraken slightly
//   above baseline.
//
//   Pale Watch aggression — the OTK enforcement faction reading your
//   posture toward shared Abyssal sites. Plunder enrages them; Venerate
//   marks you as fellow worshippers; Guard reads as ally-aligned.
//
// Per CLAUDE.md's "Rule-relevant stats live in @colonize/core" — these
// numbers are rule-relevant, not flavour, so they live next to the
// stance enum rather than in @colonize/content.

import { AbyssalStance } from './stance.js';

export const KRAKEN_STIR_STANCE_MULTIPLIER: Readonly<Record<AbyssalStance, number>> = {
  [AbyssalStance.Venerate]: 0.5,
  [AbyssalStance.Tolerate]: 1.0,
  [AbyssalStance.Guard]: 1.2,
  [AbyssalStance.Plunder]: 2.0,
};

export const PALE_WATCH_AGGRESSION_STANCE_MULTIPLIER: Readonly<Record<AbyssalStance, number>> = {
  [AbyssalStance.Venerate]: 0.5,
  [AbyssalStance.Guard]: 0.7,
  [AbyssalStance.Tolerate]: 1.0,
  [AbyssalStance.Plunder]: 2.0,
};

export function krakenStirMultiplier(stance: AbyssalStance): number {
  return KRAKEN_STIR_STANCE_MULTIPLIER[stance];
}

export function paleWatchAggressionMultiplier(stance: AbyssalStance): number {
  return PALE_WATCH_AGGRESSION_STANCE_MULTIPLIER[stance];
}
