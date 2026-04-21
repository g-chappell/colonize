import { describe, it, expect } from 'vitest';
import {
  TurnManager,
  TurnPhase,
  ALL_TURN_PHASES,
  isTurnPhase,
  type TurnHookContext,
  type TurnStateJSON,
} from './turn.js';

describe('TurnPhase registry', () => {
  it('lists exactly the five phases in canonical order', () => {
    expect([...ALL_TURN_PHASES]).toEqual(['start', 'player-action', 'ai', 'world-events', 'end']);
  });

  it('isTurnPhase narrows strings', () => {
    expect(isTurnPhase('start')).toBe(true);
    expect(isTurnPhase('player-action')).toBe(true);
    expect(isTurnPhase('ai')).toBe(true);
    expect(isTurnPhase('world-events')).toBe(true);
    expect(isTurnPhase('end')).toBe(true);
    expect(isTurnPhase('final')).toBe(false);
    expect(isTurnPhase(0)).toBe(false);
    expect(isTurnPhase(undefined)).toBe(false);
  });
});

describe('TurnManager construction', () => {
  it('defaults to turn 1 / phase start', () => {
    const tm = new TurnManager();
    expect(tm.turn).toBe(1);
    expect(tm.phase).toBe(TurnPhase.Start);
  });

  it('accepts explicit turn + phase', () => {
    const tm = new TurnManager({ turn: 7, phase: TurnPhase.AI });
    expect(tm.turn).toBe(7);
    expect(tm.phase).toBe(TurnPhase.AI);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid turn (%s)', (bad) => {
    expect(() => new TurnManager({ turn: bad })).toThrow(RangeError);
  });

  it('rejects an unknown phase string', () => {
    expect(() => new TurnManager({ phase: 'final' as TurnPhase })).toThrow(TypeError);
  });
});

describe('TurnManager.advance', () => {
  it('cycles start → player-action → ai → world-events → end → start', () => {
    const tm = new TurnManager();
    expect(tm.phase).toBe(TurnPhase.Start);
    tm.advance();
    expect(tm.phase).toBe(TurnPhase.PlayerAction);
    tm.advance();
    expect(tm.phase).toBe(TurnPhase.AI);
    tm.advance();
    expect(tm.phase).toBe(TurnPhase.WorldEvents);
    tm.advance();
    expect(tm.phase).toBe(TurnPhase.End);
    tm.advance();
    expect(tm.phase).toBe(TurnPhase.Start);
  });

  it('increments the turn counter only on End → Start, not on any other transition', () => {
    const tm = new TurnManager();
    expect(tm.turn).toBe(1);
    tm.advance(); // start → player-action
    tm.advance(); // player-action → ai
    tm.advance(); // ai → world-events
    tm.advance(); // world-events → end
    expect(tm.turn).toBe(1);
    tm.advance(); // end → start
    expect(tm.turn).toBe(2);
  });

  it('advanceToNextTurn fast-forwards from any mid-turn phase back to Start', () => {
    const tm = new TurnManager({ turn: 4, phase: TurnPhase.AI });
    tm.advanceToNextTurn();
    expect(tm.turn).toBe(5);
    expect(tm.phase).toBe(TurnPhase.Start);
  });
});

