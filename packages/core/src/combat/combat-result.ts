export const CombatResult = {
  AttackerSunk: 'attacker-sunk',
  DefenderSunk: 'defender-sunk',
  AttackerCaptured: 'attacker-captured',
  DefenderCaptured: 'defender-captured',
  AttackerFled: 'attacker-fled',
  MutualSunk: 'mutual-sunk',
  Inconclusive: 'inconclusive',
} as const;

export type CombatResult = (typeof CombatResult)[keyof typeof CombatResult];

export const ALL_COMBAT_RESULTS: readonly CombatResult[] = Object.values(CombatResult);

export function isCombatResult(value: unknown): value is CombatResult {
  return typeof value === 'string' && (ALL_COMBAT_RESULTS as readonly string[]).includes(value);
}
