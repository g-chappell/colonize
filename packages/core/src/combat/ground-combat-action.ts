export const GroundCombatActionType = {
  Engage: 'ground-engage',
  Flee: 'ground-flee',
} as const;

export type GroundCombatActionType =
  (typeof GroundCombatActionType)[keyof typeof GroundCombatActionType];

export const ALL_GROUND_COMBAT_ACTION_TYPES: readonly GroundCombatActionType[] =
  Object.values(GroundCombatActionType);

export function isGroundCombatActionType(value: unknown): value is GroundCombatActionType {
  return (
    typeof value === 'string' &&
    (ALL_GROUND_COMBAT_ACTION_TYPES as readonly string[]).includes(value)
  );
}
