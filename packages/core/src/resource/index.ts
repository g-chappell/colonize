export { ResourceType, ALL_RESOURCE_TYPES, isResourceType } from './resource-type.js';
export {
  RecipeId,
  ALL_RECIPE_IDS,
  ALL_RECIPE_DEFINITIONS,
  isRecipeId,
  getRecipeDefinition,
} from './recipe.js';
export type { RecipeDefinition, RecipeIngredient } from './recipe.js';
export { tickRecipe } from './tick.js';
export type {
  RecipeTickOutcome,
  RecipeProducedOutcome,
  RecipeMissingBuildingOutcome,
  RecipeInsufficientInputsOutcome,
  RecipeConsumedIngredient,
  RecipeMissingIngredient,
} from './tick.js';
