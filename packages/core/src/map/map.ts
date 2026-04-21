import { TileType, isTileType } from './tile.js';

export interface Coord {
  readonly x: number;
  readonly y: number;
}

export interface MapJSON {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly TileType[];
}

const NEIGHBOUR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

export class GameMap {
  readonly width: number;
  readonly height: number;
  private readonly tiles: TileType[];

  constructor(width: number, height: number, fill: TileType = TileType.Ocean) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError(`GameMap dimensions must be positive integers (got ${width}x${height})`);
    }
    this.width = width;
    this.height = height;
    this.tiles = new Array<TileType>(width * height).fill(fill);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): TileType {
    if (!this.inBounds(x, y)) {
      throw new RangeError(`coord (${x}, ${y}) out of bounds for ${this.width}x${this.height} map`);
    }
    return this.tiles[this.indexOf(x, y)]!;
  }

  set(x: number, y: number, type: TileType): void {
    if (!this.inBounds(x, y)) {
      throw new RangeError(`coord (${x}, ${y}) out of bounds for ${this.width}x${this.height} map`);
    }
    this.tiles[this.indexOf(x, y)] = type;
  }

  neighbours(x: number, y: number): Coord[] {
    if (!this.inBounds(x, y)) {
      throw new RangeError(`coord (${x}, ${y}) out of bounds for ${this.width}x${this.height} map`);
    }
    const result: Coord[] = [];
    for (const [dx, dy] of NEIGHBOUR_OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.inBounds(nx, ny)) result.push({ x: nx, y: ny });
    }
    return result;
  }

  toJSON(): MapJSON {
    return {
      width: this.width,
      height: this.height,
      tiles: [...this.tiles],
    };
  }

  static fromJSON(data: MapJSON): GameMap {
    if (
      !Number.isInteger(data.width) ||
      !Number.isInteger(data.height) ||
      data.width <= 0 ||
      data.height <= 0
    ) {
      throw new RangeError(
        `MapJSON dimensions must be positive integers (got ${data.width}x${data.height})`,
      );
    }
    const expected = data.width * data.height;
    if (data.tiles.length !== expected) {
      throw new RangeError(
        `MapJSON tiles length ${data.tiles.length} does not match ${data.width}x${data.height} = ${expected}`,
      );
    }
    for (let i = 0; i < data.tiles.length; i++) {
      if (!isTileType(data.tiles[i])) {
        throw new TypeError(
          `MapJSON tiles[${i}] is not a valid TileType: ${String(data.tiles[i])}`,
        );
      }
    }
    const map = new GameMap(data.width, data.height);
    for (let i = 0; i < data.tiles.length; i++) {
      map.tiles[i] = data.tiles[i]!;
    }
    return map;
  }

  private indexOf(x: number, y: number): number {
    return y * this.width + x;
  }
}
