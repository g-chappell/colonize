import type { GameEvents } from '@colonize/shared';

export type EventHandler<T> = (payload: T) => void;

export interface Bus<Events extends object> {
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void;
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
  clear(): void;
}

export function createBus<Events extends object>(): Bus<Events> {
  const handlers = new Map<keyof Events, Set<EventHandler<unknown>>>();

  const remove = <K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void => {
    handlers.get(event)?.delete(handler as EventHandler<unknown>);
  };

  return {
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler as EventHandler<unknown>);
      return () => remove(event, handler);
    },
    off: remove,
    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      // Iterate a snapshot so handlers can safely unsubscribe mid-emit.
      for (const handler of [...set]) {
        (handler as EventHandler<Events[typeof event]>)(payload);
      }
    },
    clear() {
      handlers.clear();
    },
  };
}

export const bus: Bus<GameEvents> = createBus<GameEvents>();
