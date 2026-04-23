// TrainingOrder — a single in-progress "train crew X to profession Y" record.
//
// One order per trainee. The owner of the training-order collection (a
// colony, a global roster — neither has landed yet) iterates over its
// orders each turn and calls `tick()` to count down, then applies the
// result when `isComplete` flips true. Per CLAUDE.md "Ship the entity's
// primitive; leave iteration / scheduling to the task that owns the
// collection", this module publishes the primitive only; it does NOT
// wire a TurnManager hook and does NOT know which building produced
// the order. The scalar-seam module (`./training-building.ts`) owns the
// "which building trains which profession at what duration" tables; the
// orchestrator queries it, constructs a TrainingOrder with the chosen
// duration, and stores the order wherever its collection lives.
//
// Fields:
//   - `crewId` — opaque save-format identifier per CLAUDE.md "Opaque
//     string aliases bridge pre-registry save-format identifiers". The
//     Crew entity has not yet landed; the order references the trainee
//     by id and the Crew entity, when it arrives, is responsible for
//     binding that id to a profession mutation.
//   - `target` — the ProfessionType the trainee is becoming. Rejected
//     at construction if it equals `Deckhand` (the unspecialised
//     baseline — you don't "train to" Deckhand).
//   - `turnsRemaining` — non-negative integer. `tick()` decrements by
//     one; `isComplete` is true when the counter hits zero. `tick()`
//     throws when already complete to force the orchestrator to apply
//     the outcome before the next tick.
//
// `TrainingOrder.instant(crewId, target)` is the "captured crew learned
// from" 1-shot-conversion factory from the task description — it
// returns an order with `turnsRemaining: 0`, already-complete,
// ready for immediate application by the same pathway as a
// school-trained order.

import type { CrewId } from '../colony/colony.js';
import { ProfessionType, isProfessionType } from '../profession/profession-type.js';

export interface TrainingOrderJSON {
  readonly crewId: CrewId;
  readonly target: ProfessionType;
  readonly turnsRemaining: number;
}

export interface TrainingOrderInit {
  readonly crewId: CrewId;
  readonly target: ProfessionType;
  readonly turnsRemaining: number;
}

export class TrainingOrder {
  private readonly _crewId: CrewId;
  private readonly _target: ProfessionType;
  private _turnsRemaining: number;

  constructor(init: TrainingOrderInit) {
    if (init === null || typeof init !== 'object') {
      throw new TypeError('TrainingOrder init must be an object');
    }
    assertNonEmptyString('TrainingOrder', 'crewId', init.crewId);
    if (!isProfessionType(init.target)) {
      throw new TypeError(
        `TrainingOrder target must be a ProfessionType (got ${String(init.target)})`,
      );
    }
    if (init.target === ProfessionType.Deckhand) {
      throw new RangeError(
        'TrainingOrder target must not be Deckhand (the unspecialised baseline)',
      );
    }
    if (!Number.isInteger(init.turnsRemaining) || init.turnsRemaining < 0) {
      throw new RangeError(
        `TrainingOrder turnsRemaining must be a non-negative integer (got ${String(init.turnsRemaining)})`,
      );
    }
    this._crewId = init.crewId;
    this._target = init.target;
    this._turnsRemaining = init.turnsRemaining;
  }

  get crewId(): CrewId {
    return this._crewId;
  }

  get target(): ProfessionType {
    return this._target;
  }

  get turnsRemaining(): number {
    return this._turnsRemaining;
  }

  get isComplete(): boolean {
    return this._turnsRemaining === 0;
  }

  tick(): void {
    if (this._turnsRemaining === 0) {
      throw new Error(`TrainingOrder.tick: order for crew "${this._crewId}" is already complete`);
    }
    this._turnsRemaining -= 1;
  }

  static instant(crewId: CrewId, target: ProfessionType): TrainingOrder {
    return new TrainingOrder({ crewId, target, turnsRemaining: 0 });
  }

  toJSON(): TrainingOrderJSON {
    return {
      crewId: this._crewId,
      target: this._target,
      turnsRemaining: this._turnsRemaining,
    };
  }

  static fromJSON(data: TrainingOrderJSON): TrainingOrder {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('TrainingOrderJSON must be an object');
    }
    return new TrainingOrder({
      crewId: data.crewId,
      target: data.target,
      turnsRemaining: data.turnsRemaining,
    });
  }
}

function assertNonEmptyString(op: string, label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: ${label} must be a non-empty string`);
  }
}