describe('TurnManager hooks', () => {
  it('fires enter on phase entry and exit on phase exit', () => {
    const tm = new TurnManager();
    const events: string[] = [];
    tm.on(TurnPhase.Start, 'exit', (ctx) => events.push(`exit:${ctx.phase}:t${ctx.turn}`));
    tm.on(TurnPhase.PlayerAction, 'enter', (ctx) => events.push(`enter:${ctx.phase}:t${ctx.turn}`));
    tm.advance();
    expect(events).toEqual(['exit:start:t1', 'enter:player-action:t1']);
  });

  it('does not fire hooks for other phases', () => {
    const tm = new TurnManager();
    const calls: TurnHookContext[] = [];
    tm.on(TurnPhase.AI, 'enter', (ctx) => calls.push(ctx));
    tm.on(TurnPhase.AI, 'exit', (ctx) => calls.push(ctx));
    tm.advance(); // start → player-action (no AI fires)
    expect(calls).toHaveLength(0);
    tm.advance(); // player-action → ai (AI enters)
    tm.advance(); // ai → world-events (AI exits)
    expect(calls).toHaveLength(2);
    expect(calls[0]?.event).toBe('enter');
    expect(calls[1]?.event).toBe('exit');
  });

  it('fires multiple hooks on the same (phase, event) in registration order', () => {
    const tm = new TurnManager();
    const order: string[] = [];
    tm.on(TurnPhase.Start, 'exit', () => order.push('first'));
    tm.on(TurnPhase.Start, 'exit', () => order.push('second'));
    tm.on(TurnPhase.Start, 'exit', () => order.push('third'));
    tm.advance();
    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('reports the correct turn number inside End-phase exit hook (still old turn)', () => {
    const tm = new TurnManager();
    const seen: number[] = [];
    tm.on(TurnPhase.End, 'exit', (ctx) => seen.push(ctx.turn));
    tm.advance(); // start → player-action
    tm.advance(); // player-action → ai
    tm.advance(); // ai → world-events
    tm.advance(); // world-events → end
    tm.advance(); // end → start (turn increments AFTER exit hook)
    expect(seen).toEqual([1]);
    expect(tm.turn).toBe(2);
  });

  it('reports the new turn number inside Start-phase enter hook on wrap', () => {
    const tm = new TurnManager();
    const seen: number[] = [];
    tm.on(TurnPhase.Start, 'enter', (ctx) => seen.push(ctx.turn));
    // Explicitly cycle: End → Start crossing should fire with turn=2.
    tm.advanceToNextTurn();
    expect(seen).toEqual([2]);
  });

  it('unsubscribe removes the hook without affecting siblings', () => {
    const tm = new TurnManager();
    const order: string[] = [];
    tm.on(TurnPhase.Start, 'exit', () => order.push('keep'));
    const off = tm.on(TurnPhase.Start, 'exit', () => order.push('drop'));
    off();
    tm.advance();
    expect(order).toEqual(['keep']);
  });

  it('rejects unknown phase / event arguments', () => {
    const tm = new TurnManager();
    expect(() => tm.on('final' as TurnPhase, 'enter', () => undefined)).toThrow(TypeError);
    expect(() => tm.on(TurnPhase.Start, 'middle' as 'enter', () => undefined)).toThrow(TypeError);
  });

  it('is deterministic: two identical hook+advance sequences produce identical logs', () => {
    const run = (): string[] => {
      const tm = new TurnManager();
      const log: string[] = [];
      for (const p of ALL_TURN_PHASES) {
        tm.on(p, 'enter', (ctx) => log.push(`in:${ctx.phase}:t${ctx.turn}`));
        tm.on(p, 'exit', (ctx) => log.push(`out:${ctx.phase}:t${ctx.turn}`));
      }
      for (let i = 0; i < 12; i++) tm.advance();
      return log;
    };
    expect(run()).toEqual(run());
  });
});

describe('TurnManager.toJSON / fromJSON', () => {
  it('round-trips turn + phase', () => {
    const tm = new TurnManager({ turn: 3, phase: TurnPhase.WorldEvents });
    const json = tm.toJSON();
    expect(json).toEqual({ turn: 3, phase: 'world-events' });

    const revived = TurnManager.fromJSON(json);
    expect(revived.turn).toBe(3);
    expect(revived.phase).toBe(TurnPhase.WorldEvents);
  });

  it('toJSON output is JSON-serialisable and lossless', () => {
    const tm = new TurnManager({ turn: 9, phase: TurnPhase.AI });
    const text = JSON.stringify(tm.toJSON());
    const revived = TurnManager.fromJSON(JSON.parse(text) as TurnStateJSON);
    expect(revived.turn).toBe(9);
    expect(revived.phase).toBe(TurnPhase.AI);
  });

  it('fromJSON rejects invalid turn', () => {
    expect(() => TurnManager.fromJSON({ turn: 0, phase: TurnPhase.Start })).toThrow(RangeError);
    expect(() => TurnManager.fromJSON({ turn: 1.5, phase: TurnPhase.Start })).toThrow(RangeError);
  });

  it('fromJSON rejects invalid phase', () => {
    expect(() => TurnManager.fromJSON({ turn: 1, phase: 'final' as TurnPhase })).toThrow(TypeError);
  });

  it('revived manager is independent of source (hooks do not cross over)', () => {
    const a = new TurnManager();
    const events: string[] = [];
    a.on(TurnPhase.Start, 'exit', () => events.push('a'));
    const b = TurnManager.fromJSON(a.toJSON());
    b.advance(); // should NOT fire a's hook
    expect(events).toEqual([]);
    a.advance();
    expect(events).toEqual(['a']);
  });
});
