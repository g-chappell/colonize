import { describe, it, expect } from 'vitest';
import {
  AutoRoute,
  AutoRouteStatus,
  ALL_AUTO_ROUTE_STATUSES,
  isAutoRouteStatus,
  type AutoRouteJSON,
} from './auto-route.js';

describe('AutoRouteStatus const-object', () => {
  it('exposes active + broken literals', () => {
    expect(AutoRouteStatus.Active).toBe('active');
    expect(AutoRouteStatus.Broken).toBe('broken');
  });

  it('ALL_AUTO_ROUTE_STATUSES enumerates both', () => {
    expect(ALL_AUTO_ROUTE_STATUSES).toEqual(['active', 'broken']);
  });

  it('isAutoRouteStatus narrows known kinds and rejects strangers', () => {
    expect(isAutoRouteStatus('active')).toBe(true);
    expect(isAutoRouteStatus('broken')).toBe(true);
    expect(isAutoRouteStatus('paused')).toBe(false);
    expect(isAutoRouteStatus(null)).toBe(false);
  });
});

describe('AutoRoute construction', () => {
  it('defaults to active status + stop 0', () => {
    const ar = new AutoRoute({ unitId: 'ship-1', routeId: 'route-a' });
    expect(ar.unitId).toBe('ship-1');
    expect(ar.routeId).toBe('route-a');
    expect(ar.currentStopIndex).toBe(0);
    expect(ar.status).toBe('active');
    expect(ar.isActive).toBe(true);
    expect(ar.isBroken).toBe(false);
    expect(ar.brokenReason).toBeNull();
  });

  it('accepts a mid-route starting index', () => {
    const ar = new AutoRoute({ unitId: 'ship-1', routeId: 'route-a', currentStopIndex: 2 });
    expect(ar.currentStopIndex).toBe(2);
  });

  it('accepts a broken initial state with a reason', () => {
    const ar = new AutoRoute({
      unitId: 'ship-1',
      routeId: 'route-a',
      status: AutoRouteStatus.Broken,
      brokenReason: 'colony destroyed',
    });
    expect(ar.isBroken).toBe(true);
    expect(ar.brokenReason).toBe('colony destroyed');
  });

  it('rejects broken status without a reason', () => {
    expect(
      () =>
        new AutoRoute({
          unitId: 'ship-1',
          routeId: 'route-a',
          status: AutoRouteStatus.Broken,
        }),
    ).toThrow(Error);
  });

  it('rejects active status with a reason', () => {
    expect(
      () =>
        new AutoRoute({
          unitId: 'ship-1',
          routeId: 'route-a',
          brokenReason: 'nope',
        }),
    ).toThrow(Error);
  });

  it.each([
    ['empty unit id', { unitId: '', routeId: 'r' }],
    ['empty route id', { unitId: 's', routeId: '' }],
  ])('rejects invalid ids (%s)', (_label, init) => {
    expect(() => new AutoRoute(init)).toThrow(TypeError);
  });

  it.each([
    ['negative index', -1],
    ['fractional index', 0.5],
  ])('rejects invalid currentStopIndex (%s)', (_label, currentStopIndex) => {
    expect(() => new AutoRoute({ unitId: 's', routeId: 'r', currentStopIndex })).toThrow(
      RangeError,
    );
  });
});

describe('AutoRoute mutations', () => {
  it('advanceTo updates current stop index', () => {
    const ar = new AutoRoute({ unitId: 's', routeId: 'r' });
    ar.advanceTo(1, 3);
    expect(ar.currentStopIndex).toBe(1);
    ar.advanceTo(0, 3);
    expect(ar.currentStopIndex).toBe(0);
  });

  it('advanceTo rejects out-of-range index', () => {
    const ar = new AutoRoute({ unitId: 's', routeId: 'r' });
    expect(() => ar.advanceTo(3, 3)).toThrow(RangeError);
    expect(() => ar.advanceTo(-1, 3)).toThrow(RangeError);
  });

  it('advanceTo rejects zero totalStops', () => {
    const ar = new AutoRoute({ unitId: 's', routeId: 'r' });
    expect(() => ar.advanceTo(0, 0)).toThrow(RangeError);
  });

  it('advanceTo throws when the route is broken', () => {
    const ar = new AutoRoute({ unitId: 's', routeId: 'r' });
    ar.markBroken('ship captured');
    expect(() => ar.advanceTo(1, 3)).toThrow(Error);
  });

  it('markBroken flips status + reason and is sticky', () => {
    const ar = new AutoRoute({ unitId: 's', routeId: 'r' });
    ar.markBroken('colony destroyed');
    expect(ar.status).toBe('broken');
    expect(ar.brokenReason).toBe('colony destroyed');
    expect(ar.isBroken).toBe(true);
    expect(ar.isActive).toBe(false);
  });

  it('markBroken rejects empty reason', () => {
    const ar = new AutoRoute({ unitId: 's', routeId: 'r' });
    expect(() => ar.markBroken('')).toThrow(TypeError);
  });
});

describe('AutoRoute.toJSON / fromJSON', () => {
  it('round-trips an active route', () => {
    const original = new AutoRoute({
      unitId: 'ship-1',
      routeId: 'route-a',
      currentStopIndex: 2,
    });
    const json = original.toJSON();
    expect(json).toEqual({
      unitId: 'ship-1',
      routeId: 'route-a',
      currentStopIndex: 2,
      status: 'active',
      brokenReason: null,
    });
    const revived = AutoRoute.fromJSON(json);
    expect(revived.toJSON()).toEqual(json);
  });

  it('round-trips a broken route', () => {
    const original = new AutoRoute({
      unitId: 'ship-1',
      routeId: 'route-a',
      status: AutoRouteStatus.Broken,
      brokenReason: 'ship captured',
    });
    const json = original.toJSON();
    const revived = AutoRoute.fromJSON(json);
    expect(revived.isBroken).toBe(true);
    expect(revived.brokenReason).toBe('ship captured');
  });

  it('toJSON is JSON.stringify-lossless', () => {
    const original = new AutoRoute({
      unitId: 'ship-1',
      routeId: 'route-a',
      currentStopIndex: 1,
    });
    const text = JSON.stringify(original.toJSON());
    const revived = AutoRoute.fromJSON(JSON.parse(text) as AutoRouteJSON);
    expect(revived.toJSON()).toEqual(original.toJSON());
  });

  it('fromJSON rejects a non-object payload', () => {
    expect(() => AutoRoute.fromJSON(null as unknown as AutoRouteJSON)).toThrow(TypeError);
  });
});
