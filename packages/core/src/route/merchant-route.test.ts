import { describe, it, expect } from 'vitest';
import {
  MerchantRoute,
  MerchantRouteActionKind,
  ALL_MERCHANT_ROUTE_ACTION_KINDS,
  isMerchantRouteActionKind,
  type MerchantRouteJSON,
  type MerchantRouteStop,
} from './merchant-route.js';

const otkRoute = (): MerchantRouteStop[] => [
  {
    colonyId: 'coral-bight',
    actions: [
      { kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty: 4 },
      { kind: MerchantRouteActionKind.Load, resourceId: 'provisions', qty: 2 },
    ],
  },
  {
    colonyId: 'salt-wharf',
    actions: [{ kind: MerchantRouteActionKind.Unload, resourceId: 'timber', qty: 4 }],
  },
];

describe('MerchantRouteActionKind const-object', () => {
  it('exposes load + unload literals with stable kebab-case values', () => {
    expect(MerchantRouteActionKind.Load).toBe('load');
    expect(MerchantRouteActionKind.Unload).toBe('unload');
  });

  it('ALL_MERCHANT_ROUTE_ACTION_KINDS enumerates both', () => {
    expect(ALL_MERCHANT_ROUTE_ACTION_KINDS).toEqual(['load', 'unload']);
  });

  it('isMerchantRouteActionKind narrows known kinds and rejects strangers', () => {
    expect(isMerchantRouteActionKind('load')).toBe(true);
    expect(isMerchantRouteActionKind('unload')).toBe(true);
    expect(isMerchantRouteActionKind('dump')).toBe(false);
    expect(isMerchantRouteActionKind(42)).toBe(false);
    expect(isMerchantRouteActionKind(null)).toBe(false);
  });
});

describe('MerchantRoute construction', () => {
  it('accepts a well-formed multi-stop loop', () => {
    const route = new MerchantRoute({ id: 'route-1', faction: 'otk', stops: otkRoute() });
    expect(route.id).toBe('route-1');
    expect(route.faction).toBe('otk');
    expect(route.length).toBe(2);
    expect(route.stops).toHaveLength(2);
    expect(route.stopAt(0).colonyId).toBe('coral-bight');
    expect(route.stopAt(1).colonyId).toBe('salt-wharf');
  });

  it.each([
    ['empty id', ''],
    ['non-string id', 42 as unknown as string],
  ])('rejects invalid id (%s)', (_label, id) => {
    expect(() => new MerchantRoute({ id, faction: 'otk', stops: otkRoute() })).toThrow(TypeError);
  });

  it('rejects empty faction', () => {
    expect(() => new MerchantRoute({ id: 'r', faction: '', stops: otkRoute() })).toThrow(TypeError);
  });

  it('rejects zero-stop route', () => {
    expect(() => new MerchantRoute({ id: 'r', faction: 'otk', stops: [] })).toThrow(RangeError);
  });

  it('rejects a stop without a colonyId', () => {
    const stops: MerchantRouteStop[] = [
      {
        colonyId: '',
        actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty: 1 }],
      },
    ];
    expect(() => new MerchantRoute({ id: 'r', faction: 'otk', stops })).toThrow(TypeError);
  });

  it('rejects an action with invalid kind', () => {
    const stops: MerchantRouteStop[] = [
      {
        colonyId: 'c',
        actions: [{ kind: 'dump' as never, resourceId: 'timber', qty: 1 }],
      },
    ];
    expect(() => new MerchantRoute({ id: 'r', faction: 'otk', stops })).toThrow(TypeError);
  });

  it.each([
    ['zero qty', 0],
    ['negative qty', -1],
    ['fractional qty', 1.5],
  ])('rejects action with invalid qty (%s)', (_label, qty) => {
    const stops: MerchantRouteStop[] = [
      {
        colonyId: 'c',
        actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty }],
      },
    ];
    expect(() => new MerchantRoute({ id: 'r', faction: 'otk', stops })).toThrow(RangeError);
  });

  it('rejects an action with empty resourceId', () => {
    const stops: MerchantRouteStop[] = [
      { colonyId: 'c', actions: [{ kind: MerchantRouteActionKind.Load, resourceId: '', qty: 1 }] },
    ];
    expect(() => new MerchantRoute({ id: 'r', faction: 'otk', stops })).toThrow(TypeError);
  });

  it('allows a stop with zero actions (waypoint-only)', () => {
    const route = new MerchantRoute({
      id: 'r',
      faction: 'otk',
      stops: [{ colonyId: 'pass-through', actions: [] }],
    });
    expect(route.stopAt(0).actions).toEqual([]);
  });
});

