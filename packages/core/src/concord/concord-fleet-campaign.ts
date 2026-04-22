// ConcordFleetCampaign — the endgame state slice spun up when a faction
// declares Sovereignty (see `sovereignty-trigger.ts`). Tracks how long
// the campaign has been running, which of its pre-scheduled waves have
// already spawned, and whether the survive-T-turns win condition has
// been met.
//
// Scope:
//   - Wave schedule is fixed at construction time (the difficulty
//     registry in packages/content supplies the schedule). Each wave
//     names the ship classes + ground troops to spawn and the
//     campaign-relative turn at which they become due.
//   - `tick()` advances the internal campaign-turn counter. The
//     orchestrator calls this once per in-game turn while Sovereignty
//     is active; the primitive stays agnostic about which TurnPhase
//     hook owns the call.
//   - `pendingWaves()` returns every scheduled wave whose spawnTurn
//     has been reached and which has not yet been marked spawned. The
//     orchestrator walks this list, spawns the actual units at
//     map-edge coordinates (not a primitive concern), and calls
//     `markWaveSpawned(index)` to dequeue the entry.
//   - `outcome()` reports 'in-progress' | 'victory'. Victory fires
//     when `turnsElapsed >= turnsRequired` — the "survive T turns"
//     condition named in TASK-070. Defeat (every colony lost, faction
//     wiped) is the orchestrator's call, not this primitive's.
//
// Ship + ground ids are opaque strings (ShipUnitId / GroundUnitId
// aliases) because the content-side registry lives across the
// dependency boundary that `packages/core` cannot cross. Untrusted
// JSON input is validated at the primitive boundary — non-empty
// string, known wave index for spawned set, non-negative integers for
// turn counters. See CLAUDE.md:
//   - "Opaque string aliases bridge pre-registry save-format identifiers"
//   - "Map/Set-backed save-format emitters sort entries in toJSON for
//     byte-parity determinism"
//   - "Ship the entity's primitive; leave iteration / scheduling to
//     the task that owns the collection"

export type ConcordDifficultyId = string;
export type ConcordFleetShipUnitId = string;
export type ConcordFleetGroundUnitId = string;

export interface ConcordFleetWave {
  // Campaign-relative turn at which the wave is due. `tick()` ticks
  // the campaign counter once per in-game turn; a wave with spawnTurn
  // N becomes pending on the tick that lands turnsElapsed at N.
  readonly spawnTurn: number;
  // Opaque ship class ids (content supplies ShipClassId values). Empty
  // arrays are allowed — a ground-only landing wave may skip ships.
  readonly ships: readonly ConcordFleetShipUnitId[];
  // Opaque ground class ids (content supplies GroundClassId values).
  // Empty arrays are allowed — a sea-only blockade wave may skip
  // ground troops.
  readonly groundTroops: readonly ConcordFleetGroundUnitId[];
}

export interface ConcordFleetCampaignJSON {
  readonly difficulty: ConcordDifficultyId;
  readonly turnsRequired: number;
  readonly turnsElapsed: number;
  readonly waves: readonly ConcordFleetWave[];
  readonly spawnedWaveIndices: readonly number[];
}

export interface ConcordFleetCampaignInit {
  readonly difficulty: ConcordDifficultyId;
  readonly turnsRequired: number;
  readonly turnsElapsed?: number;
  readonly waves: readonly ConcordFleetWave[];
  readonly spawnedWaveIndices?: readonly number[];
}

export type ConcordCampaignOutcome = 'in-progress' | 'victory';

export interface ConcordFleetPendingWave {
  readonly index: number;
  readonly wave: ConcordFleetWave;
}

export class ConcordFleetCampaign {
  private readonly _difficulty: ConcordDifficultyId;
  private readonly _turnsRequired: number;
  private _turnsElapsed: number;
  private readonly _waves: readonly ConcordFleetWave[];
  private readonly _spawnedWaveIndices: Set<number>;

