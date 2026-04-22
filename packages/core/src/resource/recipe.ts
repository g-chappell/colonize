// Recipe — the save-format registry for colony production chains.
//
// A recipe pairs a BuildingType (the enabling workshop) with a vector of
// resource inputs and a single resource output. Recipes are pure data —
// executing one is `tickRecipe` in `./tick.ts`; orchestration (how a
// colony queues recipes, who owns the queue, when a turn-tick drains it,
// where the resulting event log lives) belongs to the task that owns
// the recipe-queue collection. See CLAUDE.md: "Ship the entity's
// primitive; leave iteration / scheduling to the task that owns the
// collection."
//
// Scope locked to chains whose output is already a consumer rule today:
//   - Sawmill: timber → planks (cost of Barracks / Distillery / Study
//     Hall / Shipyard)
//   - Forge:   salvage → forgework (cost of Shipyard / Gun-Deck)
// Further recipes (rope, salt, rum, fish, etc.) are added alongside the
// rule that consumes their output. See CLAUDE.md: "Trim consumer-
// specific fields off save-format registries."

import { BuildingType } from '../building/building-type.js';
import { ResourceType } from './resource-type.js';

export const RecipeId = {
  PlanksFromTimber: 'planks-from-timber',
  ForgeworkFromSalvage: 'forgework-from-salvage',
} as const;

export type RecipeId = (typeof RecipeId)[keyof typeof RecipeId];

export const ALL_RECIPE_IDS: readonly RecipeId[] = Object.values(RecipeId);

export function isRecipeId(value: unknown): value is RecipeId {
  return typeof value === 'string' && (ALL_RECIPE_IDS as readonly string[]).includes(value);
}

export interface RecipeIngredient {
  readonly resource: ResourceType;
  readonly qty: number;
}

export interface RecipeDefinition {
  readonly id: RecipeId;
  readonly building: BuildingType;
  readonly inputs: readonly RecipeIngredient[];
  readonly output: RecipeIngredient;
}

const RECIPE_DEFINITIONS: Readonly<Record<RecipeId, RecipeDefinition>> = {
  [RecipeId.PlanksFromTimber]: {
    id: RecipeId.PlanksFromTimber,
    building: BuildingType.Sawmill,
    inputs: [{ resource: ResourceType.Timber, qty: 1 }],
    output: { resource: ResourceType.Planks, qty: 1 },
  },
  [RecipeId.ForgeworkFromSalvage]: {
    id: RecipeId.ForgeworkFromSalvage,
    building: BuildingType.Forge,
    inputs: [{ resource: ResourceType.Salvage, qty: 1 }],
    output: { resource: ResourceType.Forgework, qty: 1 },
  },
};

export function getRecipeDefinition(id: RecipeId): RecipeDefinition {
  if (!isRecipeId(id)) {
    throw new TypeError(`getRecipeDefinition: not a valid RecipeId: ${String(id)}`);
  }
  return RECIPE_DEFINITIONS[id];
}

export const ALL_RECIPE_DEFINITIONS: readonly RecipeDefinition[] = ALL_RECIPE_IDS.map(
  (id) => RECIPE_DEFINITIONS[id],
);
