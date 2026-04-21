import { describe, it, expect } from 'vitest';
import {
  FactionVisibility,
  Visibility,
  ALL_VISIBILITY_STATES,
  isVisibility,
  type VisibilityJSON,
} from './visibility.js';

describe('Visibility type registry', () => {
  it('lists exactly unseen / seen / visible', () => {
    expect(new Set(ALL_VISIBILITY_STATES)).toEqual(new Set(['unseen', 'seen', 'visible']));
  });

  it('isVisibility narrows strings', () => {
    expect(isVisibility('unseen')).toBe(true);
    expect(isVisibility('seen')).toBe(true);
    expect(isVisibility('visible')).toBe(true);
    expect(isVisibility('sighted')).toBe(false);
    expect(isVisibility(0)).toBe(false);
    expect(isVisibility(undefined)).toBe(false);
  });
});

describe('FactionVisibility construction', () => {
  it('fills every cell with Unseen by default', () => {
    const vis = new FactionVisibility(3, 2);
    expect(vis.width).toBe(3);
    expect(vis.height).toBe(2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        expect(vis.get(x, y)).toBe(Visibility.Unseen);
      }
    }
  });

  it.each([
    [0, 1],
    [1, 0],
    [-1, 1],
    [1, -1],
    [1.5, 1],
  ])('rejects invalid dimensions (%i x %i)', (w, h) => {
    expect(() => new FactionVisibility(w, h)).toThrow(RangeError);
  });
});

describe('FactionVisibility.get / inBounds', () => {
  it('inBounds reports cells inside and outside', () => {
    const vis = new FactionVisibility(4, 3);
    expect(vis.inBounds(0, 0)).toBe(true);
    expect(vis.inBounds(3, 2)).toBe(true);
    expect(vis.inBounds(4, 0)).toBe(false);
    expect(vis.inBounds(0, 3)).toBe(false);
    expect(vis.inBounds(-1, 0)).toBe(false);
  });

  it('rejects out-of-bounds reads', () => {
    const vis = new FactionVisibility(2, 2);
    expect(() => vis.get(2, 0)).toThrow(RangeError);
    expect(() => vis.get(0, -1)).toThrow(RangeError);
  });
});

describe('FactionVisibility.reveal', () => {
  it('radius 0 marks only the origin visible', () => {
    const vis = new FactionVisibility(3, 3);
    vis.reveal({ x: 1, y: 1 }, 0);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(vis.get(x, y)).toBe(x === 1 && y === 1 ? Visibility.Visible : Visibility.Unseen);
      }
    }
  });

  it('radius 1 marks a 3x3 Chebyshev square', () => {
    const vis = new FactionVisibility(5, 5);
    vis.reveal({ x: 2, y: 2 }, 1);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const inRange = Math.max(Math.abs(x - 2), Math.abs(y - 2)) <= 1;
        expect(vis.get(x, y)).toBe(inRange ? Visibility.Visible : Visibility.Unseen);
      }
    }
  });

  it('clips reveal at map edges without error', () => {
    const vis = new FactionVisibility(3, 3);
    vis.reveal({ x: 0, y: 0 }, 5);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(vis.get(x, y)).toBe(Visibility.Visible);
      }
    }
  });

  it('rejects origin out of bounds', () => {
    const vis = new FactionVisibility(3, 3);
    expect(() => vis.reveal({ x: 3, y: 0 }, 1)).toThrow(RangeError);
    expect(() => vis.reveal({ x: 0, y: -1 }, 1)).toThrow(RangeError);
  });

  it.each([-1, 1.5, Number.NaN])('rejects invalid radius (%s)', (r) => {
    const vis = new FactionVisibility(3, 3);
    expect(() => vis.reveal({ x: 1, y: 1 }, r)).toThrow(RangeError);
  });

  it('overlapping reveals leave cells visible (not overwritten to unseen)', () => {
    const vis = new FactionVisibility(5, 5);
    vis.reveal({ x: 1, y: 1 }, 1);
    vis.reveal({ x: 3, y: 3 }, 1);
    expect(vis.get(2, 2)).toBe(Visibility.Visible);
    expect(vis.get(1, 1)).toBe(Visibility.Visible);
    expect(vis.get(3, 3)).toBe(Visibility.Visible);
    expect(vis.get(0, 4)).toBe(Visibility.Unseen);
  });
});

