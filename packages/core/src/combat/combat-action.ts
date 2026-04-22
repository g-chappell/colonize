export const CombatActionType = {
  Broadside: 'broadside',
  Boarding: 'boarding',
  Ram: 'ram',
  Flee: 'flee',
} as const;

export type CombatActionType = (typeof CombatActionType)[keyof typeof CombatActionType];

export const ALL_COMBAT_ACTION_TYPES: readonly CombatActionType[] = Object.values(CombatActionType);

export function isCombatActionType(value: unknown): value is CombatActionType {
  return (
    typeof value === 'string' && (ALL_COMBAT_ACTION_TYPES as readonly string[]).includes(value)
  );
}