  constructor(init: ConcordFleetCampaignInit) {
    if (init === null || typeof init !== 'object') {
      throw new TypeError('ConcordFleetCampaign init must be an object');
    }
    assertNonEmptyString('ConcordFleetCampaign', 'difficulty', init.difficulty);
    assertNonNegativeInteger('ConcordFleetCampaign', 'turnsRequired', init.turnsRequired);
    if (init.turnsRequired === 0) {
      throw new RangeError('ConcordFleetCampaign turnsRequired must be at least 1');
    }
    const turnsElapsed = init.turnsElapsed ?? 0;
    assertNonNegativeInteger('ConcordFleetCampaign', 'turnsElapsed', turnsElapsed);
    if (!Array.isArray(init.waves)) {
      throw new TypeError('ConcordFleetCampaign init.waves must be an array');
    }
    if (init.waves.length === 0) {
      throw new RangeError('ConcordFleetCampaign init.waves must be non-empty');
    }
    const validatedWaves: ConcordFleetWave[] = [];
    let prevTurn = -Infinity;
    for (let i = 0; i < init.waves.length; i++) {
      const wave = init.waves[i]!;
      if (wave === null || typeof wave !== 'object') {
        throw new TypeError(`ConcordFleetCampaign wave[${i}] must be an object`);
      }
      assertNonNegativeInteger(`ConcordFleetCampaign wave[${i}]`, 'spawnTurn', wave.spawnTurn);
      if (wave.spawnTurn < prevTurn) {
        throw new RangeError(
          `ConcordFleetCampaign wave[${i}].spawnTurn (${wave.spawnTurn}) must be >= previous wave spawnTurn (${prevTurn})`,
        );
      }
      prevTurn = wave.spawnTurn;
      if (!Array.isArray(wave.ships)) {
        throw new TypeError(`ConcordFleetCampaign wave[${i}].ships must be an array`);
      }
      if (!Array.isArray(wave.groundTroops)) {
        throw new TypeError(`ConcordFleetCampaign wave[${i}].groundTroops must be an array`);
      }
      const ships: ConcordFleetShipUnitId[] = [];
      for (let j = 0; j < wave.ships.length; j++) {
        const id = wave.ships[j]!;
        assertNonEmptyString(`ConcordFleetCampaign wave[${i}]`, `ships[${j}]`, id);
        ships.push(id);
      }
      const groundTroops: ConcordFleetGroundUnitId[] = [];
      for (let j = 0; j < wave.groundTroops.length; j++) {
        const id = wave.groundTroops[j]!;
        assertNonEmptyString(`ConcordFleetCampaign wave[${i}]`, `groundTroops[${j}]`, id);
        groundTroops.push(id);
      }
      if (ships.length === 0 && groundTroops.length === 0) {
        throw new RangeError(
          `ConcordFleetCampaign wave[${i}] must spawn at least one ship or ground unit`,
        );
      }
      validatedWaves.push({ spawnTurn: wave.spawnTurn, ships, groundTroops });
    }
    this._difficulty = init.difficulty;
    this._turnsRequired = init.turnsRequired;
    this._turnsElapsed = turnsElapsed;
    this._waves = validatedWaves;
    this._spawnedWaveIndices = new Set();
    if (init.spawnedWaveIndices !== undefined) {
      if (!Array.isArray(init.spawnedWaveIndices)) {
        throw new TypeError('ConcordFleetCampaign init.spawnedWaveIndices must be an array');
      }
      for (const idx of init.spawnedWaveIndices) {
        if (!Number.isFinite(idx) || !Number.isInteger(idx) || idx < 0) {
          throw new RangeError(
            `ConcordFleetCampaign spawnedWaveIndices entry must be a non-negative integer (got ${idx})`,
          );
        }
        if (idx >= validatedWaves.length) {
          throw new RangeError(
            `ConcordFleetCampaign spawnedWaveIndices entry ${idx} is out of range (waves length ${validatedWaves.length})`,
          );
        }
        this._spawnedWaveIndices.add(idx);
      }
    }
  }

  get difficulty(): ConcordDifficultyId {
    return this._difficulty;
  }

  get turnsRequired(): number {
    return this._turnsRequired;
  }

  get turnsElapsed(): number {
    return this._turnsElapsed;
  }

