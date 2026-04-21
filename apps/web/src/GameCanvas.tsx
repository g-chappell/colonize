import { useEffect, useRef } from 'react';
import { bus } from './bus';
import { SCENE_KEYS } from './game/asset-keys';

// Phaser's module init touches the canvas 2D context, which jsdom
// (used by vitest) does not implement. We import Phaser dynamically
// inside the effect so unit tests that render GameCanvas do not
// trigger Phaser's browser-only startup. `canMountPhaser` then guards
// against the jsdom canvas stub returning null.
function canMountPhaser(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  try {
    return typeof canvas.getContext === 'function' && canvas.getContext('2d') !== null;
  } catch {
    return false;
  }
}

type PhaserGame = {
  destroy: (removeCanvas: boolean) => void;
  scene: {
    pause: (key: string) => void;
    resume: (key: string) => void;
  };
};

export function GameCanvas(): JSX.Element {
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!parentRef.current || !canMountPhaser()) return;

    let destroyed = false;
    let gameInstance: PhaserGame | null = null;
    const busUnsubscribes: Array<() => void> = [];

    void import('./game').then(({ createGame }) => {
      if (destroyed || !parentRef.current) return;
      gameInstance = createGame({ parent: parentRef.current }) as PhaserGame;
      busUnsubscribes.push(
        bus.on('game:pause', () => gameInstance?.scene.pause(SCENE_KEYS.game)),
        bus.on('game:resume', () => gameInstance?.scene.resume(SCENE_KEYS.game)),
      );
    });

    return () => {
      destroyed = true;
      for (const unsub of busUnsubscribes) unsub();
      gameInstance?.destroy(true);
    };
  }, []);

  return <div ref={parentRef} className="game-canvas" data-testid="game-canvas" />;
}
