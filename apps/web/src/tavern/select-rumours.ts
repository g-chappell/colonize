import {
  TAVERN_RUMOURS,
  eligibleTavernRumours,
  tavernRumourWeight,
  type TavernContext,
  type TavernRumourEntry,
} from '@colonize/content';

export interface SelectRumoursParams {
  readonly context: TavernContext;
  readonly count: number;
  readonly rumours?: readonly TavernRumourEntry[];
  readonly rng?: () => number;
}

// Weighted-random sample (without replacement) of `count` rumours
// whose triggers admit `context`. Higher `trigger.weight` raises the
// chance of selection on each draw. When fewer eligible rumours
// exist than `count`, returns all of them in eligibility order.
// Pure: no DOM, no store, no Phaser — testable with a seeded rng.
export function selectRumours(params: SelectRumoursParams): readonly TavernRumourEntry[] {
  const { context, count } = params;
  const pool = params.rumours ?? TAVERN_RUMOURS;
  const rng = params.rng ?? Math.random;
  if (!Number.isInteger(count) || count <= 0) return [];
  const eligible = [...eligibleTavernRumours(context, pool)];
  if (eligible.length <= count) return eligible;
  const picked: TavernRumourEntry[] = [];
  const remaining = eligible;
  for (let i = 0; i < count; i++) {
    const totalWeight = remaining.reduce((sum, r) => sum + tavernRumourWeight(r), 0);
    if (totalWeight <= 0) break;
    let roll = rng() * totalWeight;
    let chosenIndex = remaining.length - 1;
    for (let j = 0; j < remaining.length; j++) {
      roll -= tavernRumourWeight(remaining[j]!);
      if (roll < 0) {
        chosenIndex = j;
        break;
      }
    }
    picked.push(remaining[chosenIndex]!);
    remaining.splice(chosenIndex, 1);
  }
  return picked;
}
