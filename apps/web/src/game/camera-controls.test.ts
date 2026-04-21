import { describe, it, expect } from 'vitest';

import {
  CAMERA_KEY_PAN_SPEED,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_WHEEL_ZOOM_FACTOR,
  applyPinchZoom,
  applyWheelZoom,
  clampZoom,
  keyPanDelta,
  pointerDistance,
} from './camera-controls';

describe('clampZoom', () => {
  it('passes through values within the allowed range', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2)).toBe(2);
  });

  it('snaps below-min to CAMERA_MIN_ZOOM', () => {
    expect(clampZoom(0.1)).toBe(CAMERA_MIN_ZOOM);
    expect(clampZoom(-5)).toBe(CAMERA_MIN_ZOOM);
  });

  it('snaps above-max to CAMERA_MAX_ZOOM', () => {
    expect(clampZoom(99)).toBe(CAMERA_MAX_ZOOM);
  });

  it('treats non-finite values as the minimum (defensive)', () => {
    expect(clampZoom(NaN)).toBe(CAMERA_MIN_ZOOM);
    expect(clampZoom(Infinity)).toBe(CAMERA_MAX_ZOOM);
  });

  it('keeps the min/max ordered with min < max', () => {
    expect(CAMERA_MIN_ZOOM).toBeLessThan(CAMERA_MAX_ZOOM);
  });
});

describe('applyWheelZoom', () => {
  it('zooms in on a negative wheel delta (DOM scroll-up convention)', () => {
    const next = applyWheelZoom(1, -100);
    expect(next).toBeGreaterThan(1);
  });

  it('zooms out on a positive wheel delta', () => {
    const next = applyWheelZoom(1, 100);
    expect(next).toBeLessThan(1);
  });

  it('clamps the resulting zoom', () => {
    expect(applyWheelZoom(CAMERA_MAX_ZOOM, -10000)).toBe(CAMERA_MAX_ZOOM);
    expect(applyWheelZoom(CAMERA_MIN_ZOOM, 10000)).toBe(CAMERA_MIN_ZOOM);
  });

  it('uses CAMERA_WHEEL_ZOOM_FACTOR by default', () => {
    expect(applyWheelZoom(1, 100)).toBe(clampZoom(1 - 100 * CAMERA_WHEEL_ZOOM_FACTOR));
  });

  it('honours an explicit factor override', () => {
    expect(applyWheelZoom(1, 100, 0.001)).toBe(clampZoom(1 - 100 * 0.001));
  });
});

describe('applyPinchZoom', () => {
  it('multiplies the zoom by the spread ratio', () => {
    expect(applyPinchZoom(1, 100, 200)).toBeCloseTo(2);
    expect(applyPinchZoom(1, 200, 100)).toBeCloseTo(0.5);
  });

  it('clamps the resulting zoom', () => {
    expect(applyPinchZoom(1, 100, 100000)).toBe(CAMERA_MAX_ZOOM);
    expect(applyPinchZoom(1, 100000, 1)).toBe(CAMERA_MIN_ZOOM);
  });

  it('returns the (clamped) start zoom on a degenerate distance', () => {
    expect(applyPinchZoom(1.5, 0, 200)).toBe(1.5);
    expect(applyPinchZoom(1.5, 200, 0)).toBe(1.5);
    expect(applyPinchZoom(99, 100, 100)).toBe(CAMERA_MAX_ZOOM);
  });
});

describe('keyPanDelta', () => {
  const noKeys = { up: false, down: false, left: false, right: false };

  it('returns zero motion when no keys are held', () => {
    expect(keyPanDelta(noKeys, 16, 1)).toEqual({ dx: 0, dy: 0 });
  });

  it('right key moves +x, left key moves -x', () => {
    expect(keyPanDelta({ ...noKeys, right: true }, 1000, 1).dx).toBe(CAMERA_KEY_PAN_SPEED);
    expect(keyPanDelta({ ...noKeys, left: true }, 1000, 1).dx).toBe(-CAMERA_KEY_PAN_SPEED);
  });

  it('down key moves +y, up key moves -y (screen convention)', () => {
    expect(keyPanDelta({ ...noKeys, down: true }, 1000, 1).dy).toBe(CAMERA_KEY_PAN_SPEED);
    expect(keyPanDelta({ ...noKeys, up: true }, 1000, 1).dy).toBe(-CAMERA_KEY_PAN_SPEED);
  });

  it('opposite keys cancel out', () => {
    expect(keyPanDelta({ up: true, down: true, left: true, right: true }, 100, 1)).toEqual({
      dx: 0,
      dy: 0,
    });
  });

  it('scales linearly with frame delta', () => {
    const a = keyPanDelta({ ...noKeys, right: true }, 16, 1);
    const b = keyPanDelta({ ...noKeys, right: true }, 32, 1);
    expect(b.dx).toBeCloseTo(a.dx * 2);
  });

  it('scales inversely with zoom so screen-space pan rate stays constant', () => {
    const z1 = keyPanDelta({ ...noKeys, right: true }, 16, 1).dx;
    const z2 = keyPanDelta({ ...noKeys, right: true }, 16, 2).dx;
    expect(z2).toBeCloseTo(z1 / 2);
  });

  it('clamps zoom inputs through clampZoom', () => {
    const undersize = keyPanDelta({ ...noKeys, right: true }, 16, 0.0001).dx;
    const atFloor = keyPanDelta({ ...noKeys, right: true }, 16, CAMERA_MIN_ZOOM).dx;
    expect(undersize).toBeCloseTo(atFloor);
  });
});

describe('pointerDistance', () => {
  it('returns the Euclidean distance between two points', () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('is symmetric', () => {
    const a = { x: 12, y: -7 };
    const b = { x: -3, y: 5 };
    expect(pointerDistance(a, b)).toBeCloseTo(pointerDistance(b, a));
  });

  it('returns zero when both pointers coincide', () => {
    expect(pointerDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });
});
