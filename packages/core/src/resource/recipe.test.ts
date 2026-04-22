import { describe, it, expect } from 'vitest';
import { BuildingType } from '../building/building-type.js';
import {
  ALL_RECIPE_DEFINITIONS,
  ALL_RECIPE_IDS,
  RecipeId,
  getRecipeDefinition,
  isRecipeId,
} from './recipe.js';
import { ResourceType, isResourceType } from './resource-type.js';

describe('RecipeId registry', () => {
  it('exposes unique kebab-case ids', () => {
    expect(new Set(ALL_RECIPE_IDS).size).toBe(ALL_RECIPE_IDS.length);
    for (const id of ALL_RECIPE_IDS) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('includes the MVP chains', () => {
    const ids = new Set<string>(ALL_RECIPE_IDS);
    expect(ids.has(RecipeId.PlanksFromTimber)).toBe(true);
    expect(ids.has(RecipeId.ForgeworkFromSalvage)).toBe(true);
  });
});

describe('isRecipeId', () => {
  it('accepts every registered id', () => {
    for (const id of ALL_RECIPE_IDS) expect(isRecipeId(id)).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isRecipeId('')).toBe(false);
    expect(isRecipeId('unknown-recipe')).toBe(false);
    expect(isRecipeId(null)).toBe(false);
    expect(isRecipeId(42)).toBe(false);
  });
});

describe('getRecipeDefinition', () => {
  it('returns the definition for a known id', () => {
    const def = getRecipeDefinition(RecipeId.PlanksFromTimber);
    expect(def.id).toBe(RecipeId.PlanksFromTimber);
    expect(def.building).toBe(BuildingType.Sawmill);
    expect(def.output.resource).toBe(ResourceType.Planks);
    expect(def.output.qty).toBeGreaterThan(0);
    expect(def.inputs.length).toBeGreaterThan(0);
  });

  it('throws a TypeError for an unknown id', () => {
    expect(() => getRecipeDefinition('unknown-recipe' as RecipeId)).toThrow(TypeError);
  });
});

describe('recipe definitions', () => {
  it('every ingredient names a registered ResourceType with positive qty', () => {
    for (const def of ALL_RECIPE_DEFINITIONS) {
      expect(isResourceType(def.output.resource)).toBe(true);
      expect(def.output.qty).toBeGreaterThan(0);
      for (const ing of def.inputs) {
        expect(isResourceType(ing.resource)).toBe(true);
        expect(ing.qty).toBeGreaterThan(0);
      }
    }
  });

  it('every recipe has at least one input', () => {
    for (const def of ALL_RECIPE_DEFINITIONS) {
      expect(def.inputs.length).toBeGreaterThan(0);
    }
  });

  it('no recipe produces a resource it also consumes', () => {
    for (const def of ALL_RECIPE_DEFINITIONS) {
      const inputResources = new Set(def.inputs.map((i) => i.resource));
      expect(inputResources.has(def.output.resource)).toBe(false);
    }
  });
});
