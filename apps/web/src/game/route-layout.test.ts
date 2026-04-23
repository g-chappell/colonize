import { describe, expect, it } from 'vitest';
import { MerchantRouteActionKind, type ColonyJSON, type MerchantRouteJSON } from '@colonize/core';
import { computeRouteSegments } from './route-layout';

function colony(id: string, x: number, y: number): ColonyJSON {
  return {
    id,
    faction: 'otk',
    position: { x, y },
    population: 1,
    crew: [],
    buildings: [],
    stocks: { resources: {}, artifacts: [] },
  };
}

function route(id: string, stopColonyIds: readonly string[]): MerchantRouteJSON {
  return {
    id,
    faction: 'otk',
    stops: stopColonyIds.map((cid) => ({
      colonyId: cid,
      actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'salvage', qty: 1 }],
    })),
  };
}

describe('computeRouteSegments', () => {
  it('returns no segments when the route catalogue is empty', () => {
    expect(computeRouteSegments({}, [colony('a', 1, 1)])).toEqual([]);
  });

  it('returns no segments for a single-stop route', () => {
    const routes = { r: route('r', ['a']) };
    expect(computeRouteSegments(routes, [colony('a', 1, 1)])).toEqual([]);
  });

  it('emits one segment for a two-stop route', () => {
    const routes = { r: route('r', ['a', 'b']) };
    const out = computeRouteSegments(routes, [colony('a', 1, 2), colony('b', 5, 6)]);
    expect(out).toEqual([{ routeId: 'r', from: { x: 1, y: 2 }, to: { x: 5, y: 6 } }]);
  });

  it('emits N-1 segments for an N-stop route, in stop order', () => {
    const routes = { r: route('r', ['a', 'b', 'c']) };
    const out = computeRouteSegments(routes, [
      colony('a', 0, 0),
      colony('b', 5, 0),
      colony('c', 5, 5),
    ]);
    expect(out.length).toBe(2);
    expect(out[0]?.from).toEqual({ x: 0, y: 0 });
    expect(out[0]?.to).toEqual({ x: 5, y: 0 });
    expect(out[1]?.from).toEqual({ x: 5, y: 0 });
    expect(out[1]?.to).toEqual({ x: 5, y: 5 });
  });

  it('skips stops whose colony is missing; bridges neighbours over the gap', () => {
    const routes = { r: route('r', ['a', 'ghost', 'c']) };
    const out = computeRouteSegments(routes, [colony('a', 0, 0), colony('c', 9, 9)]);
    expect(out).toEqual([{ routeId: 'r', from: { x: 0, y: 0 }, to: { x: 9, y: 9 } }]);
  });

  it('returns no segments when only one colony remains after filtering', () => {
    const routes = { r: route('r', ['a', 'ghost-1', 'ghost-2']) };
    const out = computeRouteSegments(routes, [colony('a', 0, 0)]);
    expect(out).toEqual([]);
  });

  it('emits segments for every route, ordered by routeId for determinism', () => {
    const routes = {
      zebra: route('zebra', ['a', 'b']),
      alpha: route('alpha', ['c', 'd']),
    };
    const out = computeRouteSegments(routes, [
      colony('a', 1, 1),
      colony('b', 2, 2),
      colony('c', 3, 3),
      colony('d', 4, 4),
    ]);
    expect(out.map((s) => s.routeId)).toEqual(['alpha', 'zebra']);
  });
});
