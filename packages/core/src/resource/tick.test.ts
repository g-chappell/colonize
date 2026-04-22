import { describe, it, expect } from 'vitest';
import { BuildingType } from '../building/building-type.js';
import { CargoHold } from '../cargo/cargo-hold.js';
import { RecipeId, getRecipeDefinition } from './recipe.js';
import { ResourceType } from './resource-type.js';
import { tickRecipe } from './tick.js';

describe('tickRecipe — produced', () => {
  it('consumes inputs and emits output when building + inputs are present', () => {
    const stock = new CargoHold({ resources: { timber: 5 } });
    const outcome = tickRecipe(RecipeId.PlanksFromTimber, stock, [BuildingType.Sawmill]);
    expect(outcome.status).toBe('produced');
    if (outcome.status !== 'produced') throw new Error('status narrowing');
    expect(outcome.recipe).toBe(RecipeId.PlanksFromTimber);
    expect(outcome.produced).toEqual({ resource: ResourceType.Planks, qty: 1 });
    expect(outcome.consumed).toEqual([{ resource: ResourceType.Timber, qty: 1 }]);
    expect(stock.getQuantity(ResourceType.Timber)).toBe(4);
    expect(stock.getQuantity(ResourceType.Planks)).toBe(1);
  });

  it('accepts a RecipeDefinition directly', () => {
    const def = getRecipeDefinition(RecipeId.ForgeworkFromSalvage);
    const stock = new CargoHold({ resources: { salvage: 3 } });
    const outcome = tickRecipe(def, stock, new Set([BuildingType.Forge]));
    expect(outcome.status).toBe('produced');
    expect(stock.getQuantity(ResourceType.Salvage)).toBe(2);
    expect(stock.getQuantity(ResourceType.Forgework)).toBe(1);
  });
});

describe('tickRecipe — missing-building', () => {
  it('returns missing-building when the required workshop is absent', () => {
    const stock = new CargoHold({ resources: { timber: 5 } });
    const outcome = tickRecipe(RecipeId.PlanksFromTimber, stock, []);
    expect(outcome.status).toBe('missing-building');
    if (outcome.status !== 'missing-building') throw new Error('status narrowing');
    expect(outcome.required).toBe(BuildingType.Sawmill);
    expect(outcome.recipe).toBe(RecipeId.PlanksFromTimber);
  });

  it('leaves the stockpile untouched on missing-building', () => {
    const stock = new CargoHold({ resources: { timber: 5 } });
    tickRecipe(RecipeId.PlanksFromTimber, stock, [BuildingType.Tavern]);
    expect(stock.getQuantity(ResourceType.Timber)).toBe(5);
    expect(stock.getQuantity(ResourceType.Planks)).toBe(0);
  });
});

describe('tickRecipe — insufficient-inputs', () => {
  it('returns insufficient-inputs with shortfall details', () => {
    const stock = new CargoHold();
    const outcome = tickRecipe(RecipeId.PlanksFromTimber, stock, [BuildingType.Sawmill]);
    expect(outcome.status).toBe('insufficient-inputs');
    if (outcome.status !== 'insufficient-inputs') throw new Error('status narrowing');
    expect(outcome.missing).toEqual([{ resource: ResourceType.Timber, required: 1, available: 0 }]);
    expect(outcome.recipe).toBe(RecipeId.PlanksFromTimber);
  });

  it('leaves the stockpile untouched on insufficient-inputs', () => {
    const stock = new CargoHold();
    tickRecipe(RecipeId.PlanksFromTimber, stock, [BuildingType.Sawmill]);
    expect(stock.getQuantity(ResourceType.Timber)).toBe(0);
    expect(stock.getQuantity(ResourceType.Planks)).toBe(0);
  });

  it('sorts missing entries by resource id for stable event-log order', () => {
    // A synthetic multi-input recipe shape, built at runtime to exercise the sort.
    const synthetic = {
      id: RecipeId.PlanksFromTimber,
      building: BuildingType.Sawmill,
      inputs: [
        { resource: ResourceType.Timber, qty: 2 },
        { resource: ResourceType.Fibre, qty: 3 },
      ],
      output: { resource: ResourceType.Planks, qty: 1 },
    };
    const stock = new CargoHold();
    const outcome = tickRecipe(synthetic, stock, [BuildingType.Sawmill]);
    expect(outcome.status).toBe('insufficient-inputs');
    if (outcome.status !== 'insufficient-inputs') throw new Error('status narrowing');
    expect(outcome.missing.map((m) => m.resource)).toEqual([
      ResourceType.Fibre,
      ResourceType.Timber,
    ]);
  });
});

describe('tickRecipe — queue-like iteration', () => {
  it('caller can drain a queue by looping tickRecipe and collecting outcomes', () => {
    const stock = new CargoHold({ resources: { timber: 2, salvage: 1 } });
    const queue = [
      RecipeId.PlanksFromTimber,
      RecipeId.PlanksFromTimber,
      RecipeId.PlanksFromTimber, // runs out on the third
      RecipeId.ForgeworkFromSalvage,
    ];
    const buildings = new Set([BuildingType.Sawmill, BuildingType.Forge]);
    const outcomes = queue.map((id) => tickRecipe(id, stock, buildings));
    expect(outcomes.map((o) => o.status)).toEqual([
      'produced',
      'produced',
      'insufficient-inputs',
      'produced',
    ]);
    expect(stock.getQuantity(ResourceType.Timber)).toBe(0);
    expect(stock.getQuantity(ResourceType.Planks)).toBe(2);
    expect(stock.getQuantity(ResourceType.Salvage)).toBe(0);
    expect(stock.getQuantity(ResourceType.Forgework)).toBe(1);
  });
});
