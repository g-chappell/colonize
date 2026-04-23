import { describe, expect, it } from 'vitest';
import { MerchantRouteActionKind, type MerchantRouteJSON } from '@colonize/core';
import {
  EMPTY_DRAFT,
  addAction,
  addStop,
  draftFromRoute,
  draftToRouteJSON,
  removeAction,
  removeStop,
  setAction,
  setStopColony,
  slugifyRouteName,
  type RouteDraft,
} from './routes-math';

describe('slugifyRouteName', () => {
  it('lowercases and joins with hyphens', () => {
    expect(slugifyRouteName('Salt Run')).toBe('salt-run');
  });

  it('collapses runs of non-alphanumeric characters', () => {
    expect(slugifyRouteName('Rum   & Salt  !')).toBe('rum-salt');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugifyRouteName('   ---Salt---   ')).toBe('salt');
  });

  it('returns empty string for blank input', () => {
    expect(slugifyRouteName('')).toBe('');
    expect(slugifyRouteName('    ')).toBe('');
    expect(slugifyRouteName('!!!')).toBe('');
  });

  it('preserves digits', () => {
    expect(slugifyRouteName('Route 42')).toBe('route-42');
  });
});

describe('draftFromRoute', () => {
  const sample: MerchantRouteJSON = {
    id: 'salt-run',
    faction: 'otk',
    stops: [
      {
        colonyId: 'driftwatch',
        actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'salt', qty: 5 }],
      },
      {
        colonyId: 'blackreef',
        actions: [{ kind: MerchantRouteActionKind.Unload, resourceId: 'salt', qty: 5 }],
      },
    ],
  };

  it('copies stops + actions verbatim and sets editingId to the source id', () => {
    const draft = draftFromRoute(sample);
    expect(draft.editingId).toBe('salt-run');
    expect(draft.name).toBe('salt-run');
    expect(draft.stops).toHaveLength(2);
    expect(draft.stops[0]?.colonyId).toBe('driftwatch');
    expect(draft.stops[0]?.actions[0]).toEqual({
      kind: MerchantRouteActionKind.Load,
      resourceId: 'salt',
      qty: 5,
    });
  });

  it('Duplicate pathway: setting nameOverride clears editingId', () => {
    const dup = draftFromRoute(sample, 'salt-run-copy');
    expect(dup.editingId).toBeNull();
    expect(dup.name).toBe('salt-run-copy');
    expect(dup.stops).toHaveLength(2);
  });

  it('deep-copies action lists so mutating the draft does not mutate the source', () => {
    const draft = draftFromRoute(sample);
    expect(draft.stops[0]?.actions).not.toBe(sample.stops[0]?.actions);
  });
});

describe('draftToRouteJSON', () => {
  const baseDraft: RouteDraft = {
    name: 'Salt Run',
    editingId: null,
    stops: [
      {
        colonyId: 'driftwatch',
        actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'salt', qty: 5 }],
      },
    ],
    assignedUnitId: null,
  };

  it('serialises a valid draft with the slugged name as id', () => {
    const result = draftToRouteJSON(baseDraft, 'otk', new Set());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.route.id).toBe('salt-run');
      expect(result.route.faction).toBe('otk');
      expect(result.route.stops).toEqual(baseDraft.stops);
    }
  });

  it('rejects an empty name', () => {
    const result = draftToRouteJSON({ ...baseDraft, name: '' }, 'otk', new Set());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/name is required/i);
  });

  it('rejects a name whose slug collides with an existing id (create mode)', () => {
    const result = draftToRouteJSON(baseDraft, 'otk', new Set(['salt-run']));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/already exists/);
  });

  it('allows renaming back to the editingId when in edit mode', () => {
    const editing: RouteDraft = { ...baseDraft, editingId: 'salt-run' };
    const result = draftToRouteJSON(editing, 'otk', new Set(['salt-run', 'spice-run']));
    expect(result.ok).toBe(true);
  });

  it('rejects an edit-mode rename that collides with a different existing route', () => {
    const editing: RouteDraft = { ...baseDraft, name: 'Spice Run', editingId: 'salt-run' };
    const result = draftToRouteJSON(editing, 'otk', new Set(['salt-run', 'spice-run']));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/already exists/);
  });

  it('rejects a route with zero stops', () => {
    const result = draftToRouteJSON({ ...baseDraft, stops: [] }, 'otk', new Set());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/at least one stop/i);
  });

  it('rejects a stop with no colony picked', () => {
    const draft: RouteDraft = {
      ...baseDraft,
      stops: [{ colonyId: '', actions: [] }],
    };
    const result = draftToRouteJSON(draft, 'otk', new Set());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/pick a colony/i);
  });

  it('rejects an action with empty resourceId', () => {
    const draft: RouteDraft = {
      ...baseDraft,
      stops: [
        {
          colonyId: 'driftwatch',
          actions: [{ kind: MerchantRouteActionKind.Load, resourceId: '', qty: 3 }],
        },
      ],
    };
    const result = draftToRouteJSON(draft, 'otk', new Set());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/pick a resource/i);
  });

  it('rejects an action with non-positive or non-integer qty', () => {
    const draftZero: RouteDraft = {
      ...baseDraft,
      stops: [
        {
          colonyId: 'driftwatch',
          actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'salt', qty: 0 }],
        },
      ],
    };
    const zero = draftToRouteJSON(draftZero, 'otk', new Set());
    expect(zero.ok).toBe(false);

    const draftFrac: RouteDraft = {
      ...baseDraft,
      stops: [
        {
          colonyId: 'driftwatch',
          actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'salt', qty: 2.5 }],
        },
      ],
    };
    const frac = draftToRouteJSON(draftFrac, 'otk', new Set());
    expect(frac.ok).toBe(false);
  });

  it('allows a stop with zero actions — a pure waypoint', () => {
    const draft: RouteDraft = {
      ...baseDraft,
      stops: [{ colonyId: 'driftwatch', actions: [] }],
    };
    const result = draftToRouteJSON(draft, 'otk', new Set());
    expect(result.ok).toBe(true);
  });
});

