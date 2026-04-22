// tickRecipe — runs one recipe against a stockpile + set of buildings.
//
// On success the stockpile is mutated (inputs removed, output added) and
// the outcome carries the produced ingredient for event-log use. On
// failure the stockpile is untouched and the outcome names the reason
// (missing building or insufficient inputs) so the caller — whatever
// system owns the colony event log — can record it.
//
// This is the primitive behind "turn tick converts queued recipes". The
// queue itself, the iteration order, and the event-log wiring live with
// the orchestrator that owns those collections. See CLAUDE.md: "Ship
// the entity's primitive; leave iteration / scheduling to the task
// that owns the collection."

import type { BuildingType } from '../building/building-type.js';
import type { CargoHold } from '../cargo/cargo-hold.js';
import { getRecipeDefinition } from './recipe.js';
import type { RecipeDefinition, RecipeId } from './recipe.js';
import type { ResourceType } from './resource-type.js';

export interface RecipeProducedOutcome {
  readonly status: 'produced';
  readonly recipe: RecipeId;
  readonly consumed: readonly RecipeConsumedIngredient[];
  readonly produced: { readonly resource: ResourceType; readonly qty: number };
}

export interface RecipeMissingBuildingOutcome {
  readonly status: 'missing-building';
  readonly recipe: RecipeId;
  readonly required: BuildingType;
}

export interface RecipeInsufficientInputsOutcome {
  readonly status: 'insufficient-inputs';
  readonly recipe: RecipeId;
  readonly missing: readonly RecipeMissingIngredient[];
}

export type RecipeTickOutcome =
  | RecipeProducedOutcome
  | RecipeMissingBuildingOutcome
  | RecipeInsufficientInputsOutcome;

export interface RecipeConsumedIngredient {
  readonly resource: ResourceType;
  readonly qty: number;
}

export interface RecipeMissingIngredient {
  readonly resource: ResourceType;
  readonly required: number;
  readonly available: number;
}

export function tickRecipe(
  recipe: RecipeDefinition | RecipeId,
  stockpile: CargoHold,
  buildings: Iterable<BuildingType>,
): RecipeTickOutcome {
  const def = typeof recipe === 'string' ? getRecipeDefinition(recipe) : recipe;
  const buildingSet = new Set<BuildingType>(buildings);
  if (!buildingSet.has(def.building)) {
    return { status: 'missing-building', recipe: def.id, required: def.building };
  }
  const missing: RecipeMissingIngredient[] = [];
  for (const ing of def.inputs) {
    const available = stockpile.getQuantity(ing.resource);
    if (available < ing.qty) {
      missing.push({ resource: ing.resource, required: ing.qty, available });
    }
  }
  if (missing.length > 0) {
    missing.sort((a, b) => a.resource.localeCompare(b.resource));
    return { status: 'insufficient-inputs', recipe: def.id, missing };
  }
  for (const ing of def.inputs) {
    stockpile.removeResource(ing.resource, ing.qty);
  }
  stockpile.addResource(def.output.resource, def.output.qty);
  const consumed: RecipeConsumedIngredient[] = def.inputs
    .map((i) => ({ resource: i.resource, qty: i.qty }))
    .sort((a, b) => a.resource.localeCompare(b.resource));
  return {
    status: 'produced',
    recipe: def.id,
    consumed,
    produced: { resource: def.output.resource, qty: def.output.qty },
  };
}
