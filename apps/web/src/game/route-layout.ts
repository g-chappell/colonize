import type { ColonyJSON, Coord, MerchantRouteJSON } from '@colonize/core';

// Pure-sibling layout for the Phaser route-line overlay. Takes the
// route catalogue + the current colony roster and produces a flat list
// of line segments (world-tile coord pairs) the scene draws with
// Phaser.GameObjects.Graphics. Separated from game-scene.ts so the
// mapping logic is testable without mounting Phaser in the test env.
//
// Rules:
//   - A route with fewer than two resolvable stops produces no
//     segments (nothing to connect). Single-stop routes still exist
//     (a waypoint) but draw no lines.
//   - Stops referencing a colony that is not in the roster are
//     skipped (not fatal) — the segment neighbouring a broken stop
//     bridges the remaining ones, so a missing middle colony doesn't
//     shatter the visualisation.
//   - Segments are emitted in route-listing order so render order is
//     deterministic; tests pin it.

export interface RouteSegment {
  readonly routeId: string;
  readonly from: Coord;
  readonly to: Coord;
}

export function computeRouteSegments(
  routes: Readonly<Record<string, MerchantRouteJSON>>,
  colonies: readonly ColonyJSON[],
): readonly RouteSegment[] {
  const byId = new Map<string, Coord>();
  for (const c of colonies) byId.set(c.id, { x: c.position.x, y: c.position.y });

  const segments: RouteSegment[] = [];
  const sortedIds = Object.keys(routes).sort();
  for (const routeId of sortedIds) {
    const route = routes[routeId];
    if (!route) continue;
    const resolved: Coord[] = [];
    for (const stop of route.stops) {
      const coord = byId.get(stop.colonyId);
      if (coord) resolved.push(coord);
    }
    if (resolved.length < 2) continue;
    for (let i = 0; i < resolved.length - 1; i++) {
      segments.push({ routeId, from: resolved[i]!, to: resolved[i + 1]! });
    }
  }
  return segments;
}
