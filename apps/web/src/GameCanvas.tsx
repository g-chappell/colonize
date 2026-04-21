import { useEffect, useRef } from 'react';

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

export function GameCanvas(): JSX.Element {
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!parentRef.current || !canMountPhaser()) return;

    let destroyed = false;
    let gameInstance: { destroy: (removeCanvas: boolean) => void } | null = null;

    void import('./game').then(({ createGame }) => {
      if (destroyed || !parentRef.current) return;
      gameInstance = createGame({ parent: parentRef.current });
    });

    return () => {
      destroyed = true;
      gameInstance?.destroy(true);
    };
  }, []);

  return <div ref={parentRef} className="game-canvas" data-testid="game-canvas" />;
}
