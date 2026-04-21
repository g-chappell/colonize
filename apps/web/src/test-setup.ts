import '@testing-library/jest-dom/vitest';

// jsdom logs a noisy "not implemented: HTMLCanvasElement.prototype.getContext"
// warning whenever code probes the canvas 2D context (our GameCanvas
// mount guard does this intentionally). Replace it with a quiet stub
// that returns null, which callers already handle.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return null;
  } as HTMLCanvasElement['getContext'];
}
