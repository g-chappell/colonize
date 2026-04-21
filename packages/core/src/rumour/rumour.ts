import type { Coord } from '../map/map.js';

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

export type RumourOutcome =
  | { readonly type: 'gold'; readonly amount: number }
  | { readonly type: 'salvage'; readonly amount: number }
  | { readonly type: 'nothing' }
  | { readonly type: 'encounter' };

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

  resolve(rng: () => number): RumourOutcome {
    if (this._resolved) {
      throw new Error(`RumourTile ${this.id} has already been resolved`);
    }
    if (typeof rng !== 'function') {
      throw new TypeError('RumourTile.resolve requires an rng function () => number');
    }
    const outcome = rollOutcome(this.kind, rng);
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

function rollOutcome(kind: RumourKind, rng: () => number): RumourOutcome {
  switch (kind) {
    case RumourKind.Treasure:
      return { type: 'gold', amount: randInt(rng, 20, 100) };
    case RumourKind.Derelict:
      return { type: 'salvage', amount: randInt(rng, 1, 5) };
    case RumourKind.Mirage:
      return { type: 'nothing' };
    case RumourKind.Encounter:
      return { type: 'encounter' };
  }
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function isCoord(value: unknown): value is Coord {
  if (value === null || typeof value !== 'object') return false;
  const c = value as { x?: unknown; y?: unknown };
  return Number.isInteger(c.x) && Number.isInteger(c.y);
}
