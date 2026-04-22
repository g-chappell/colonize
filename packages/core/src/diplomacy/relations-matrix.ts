// RelationsMatrix — per-faction-pair diplomatic score and per-pair-per-action
// cooldowns. The pair is symmetric: `score(a, b)` and `score(b, a)` return
// the same value, and one mutation updates both directions.
//
// Scope is intentionally the data layer only:
//   - score: integer in [-100, 100], clamped on every shift
//   - cooldowns: per-pair-per-action "expires on turn N" (turn numbers are
//     absolute, matching TurnManager.turn — a cooldown is active when
//     currentTurn < expiresOnTurn)
//
// The matrix knows nothing about *which* actions exist or how each one shifts
// the score — that policy lives in diplomacy-action.ts (effect table + AI
// decision), and the attempt.ts orchestrator ties score + cooldowns + policy
// together. Separating data from policy means a future policy change (new
// action, re-tuned threshold, alternate cooldown) does not rewrite the data
// primitive or migrate the wire format.
//
// Faction ids are opaque strings (FactionId alias in ../unit/unit.ts).
// Untrusted JSON input is validated at the primitive boundary — same pattern
// as CargoHold, Colony, LegendaryFleet. Map-backed state is serialized in
// sorted order for byte-parity determinism across runs and machines. See
// CLAUDE.md "Map/Set-backed save-format emitters sort entries in toJSON for
// byte-parity determinism."

import type { FactionId } from '../unit/unit.js';
import { isDiplomacyAction } from './diplomacy-action.js';
import type { DiplomacyAction } from './diplomacy-action.js';

export const MIN_RELATIONS_SCORE = -100;
export const MAX_RELATIONS_SCORE = 100;
export const NEUTRAL_RELATIONS_SCORE = 0;

export interface RelationsEntryJSON {
  readonly a: FactionId;
  readonly b: FactionId;
  readonly score: number;
  readonly cooldowns?: { readonly [action: string]: number };
}

export interface RelationsMatrixJSON {
  readonly entries: readonly RelationsEntryJSON[];
}

export interface RelationsMatrixInit {
  readonly entries?: readonly RelationsEntryJSON[];
}

// Canonical pair key: alphabetical order joined by a pipe. Pipe is safe
// because FactionId values are kebab-case / bare identifiers (no pipes),
// and alphabetical order is stable across JS engines via localeCompare.
const PAIR_SEPARATOR = '|';

function canonicalPairKey(a: FactionId, b: FactionId): string {
  return a < b ? `${a}${PAIR_SEPARATOR}${b}` : `${b}${PAIR_SEPARATOR}${a}`;
}

function clampScore(score: number): number {
  if (score < MIN_RELATIONS_SCORE) return MIN_RELATIONS_SCORE;
  if (score > MAX_RELATIONS_SCORE) return MAX_RELATIONS_SCORE;
  return score;
}

interface PairState {
  readonly a: FactionId;
  readonly b: FactionId;
  score: number;
  cooldowns: Map<DiplomacyAction, number>;
}

export class RelationsMatrix {
  private readonly _pairs: Map<string, PairState> = new Map();

  constructor(init: RelationsMatrixInit = {}) {
    if (init.entries !== undefined) {
      if (!Array.isArray(init.entries)) {
        throw new TypeError('RelationsMatrix init.entries must be an array');
      }
      for (const entry of init.entries) this.seedEntry(entry);
    }
  }

  /**
   * Return the current relations score for the `{a, b}` pair. Defaults to
   * {@link NEUTRAL_RELATIONS_SCORE} when no interaction has occurred yet.
   */
  getScore(a: FactionId, b: FactionId): number {
    assertDistinctPair('getScore', a, b);
    const pair = this._pairs.get(canonicalPairKey(a, b));
    return pair ? pair.score : NEUTRAL_RELATIONS_SCORE;
  }

  /**
   * Turn on which the cooldown for `action` between `{a, b}` expires, or
   * `null` if no cooldown has been recorded. A cooldown is *active* while
   * `currentTurn < expiresOnTurn`.
   */
  getCooldownExpiry(a: FactionId, b: FactionId, action: DiplomacyAction): number | null {
    assertDistinctPair('getCooldownExpiry', a, b);
    assertDiplomacyAction('getCooldownExpiry', action);
    const pair = this._pairs.get(canonicalPairKey(a, b));
    if (!pair) return null;
    return pair.cooldowns.get(action) ?? null;
  }