describe('draft mutators', () => {
  it('addStop appends an empty stop', () => {
    const next = addStop(EMPTY_DRAFT);
    expect(next.stops).toHaveLength(1);
    expect(next.stops[0]).toEqual({ colonyId: '', actions: [] });
  });

  it('addStop accepts a pre-filled colonyId', () => {
    const next = addStop(EMPTY_DRAFT, 'driftwatch');
    expect(next.stops[0]?.colonyId).toBe('driftwatch');
  });

  it('removeStop drops the entry at the index', () => {
    const d = addStop(addStop(EMPTY_DRAFT, 'a'), 'b');
    const next = removeStop(d, 0);
    expect(next.stops).toHaveLength(1);
    expect(next.stops[0]?.colonyId).toBe('b');
  });

  it('removeStop is a no-op for an out-of-range index', () => {
    const d = addStop(EMPTY_DRAFT, 'a');
    expect(removeStop(d, 99).stops).toHaveLength(1);
    expect(removeStop(d, -1).stops).toHaveLength(1);
  });

  it('setStopColony updates only the target stop', () => {
    const d = addStop(addStop(EMPTY_DRAFT, 'a'), 'b');
    const next = setStopColony(d, 1, 'zanzibar');
    expect(next.stops[0]?.colonyId).toBe('a');
    expect(next.stops[1]?.colonyId).toBe('zanzibar');
  });

  it('addAction appends an action to the target stop', () => {
    const d = addStop(EMPTY_DRAFT, 'a');
    const next = addAction(d, 0, {
      kind: MerchantRouteActionKind.Load,
      resourceId: 'salt',
      qty: 3,
    });
    expect(next.stops[0]?.actions).toHaveLength(1);
    expect(next.stops[0]?.actions[0]?.qty).toBe(3);
  });

  it('setAction patches the action in place', () => {
    const d = addAction(addStop(EMPTY_DRAFT, 'a'), 0, {
      kind: MerchantRouteActionKind.Load,
      resourceId: 'salt',
      qty: 3,
    });
    const next = setAction(d, 0, 0, { qty: 7 });
    expect(next.stops[0]?.actions[0]?.qty).toBe(7);
    expect(next.stops[0]?.actions[0]?.resourceId).toBe('salt');
  });

  it('removeAction drops the action at the index', () => {
    let d = addStop(EMPTY_DRAFT, 'a');
    d = addAction(d, 0, { kind: MerchantRouteActionKind.Load, resourceId: 'salt', qty: 3 });
    d = addAction(d, 0, { kind: MerchantRouteActionKind.Unload, resourceId: 'rum', qty: 2 });
    const next = removeAction(d, 0, 0);
    expect(next.stops[0]?.actions).toHaveLength(1);
    expect(next.stops[0]?.actions[0]?.resourceId).toBe('rum');
  });
});
