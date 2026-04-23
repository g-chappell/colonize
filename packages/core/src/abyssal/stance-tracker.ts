// AbyssalStanceTracker — per-faction primitive that records cumulative
// affinity for each AbyssalStance and exposes the dominant stance.
//
// One tracker per faction. The owner of the faction collection wraps a
// `Map<FactionId, AbyssalStanceTracker>` and routes per-tile actions
// (offering at an Abyssal site, plunder of a shrine, patrol assignment,
// pass-through) into `applyAction`. The dominant stance is recomputed
// after every action via argmax over the four counters; ties keep the
// current stance for stability — a tracker never flips on a wash, only
// when one stance overtakes the others.
//
// Per CLAUDE.md: "Ship the entity's primitive; leave iteration /
// scheduling to the task that owns the collection." This module ships
// the tracker and its determinism guarantees. It does NOT register a
// `TurnManager` hook, iterate factions, or know which tile types are
// "Abyssal" — those decisions belong to the orchestrator that wires
// the per-faction map into a turn flow.

import { abyssalActionAffinity, isAbyssalAction } from './abyssal-action.js';
import type { AbyssalAction } from './abyssal-action.js';
import { ALL_ABYSSAL_STANCES, DEFAULT_ABYSSAL_STANCE, isAbyssalStance } from './stance.js';
import type { AbyssalStance } from './stance.js';

export type AbyssalAffinityCounts = Readonly<Record<AbyssalStance, number>>;

export interface AbyssalStanceTrackerJSON {
  readonly stance: AbyssalStance;
  readonly affinity: AbyssalAffinityCounts;
  readonly history: readonly AbyssalAction[];
}

export interface AbyssalStanceTrackerInit {
  readonly stance?: AbyssalStance;
  readonly affinity?: Partial<Record<AbyssalStance, number>>;
  readonly history?: readonly AbyssalAction[];
}

export class AbyssalStanceTracker {
  private _stance: AbyssalStance;
  private readonly _affinity: Record<AbyssalStance, number>;
  private readonly _history: AbyssalAction[];

  constructor(init: AbyssalStanceTrackerInit = {}) {
    const stance = init.stance ?? DEFAULT_ABYSSAL_STANCE;
    if (!isAbyssalStance(stance)) {
      throw new TypeError(
        `AbyssalStanceTracker stance must be a valid stance (got ${String(stance)})`,
      );
    }
    this._affinity = zeroAffinity();
    if (init.affinity !== undefined) {
      if (init.affinity === null || typeof init.affinity !== 'object') {
        throw new TypeError('AbyssalStanceTracker init.affinity must be an object');
      }
      for (const [key, value] of Object.entries(init.affinity)) {
        if (!isAbyssalStance(key)) {
          throw new RangeError(`AbyssalStanceTracker init.affinity has unknown stance key ${key}`);
        }
        if (value === undefined) continue;
        validateCount(value, key);
        this._affinity[key] = value;
      }
    }
    this._history = [];
    if (init.history !== undefined) {
      if (!Array.isArray(init.history)) {
        throw new TypeError('AbyssalStanceTracker init.history must be an array');
      }
      for (const entry of init.history) {
        if (!isAbyssalAction(entry)) {
          throw new RangeError(
            `AbyssalStanceTracker init.history has unknown action ${String(entry)})`,
          );
        }
        this._history.push(entry);
      }
    }
    this._stance = stance;
  }

  get stance(): AbyssalStance {
    return this._stance;
  }

  // Per-access defensive copy: callers may iterate or destructure but
  // can't mutate the internal counter map.
  get affinity(): AbyssalAffinityCounts {
    return { ...this._affinity };
  }

  // Per-access defensive copy: orchestrators that pop a history-replay
  // queue must not splice the internal array.
  get history(): readonly AbyssalAction[] {
    return [...this._history];
  }

  // Apply an action: increment its affinity counter, recompute the
  // dominant stance (ties keep the incumbent), and return the new
  // stance for caller convenience.
  applyAction(action: AbyssalAction): AbyssalStance {
    if (!isAbyssalAction(action)) {
      throw new TypeError(
        `AbyssalStanceTracker.applyAction received unknown action ${String(action)}`,
      );
    }
    const target = abyssalActionAffinity(action);
    this._affinity[target] += 1;
    this._history.push(action);
    this._stance = dominantStance(this._affinity, this._stance);
    return this._stance;
  }

  toJSON(): AbyssalStanceTrackerJSON {
    return {
      stance: this._stance,
      affinity: { ...this._affinity },
      history: [...this._history],
    };
  }

  static fromJSON(data: AbyssalStanceTrackerJSON): AbyssalStanceTracker {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('AbyssalStanceTrackerJSON must be an object');
    }
    if (!isAbyssalStance(data.stance)) {
      throw new TypeError('AbyssalStanceTrackerJSON.stance must be a valid stance');
    }
    if (data.affinity === null || typeof data.affinity !== 'object') {
      throw new TypeError('AbyssalStanceTrackerJSON.affinity must be an object');
    }
    if (!Array.isArray(data.history)) {
      throw new TypeError('AbyssalStanceTrackerJSON.history must be an array');
    }
    return new AbyssalStanceTracker({
      stance: data.stance,
      affinity: data.affinity,
      history: data.history,
    });
  }
}

function zeroAffinity(): Record<AbyssalStance, number> {
  const out = {} as Record<AbyssalStance, number>;
  for (const s of ALL_ABYSSAL_STANCES) out[s] = 0;
  return out;
}

function validateCount(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `AbyssalStanceTracker affinity[${label}] must be a non-negative integer (got ${String(value)})`,
    );
  }
}

// Argmax with current-stance tie-break. Walking ALL_ABYSSAL_STANCES in
// declared order keeps the result deterministic across runs.
function dominantStance(
  affinity: Readonly<Record<AbyssalStance, number>>,
  current: AbyssalStance,
): AbyssalStance {
  let best = current;
  let bestCount = affinity[current];
  for (const s of ALL_ABYSSAL_STANCES) {
    if (affinity[s] > bestCount) {
      best = s;
      bestCount = affinity[s];
    }
  }
  return best;
}
