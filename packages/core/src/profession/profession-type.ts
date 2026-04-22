// ProfessionType — the canonical save-format registry for crew specialisations.
//
// The kebab-case values are the wire format: a future Crew entity will store
// `profession: ProfessionType` directly in its JSON snapshot. Renames require
// a save-version migration (per CLAUDE.md "String-literal const-objects for
// save-format-bound kinds").
//
// Scope locked to the seven MVP roles described by STORY-25:
//   - Deckhand     — generic; no bonuses (the unspecialised baseline)
//   - Shipwright   — speeds plank/forgework throughput at the shipyard
//   - Gunner       — boosts forgework yield (cannon-casting)
//   - Cartographer — boosts salvage from wrecks / floating cities
//   - Scholar      — boosts study-hall lore recovery
//   - Quartermaster— boosts provisions (larder management)
//   - Loremaster   — boosts chapel-of-the-kraken talisman blessings
//
// Per-resource and per-building bonuses are exposed as scalar lookups
// (`getProfessionYieldMultiplier`, `getProfessionBuildingMultiplier`) that
// return 1.0 when no bonus applies. Per CLAUDE.md "Scalar seams for
// pre-registry axis values", consumers that don't yet exist (a future
// crew-roster iterator, the colony build-queue) call into these helpers
// rather than this module reaching across into them.
//
// `getProfessionYieldMultiplier` and `getProfessionBuildingMultiplier` use
// exhaustive `switch` over ProfessionType so adding a new profession
// surfaces as a compile error at every consumer (per CLAUDE.md "Consume
// save-format const-object unions via an exhaustive `switch`").
//
// The Crew entity itself (which holds `profession` + a `training-in-progress`
// slot) is deliberately NOT introduced here — see CLAUDE.md "Ship the
// entity's primitive; leave iteration / scheduling to the task that owns
// the collection." This task ships the registry; the future crew-roster
// task will own crew state and wire profession bonuses through these
// scalar lookups.

import type { BuildingType } from '../building/building-type.js';
import type { ResourceId } from '../cargo/cargo-hold.js';
import type { TileYield } from '../map/tile-yield.js';

export const ProfessionType = {
  Deckhand: 'deckhand',
  Shipwright: 'shipwright',
  Gunner: 'gunner',
  Cartographer: 'cartographer',
  Scholar: 'scholar',
  Quartermaster: 'quartermaster',
  Loremaster: 'loremaster',
} as const;

export type ProfessionType = (typeof ProfessionType)[keyof typeof ProfessionType];

export const ALL_PROFESSION_TYPES: readonly ProfessionType[] = Object.values(ProfessionType);

export function isProfessionType(value: unknown): value is ProfessionType {
  return typeof value === 'string' && (ALL_PROFESSION_TYPES as readonly string[]).includes(value);
}

const NEUTRAL_MULTIPLIER = 1;

const PROFESSION_YIELD_BONUSES: Readonly<Record<ProfessionType, Readonly<Record<string, number>>>> =
  {
    [ProfessionType.Deckhand]: {},
    [ProfessionType.Shipwright]: { planks: 1.25 },
    [ProfessionType.Gunner]: { forgework: 1.25 },
    [ProfessionType.Cartographer]: { salvage: 1.25 },
    [ProfessionType.Scholar]: {},
    [ProfessionType.Quartermaster]: { provisions: 1.25 },
    [ProfessionType.Loremaster]: {},
  };

const PROFESSION_BUILDING_BONUSES: Readonly<
  Record<ProfessionType, Readonly<Partial<Record<BuildingType, number>>>>
> = {
  [ProfessionType.Deckhand]: {},
  [ProfessionType.Shipwright]: { shipyard: 1.25, sawmill: 1.15 },
  [ProfessionType.Gunner]: { 'gun-deck': 1.25, forge: 1.15 },
  [ProfessionType.Cartographer]: {},
  [ProfessionType.Scholar]: { 'study-hall': 1.25 },
  [ProfessionType.Quartermaster]: { warehouse: 1.15, 'fish-market': 1.15 },
  [ProfessionType.Loremaster]: { 'chapel-of-the-kraken': 1.25 },
};

export function getProfessionYieldMultiplier(
  profession: ProfessionType,
  resource: ResourceId,
): number {
  switch (profession) {
    case ProfessionType.Deckhand:
    case ProfessionType.Shipwright:
    case ProfessionType.Gunner:
    case ProfessionType.Cartographer:
    case ProfessionType.Scholar:
    case ProfessionType.Quartermaster:
    case ProfessionType.Loremaster:
      return PROFESSION_YIELD_BONUSES[profession][resource] ?? NEUTRAL_MULTIPLIER;
  }
}

export function getProfessionBuildingMultiplier(
  profession: ProfessionType,
  building: BuildingType,
): number {
  switch (profession) {
    case ProfessionType.Deckhand:
    case ProfessionType.Shipwright:
    case ProfessionType.Gunner:
    case ProfessionType.Cartographer:
    case ProfessionType.Scholar:
    case ProfessionType.Quartermaster:
    case ProfessionType.Loremaster:
      return PROFESSION_BUILDING_BONUSES[profession][building] ?? NEUTRAL_MULTIPLIER;
  }
}

// Apply per-resource profession bonuses across an entire base-yield vector.
// Each entry is scaled by the profession's multiplier for that resource
// (1.0 when no bonus); fractional results are floored and zero-floor entries
// are dropped, matching `scaleTileYield`'s contract. Output keys are sorted
// alphabetically for save-format determinism (per CLAUDE.md "Map/Set-backed
// save-format emitters sort entries in toJSON for byte-parity determinism").
export function applyProfessionBonusToYield(
  base: TileYield,
  profession: ProfessionType,
): TileYield {
  const out: { [resource: string]: number } = {};
  const keys = Object.keys(base).sort();
  for (const key of keys) {
    const multiplier = getProfessionYieldMultiplier(profession, key);
    const qty = Math.floor(base[key]! * multiplier);
    if (qty > 0) out[key] = qty;
  }
  return out;
}
