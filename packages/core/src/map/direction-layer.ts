import { isDirection, type Direction } from './direction.js';

export interface DirectionLayerEntryJSON {
  readonly x: number;
  readonly y: number;
  readonly dir: Direction;
}

export interface DirectionLayerJSON {
  readonly width: number;
  readonly height: number;
  readonly entries: readonly DirectionLayerEntryJSON[];
}

export class DirectionLayer {
  readonly width: number;
  readonly height: number;
  private readonly cells: Map<number, Direction>;

  constructor(width: number, height: number) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError(
        `DirectionLayer dimensions must be positive integers (got ${width}x${height})`,
      );
    }
    this.width = width;
    this.height = height;
    this.cells = new Map();
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): Direction | null {
    if (!this.inBounds(x, y)) {
      throw new RangeError(
        `coord (${x}, ${y}) out of bounds for ${this.width}x${this.height} DirectionLayer`,
      );
    }
    return this.cells.get(this.indexOf(x, y)) ?? null;
  }

  set(x: number, y: number, dir: Direction | null): void {
    if (!this.inBounds(x, y)) {
      throw new RangeError(
        `coord (${x}, ${y}) out of bounds for ${this.width}x${this.height} DirectionLayer`,
      );
    }
    const idx = this.indexOf(x, y);
    if (dir === null) this.cells.delete(idx);
    else this.cells.set(idx, dir);
  }

  get size(): number {
    return this.cells.size;
  }

  toJSON(): DirectionLayerJSON {
    const entries: DirectionLayerEntryJSON[] = [];
    for (const [idx, dir] of this.cells) {
      entries.push({ x: idx % this.width, y: Math.floor(idx / this.width), dir });
    }
    entries.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
    return { width: this.width, height: this.height, entries };
  }

  static fromJSON(data: DirectionLayerJSON): DirectionLayer {
    if (
      !Number.isInteger(data.width) ||
      !Number.isInteger(data.height) ||
      data.width <= 0 ||
      data.height <= 0
    ) {
      throw new RangeError(
        `DirectionLayerJSON dimensions must be positive integers (got ${data.width}x${data.height})`,
      );
    }
    const layer = new DirectionLayer(data.width, data.height);
    for (let i = 0; i < data.entries.length; i++) {
      const entry = data.entries[i]!;
      if (!layer.inBounds(entry.x, entry.y)) {
        throw new RangeError(
          `DirectionLayerJSON entries[${i}] (${entry.x}, ${entry.y}) out of bounds`,
        );
      }
      if (!isDirection(entry.dir)) {
        throw new TypeError(
          `DirectionLayerJSON entries[${i}] has invalid direction: ${String(entry.dir)}`,
        );
      }
      layer.set(entry.x, entry.y, entry.dir);
    }
    return layer;
  }

  private indexOf(x: number, y: number): number {
    return y * this.width + x;
  }
}