  /**
   * Whether the given action is currently locked out between `{a, b}`.
   */
  isOnCooldown(a: FactionId, b: FactionId, action: DiplomacyAction, currentTurn: number): boolean {
    assertPositiveInteger('isOnCooldown', 'currentTurn', currentTurn);
    const expires = this.getCooldownExpiry(a, b, action);
    return expires !== null && currentTurn < expires;
  }

  /**
   * Shift the score for `{a, b}` by `delta`, clamping to
   * [{@link MIN_RELATIONS_SCORE}, {@link MAX_RELATIONS_SCORE}]. Returns the
   * resulting score so callers can log / surface the clamped value without
   * a second getter read.
   */
  shiftScore(a: FactionId, b: FactionId, delta: number): number {
    assertDistinctPair('shiftScore', a, b);
    if (!Number.isInteger(delta)) {
      throw new RangeError(`shiftScore: delta must be an integer (got ${delta})`);
    }
    if (delta === 0) {
      return this.getScore(a, b);
    }
    const pair = this.ensurePair(a, b);
    pair.score = clampScore(pair.score + delta);
    return pair.score;
  }

  /**
   * Directly set the score for `{a, b}` (primarily for save-load and test
   * seeding — gameplay code should prefer {@link shiftScore}).
   */
  setScore(a: FactionId, b: FactionId, score: number): void {
    assertDistinctPair('setScore', a, b);
    if (!Number.isInteger(score)) {
      throw new RangeError(`setScore: score must be an integer (got ${score})`);
    }
    if (score < MIN_RELATIONS_SCORE || score > MAX_RELATIONS_SCORE) {
      throw new RangeError(
        `setScore: score ${score} out of range [${MIN_RELATIONS_SCORE}, ${MAX_RELATIONS_SCORE}]`,
      );
    }
    const pair = this.ensurePair(a, b);
    pair.score = score;
  }

  /**
   * Lock the given action between `{a, b}` until `expiresOnTurn`.
   * `expiresOnTurn` is absolute (matches TurnManager.turn). Callers compute
   * it from `currentTurn + effect.cooldownTurns`.
   */
  setCooldown(a: FactionId, b: FactionId, action: DiplomacyAction, expiresOnTurn: number): void {
    assertDistinctPair('setCooldown', a, b);
    assertDiplomacyAction('setCooldown', action);
    assertPositiveInteger('setCooldown', 'expiresOnTurn', expiresOnTurn);
    const pair = this.ensurePair(a, b);
    pair.cooldowns.set(action, expiresOnTurn);
  }

  /**
   * Clear a cooldown between `{a, b}`. Idempotent — clearing a non-existent
   * cooldown is a no-op.
   */
  clearCooldown(a: FactionId, b: FactionId, action: DiplomacyAction): void {
    assertDistinctPair('clearCooldown', a, b);
    assertDiplomacyAction('clearCooldown', action);
    const pair = this._pairs.get(canonicalPairKey(a, b));
    if (!pair) return;
    pair.cooldowns.delete(action);
  }

  /**
   * Return the canonical entry list for the pair, or `null` if no
   * interaction has occurred. Useful for UI surfaces that want to enumerate
   * "known" pairs without treating never-contacted pairs as score-0 entries.
   */
  getEntry(a: FactionId, b: FactionId): RelationsEntryJSON | null {
    assertDistinctPair('getEntry', a, b);
    const pair = this._pairs.get(canonicalPairKey(a, b));
    if (!pair) return null;
    return pairToJSON(pair);
  }

  toJSON(): RelationsMatrixJSON {
    const keys = [...this._pairs.keys()].sort();
    const entries: RelationsEntryJSON[] = [];
    for (const key of keys) {
      const pair = this._pairs.get(key)!;
      entries.push(pairToJSON(pair));
    }
    return { entries };
  }