describe('FactionVisibility.demoteVisibleToSeen', () => {
  it('demotes only Visible cells to Seen', () => {
    const vis = new FactionVisibility(3, 3);
    vis.reveal({ x: 1, y: 1 }, 0);
    expect(vis.get(1, 1)).toBe(Visibility.Visible);
    expect(vis.get(0, 0)).toBe(Visibility.Unseen);

    vis.demoteVisibleToSeen();
    expect(vis.get(1, 1)).toBe(Visibility.Seen);
    expect(vis.get(0, 0)).toBe(Visibility.Unseen);
  });

  it('is idempotent when no cells are visible', () => {
    const vis = new FactionVisibility(2, 2);
    vis.demoteVisibleToSeen();
    vis.demoteVisibleToSeen();
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        expect(vis.get(x, y)).toBe(Visibility.Unseen);
      }
    }
  });

  it('turn loop: reveal → demote → re-reveal promotes Seen back to Visible', () => {
    const vis = new FactionVisibility(5, 1);
    vis.reveal({ x: 0, y: 0 }, 1);
    expect(vis.get(0, 0)).toBe(Visibility.Visible);
    expect(vis.get(1, 0)).toBe(Visibility.Visible);
    expect(vis.get(2, 0)).toBe(Visibility.Unseen);

    // End of turn: LoS collapses to Seen snapshot.
    vis.demoteVisibleToSeen();
    expect(vis.get(0, 0)).toBe(Visibility.Seen);
    expect(vis.get(1, 0)).toBe(Visibility.Seen);

    // Next turn: unit moved one east; re-reveal re-promotes some cells and
    // opens a new one, while the left-most cell stays Seen (last observed).
    vis.reveal({ x: 2, y: 0 }, 1);
    expect(vis.get(0, 0)).toBe(Visibility.Seen);
    expect(vis.get(1, 0)).toBe(Visibility.Visible);
    expect(vis.get(2, 0)).toBe(Visibility.Visible);
    expect(vis.get(3, 0)).toBe(Visibility.Visible);
    expect(vis.get(4, 0)).toBe(Visibility.Unseen);
  });
});

describe('FactionVisibility.toJSON / fromJSON', () => {
  it('round-trips a mixed-state grid', () => {
    const vis = new FactionVisibility(3, 2);
    vis.reveal({ x: 0, y: 0 }, 0); // Visible at (0,0)
    vis.reveal({ x: 2, y: 1 }, 0); // Visible at (2,1)
    vis.demoteVisibleToSeen(); // both → Seen
    vis.reveal({ x: 1, y: 0 }, 0); // Visible at (1,0)

    const json = vis.toJSON();
    const revived = FactionVisibility.fromJSON(json);

    expect(revived.width).toBe(3);
    expect(revived.height).toBe(2);
    expect(revived.get(0, 0)).toBe(Visibility.Seen);
    expect(revived.get(1, 0)).toBe(Visibility.Visible);
    expect(revived.get(2, 0)).toBe(Visibility.Unseen);
    expect(revived.get(0, 1)).toBe(Visibility.Unseen);
    expect(revived.get(1, 1)).toBe(Visibility.Unseen);
    expect(revived.get(2, 1)).toBe(Visibility.Seen);
  });

  it('toJSON output is JSON-serialisable and lossless', () => {
    const vis = new FactionVisibility(2, 2);
    vis.reveal({ x: 1, y: 1 }, 0);
    const text = JSON.stringify(vis.toJSON());
    const revived = FactionVisibility.fromJSON(JSON.parse(text) as VisibilityJSON);
    expect(revived.get(1, 1)).toBe(Visibility.Visible);
    expect(revived.get(0, 0)).toBe(Visibility.Unseen);
  });

  it('toJSON returns a defensive copy', () => {
    const vis = new FactionVisibility(2, 2);
    const json = vis.toJSON();
    (json.cells as Visibility[])[0] = Visibility.Visible;
    expect(vis.get(0, 0)).toBe(Visibility.Unseen);
  });

  it('fromJSON rejects mismatched cell-array length', () => {
    expect(() =>
      FactionVisibility.fromJSON({
        width: 2,
        height: 2,
        cells: [Visibility.Unseen, Visibility.Unseen, Visibility.Unseen],
      }),
    ).toThrow(RangeError);
  });

  it('fromJSON rejects unknown cell values', () => {
    expect(() =>
      FactionVisibility.fromJSON({
        width: 1,
        height: 1,
        cells: ['sighted' as Visibility],
      }),
    ).toThrow(TypeError);
  });

  it('fromJSON rejects non-positive dimensions', () => {
    expect(() => FactionVisibility.fromJSON({ width: 0, height: 1, cells: [] })).toThrow(
      RangeError,
    );
  });
});
