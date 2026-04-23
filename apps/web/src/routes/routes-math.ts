import type {
  MerchantRouteAction,
  MerchantRouteActionKind,
  MerchantRouteJSON,
  MerchantRouteStop,
} from '@colonize/core';

// Form state for the route-builder screen. Kept in React local state;
// the store only sees validated MerchantRouteJSON snapshots on save.
// `editingId` is the id of the route being replaced (edit mode) or
// null for a fresh creation (new / duplicate). The screen calls
// `draftToRouteJSON` on save — if it returns { ok: false }, the save
// button is disabled and the reason is surfaced to the player.
export interface RouteDraftAction {
  readonly kind: MerchantRouteActionKind;
  readonly resourceId: string;
  readonly qty: number;
}

export interface RouteDraftStop {
  readonly colonyId: string;
  readonly actions: readonly RouteDraftAction[];
}

export interface RouteDraft {
  readonly name: string;
  readonly editingId: string | null;
  readonly stops: readonly RouteDraftStop[];
  readonly assignedUnitId: string | null;
}

// Kebab-case slug for the player-typed name. Empty input becomes the
// empty string — callers (the save validator) treat that as invalid.
export function slugifyRouteName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const EMPTY_DRAFT: RouteDraft = {
  name: '',
  editingId: null,
  stops: [],
  assignedUnitId: null,
};

// Deep-copy an existing route into draft form. `nameOverride` is used
// by Duplicate (adds a '-copy' suffix); omit to keep the original
// name for Edit.
export function draftFromRoute(route: MerchantRouteJSON, nameOverride?: string): RouteDraft {
  return {
    name: nameOverride ?? route.id,
    editingId: nameOverride === undefined ? route.id : null,
    stops: route.stops.map((stop) => ({
      colonyId: stop.colonyId,
      actions: stop.actions.map((a) => ({
        kind: a.kind,
        resourceId: a.resourceId,
        qty: a.qty,
      })),
    })),
    assignedUnitId: null,
  };
}

export type DraftValidation =
  | { readonly ok: true; readonly route: MerchantRouteJSON }
  | { readonly ok: false; readonly reason: string };

// Validate + serialise a draft into a MerchantRouteJSON. Returns
// structured failure so the UI can disable the save button and show
// a reason line; does not throw. `existingIds` is the current catalogue
// of route ids so create-mode rejects a name collision; edit-mode
// allows the id that equals `draft.editingId` (renaming re-validates
// against the rest of the catalogue).
export function draftToRouteJSON(
  draft: RouteDraft,
  factionId: string,
  existingIds: ReadonlySet<string>,
): DraftValidation {
  const slug = slugifyRouteName(draft.name);
  if (slug.length === 0) {
    return { ok: false, reason: 'Route name is required.' };
  }
  if (slug !== draft.editingId && existingIds.has(slug)) {
    return { ok: false, reason: `A route named "${slug}" already exists.` };
  }
  if (draft.stops.length === 0) {
    return { ok: false, reason: 'Route needs at least one stop.' };
  }
  const stops: MerchantRouteStop[] = [];
  for (let i = 0; i < draft.stops.length; i++) {
    const stop = draft.stops[i]!;
    if (stop.colonyId.length === 0) {
      return { ok: false, reason: `Stop ${i + 1}: pick a colony.` };
    }
    const actions: MerchantRouteAction[] = [];
    for (let a = 0; a < stop.actions.length; a++) {
      const action = stop.actions[a]!;
      if (action.resourceId.length === 0) {
        return { ok: false, reason: `Stop ${i + 1}, action ${a + 1}: pick a resource.` };
      }
      if (!Number.isInteger(action.qty) || action.qty <= 0) {
        return {
          ok: false,
          reason: `Stop ${i + 1}, action ${a + 1}: qty must be a positive integer.`,
        };
      }
      actions.push({ kind: action.kind, resourceId: action.resourceId, qty: action.qty });
    }
    stops.push({ colonyId: stop.colonyId, actions });
  }
  return {
    ok: true,
    route: { id: slug, faction: factionId, stops },
  };
}

// Helpers used by the editor form. All return a *new* draft — the
// screen calls `setDraft` with the result. Keeps the form reducer
// free of inline spreads and tested in isolation.

export function addStop(draft: RouteDraft, colonyId = ''): RouteDraft {
  return { ...draft, stops: [...draft.stops, { colonyId, actions: [] }] };
}

export function removeStop(draft: RouteDraft, stopIndex: number): RouteDraft {
  if (stopIndex < 0 || stopIndex >= draft.stops.length) return draft;
  return {
    ...draft,
    stops: draft.stops.filter((_, i) => i !== stopIndex),
  };
}

export function setStopColony(draft: RouteDraft, stopIndex: number, colonyId: string): RouteDraft {
  if (stopIndex < 0 || stopIndex >= draft.stops.length) return draft;
  return {
    ...draft,
    stops: draft.stops.map((stop, i) => (i === stopIndex ? { ...stop, colonyId } : stop)),
  };
}

export function addAction(
  draft: RouteDraft,
  stopIndex: number,
  action: RouteDraftAction,
): RouteDraft {
  if (stopIndex < 0 || stopIndex >= draft.stops.length) return draft;
  return {
    ...draft,
    stops: draft.stops.map((stop, i) =>
      i === stopIndex ? { ...stop, actions: [...stop.actions, action] } : stop,
    ),
  };
}

export function removeAction(
  draft: RouteDraft,
  stopIndex: number,
  actionIndex: number,
): RouteDraft {
  if (stopIndex < 0 || stopIndex >= draft.stops.length) return draft;
  return {
    ...draft,
    stops: draft.stops.map((stop, i) => {
      if (i !== stopIndex) return stop;
      if (actionIndex < 0 || actionIndex >= stop.actions.length) return stop;
      return { ...stop, actions: stop.actions.filter((_, j) => j !== actionIndex) };
    }),
  };
}

export function setAction(
  draft: RouteDraft,
  stopIndex: number,
  actionIndex: number,
  patch: Partial<RouteDraftAction>,
): RouteDraft {
  if (stopIndex < 0 || stopIndex >= draft.stops.length) return draft;
  return {
    ...draft,
    stops: draft.stops.map((stop, i) => {
      if (i !== stopIndex) return stop;
      if (actionIndex < 0 || actionIndex >= stop.actions.length) return stop;
      return {
        ...stop,
        actions: stop.actions.map((a, j) => (j === actionIndex ? { ...a, ...patch } : a)),
      };
    }),
  };
}
