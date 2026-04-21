export const TurnPhase = {
  Start: 'start',
  PlayerAction: 'player-action',
  AI: 'ai',
  WorldEvents: 'world-events',
  End: 'end',
} as const;

export type TurnPhase = (typeof TurnPhase)[keyof typeof TurnPhase];

export const ALL_TURN_PHASES: readonly TurnPhase[] = Object.values(TurnPhase);

export function isTurnPhase(value: unknown): value is TurnPhase {
  return typeof value === 'string' && (ALL_TURN_PHASES as readonly string[]).includes(value);
}

const PHASE_SEQUENCE: readonly TurnPhase[] = [
  TurnPhase.Start,
  TurnPhase.PlayerAction,
  TurnPhase.AI,
  TurnPhase.WorldEvents,
  TurnPhase.End,
];

export type TurnHookEvent = 'enter' | 'exit';

export interface TurnHookContext {
  readonly turn: number;
  readonly phase: TurnPhase;
  readonly event: TurnHookEvent;
}

export type TurnHook = (context: TurnHookContext) => void;

export interface TurnStateJSON {
  readonly turn: number;
  readonly phase: TurnPhase;
}

export class TurnManager {
  private _turn: number;
  private _phase: TurnPhase;
  private readonly enterHooks: Map<TurnPhase, TurnHook[]> = new Map();
  private readonly exitHooks: Map<TurnPhase, TurnHook[]> = new Map();

  constructor(options: { turn?: number; phase?: TurnPhase } = {}) {
    const turn = options.turn ?? 1;
    const phase = options.phase ?? TurnPhase.Start;
    if (!Number.isInteger(turn) || turn < 1) {
      throw new RangeError(`TurnManager turn must be a positive integer (got ${turn})`);
    }
    if (!isTurnPhase(phase)) {
      throw new TypeError(`TurnManager phase is not a valid TurnPhase: ${String(phase)}`);
    }
    this._turn = turn;
    this._phase = phase;
  }

  get turn(): number {
    return this._turn;
  }

  get phase(): TurnPhase {
    return this._phase;
  }

  /**
   * Register a hook fired when `phase` is entered or exited. Returns an
   * unsubscribe callback. Multiple hooks on the same (phase, event) fire in
   * registration order — the order is stable so that a deterministic input
   * sequence produces a deterministic hook-invocation log.
   */
  on(phase: TurnPhase, event: TurnHookEvent, hook: TurnHook): () => void {
    if (!isTurnPhase(phase)) {
      throw new TypeError(`on: invalid phase: ${String(phase)}`);
    }
    if (event !== 'enter' && event !== 'exit') {
      throw new TypeError(`on: event must be 'enter' or 'exit' (got ${String(event)})`);
    }
    const bucket = event === 'enter' ? this.enterHooks : this.exitHooks;
    const list = bucket.get(phase) ?? [];
    list.push(hook);
    bucket.set(phase, list);
    return () => {
      const current = bucket.get(phase);
      if (!current) return;
      const idx = current.indexOf(hook);
      if (idx >= 0) current.splice(idx, 1);
    };
  }

  /**
   * Fire exit-hooks for the current phase, transition to the next phase, then
   * fire its enter-hooks. Wraps from End back to Start and increments `turn`.
   */
  advance(): void {
    const prev = this._phase;
    this.runHooks(this.exitHooks, prev, 'exit');
    const nextIndex = (PHASE_SEQUENCE.indexOf(prev) + 1) % PHASE_SEQUENCE.length;
    const next = PHASE_SEQUENCE[nextIndex]!;
    if (prev === TurnPhase.End) this._turn += 1;
    this._phase = next;
    this.runHooks(this.enterHooks, next, 'enter');
  }

  /**
   * Repeatedly {@link advance} until the manager is back at {@link TurnPhase.Start}
   * of the next turn. Convenience for tests and headless simulation.
   */
  advanceToNextTurn(): void {
    const target = this._turn + 1;
    let guard = PHASE_SEQUENCE.length + 1;
    while ((this._turn !== target || this._phase !== TurnPhase.Start) && guard-- > 0) {
      this.advance();
    }
  }

  toJSON(): TurnStateJSON {
    return { turn: this._turn, phase: this._phase };
  }

  static fromJSON(data: TurnStateJSON): TurnManager {
    if (!Number.isInteger(data.turn) || data.turn < 1) {
      throw new RangeError(`TurnStateJSON.turn must be a positive integer (got ${data.turn})`);
    }
    if (!isTurnPhase(data.phase)) {
      throw new TypeError(`TurnStateJSON.phase is not a valid TurnPhase: ${String(data.phase)}`);
    }
    return new TurnManager({ turn: data.turn, phase: data.phase });
  }

  private runHooks(
    bucket: Map<TurnPhase, TurnHook[]>,
    phase: TurnPhase,
    event: TurnHookEvent,
  ): void {
    const hooks = bucket.get(phase);
    if (!hooks || hooks.length === 0) return;
    const snapshot = [...hooks];
    const context: TurnHookContext = { turn: this._turn, phase, event };
    for (const hook of snapshot) hook(context);
  }
}
