// TileYield — base resource-production vector per tile type.
//
// This is the primitive behind tile-work assignment: every TileType exposes
// the resources one crew-turn of labour on that tile produces. Orchestration
// (iterating colonies, summing per-turn output, crediting the stockpile)
// lives with the task that owns the colony-tile collection. See CLAUDE.md:
// "Ship the entity's primitive; leave iteration / scheduling to the task
// that owns the collection."
//
// ResourceId is kept as an opaque string per the "registry-not-ready-yet"
// pattern in CLAUDE.md — TASK-044 introduces the ResourceType const-object
// and this module will pick up the narrower type automatically.
//
// Profession bonuses arrive in TASK-045. Until then, `scaleTileYield`
// provides the multiplier seam — the caller (a profession-aware wrapper)
// supplies the factor and this module keeps the arithmetic.
//
// `getTileYield` uses an exhaustive `switch` with no `default` case so that
// adding a new TileType to the registry surfaces as a compile error at
// every consumer (per CLAUDE.md "Consume save-format const-object unions
// via an exhaustive `switch`").

import type { ResourceId } from '../cargo/cargo-hold.js';
import { TileType } from './tile.js';

export type TileYield = { readonly [resource: ResourceId]: number };

export const EMPTY_TILE_YIELD: TileYield = Object.freeze({});

export function getTileYield(type: TileType): TileYield {
  switch (type) {
    case TileType.Ocean:
      return { provisions: 1 };
    case TileType.Island:
      return { timber: 1, fibre: 1 };
    case TileType.FloatingCity:
      return { salvage: 1, provisions: 1 };
    case TileType.RayonPassage:
    case TileType.RedTide:
    case TileType.FataMorgana:
      return EMPTY_TILE_YIELD;
  }
}

export function scaleTileYield(base: TileYield, multiplier: number): TileYield {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new RangeError(
      `scaleTileYield multiplier must be a positive finite number (got ${multiplier})`,
    );
  }
  const out: { [resource: string]: number } = {};
  const keys = Object.keys(base).sort();
  for (const key of keys) {
    const qty = Math.floor(base[key]! * multiplier);
    if (qty > 0) out[key] = qty;
  }
  return out;
}