  static fromJSON(data: RelationsMatrixJSON): RelationsMatrix {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('RelationsMatrixJSON must be an object');
    }
    if (!Array.isArray(data.entries)) {
      throw new TypeError('RelationsMatrixJSON.entries must be an array');
    }
    return new RelationsMatrix({ entries: data.entries });
  }

  private ensurePair(a: FactionId, b: FactionId): PairState {
    const key = canonicalPairKey(a, b);
    const existing = this._pairs.get(key);
    if (existing) return existing;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const fresh: PairState = {
      a: lo,
      b: hi,
      score: NEUTRAL_RELATIONS_SCORE,
      cooldowns: new Map(),
    };
    this._pairs.set(key, fresh);
    return fresh;
  }

  private seedEntry(entry: RelationsEntryJSON): void {
    if (entry === null || typeof entry !== 'object') {
      throw new TypeError('RelationsMatrix entry must be an object');
    }
    assertNonEmptyString('seed entry', 'a', entry.a);
    assertNonEmptyString('seed entry', 'b', entry.b);
    if (entry.a === entry.b) {
      throw new RangeError(`seed entry: a and b must differ (got "${entry.a}")`);
    }
    if (!Number.isInteger(entry.score)) {
      throw new RangeError(
        `seed entry for (${entry.a}, ${entry.b}): score must be an integer (got ${entry.score})`,
      );
    }
    if (entry.score < MIN_RELATIONS_SCORE || entry.score > MAX_RELATIONS_SCORE) {
      throw new RangeError(
        `seed entry for (${entry.a}, ${entry.b}): score ${entry.score} out of range [${MIN_RELATIONS_SCORE}, ${MAX_RELATIONS_SCORE}]`,
      );
    }
    const key = canonicalPairKey(entry.a, entry.b);
    if (this._pairs.has(key)) {
      throw new Error(`seed entry for (${entry.a}, ${entry.b}): duplicate pair in entries array`);
    }
    const [lo, hi] = entry.a < entry.b ? [entry.a, entry.b] : [entry.b, entry.a];
    const pair: PairState = {
      a: lo,
      b: hi,
      score: entry.score,
      cooldowns: new Map(),
    };
    if (entry.cooldowns !== undefined) {
      if (entry.cooldowns === null || typeof entry.cooldowns !== 'object') {
        throw new TypeError(
          `seed entry for (${entry.a}, ${entry.b}): cooldowns must be a plain object`,
        );
      }
      for (const [rawAction, rawExpiry] of Object.entries(entry.cooldowns)) {
        if (!isDiplomacyAction(rawAction)) {
          throw new TypeError(
            `seed entry for (${entry.a}, ${entry.b}): unknown DiplomacyAction "${rawAction}"`,
          );
        }
        assertPositiveInteger(
          `seed entry for (${entry.a}, ${entry.b})`,
          `cooldowns["${rawAction}"]`,
          rawExpiry,
        );
        pair.cooldowns.set(rawAction, rawExpiry);
      }
    }
    this._pairs.set(key, pair);
  }
}

function pairToJSON(pair: PairState): RelationsEntryJSON {
  if (pair.cooldowns.size === 0) {
    return { a: pair.a, b: pair.b, score: pair.score };
  }
  const sortedActions = [...pair.cooldowns.keys()].sort();
  const cooldowns: { [action: string]: number } = {};
  for (const action of sortedActions) {
    cooldowns[action] = pair.cooldowns.get(action)!;
  }
  return { a: pair.a, b: pair.b, score: pair.score, cooldowns };
}

function assertDistinctPair(op: string, a: unknown, b: unknown): void {
  assertNonEmptyString(op, 'a', a);
  assertNonEmptyString(op, 'b', b);
  if (a === b) {
    throw new RangeError(`${op}: a and b must be distinct factions (got "${String(a)}")`);
  }
}

function assertDiplomacyAction(op: string, value: unknown): void {
  if (!isDiplomacyAction(value)) {
    throw new TypeError(`${op}: action is not a valid DiplomacyAction (got ${String(value)})`);
  }
}

function assertPositiveInteger(op: string, label: string, value: unknown): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new RangeError(`${op}: ${label} must be a positive integer (got ${String(value)})`);
  }
}

function assertNonEmptyString(op: string, label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: ${label} must be a non-empty string`);
  }
}
