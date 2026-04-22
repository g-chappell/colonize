// HomePort — the per-faction trade port primitive.
//
// Tracks, per resource id, a fixed base price plus a signed net volume
// (positive when the player has been a net seller, negative when net
// buyer). Each transaction inverts the price: every PRICE_VOLUME_STEP
// units shifts the derived mid-price by 1, clamped to
// [MIN_MID_PRICE, MAX_MID_PRICE]. Sell (player buys from port) and
// buy-back (port buys from player) prices are computed from the
// mid-price ± PRICE_SPREAD, so buy-back < sell at every volume.
//
// The primitive only tracks state and exposes price-query +
// volume-mutate primitives. Orchestration ("execute a trade",
// "settle the books at end of turn", "tick prices back toward
// equilibrium") belongs with the trade-screen task that owns the
// colony / port collection. See CLAUDE.md: "Ship the entity's
// primitive; leave iteration / scheduling to the task that owns the
// collection."
//
// Per-faction starting base prices live in @colonize/content's
// HOMEPORT_STARTING_PRICES table; the spawning code (downstream task)
// reads that table and supplies basePrices via the init object,
// keeping the dependency direction core ← content one-way only.

import type { ResourceId } from '../cargo/cargo-hold.js';
import type { FactionId } from '../unit/unit.js';

export const PRICE_SPREAD = 1;
export const MIN_MID_PRICE = 2;
export const MAX_MID_PRICE = 99;
export const PRICE_VOLUME_STEP = 5;

export interface HomePortJSON {
  readonly id: string;
  readonly faction: FactionId;
  readonly basePrices: { readonly [resourceId: string]: number };
  readonly netVolume: { readonly [resourceId: string]: number };
}

export interface HomePortInit {
  readonly id: string;
  readonly faction: FactionId;
  readonly basePrices: { readonly [resourceId: string]: number };
  readonly netVolume?: { readonly [resourceId: string]: number };
}

export class HomePort {
  readonly id: string;
  readonly faction: FactionId;
  private readonly _basePrices: Map<ResourceId, number>;
  private readonly _netVolume: Map<ResourceId, number>;

  constructor(init: HomePortInit) {
    assertNonEmptyString('HomePort', 'id', init.id);
    assertNonEmptyString('HomePort', 'faction', init.faction);
    if (init.basePrices === null || typeof init.basePrices !== 'object') {
      throw new TypeError('HomePort: basePrices must be a plain object');
    }
    this.id = init.id;
    this.faction = init.faction;
    this._basePrices = new Map();
    this._netVolume = new Map();
    for (const [id, price] of Object.entries(init.basePrices)) {
      assertNonEmptyString('HomePort', 'basePrice resource id', id);
      assertBasePrice(id, price);
      this._basePrices.set(id, price);
    }
    if (this._basePrices.size === 0) {
      throw new RangeError('HomePort: basePrices must contain at least one entry');
    }
    if (init.netVolume !== undefined) {
      if (init.netVolume === null || typeof init.netVolume !== 'object') {
        throw new TypeError('HomePort: netVolume must be a plain object');
      }
      for (const [id, volume] of Object.entries(init.netVolume)) {
        assertNonEmptyString('HomePort', 'netVolume resource id', id);
        if (!this._basePrices.has(id)) {
          throw new RangeError(`HomePort: netVolume references untraded resource "${id}"`);
        }
        if (!Number.isInteger(volume)) {
          throw new RangeError(`HomePort: netVolume[${id}] must be an integer (got ${volume})`);
        }
        if (volume !== 0) this._netVolume.set(id, volume);
      }
    }
  }

  get tradedResources(): readonly ResourceId[] {
    return [...this._basePrices.keys()].sort();
  }

  trades(resourceId: ResourceId): boolean {
    return this._basePrices.has(resourceId);
  }

  basePrice(resourceId: ResourceId): number {
    const v = this._basePrices.get(resourceId);
    if (v === undefined) {
      throw new RangeError(`HomePort.basePrice: resource "${resourceId}" not traded here`);
    }
    return v;
  }

  netVolume(resourceId: ResourceId): number {
    if (!this._basePrices.has(resourceId)) {
      throw new RangeError(`HomePort.netVolume: resource "${resourceId}" not traded here`);
    }
    return this._netVolume.get(resourceId) ?? 0;
  }

  midPrice(resourceId: ResourceId): number {
    const base = this.basePrice(resourceId);
    const v = this._netVolume.get(resourceId) ?? 0;
    const shift = Math.floor(v / PRICE_VOLUME_STEP);
    const raw = base - shift;
    if (raw < MIN_MID_PRICE) return MIN_MID_PRICE;
    if (raw > MAX_MID_PRICE) return MAX_MID_PRICE;
    return raw;
  }

  sellPrice(resourceId: ResourceId): number {
    return this.midPrice(resourceId) + PRICE_SPREAD;
  }

  buyBackPrice(resourceId: ResourceId): number {
    return this.midPrice(resourceId) - PRICE_SPREAD;
  }

  recordPlayerSale(resourceId: ResourceId, qty: number): void {
    assertPositiveQty('recordPlayerSale', qty);
    this._mutateVolume(resourceId, qty);
  }

  recordPlayerPurchase(resourceId: ResourceId, qty: number): void {
    assertPositiveQty('recordPlayerPurchase', qty);
    this._mutateVolume(resourceId, -qty);
  }

  private _mutateVolume(resourceId: ResourceId, delta: number): void {
    if (!this._basePrices.has(resourceId)) {
      throw new RangeError(`HomePort: resource "${resourceId}" not traded at this port`);
    }
    const next = (this._netVolume.get(resourceId) ?? 0) + delta;
    if (next === 0) {
      this._netVolume.delete(resourceId);
    } else {
      this._netVolume.set(resourceId, next);
    }
  }

  toJSON(): HomePortJSON {
    const basePrices: { [resourceId: string]: number } = {};
    for (const id of [...this._basePrices.keys()].sort()) {
      basePrices[id] = this._basePrices.get(id)!;
    }
    const netVolume: { [resourceId: string]: number } = {};
    for (const id of [...this._netVolume.keys()].sort()) {
      netVolume[id] = this._netVolume.get(id)!;
    }
    return { id: this.id, faction: this.faction, basePrices, netVolume };
  }

  static fromJSON(data: HomePortJSON): HomePort {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('HomePortJSON must be an object');
    }
    if (data.basePrices === null || typeof data.basePrices !== 'object') {
      throw new TypeError('HomePortJSON.basePrices must be a plain object');
    }
    if (data.netVolume === null || typeof data.netVolume !== 'object') {
      throw new TypeError('HomePortJSON.netVolume must be a plain object');
    }
    return new HomePort({
      id: data.id,
      faction: data.faction,
      basePrices: data.basePrices,
      netVolume: data.netVolume,
    });
  }
}

function assertNonEmptyString(op: string, label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: ${label} must be a non-empty string`);
  }
}

function assertBasePrice(resourceId: string, value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new RangeError(`HomePort: basePrice[${resourceId}] must be an integer (got ${value})`);
  }
  if (value < MIN_MID_PRICE || value > MAX_MID_PRICE) {
    throw new RangeError(
      `HomePort: basePrice[${resourceId}] must be in [${MIN_MID_PRICE}, ${MAX_MID_PRICE}] (got ${value})`,
    );
  }
}

function assertPositiveQty(op: string, qty: number): void {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new RangeError(`${op}: qty must be a positive integer (got ${qty})`);
  }
}