describe('MerchantRoute navigation helpers', () => {
  it('nextStopIndex wraps from last back to first', () => {
    const route = new MerchantRoute({ id: 'r', faction: 'otk', stops: otkRoute() });
    expect(route.nextStopIndex(0)).toBe(1);
    expect(route.nextStopIndex(1)).toBe(0);
  });

  it('nextStopIndex rejects out-of-range input', () => {
    const route = new MerchantRoute({ id: 'r', faction: 'otk', stops: otkRoute() });
    expect(() => route.nextStopIndex(-1)).toThrow(RangeError);
    expect(() => route.nextStopIndex(2)).toThrow(RangeError);
  });

  it('stopAt rejects out-of-range index', () => {
    const route = new MerchantRoute({ id: 'r', faction: 'otk', stops: otkRoute() });
    expect(() => route.stopAt(-1)).toThrow(RangeError);
    expect(() => route.stopAt(2)).toThrow(RangeError);
  });

  it('single-stop route wraps nextStopIndex back to itself', () => {
    const route = new MerchantRoute({
      id: 'r',
      faction: 'otk',
      stops: [
        {
          colonyId: 'only',
          actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty: 1 }],
        },
      ],
    });
    expect(route.nextStopIndex(0)).toBe(0);
  });
});

describe('MerchantRoute.toJSON / fromJSON', () => {
  it('round-trips a typical route', () => {
    const original = new MerchantRoute({ id: 'r', faction: 'otk', stops: otkRoute() });
    const json = original.toJSON();
    const revived = MerchantRoute.fromJSON(json);
    expect(revived.toJSON()).toEqual(json);
  });

  it('toJSON emits preserved stop order (insertion order is meaningful)', () => {
    const route = new MerchantRoute({
      id: 'r',
      faction: 'otk',
      stops: [
        { colonyId: 'zeta', actions: [] },
        { colonyId: 'alpha', actions: [] },
        { colonyId: 'mu', actions: [] },
      ],
    });
    const json = route.toJSON();
    expect(json.stops.map((s) => s.colonyId)).toEqual(['zeta', 'alpha', 'mu']);
  });

  it('toJSON is JSON.stringify-lossless', () => {
    const original = new MerchantRoute({ id: 'r', faction: 'otk', stops: otkRoute() });
    const text = JSON.stringify(original.toJSON());
    const revived = MerchantRoute.fromJSON(JSON.parse(text) as MerchantRouteJSON);
    expect(revived.toJSON()).toEqual(original.toJSON());
  });

  it('fromJSON rejects a non-object payload', () => {
    expect(() => MerchantRoute.fromJSON(null as unknown as MerchantRouteJSON)).toThrow(TypeError);
  });

  it('fromJSON rejects a malformed stops payload', () => {
    const bad = {
      id: 'r',
      faction: 'otk',
      stops: 'nope',
    } as unknown as MerchantRouteJSON;
    expect(() => MerchantRoute.fromJSON(bad)).toThrow(TypeError);
  });

  it('revived route is independent of the source (defensive copy of action arrays)', () => {
    const stops = otkRoute();
    const original = new MerchantRoute({ id: 'r', faction: 'otk', stops });
    const json = original.toJSON();
    // mutate the emitted JSON and verify the source is unaffected
    (json.stops[0]!.actions as unknown as unknown[]).push({
      kind: 'load',
      resourceId: 'planks',
      qty: 99,
    });
    expect(original.stopAt(0).actions).toHaveLength(2);
  });
});