  get waves(): readonly ConcordFleetWave[] {
    return this._waves.map((w) => ({
      spawnTurn: w.spawnTurn,
      ships: [...w.ships],
      groundTroops: [...w.groundTroops],
    }));
  }

  // Sorted ascending for determinism — matches the save-format contract.
  get spawnedWaveIndices(): readonly number[] {
    return [...this._spawnedWaveIndices].sort((a, b) => a - b);
  }

  // Advance the campaign-turn counter. Called once per in-game turn
  // while Sovereignty is active; the orchestrator decides the hook
  // (typically the TurnPhase.End / TurnPhase.WorldEvents boundary).
  tick(): void {
    this._turnsElapsed += 1;
  }

  // Waves whose spawnTurn has been reached and which have not yet
  // been marked spawned. Returned in ascending wave-index order so
  // the orchestrator can iterate deterministically.
  pendingWaves(): readonly ConcordFleetPendingWave[] {
    const pending: ConcordFleetPendingWave[] = [];
    for (let i = 0; i < this._waves.length; i++) {
      if (this._spawnedWaveIndices.has(i)) continue;
      const wave = this._waves[i]!;
      if (wave.spawnTurn > this._turnsElapsed) continue;
      pending.push({
        index: i,
        wave: {
          spawnTurn: wave.spawnTurn,
          ships: [...wave.ships],
          groundTroops: [...wave.groundTroops],
        },
      });
    }
    return pending;
  }

  hasSpawnedWave(index: number): boolean {
    return this._spawnedWaveIndices.has(index);
  }

  // Mark a wave as spawned. Idempotent — re-marking is a no-op, which
  // keeps the orchestrator safe to re-run the spawn pass in the face
  // of crash recovery or mid-tick re-entry.
  markWaveSpawned(index: number): void {
    if (!Number.isFinite(index) || !Number.isInteger(index) || index < 0) {
      throw new RangeError(
        `ConcordFleetCampaign.markWaveSpawned: index must be a non-negative integer (got ${index})`,
      );
    }
    if (index >= this._waves.length) {
      throw new RangeError(
        `ConcordFleetCampaign.markWaveSpawned: index ${index} is out of range (waves length ${this._waves.length})`,
      );
    }
    this._spawnedWaveIndices.add(index);
  }

  outcome(): ConcordCampaignOutcome {
    return this._turnsElapsed >= this._turnsRequired ? 'victory' : 'in-progress';
  }

  isVictorious(): boolean {
    return this.outcome() === 'victory';
  }

  toJSON(): ConcordFleetCampaignJSON {
    return {
      difficulty: this._difficulty,
      turnsRequired: this._turnsRequired,
      turnsElapsed: this._turnsElapsed,
      waves: this._waves.map((w) => ({
        spawnTurn: w.spawnTurn,
        ships: [...w.ships],
        groundTroops: [...w.groundTroops],
      })),
      spawnedWaveIndices: [...this._spawnedWaveIndices].sort((a, b) => a - b),
    };
  }

  static fromJSON(data: ConcordFleetCampaignJSON): ConcordFleetCampaign {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('ConcordFleetCampaignJSON must be an object');
    }
    if (!Array.isArray(data.waves)) {
      throw new TypeError('ConcordFleetCampaignJSON.waves must be an array');
    }
    if (!Array.isArray(data.spawnedWaveIndices)) {
      throw new TypeError('ConcordFleetCampaignJSON.spawnedWaveIndices must be an array');
    }
    return new ConcordFleetCampaign({
      difficulty: data.difficulty,
      turnsRequired: data.turnsRequired,
      turnsElapsed: data.turnsElapsed,
      waves: data.waves,
      spawnedWaveIndices: data.spawnedWaveIndices,
    });
  }
}

function assertNonEmptyString(op: string, label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: ${label} must be a non-empty string (got ${String(value)})`);
  }
}

function assertNonNegativeInteger(
  op: string,
  label: string,
  value: unknown,
): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new RangeError(`${op}: ${label} must be a non-negative integer (got ${String(value)})`);
  }
}
