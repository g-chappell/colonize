import { useEffect, useMemo, useState } from 'react';
import {
  ALL_RESOURCE_TYPES,
  MerchantRouteActionKind,
  isShipUnitType,
  type MerchantRouteJSON,
  type UnitJSON,
} from '@colonize/core';
import { useGameStore } from '../store/game';
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
  type RouteDraft,
} from './routes-math';
import styles from './RouteScreen.module.css';

// Mounts while `screen === 'routes'`. Left panel lists existing
// routes + edit/duplicate/delete buttons; right panel is the editor
// form for a new/edited draft. Save validates the draft via
// `draftToRouteJSON` and commits via `saveMerchantRoute`. Esc closes
// back to the game map.
export function RouteScreen(): JSX.Element {
  const faction = useGameStore((s) => s.faction);
  const colonies = useGameStore((s) => s.colonies);
  const units = useGameStore((s) => s.units);
  const routes = useGameStore((s) => s.merchantRoutes);
  const autoRoutes = useGameStore((s) => s.autoRoutes);
  const saveMerchantRoute = useGameStore((s) => s.saveMerchantRoute);
  const deleteMerchantRoute = useGameStore((s) => s.deleteMerchantRoute);
  const assignRouteToShip = useGameStore((s) => s.assignRouteToShip);
  const unassignRoute = useGameStore((s) => s.unassignRoute);
  const closeRouteScreen = useGameStore((s) => s.closeRouteScreen);

  const [draft, setDraft] = useState<RouteDraft>(EMPTY_DRAFT);

  const factionColonies = useMemo(
    () => colonies.filter((c) => c.faction === faction),
    [colonies, faction],
  );
  const factionShips = useMemo(
    () => units.filter((u) => u.faction === faction && isShipUnitType(u.type)),
    [units, faction],
  );
  const routeList = useMemo(() => Object.values(routes), [routes]);
  const existingIds = useMemo(() => new Set(Object.keys(routes)), [routes]);

  const validation = useMemo(
    () => draftToRouteJSON(draft, faction, existingIds),
    [draft, faction, existingIds],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      useGameStore.getState().closeRouteScreen();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleNew = (): void => setDraft(EMPTY_DRAFT);

  const handleEdit = (route: MerchantRouteJSON): void => {
    setDraft(draftFromRoute(route));
  };

  const handleDuplicate = (route: MerchantRouteJSON): void => {
    setDraft(draftFromRoute(route, `${route.id}-copy`));
  };

  const handleDelete = (routeId: string): void => {
    deleteMerchantRoute(routeId);
    if (draft.editingId === routeId) setDraft(EMPTY_DRAFT);
  };

  const handleSave = (): void => {
    if (!validation.ok) return;
    saveMerchantRoute(validation.route);
    if (draft.assignedUnitId) {
      assignRouteToShip(draft.assignedUnitId, validation.route.id);
    }
    setDraft(EMPTY_DRAFT);
  };

  const handleAssign = (unitId: string, routeId: string): void => {
    if (unitId.length === 0) return;
    assignRouteToShip(unitId, routeId);
  };

  const handleUnassign = (unitId: string): void => unassignRoute(unitId);

  return (
    <div className={styles.backdrop} data-testid="route-screen">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Route builder"
        data-testid="route-screen-panel"
      >
        <header className={styles.header}>
          <h2 className={styles.title} data-testid="route-screen-title">
            Merchant Routes
          </h2>
          <button
            type="button"
            className={styles.button}
            onClick={closeRouteScreen}
            data-testid="route-screen-close"
          >
            Close
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.sidebar} aria-label="Saved routes">
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarHeading}>Saved</span>
              <button
                type="button"
                className={styles.buttonSmall}
                onClick={handleNew}
                data-testid="route-screen-new"
              >
                New
              </button>
            </div>
            {routeList.length === 0 && (
              <p className={styles.missing} data-testid="route-screen-empty">
                No routes yet.
              </p>
            )}
            <ul className={styles.routeList} data-testid="route-screen-list">
              {routeList.map((route) => (
                <RouteRow
                  key={route.id}
                  route={route}
                  assignedShipIds={shipIdsForRoute(autoRoutes, route.id)}
                  ships={factionShips}
                  onEdit={() => handleEdit(route)}
                  onDuplicate={() => handleDuplicate(route)}
                  onDelete={() => handleDelete(route.id)}
                  onAssign={(unitId) => handleAssign(unitId, route.id)}
                  onUnassign={handleUnassign}
                />
              ))}
            </ul>
          </section>

          <section className={styles.editor} aria-label="Route editor">
            <div className={styles.editorHeader}>
              <span className={styles.sidebarHeading}>
                {draft.editingId ? `Editing ${draft.editingId}` : 'New route'}
              </span>
            </div>
            <label className={styles.fieldLabel}>
              Name
              <input
                type="text"
                className={styles.textInput}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                data-testid="route-screen-name"
              />
            </label>

            <div className={styles.stops} data-testid="route-screen-stops">
              {draft.stops.map((stop, stopIndex) => (
                <StopEditor
                  key={stopIndex}
                  index={stopIndex}
                  colonyId={stop.colonyId}
                  actions={stop.actions}
                  colonyOptions={factionColonies.map((c) => c.id)}
                  onSetColony={(id) => setDraft(setStopColony(draft, stopIndex, id))}
                  onRemove={() => setDraft(removeStop(draft, stopIndex))}
                  onAddAction={() =>
                    setDraft(
                      addAction(draft, stopIndex, {
                        kind: MerchantRouteActionKind.Load,
                        resourceId: ALL_RESOURCE_TYPES[0] ?? '',
                        qty: 1,
                      }),
                    )
                  }
                  onRemoveAction={(actionIndex) =>
                    setDraft(removeAction(draft, stopIndex, actionIndex))
                  }
                  onPatchAction={(actionIndex, patch) =>
                    setDraft(setAction(draft, stopIndex, actionIndex, patch))
                  }
                />
              ))}
              <button
                type="button"
                className={styles.buttonSmall}
                onClick={() => setDraft(addStop(draft))}
                data-testid="route-screen-add-stop"
              >
                + Add stop
              </button>
            </div>

            <label className={styles.fieldLabel}>
              Assign to ship (optional)
              <select
                className={styles.select}
                value={draft.assignedUnitId ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    assignedUnitId: e.target.value.length > 0 ? e.target.value : null,
                  })
                }
                data-testid="route-screen-assign"
              >
                <option value="">— unassigned —</option>
                {factionShips.map((ship) => (
                  <option key={ship.id} value={ship.id}>
                    {ship.id}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.editorFooter}>
              {!validation.ok && (
                <p className={styles.reason} data-testid="route-screen-reason">
                  {validation.reason}
                </p>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.button}
                  onClick={handleSave}
                  disabled={!validation.ok}
                  data-testid="route-screen-save"
                >
                  Save
                </button>
                <button
                  type="button"
                  className={styles.button}
                  onClick={handleNew}
                  data-testid="route-screen-reset"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function shipIdsForRoute(
  autoRoutes: Readonly<Record<string, { routeId: string }>>,
  routeId: string,
): readonly string[] {
  return Object.entries(autoRoutes)
    .filter(([, ar]) => ar.routeId === routeId)
    .map(([unitId]) => unitId);
}

interface RouteRowProps {
  readonly route: MerchantRouteJSON;
  readonly assignedShipIds: readonly string[];
  readonly ships: readonly UnitJSON[];
  readonly onEdit: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
  readonly onAssign: (unitId: string) => void;
  readonly onUnassign: (unitId: string) => void;
}

function RouteRow({
  route,
  assignedShipIds,
  ships,
  onEdit,
  onDuplicate,
  onDelete,
  onAssign,
  onUnassign,
}: RouteRowProps): JSX.Element {
  const rowTestId = `route-row-${route.id}`;
  return (
    <li className={styles.routeRow} data-testid={rowTestId}>
      <div className={styles.routeRowHeader}>
        <span className={styles.routeRowName}>{route.id}</span>
        <span className={styles.routeRowStops} data-testid={`${rowTestId}-stops`}>
          {route.stops.length} stop{route.stops.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className={styles.routeRowPath}>{route.stops.map((s) => s.colonyId).join(' → ')}</div>
      <div className={styles.routeRowActions}>
        <button
          type="button"
          className={styles.buttonSmall}
          onClick={onEdit}
          data-testid={`${rowTestId}-edit`}
        >
          Edit
        </button>
        <button
          type="button"
          className={styles.buttonSmall}
          onClick={onDuplicate}
          data-testid={`${rowTestId}-duplicate`}
        >
          Duplicate
        </button>
        <button
          type="button"
          className={styles.buttonSmall}
          onClick={onDelete}
          data-testid={`${rowTestId}-delete`}
        >
          Delete
        </button>
      </div>
      <div className={styles.routeRowAssign}>
        <select
          className={styles.selectSmall}
          value=""
          onChange={(e) => {
            onAssign(e.target.value);
            e.currentTarget.value = '';
          }}
          data-testid={`${rowTestId}-assign`}
          aria-label={`Assign ${route.id} to a ship`}
        >
          <option value="">— assign ship —</option>
          {ships.map((ship) => (
            <option key={ship.id} value={ship.id}>
              {ship.id}
            </option>
          ))}
        </select>
      </div>
      {assignedShipIds.length > 0 && (
        <ul className={styles.assignedList} data-testid={`${rowTestId}-assigned`}>
          {assignedShipIds.map((unitId) => (
            <li key={unitId} className={styles.assignedEntry}>
              <span>{unitId}</span>
              <button
                type="button"
                className={styles.buttonSmall}
                onClick={() => onUnassign(unitId)}
                data-testid={`${rowTestId}-unassign-${unitId}`}
              >
                Release
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

interface StopEditorProps {
  readonly index: number;
  readonly colonyId: string;
  readonly actions: readonly { kind: string; resourceId: string; qty: number }[];
  readonly colonyOptions: readonly string[];
  readonly onSetColony: (id: string) => void;
  readonly onRemove: () => void;
  readonly onAddAction: () => void;
  readonly onRemoveAction: (actionIndex: number) => void;
  readonly onPatchAction: (
    actionIndex: number,
    patch: { kind?: 'load' | 'unload'; resourceId?: string; qty?: number },
  ) => void;
}

function StopEditor({
  index,
  colonyId,
  actions,
  colonyOptions,
  onSetColony,
  onRemove,
  onAddAction,
  onRemoveAction,
  onPatchAction,
}: StopEditorProps): JSX.Element {
  const stopTestId = `route-stop-${index}`;
  return (
    <div className={styles.stop} data-testid={stopTestId}>
      <div className={styles.stopHeader}>
        <span className={styles.stopLabel}>Stop {index + 1}</span>
        <button
          type="button"
          className={styles.buttonSmall}
          onClick={onRemove}
          data-testid={`${stopTestId}-remove`}
        >
          Remove
        </button>
      </div>
      <select
        className={styles.select}
        value={colonyId}
        onChange={(e) => onSetColony(e.target.value)}
        data-testid={`${stopTestId}-colony`}
      >
        <option value="">— pick colony —</option>
        {colonyOptions.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <ul className={styles.actionList} data-testid={`${stopTestId}-actions`}>
        {actions.map((action, actionIndex) => (
          <li key={actionIndex} className={styles.actionRow}>
            <select
              className={styles.selectSmall}
              value={action.kind}
              onChange={(e) =>
                onPatchAction(actionIndex, {
                  kind: e.target.value as 'load' | 'unload',
                })
              }
              data-testid={`${stopTestId}-action-${actionIndex}-kind`}
              aria-label={`Stop ${index + 1} action ${actionIndex + 1} kind`}
            >
              <option value={MerchantRouteActionKind.Load}>Load</option>
              <option value={MerchantRouteActionKind.Unload}>Unload</option>
            </select>
            <select
              className={styles.selectSmall}
              value={action.resourceId}
              onChange={(e) => onPatchAction(actionIndex, { resourceId: e.target.value })}
              data-testid={`${stopTestId}-action-${actionIndex}-resource`}
              aria-label={`Stop ${index + 1} action ${actionIndex + 1} resource`}
            >
              {ALL_RESOURCE_TYPES.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              step={1}
              value={action.qty}
              onChange={(e) => onPatchAction(actionIndex, { qty: Number(e.target.value) })}
              className={styles.numberInput}
              data-testid={`${stopTestId}-action-${actionIndex}-qty`}
              aria-label={`Stop ${index + 1} action ${actionIndex + 1} qty`}
            />
            <button
              type="button"
              className={styles.buttonSmall}
              onClick={() => onRemoveAction(actionIndex)}
              data-testid={`${stopTestId}-action-${actionIndex}-remove`}
            >
              ×
            </button>
          </li>
        ))}
        <button
          type="button"
          className={styles.buttonSmall}
          onClick={onAddAction}
          data-testid={`${stopTestId}-add-action`}
        >
          + Add action
        </button>
      </ul>
    </div>
  );
}
