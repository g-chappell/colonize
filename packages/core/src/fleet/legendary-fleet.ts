// LegendaryFleet — tracks per-faction progress on Legendary Ship blueprints.
//
// Two orthogonal sets:
//   - discovered: blueprints the faction has *found* (rumour-pile result).
//     Factions other than OTK may surface a Legendary wreck too, but the only
//     reward they get is scrap salvage — see LEGENDARY_WRECK_BLUEPRINT_FACTION.
//     Tracking discovered separately from redeemed lets the UI show "found but
//     not yet buildable" entries in an OTK codex.
//   - redeemed: blueprints whose hull has been added to the OTK shipyard roster,
//     making the legendary ship class buildable. Redeem implies discovered.
//
// Ship ids are opaque strings (LegendaryShipId alias) because the ship-slot
// registry lives in packages/content and packages/core cannot import it —
// see CLAUDE.md "Opaque string aliases bridge pre-registry save-format
// identifiers" and the dependency-direction rule. Untrusted JSON input is
// validated at the primitive boundary (assertNonEmptyString) rather than at
// first consumer.
//
// Orchestration — wiring rumour-resolve results into discover(), wiring a
// "redeem blueprint" player action into redeem(), enumerating buildable ships
// for a shipyard UI — lives with the task that owns the relevant collection
// (faction register, shipyard system). This module ships only the primitive.
// See CLAUDE.md "Ship the entity's primitive; leave iteration / scheduling
// to the task that owns the collection."

export type LegendaryShipId = string;

export interface LegendaryFleetJSON {
  readonly discovered: readonly LegendaryShipId[];
  readonly redeemed: readonly LegendaryShipId[];
}

export interface LegendaryFleetInit {
  readonly discovered?: readonly LegendaryShipId[];
  readonly redeemed?: readonly LegendaryShipId[];
}

export class LegendaryFleet {
  private readonly _discovered: Set<LegendaryShipId>;
  private readonly _redeemed: Set<LegendaryShipId>;

  constructor(init: LegendaryFleetInit = {}) {
    this._discovered = new Set();
    this._redeemed = new Set();
    if (init.discovered !== undefined) {
      if (!Array.isArray(init.discovered)) {
        throw new TypeError('LegendaryFleet init.discovered must be an array');
      }
      for (const id of init.discovered) this.discover(id);
    }
    if (init.redeemed !== undefined) {
      if (!Array.isArray(init.redeemed)) {
        throw new TypeError('LegendaryFleet init.redeemed must be an array');
      }
      for (const id of init.redeemed) this.redeem(id);
    }
  }

  get discovered(): readonly LegendaryShipId[] {
    return [...this._discovered].sort();
  }

  get redeemed(): readonly LegendaryShipId[] {
    return [...this._redeemed].sort();
  }

  hasDiscovered(id: LegendaryShipId): boolean {
    return this._discovered.has(id);
  }

  hasRedeemed(id: LegendaryShipId): boolean {
    return this._redeemed.has(id);
  }

  // Mark a blueprint as found. Idempotent — re-discovering the same ship is a
  // no-op (rumour-pile state machine may replay the resolve in edge cases).
  discover(id: LegendaryShipId): void {
    assertNonEmptyString('discover', 'legendary ship id', id);
    this._discovered.add(id);
  }

  // Mark a blueprint as redeemed, which implies discovery. Idempotent.
  redeem(id: LegendaryShipId): void {
    assertNonEmptyString('redeem', 'legendary ship id', id);
    this._discovered.add(id);
    this._redeemed.add(id);
  }

  // A legendary ship class is buildable in a shipyard iff its blueprint has
  // been redeemed. Discovery alone is not enough — redemption is the separate
  // player action that locks the stats into the shipyard's production menu.
  isBuildable(id: LegendaryShipId): boolean {
    return this._redeemed.has(id);
  }

  toJSON(): LegendaryFleetJSON {
    return {
      discovered: [...this._discovered].sort(),
      redeemed: [...this._redeemed].sort(),
    };
  }

  static fromJSON(data: LegendaryFleetJSON): LegendaryFleet {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('LegendaryFleetJSON must be an object');
    }
    if (!Array.isArray(data.discovered)) {
      throw new TypeError('LegendaryFleetJSON.discovered must be an array');
    }
    if (!Array.isArray(data.redeemed)) {
      throw new TypeError('LegendaryFleetJSON.redeemed must be an array');
    }
    return new LegendaryFleet({
      discovered: data.discovered,
      redeemed: data.redeemed,
    });
  }
}

function assertNonEmptyString(op: string, label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: ${label} must be a non-empty string`);
  }
}
