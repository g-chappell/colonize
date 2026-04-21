import type { Coord } from '../map/map.js';

export const Visibility = {
  Unseen: 'unseen',
  Seen: 'seen',
  Visible: 'visible',
} as const;

export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const ALL_VISIBILITY_STATES: readonly Visibility[] = Object.values(Visibility);

export function isVisibility(value: unknown): value is Visibility {
  return typeof value === 'string' && (ALL_VISIBILITY_STATES as readonly string[]).includes(value);
}

export interface VisibilityJSON {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Visibility[];
}

export class FactionVisibility {
  readonly width: number;
  readonly height: number;
  private readonly cells: Visibility[];

  constructor(width: number, height: number) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError(
        `FactionVisibility dimensions must be positive integers (got ${width}x${height})`,
      );
    }
    this.width = width;
    this.height = height;
    this.cells = new Array<Visibility>(width * height).fill(Visibility.Unseen);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): Visibility {
    if (!this.inBounds(x, y)) {
      throw new RangeError(
        `coord (${x}, ${y}) out of bounds for ${this.width}x${this.height} visibility grid`,
      );
    }
    return this.cells[this.indexOf(x, y)]!;
  }

  /**
   * Demote every currently-visible cell to seen. Call once at turn start, then
   * re-apply `reveal` from each of the faction's units and colonies so that
   * `visible` reflects only what is in line-of-sight *this* turn.
   */
  demoteVisibleToSeen(): void {
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] === Visibility.Visible) this.cells[i] = Visibility.Seen;
    }
  }

  /**
   * Mark every in-bounds cell within Chebyshev distance `radius` of `origin`
   * as `visible`. Out-of-bounds cells and the origin itself-if-out-of-bounds
   * throw; out-of-bounds cells within the radius are silently clipped.
   */
  reveal(origin: Coord, radius: number): void {
    if (!Number.isInteger(radius) || radius < 0) {
      throw new RangeError(`reveal radius must be a non-negative integer (got ${radius})`);
    }
    if (!this.inBounds(origin.x, origin.y)) {
      throw new RangeError(
        `reveal origin (${origin.x}, ${origin.y}) out of bounds for ${this.width}x${this.height} visibility grid`,
      );
    }
    const x0 = Math.max(0, origin.x - radius);
    const x1 = Math.min(this.width - 1, origin.x + radius);
    const y0 = Math.max(0, origin.y - radius);
    const y1 = Math.min(this.height - 1, origin.y + radius);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.cells[this.indexOf(x, y)] = Visibility.Visible;
      }
    }
  }

  toJSON(): VisibilityJSON {
    return {
      width: this.width,
      height: this.height,
      cells: [...this.cells],
    };
  }

  static fromJSON(data: VisibilityJSON): FactionVisibility {
    if (
      !Number.isInteger(data.width) ||
      !Number.isInteger(data.height) ||
      data.width <= 0 ||
      data.height <= 0
    ) {
      throw new RangeError(
        `VisibilityJSON dimensions must be positive integers (got ${data.width}x${data.height})`,
      );
    }
    const expected = data.width * data.height;
    if (data.cells.length !== expected) {
      throw new RangeError(
        `VisibilityJSON cells length ${data.cells.length} does not match ${data.width}x${data.height} = ${expected}`,
      );
    }
    for (let i = 0; i < data.cells.length; i++) {
      if (!isVisibility(data.cells[i])) {
        throw new TypeError(
          `VisibilityJSON cells[${i}] is not a valid Visibility state: ${String(data.cells[i])}`,
        );
      }
    }
    const vis = new FactionVisibility(data.width, data.height);
    for (let i = 0; i < data.cells.length; i++) {
      vis.cells[i] = data.cells[i]!;
    }
    return vis;
  }

  private indexOf(x: number, y: number): number {
    return y * this.width + x;
  }
}
