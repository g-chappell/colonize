import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bus, createBus } from './bus';

type TestEvents = {
  ping: { n: number };
  shout: string;
};

describe('createBus', () => {
  it('delivers payloads to subscribed handlers', () => {
    const b = createBus<TestEvents>();
    const handler = vi.fn();
    b.on('ping', handler);

    b.emit('ping', { n: 1 });
    b.emit('ping', { n: 2 });

    expect(handler).toHaveBeenNthCalledWith(1, { n: 1 });
    expect(handler).toHaveBeenNthCalledWith(2, { n: 2 });
  });

  it('supports multiple handlers on the same event', () => {
    const b = createBus<TestEvents>();
    const a = vi.fn();
    const z = vi.fn();
    b.on('shout', a);
    b.on('shout', z);

    b.emit('shout', 'avast');

    expect(a).toHaveBeenCalledWith('avast');
    expect(z).toHaveBeenCalledWith('avast');
  });

  it('isolates handlers across event names', () => {
    const b = createBus<TestEvents>();
    const pingHandler = vi.fn();
    const shoutHandler = vi.fn();
    b.on('ping', pingHandler);
    b.on('shout', shoutHandler);

    b.emit('ping', { n: 7 });

    expect(pingHandler).toHaveBeenCalledOnce();
    expect(shoutHandler).not.toHaveBeenCalled();
  });

  it('unsubscribes via the returned disposer', () => {
    const b = createBus<TestEvents>();
    const handler = vi.fn();
    const off = b.on('ping', handler);

    b.emit('ping', { n: 1 });
    off();
    b.emit('ping', { n: 2 });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('unsubscribes via off()', () => {
    const b = createBus<TestEvents>();
    const handler = vi.fn();
    b.on('ping', handler);

    b.off('ping', handler);
    b.emit('ping', { n: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('is a no-op to emit an event with no subscribers', () => {
    const b = createBus<TestEvents>();
    expect(() => b.emit('ping', { n: 1 })).not.toThrow();
  });

  it('lets a handler unsubscribe itself mid-emit without skipping siblings', () => {
    const b = createBus<TestEvents>();
    const sibling = vi.fn();
    const selfRemoving = vi.fn(() => {
      b.off('ping', selfRemoving);
    });
    b.on('ping', selfRemoving);
    b.on('ping', sibling);

    b.emit('ping', { n: 1 });

    expect(selfRemoving).toHaveBeenCalledOnce();
    expect(sibling).toHaveBeenCalledOnce();
  });

  it('clear() removes all handlers', () => {
    const b = createBus<TestEvents>();
    const handler = vi.fn();
    b.on('ping', handler);
    b.on('shout', handler);

    b.clear();
    b.emit('ping', { n: 1 });
    b.emit('shout', 'x');

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('bus singleton (GameEvents from @colonize/shared)', () => {
  beforeEach(() => {
    bus.clear();
  });

  it('dispatches turn:advanced payloads', () => {
    const handler = vi.fn();
    bus.on('turn:advanced', handler);

    bus.emit('turn:advanced', { turn: 3 });

    expect(handler).toHaveBeenCalledWith({ turn: 3 });
  });
});
