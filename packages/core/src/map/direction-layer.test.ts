import { describe, it, expect } from 'vitest';
import { Direction } from './direction.js';
import { DirectionLayer } from './direction-layer.js';

describe('DirectionLayer — construction', () => {
  it('rejects non-positive dimensions', () => {
    expect(() => new DirectionLayer(0, 5)).toThrow(RangeError);
    expect(() => new DirectionLayer(5, 0)).toThrow(RangeError);
    expect(() => new DirectionLayer(-1, 5)).toThrow(RangeError);
    expect(() => new DirectionLayer(2.5, 5)).toThrow(RangeError);
  });

  it('starts empty with null for every cell', () => {
    const layer = new DirectionLayer(3, 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        expect(layer.get(x, y)).toBeNull();
      }
    }
    expect(layer.size).toBe(0);
  });
});

describe('DirectionLayer — get/set', () => {
  it('stores and reads back directions per cell', () => {
    const layer = new DirectionLayer(4, 3);
    layer.set(1, 1, Direction.E);
    layer.set(3, 2, Direction.SW);
    expect(layer.get(1, 1)).toBe(Direction.E);
    expect(layer.get(3, 2)).toBe(Direction.SW);
    expect(layer.get(0, 0)).toBeNull();
    expect(layer.size).toBe(2);
  });

  it('clears a cell when set to null', () => {
    const layer = new DirectionLayer(3, 3);
    layer.set(1, 1, Direction.N);
    expect(layer.get(1, 1)).toBe(Direction.N);
    layer.set(1, 1, null);
    expect(layer.get(1, 1)).toBeNull();
    expect(layer.size).toBe(0);
  });

  it('throws on out-of-bounds access', () => {
    const layer = new DirectionLayer(3, 3);
    expect(() => layer.get(-1, 0)).toThrow(RangeError);
    expect(() => layer.get(3, 0)).toThrow(RangeError);
    expect(() => layer.set(0, -1, Direction.N)).toThrow(RangeError);
  });
});

describe('DirectionLayer — JSON round-trip', () => {
  it('serialises only populated cells', () => {
    const layer = new DirectionLayer(3, 2);
    layer.set(0, 0, Direction.N);
    layer.set(2, 1, Direction.SE);
    const json = layer.toJSON();
    expect(json.width).toBe(3);
    expect(json.height).toBe(2);
    expect(json.entries).toHaveLength(2);
  });

  it('sorts entries row-major for deterministic output', () => {
    const layer = new DirectionLayer(4, 3);
    layer.set(3, 2, Direction.SE);
    layer.set(0, 0, Direction.N);
    layer.set(1, 1, Direction.E);
    const json = layer.toJSON();
    expect(json.entries.map((e) => `${e.y},${e.x}`)).toEqual(['0,0', '1,1', '2,3']);
  });

  it('survives a round-trip losslessly', () => {
    const layer = new DirectionLayer(5, 4);
    layer.set(1, 1, Direction.N);
    layer.set(3, 2, Direction.SW);
    layer.set(4, 3, Direction.E);
    const revived = DirectionLayer.fromJSON(layer.toJSON());
    expect(revived.toJSON()).toEqual(layer.toJSON());
    expect(revived.get(1, 1)).toBe(Direction.N);
    expect(revived.get(3, 2)).toBe(Direction.SW);
    expect(revived.get(4, 3)).toBe(Direction.E);
  });

  it('rejects invalid JSON dimensions', () => {
    expect(() => DirectionLayer.fromJSON({ width: 0, height: 5, entries: [] })).toThrow(RangeError);
    expect(() => DirectionLayer.fromJSON({ width: 5, height: -1, entries: [] })).toThrow(
      RangeError,
    );
  });

  it('rejects entries with unknown directions', () => {
    expect(() =>
      DirectionLayer.fromJSON({
        width: 3,
        height: 3,
        entries: [{ x: 0, y: 0, dir: 'north' as unknown as Direction }],
      }),
    ).toThrow(TypeError);
  });

  it('rejects entries outside the grid', () => {
    expect(() =>
      DirectionLayer.fromJSON({
        width: 3,
        height: 3,
        entries: [{ x: 5, y: 0, dir: Direction.N }],
      }),
    ).toThrow(RangeError);
  });
});
