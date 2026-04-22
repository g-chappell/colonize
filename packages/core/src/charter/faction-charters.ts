// FactionCharters — per-faction Archive-Charter pool and adoption ledger.
//
// Two orthogonal sets sitting alongside each other:
//   - `available` — charters still in the draw pool. Seeded with every
//     `ArchiveCharterId` by default so a freshly-created faction has
//     the full roster on offer. The Council UI pulls two at a time via
//     `drawHand`; the unpicked card stays available.
//   - `selected` — charters the faction has adopted via `pick`. Ordered
//     by pick-sequence so HUD tooling can show the adoption history and
//     the aggregator can iterate in any order (effects stack linearly).
//
// Per CLAUDE.md's "Ship the entity's primitive; leave iteration /
// scheduling to the task that owns the collection", this module ships
// only the per-faction primitive — it never iterates factions, reads
// the chimes ledger, or decides when a Council fires. The store
// orchestrator owns that wiring.
//
// Draws are deterministic given a seeded `rng`: `drawHand` sorts the
// available pool, picks a first index, swaps it to the tail, then
// picks a second from the remaining head. Tests pass a seeded
// `() => number`; production defaults to `Math.random`.

import { ALL_ARCHIVE_CHARTER_IDS, isArchiveCharterId } from './charter-registry.js';
import type { ArchiveCharterId } from './charter-registry.js';

export interface FactionChartersJSON {
  readonly available: readonly ArchiveCharterId[];
  readonly selected: readonly ArchiveCharterId[];
}

export interface FactionChartersInit {
  readonly available?: readonly ArchiveCharterId[];
  readonly selected?: readonly ArchiveCharterId[];
}

export type CharterHand = readonly [ArchiveCharterId, ArchiveCharterId];

export class FactionCharters {
  private readonly _available: Set<ArchiveCharterId>;
  private readonly _selected: ArchiveCharterId[];

  constructor(init: FactionChartersInit = {}) {
    this._available = new Set();
    this._selected = [];

    if (init.available !== undefined) {
      if (!Array.isArray(init.available)) {
        throw new TypeError('FactionCharters init.available must be an array');
      }
      for (const id of init.available) {
        if (!isArchiveCharterId(id)) {
          throw new RangeError(
            `FactionCharters init.available contains unknown charter id ${String(id)}`,
          );
        }
        this._available.add(id);
      }
    } else {
      for (const id of ALL_ARCHIVE_CHARTER_IDS) this._available.add(id);
    }

    if (init.selected !== undefined) {
      if (!Array.isArray(init.selected)) {
        throw new TypeError('FactionCharters init.selected must be an array');
      }
      const seen = new Set<ArchiveCharterId>();
      for (const id of init.selected) {
        if (!isArchiveCharterId(id)) {
          throw new RangeError(
            `FactionCharters init.selected contains unknown charter id ${String(id)}`,
          );
        }
        if (seen.has(id)) {
          throw new RangeError(`FactionCharters init.selected contains duplicate ${id}`);
        }
        seen.add(id);
        this._selected.push(id);
        // Adopted charters leave the draw pool. A JSON snapshot that
        // lists the same id in both slots is almost certainly a bug;
        // enforce the invariant on load so downstream consumers can
        // trust `available ∩ selected === ∅`.
        this._available.delete(id);
      }
    }
  }

  // Sorted alphabetical for deterministic iteration — the Council UI
  // wants a stable draw order across reloads and the save-format
  // emitter wants byte-parity (see CLAUDE.md "Map/Set-backed save-format
  // emitters sort entries in `toJSON`").
  get available(): readonly ArchiveCharterId[] {
    return [...this._available].sort();
  }

  // Pick-order preserved — consumers that want a history display read
  // this directly; consumers that just want axis-sums feed it into
  // `aggregateCharterEffects`.
  get selected(): readonly ArchiveCharterId[] {
    return [...this._selected];
  }

  isAvailable(id: ArchiveCharterId): boolean {
    return this._available.has(id);
  }

  hasSelected(id: ArchiveCharterId): boolean {
    return this._selected.includes(id);
  }

  // Pure-functional two-card draw. Callers pass the available pool
  // (usually `factionCharters.available`) and a `() => number` rng;
  // the draw is deterministic given a seeded rng. Throws if the pool
  // has fewer than two charters — the Council UI should gate on
  // `available.length >= 2` before calling this.
  static drawHand(
    available: readonly ArchiveCharterId[],
    rng: () => number = Math.random,
  ): CharterHand {
    if (!Array.isArray(available)) {
      throw new TypeError('FactionCharters.drawHand: available must be an array');
    }
    if (available.length < 2) {
      throw new RangeError(
        `FactionCharters.drawHand: at least two charters required (got ${available.length})`,
      );
    }
    const pool = [...available];
    const firstIndex = pickIndex(pool.length, rng);
    const first = pool[firstIndex]!;
    pool.splice(firstIndex, 1);
    const secondIndex = pickIndex(pool.length, rng);
    const second = pool[secondIndex]!;
    return [first, second];
  }

  // Adopt a charter. Moves the id from `available` to `selected` (at
  // the tail of the pick list) and returns true; throws if the id is
  // not currently available (already adopted, never in the pool, or
  // not a valid charter id). The store boundary should gate on
  // `isAvailable` and skip-with-no-op rather than propagate this
  // throw — see CLAUDE.md "Clamp-and-skip out-of-range qty at the
  // zustand store boundary."
  pick(id: ArchiveCharterId): void {
    if (!isArchiveCharterId(id)) {
      throw new TypeError(`FactionCharters.pick: not a valid ArchiveCharterId: ${String(id)}`);
    }
    if (!this._available.has(id)) {
      throw new RangeError(`FactionCharters.pick: charter ${id} is not available`);
    }
    this._available.delete(id);
    this._selected.push(id);
  }

  toJSON(): FactionChartersJSON {
    return {
      available: [...this._available].sort(),
      selected: [...this._selected],
    };
  }

  static fromJSON(data: FactionChartersJSON): FactionCharters {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('FactionChartersJSON must be an object');
    }
    if (!Array.isArray(data.available)) {
      throw new TypeError('FactionChartersJSON.available must be an array');
    }
    if (!Array.isArray(data.selected)) {
      throw new TypeError('FactionChartersJSON.selected must be an array');
    }
    return new FactionCharters({
      available: data.available,
      selected: data.selected,
    });
  }
}

function pickIndex(length: number, rng: () => number): number {
  const r = rng();
  if (!Number.isFinite(r) || r < 0 || r >= 1) {
    // Ring-fence a malformed rng with a safe fallback rather than
    // letting it produce an out-of-bounds index. Tests that pass
    // pathological rngs should see a stable first-element pick.
    return 0;
  }
  return Math.floor(r * length);
}
