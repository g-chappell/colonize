import type { Coord } from '../map/map.js';
import type { FactionId } from '../unit/unit.js';

export const RumourKind = {
  Treasure: 'treasure',
  Derelict: 'derelict',
  Mirage: 'mirage',
  Encounter: 'encounter',
} as const;

export type RumourKind = (typeof RumourKind)[keyof typeof RumourKind];

export const ALL_RUMOUR_KINDS: readonly RumourKind[] = Object.values(RumourKind);

export function isRumourKind(value: unknown): value is RumourKind {
  return typeof value === 'string' && (ALL_RUMOUR_KINDS as readonly string[]).includes(value);
}

export const RumourOutcomeCategory = {
  ArchiveCache: 'ArchiveCache',
  LegendaryWreck: 'LegendaryWreck',
  KrakenShrine: 'KrakenShrine',
  FataMorganaMirage: 'FataMorganaMirage',
} as const;

export type RumourOutcomeCategory =
  (typeof RumourOutcomeCategory)[keyof typeof RumourOutcomeCategory];

export const ALL_RUMOUR_OUTCOME_CATEGORIES: readonly RumourOutcomeCategory[] =
  Object.values(RumourOutcomeCategory);

export function isRumourOutcomeCategory(value: unknown): value is RumourOutcomeCategory {
  return (
    typeof value === 'string' &&
    (ALL_RUMOUR_OUTCOME_CATEGORIES as readonly string[]).includes(value)
  );
}

export type MirageVariant = 'nothing' | 'bonus' | 'hazard';

// Faction id that unlocks the Legendary blueprint branch of LegendaryWreck.
// Other factions get a salvage reward instead. Hard-coded here (rather than
// read from content) because core cannot import from packages/content — the
// dependency direction forbids it.
export const LEGENDARY_WRECK_BLUEPRINT_FACTION: FactionId = 'otk';

export type RumourOutcome =
  | { readonly category: 'ArchiveCache'; readonly libertyChimes: number }
  | {
      readonly category: 'LegendaryWreck';
      readonly reward:
        | { readonly kind: 'legendary-blueprint' }
        | { readonly kind: 'salvage'; readonly amount: number };
    }
  | { readonly category: 'KrakenShrine'; readonly reputationDelta: number }
  | { readonly category: 'FataMorganaMirage'; readonly variant: MirageVariant };

export function outcomeCategoryForKind(kind: RumourKind): RumourOutcomeCategory {
  switch (kind) {
    case RumourKind.Treasure:
      return RumourOutcomeCategory.ArchiveCache;
    case RumourKind.Derelict:
      return RumourOutcomeCategory.LegendaryWreck;
    case RumourKind.Encounter:
      return RumourOutcomeCategory.KrakenShrine;
    case RumourKind.Mirage:
      return RumourOutcomeCategory.FataMorganaMirage;
  }
}

export interface RumourTileJSON {
  readonly id: string;
  readonly position: Coord;
  readonly kind: RumourKind;
  readonly resolved: boolean;
}

export interface RumourTileInit {
  readonly id: string;
  readonly position: Coord;
  readonly kind: RumourKind;
  readonly resolved?: boolean;
}

export interface ResolveOptions {
  readonly faction?: FactionId;
}

export class RumourTile {
  readonly id: string;
  readonly kind: RumourKind;
  private readonly _position: Coord;
  private _resolved: boolean;

  constructor(init: RumourTileInit) {
    if (typeof init.id !== 'string' || init.id.length === 0) {
      throw new TypeError('RumourTile id must be a non-empty string');
    }
    if (!isRumourKind(init.kind)) {
      throw new TypeError(`RumourTile kind is not a valid RumourKind: ${String(init.kind)}`);
    }
    if (!isCoord(init.position)) {
      throw new TypeError('RumourTile position is not a valid Coord');
    }
    if (init.resolved !== undefined && typeof init.resolved !== 'boolean') {
      throw new TypeError('RumourTile resolved must be a boolean when provided');
    }
    this.id = init.id;
    this.kind = init.kind;
    this._position = { x: init.position.x, y: init.position.y };
    this._resolved = init.resolved ?? false;
  }

  get position(): Coord {
    return { x: this._position.x, y: this._position.y };
  }

  get resolved(): boolean {
    return this._resolved;
  }

  get outcomeCategory(): RumourOutcomeCategory {
    return outcomeCategoryForKind(this.kind);
  }

  resolve(rng: () => number, options: ResolveOptions = {}): RumourOutcome {
    if (this._resolved) {
      throw new Error(`RumourTile ${this.id} has already been resolved`);
    }
    if (typeof rng !== 'function') {
      throw new TypeError('RumourTile.resolve requires an rng function () => number');
    }
    const outcome = rollOutcome(this.kind, rng, options.faction);
    this._resolved = true;
    return outcome;
  }

  toJSON(): RumourTileJSON {
    return {
      id: this.id,
      position: { x: this._position.x, y: this._position.y },
      kind: this.kind,
      resolved: this._resolved,
    };
  }

  static fromJSON(data: RumourTileJSON): RumourTile {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('RumourTileJSON must be an object');
    }
    return new RumourTile({
      id: data.id,
      position: data.position,
      kind: data.kind,
      resolved: data.resolved,
    });
  }
}

function rollOutcome(
  kind: RumourKind,
  rng: () => number,
  faction: FactionId | undefined,
): RumourOutcome {
  switch (kind) {
    case RumourKind.Treasure:
      return {
        category: RumourOutcomeCategory.ArchiveCache,
        libertyChimes: randInt(rng, 5, 15),
      };
    case RumourKind.Derelict:
      if (faction === LEGENDARY_WRECK_BLUEPRINT_FACTION) {
        return {
          category: RumourOutcomeCategory.LegendaryWreck,
          reward: { kind: 'legendary-blueprint' },
        };
      }
      return {
        category: RumourOutcomeCategory.LegendaryWreck,
        reward: { kind: 'salvage', amount: randInt(rng, 2, 5) },
      };
    case RumourKind.Encounter:
      return {
        category: RumourOutcomeCategory.KrakenShrine,
        reputationDelta: randInt(rng, 1, 3),
      };
    case RumourKind.Mirage:
      return {
        category: RumourOutcomeCategory.FataMorganaMirage,
        variant: rollMirageVariant(rng),
      };
  }
}

function rollMirageVariant(rng: () => number): MirageVariant {
  const r = rng();
  if (r < 1 / 3) return 'nothing';
  if (r < 2 / 3) return 'bonus';
  return 'hazard';
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function isCoord(value: unknown): value is Coord {
  if (value === null || typeof value !== 'object') return false;
  const c = value as { x?: unknown; y?: unknown };
  return Number.isInteger(c.x) && Number.isInteger(c.y);
}
