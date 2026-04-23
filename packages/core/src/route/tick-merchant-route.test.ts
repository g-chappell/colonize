import { describe, it, expect } from 'vitest';
import { Colony } from '../colony/colony.js';
import { GameMap } from '../map/map.js';
import { TileType } from '../map/tile.js';
import { Unit } from '../unit/unit.js';
import { UnitType } from '../unit/unit-type.js';
import type { UnitInit } from '../unit/unit.js';
import type { ColonyInit } from '../colony/colony.js';
import { AutoRoute } from './auto-route.js';
import { MerchantRoute, MerchantRouteActionKind } from './merchant-route.js';
import { tickMerchantRoute } from './tick-merchant-route.js';
import type { TickMerchantRouteResult } from './tick-merchant-route.js';

// Helpers ------------------------------------------------------------

function buildOceanMap(width = 10, height = 10): GameMap {
  return new GameMap(width, height, TileType.Ocean);
}

function makeShip(opts: {
  id?: string;
  faction?: string;
  position: { x: number; y: number };
  movement?: number;
  cargo?: { [r: string]: number };
}): Unit {
  const init: UnitInit = {
    id: opts.id ?? 'ship-1',
    faction: opts.faction ?? 'otk',
    position: opts.position,
    type: UnitType.Sloop,
    ...(opts.movement !== undefined ? { movement: opts.movement } : {}),
    ...(opts.cargo !== undefined ? { cargo: { resources: opts.cargo } } : {}),
  };
  return new Unit(init);
}

function makeColony(opts: {
  id: string;
  faction?: string;
  position: { x: number; y: number };
  stocks?: { [r: string]: number };
}): Colony {
  const init: ColonyInit = {
    id: opts.id,
    faction: opts.faction ?? 'otk',
    position: opts.position,
    ...(opts.stocks !== undefined ? { stocks: { resources: opts.stocks } } : {}),
  };
  return new Colony(init);
}

function colonyMap(...colonies: Colony[]): Map<string, Colony> {
  const m = new Map<string, Colony>();
  for (const c of colonies) m.set(c.id, c);
  return m;
}

function simpleRoute(): MerchantRoute {
  return new MerchantRoute({
    id: 'route-1',
    faction: 'otk',
    stops: [
      {
        colonyId: 'coral-bight',
        actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty: 3 }],
      },
      {
        colonyId: 'salt-wharf',
        actions: [{ kind: MerchantRouteActionKind.Unload, resourceId: 'timber', qty: 3 }],
      },
    ],
  });
}

// Short aliases for TypeScript-friendly result narrowing in tests
function expectKind<K extends TickMerchantRouteResult['kind']>(
  result: TickMerchantRouteResult,
  kind: K,
): Extract<TickMerchantRouteResult, { kind: K }> {
  expect(result.kind).toBe(kind);
  return result as Extract<TickMerchantRouteResult, { kind: K }>;
}

// -------------------------------------------------------------------

