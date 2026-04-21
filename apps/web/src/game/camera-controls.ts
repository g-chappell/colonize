// Camera control math, kept Phaser-free so it is unit-testable under
// jsdom. GameScene wires these helpers to Phaser's input + camera APIs.

// Zoom range. Bottom anchor is "see most of a small map at once",
// top anchor is "comfortable inspection of a single tile cluster"
// without exposing seams of unrendered tiles.
export const CAMERA_MIN_ZOOM = 0.5;
export const CAMERA_MAX_ZOOM = 3;

// Pixels-per-second pan speed when an arrow key is held. Chosen so a
// full traversal of a 30-tile map (~960 world px at scale 2) takes
// ~2.4s at 1x zoom — fast enough to feel responsive, slow enough to
// land on a target tile without overshoot.
export const CAMERA_KEY_PAN_SPEED = 400;

// Multiplier applied to wheel deltaY before subtracting from zoom.
// Browsers report wheel deltas in wildly different units (lines,
// pixels, pages); 0.0015 lands a single mouse-wheel notch (~100 px on
// most browsers) at a ~0.15 zoom step, which matches one keyboard
// "comfortable" step.
export const CAMERA_WHEEL_ZOOM_FACTOR = 0.0015;

// Pinch-to-zoom: the zoom ratio is just the touch-distance ratio,
// applied multiplicatively against the previous zoom. This is the
// standard mobile gesture model and keeps the gesture origin stable
// in screen space.
export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) return CAMERA_MIN_ZOOM;
  if (zoom < CAMERA_MIN_ZOOM) return CAMERA_MIN_ZOOM;
  if (zoom > CAMERA_MAX_ZOOM) return CAMERA_MAX_ZOOM;
  return zoom;
}

// Wheel-up (negative deltaY in DOM convention) zooms in, wheel-down
// zooms out. The factor argument is mostly for tests; production uses
// CAMERA_WHEEL_ZOOM_FACTOR.
export function applyWheelZoom(
  currentZoom: number,
  deltaY: number,
  factor: number = CAMERA_WHEEL_ZOOM_FACTOR,
): number {
  return clampZoom(currentZoom - deltaY * factor);
}

// Pinch zoom: returns the new clamped zoom given the touch distance
// when the gesture started (or the previous frame) and the current
// touch distance. A larger spread = zoom in.
export function applyPinchZoom(
  startZoom: number,
  startDistance: number,
  currentDistance: number,
): number {
  if (startDistance <= 0 || currentDistance <= 0) return clampZoom(startZoom);
  const ratio = currentDistance / startDistance;
  return clampZoom(startZoom * ratio);
}

export interface PanKeysHeld {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

// World-space delta to apply to the camera scroll given which arrow
// keys are currently held and the frame delta in milliseconds. Speed
// is divided by zoom so the perceived screen-space pan rate stays
// constant as the player zooms in.
export function keyPanDelta(
  keys: PanKeysHeld,
  deltaMs: number,
  zoom: number,
  speed: number = CAMERA_KEY_PAN_SPEED,
): { dx: number; dy: number } {
  const z = clampZoom(zoom);
  const stepWorld = (speed * deltaMs) / 1000 / z;
  let dx = 0;
  let dy = 0;
  if (keys.left) dx -= stepWorld;
  if (keys.right) dx += stepWorld;
  if (keys.up) dy -= stepWorld;
  if (keys.down) dy += stepWorld;
  return { dx, dy };
}

// Euclidean screen-space distance between two pointer positions.
// Used to drive pinch zoom.
export function pointerDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
