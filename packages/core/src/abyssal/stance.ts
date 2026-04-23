// Abyssal stance — per-faction posture toward the Abyssal sites and the
// Kraken-aligned cosmology that haunts them.
//
// Four discrete stances drive how Abyssal-tile interactions resolve and
// how downstream events (Kraken-stir probability, Pale Watch aggression)
// scale per faction. The stance string values are the wire format —
// they appear verbatim in serialized save JSON, so pick stable kebab-
// case identifiers and never re-spell them; rename via a save-version
// migration, not a refactor.

export const AbyssalStance = {
  Venerate: 'venerate',
  Tolerate: 'tolerate',
  Plunder: 'plunder',
  Guard: 'guard',
} as const;

export type AbyssalStance = (typeof AbyssalStance)[keyof typeof AbyssalStance];

export const ALL_ABYSSAL_STANCES: readonly AbyssalStance[] = [
  AbyssalStance.Venerate,
  AbyssalStance.Tolerate,
  AbyssalStance.Plunder,
  AbyssalStance.Guard,
];

export const DEFAULT_ABYSSAL_STANCE: AbyssalStance = AbyssalStance.Tolerate;

export function isAbyssalStance(value: unknown): value is AbyssalStance {
  return typeof value === 'string' && (ALL_ABYSSAL_STANCES as readonly string[]).includes(value);
}