describe('tickMerchantRoute — input validation', () => {
  it('throws when the autoRoute.unitId does not match unit.id', () => {
    const ship = makeShip({ position: { x: 2, y: 2 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: 'ship-other', routeId: route.id });
    const colonies = colonyMap(
      makeColony({ id: 'coral-bight', position: { x: 2, y: 2 } }),
      makeColony({ id: 'salt-wharf', position: { x: 5, y: 5 } }),
    );
    expect(() =>
      tickMerchantRoute({ unit: ship, autoRoute: auto, route, colonies, map: buildOceanMap() }),
    ).toThrow(Error);
  });

  it('throws when the autoRoute.routeId does not match route.id', () => {
    const ship = makeShip({ position: { x: 2, y: 2 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: 'other-route' });
    const colonies = colonyMap(
      makeColony({ id: 'coral-bight', position: { x: 2, y: 2 } }),
      makeColony({ id: 'salt-wharf', position: { x: 5, y: 5 } }),
    );
    expect(() =>
      tickMerchantRoute({ unit: ship, autoRoute: auto, route, colonies, map: buildOceanMap() }),
    ).toThrow(Error);
  });
});

describe('tickMerchantRoute — breakage', () => {
  it('reports already-broken when the route was previously marked broken', () => {
    const ship = makeShip({ position: { x: 2, y: 2 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    auto.markBroken('prior breakage');
    const colonies = colonyMap(
      makeColony({ id: 'coral-bight', position: { x: 2, y: 2 } }),
      makeColony({ id: 'salt-wharf', position: { x: 5, y: 5 } }),
    );

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies,
      map: buildOceanMap(),
    });
    const broken = expectKind(result, 'already-broken');
    expect(broken.reason).toBe('prior breakage');
    expect(auto.isBroken).toBe(true);
  });

  it('breaks when the ship has been captured (faction mismatch with the route)', () => {
    const ship = makeShip({ faction: 'privateers', position: { x: 2, y: 2 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const colonies = colonyMap(
      makeColony({ id: 'coral-bight', position: { x: 2, y: 2 } }),
      makeColony({ id: 'salt-wharf', position: { x: 5, y: 5 } }),
    );

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies,
      map: buildOceanMap(),
    });
    const broken = expectKind(result, 'broken');
    expect(broken.reason).toMatch(/ship captured/);
    expect(auto.isBroken).toBe(true);
  });

  it('breaks when the target colony is missing from the map', () => {
    const ship = makeShip({ position: { x: 2, y: 2 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    // salt-wharf intentionally absent
    const colonies = colonyMap(makeColony({ id: 'coral-bight', position: { x: 4, y: 4 } }));

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies,
      map: buildOceanMap(),
    });
    // route is at stop 0 (coral-bight), which exists — so should succeed
    expect(result.kind).not.toBe('broken');

    // Advance past coral-bight: put ship at coral-bight so stop 0 completes
    const ship2 = makeShip({ position: { x: 4, y: 4 } });
    const auto2 = new AutoRoute({ unitId: ship2.id, routeId: route.id });
    tickMerchantRoute({
      unit: ship2,
      autoRoute: auto2,
      route,
      colonies,
      map: buildOceanMap(),
    });
    expect(auto2.currentStopIndex).toBe(1);
    // Now stop 1 (salt-wharf) is targeted, and it's missing → break
    const result2 = tickMerchantRoute({
      unit: ship2,
      autoRoute: auto2,
      route,
      colonies,
      map: buildOceanMap(),
    });
    const broken = expectKind(result2, 'broken');
    expect(broken.reason).toMatch(/salt-wharf/);
    expect(auto2.isBroken).toBe(true);
  });

  it('breaks when the target colony has changed faction', () => {
    const ship = makeShip({ position: { x: 2, y: 2 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const colonies = colonyMap(
      makeColony({ id: 'coral-bight', faction: 'legion', position: { x: 4, y: 4 } }),
      makeColony({ id: 'salt-wharf', position: { x: 6, y: 6 } }),
    );

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies,
      map: buildOceanMap(),
    });
    const broken = expectKind(result, 'broken');
    expect(broken.reason).toMatch(/no longer owned/);
    expect(auto.isBroken).toBe(true);
  });

  it('breaks when no path exists to the target colony (island-walled)', () => {
    const map = buildOceanMap(6, 6);
    // Fully wall off column x=3 with Island tiles — splits the map in two
    for (let y = 0; y < 6; y++) map.set(3, y, TileType.Island);
    const ship = makeShip({ position: { x: 1, y: 2 } });
    const route = new MerchantRoute({
      id: 'route-1',
      faction: 'otk',
      stops: [
        {
          colonyId: 'east-rock',
          actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty: 1 }],
        },
      ],
    });
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    // Put east-rock behind the wall; surround with Island tiles too so there is
    // absolutely no reachable adjacent ocean tile either
    map.set(5, 2, TileType.Island);
    map.set(4, 1, TileType.Island);
    map.set(4, 2, TileType.Island);
    map.set(4, 3, TileType.Island);
    map.set(5, 1, TileType.Island);
    map.set(5, 3, TileType.Island);
    const colonies = colonyMap(makeColony({ id: 'east-rock', position: { x: 5, y: 2 } }));

    const result = tickMerchantRoute({ unit: ship, autoRoute: auto, route, colonies, map });
    const broken = expectKind(result, 'broken');
    expect(broken.reason).toMatch(/no path/);
    expect(auto.isBroken).toBe(true);
  });
});

describe('tickMerchantRoute — arrival + action execution', () => {
  it('executes load actions when the ship sits on the colony tile', () => {
    const ship = makeShip({ position: { x: 4, y: 4 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const coralBight = makeColony({
      id: 'coral-bight',
      position: { x: 4, y: 4 },
      stocks: { timber: 10 },
    });
    const saltWharf = makeColony({ id: 'salt-wharf', position: { x: 7, y: 7 } });

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(coralBight, saltWharf),
      map: buildOceanMap(),
    });

    const arrived = expectKind(result, 'arrived');
    expect(arrived.colonyId).toBe('coral-bight');
    expect(arrived.stopIndex).toBe(0);
    expect(arrived.nextStopIndex).toBe(1);
    expect(arrived.actionOutcomes).toHaveLength(1);
    expect(arrived.actionOutcomes[0]).toEqual({
      kind: 'load',
      resourceId: 'timber',
      requestedQty: 3,
      appliedQty: 3,
    });
    expect(ship.cargo.getQuantity('timber')).toBe(3);
    expect(coralBight.stocks.getQuantity('timber')).toBe(7);
    expect(auto.currentStopIndex).toBe(1);
  });

  it('treats the ship as "at" the colony when 1 tile adjacent (island-colony case)', () => {
    const map = buildOceanMap(8, 8);
    map.set(4, 4, TileType.Island);
    const ship = makeShip({ position: { x: 3, y: 3 } });
    const route = new MerchantRoute({
      id: 'route-1',
      faction: 'otk',
      stops: [
        {
          colonyId: 'island-port',
          actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty: 2 }],
        },
      ],
    });
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const colony = makeColony({
      id: 'island-port',
      position: { x: 4, y: 4 },
      stocks: { timber: 5 },
    });

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(colony),
      map,
    });
    const arrived = expectKind(result, 'arrived');
    expect(arrived.colonyId).toBe('island-port');
    expect(ship.cargo.getQuantity('timber')).toBe(2);
    expect(colony.stocks.getQuantity('timber')).toBe(3);
    // Single-stop route wraps back to 0
    expect(auto.currentStopIndex).toBe(0);
  });

  it('clamps a load action to whatever the colony actually has', () => {
    const ship = makeShip({ position: { x: 4, y: 4 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const coralBight = makeColony({
      id: 'coral-bight',
      position: { x: 4, y: 4 },
      stocks: { timber: 1 },
    });
    const saltWharf = makeColony({ id: 'salt-wharf', position: { x: 7, y: 7 } });

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(coralBight, saltWharf),
      map: buildOceanMap(),
    });
    const arrived = expectKind(result, 'arrived');
    expect(arrived.actionOutcomes[0]).toEqual({
      kind: 'load',
      resourceId: 'timber',
      requestedQty: 3,
      appliedQty: 1,
    });
    expect(ship.cargo.getQuantity('timber')).toBe(1);
    expect(coralBight.stocks.getQuantity('timber')).toBe(0);
  });

  it('silently applies zero when the colony has nothing (skip, do not throw)', () => {
    const ship = makeShip({ position: { x: 4, y: 4 } });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const coralBight = makeColony({ id: 'coral-bight', position: { x: 4, y: 4 } });
    const saltWharf = makeColony({ id: 'salt-wharf', position: { x: 7, y: 7 } });

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(coralBight, saltWharf),
      map: buildOceanMap(),
    });
    const arrived = expectKind(result, 'arrived');
    expect(arrived.actionOutcomes[0]?.appliedQty).toBe(0);
    expect(ship.cargo.isEmpty).toBe(true);
    // Route still advances even on a partial/empty action — the ship has visited
    expect(auto.currentStopIndex).toBe(1);
  });

  it('clamps an unload action to whatever the ship actually carries', () => {
    const ship = makeShip({ position: { x: 7, y: 7 }, cargo: { timber: 1 } });
    const route = simpleRoute();
    const auto = new AutoRoute({
      unitId: ship.id,
      routeId: route.id,
      currentStopIndex: 1, // target salt-wharf (unload stop)
    });
    const coralBight = makeColony({ id: 'coral-bight', position: { x: 4, y: 4 } });
    const saltWharf = makeColony({
      id: 'salt-wharf',
      position: { x: 7, y: 7 },
      stocks: { timber: 0 },
    });

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(coralBight, saltWharf),
      map: buildOceanMap(),
    });
    const arrived = expectKind(result, 'arrived');
    expect(arrived.actionOutcomes[0]).toEqual({
      kind: 'unload',
      resourceId: 'timber',
      requestedQty: 3,
      appliedQty: 1,
    });
    expect(ship.cargo.getQuantity('timber')).toBe(0);
    expect(saltWharf.stocks.getQuantity('timber')).toBe(1);
    // Wraps back to stop 0
    expect(auto.currentStopIndex).toBe(0);
  });

  it('executes multiple per-stop actions in declared order', () => {
    const ship = makeShip({ position: { x: 4, y: 4 } });
    const route = new MerchantRoute({
      id: 'route-1',
      faction: 'otk',
      stops: [
        {
          colonyId: 'port-a',
          actions: [
            { kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty: 2 },
            { kind: MerchantRouteActionKind.Load, resourceId: 'provisions', qty: 1 },
          ],
        },
      ],
    });
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const portA = makeColony({
      id: 'port-a',
      position: { x: 4, y: 4 },
      stocks: { timber: 5, provisions: 2 },
    });

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(portA),
      map: buildOceanMap(),
    });
    const arrived = expectKind(result, 'arrived');
    expect(arrived.actionOutcomes.map((o) => [o.kind, o.resourceId, o.appliedQty])).toEqual([
      ['load', 'timber', 2],
      ['load', 'provisions', 1],
    ]);
  });
});

describe('tickMerchantRoute — travelling', () => {
  it('moves the ship along a path toward the current stop when not yet arrived', () => {
    const ship = makeShip({ position: { x: 0, y: 0 } }); // Sloop baseMovement = 4
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const coralBight = makeColony({ id: 'coral-bight', position: { x: 9, y: 0 } });
    const saltWharf = makeColony({ id: 'salt-wharf', position: { x: 9, y: 9 } });

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(coralBight, saltWharf),
      map: buildOceanMap(),
    });
    const travel = expectKind(result, 'travelling');
    expect(travel.targetColonyId).toBe('coral-bight');
    expect(travel.targetStopIndex).toBe(0);
    expect(travel.from).toEqual({ x: 0, y: 0 });
    // Sloop moves 4 tiles per turn on ocean; pathfinder may pick diagonal
    // neighbours of equal cost, so only pin the movement budget + progress.
    expect(travel.movementSpent).toBe(4);
    expect(ship.position.x).toBeGreaterThan(0);
    expect(ship.position.x).toBeLessThanOrEqual(4);
    expect(ship.movement).toBe(0);
    // Route index NOT advanced — still travelling
    expect(auto.currentStopIndex).toBe(0);
  });

  it('reports idle when the ship has no movement left this turn', () => {
    const ship = makeShip({ position: { x: 0, y: 0 }, movement: 0 });
    const route = simpleRoute();
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const colonies = colonyMap(
      makeColony({ id: 'coral-bight', position: { x: 9, y: 0 } }),
      makeColony({ id: 'salt-wharf', position: { x: 9, y: 9 } }),
    );

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies,
      map: buildOceanMap(),
    });
    const idle = expectKind(result, 'idle');
    expect(idle.reason).toBe('no-movement');
    expect(idle.targetColonyId).toBe('coral-bight');
    expect(ship.position).toEqual({ x: 0, y: 0 });
  });

  it('docks adjacent to an island-tile colony (no path onto the island itself)', () => {
    const map = buildOceanMap(8, 8);
    map.set(5, 5, TileType.Island);
    const ship = makeShip({ position: { x: 0, y: 5 } });
    const route = new MerchantRoute({
      id: 'route-1',
      faction: 'otk',
      stops: [
        {
          colonyId: 'island-port',
          actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'timber', qty: 1 }],
        },
      ],
    });
    const auto = new AutoRoute({ unitId: ship.id, routeId: route.id });
    const colony = makeColony({
      id: 'island-port',
      position: { x: 5, y: 5 },
      stocks: { timber: 3 },
    });

    // First tick: move toward the island (not adjacent yet)
    const r1 = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(colony),
      map,
    });
    expectKind(r1, 'travelling');
    // Next turn — replenish movement and continue
    ship.resetMovement();
    const r2 = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(colony),
      map,
    });
    // Should now be adjacent to the island and execute
    expectKind(r2, 'arrived');
    expect(ship.cargo.getQuantity('timber')).toBe(1);
    expect(colony.stocks.getQuantity('timber')).toBe(2);
  });
});

describe('tickMerchantRoute — route wrap-around', () => {
  it('wraps from last stop back to first on arrival', () => {
    const ship = makeShip({ position: { x: 7, y: 7 }, cargo: { timber: 3 } });
    const route = simpleRoute();
    const auto = new AutoRoute({
      unitId: ship.id,
      routeId: route.id,
      currentStopIndex: 1, // at last stop
    });
    const coralBight = makeColony({ id: 'coral-bight', position: { x: 4, y: 4 } });
    const saltWharf = makeColony({ id: 'salt-wharf', position: { x: 7, y: 7 } });

    const result = tickMerchantRoute({
      unit: ship,
      autoRoute: auto,
      route,
      colonies: colonyMap(coralBight, saltWharf),
      map: buildOceanMap(),
    });
    const arrived = expectKind(result, 'arrived');
    expect(arrived.nextStopIndex).toBe(0);
    expect(auto.currentStopIndex).toBe(0);
    expect(ship.cargo.getQuantity('timber')).toBe(0);
    expect(saltWharf.stocks.getQuantity('timber')).toBe(3);
  });
});
