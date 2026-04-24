import { useEffect, useState, type DragEvent } from 'react';
import type { BuildingType, ColonyJSON, Coord, TileYield, UnitJSON } from '@colonize/core';
import { getTileYield, isShipUnitType } from '@colonize/core';
import { getBuilding, isBuildingEntryId, type BuildingEntryId } from '@colonize/content';
import {
  FACTION_NAMES,
  coordKey,
  useGameStore,
  type PlayableFaction,
  type SurroundingTile,
} from '../store/game';
import { selectRumours } from '../tavern/select-rumours';
import { availableBuildings, type ProductionQueueItem } from './build-queue';
import styles from './ColonyOverlay.module.css';

const CREW_DRAG_MIME = 'application/x-colonize-crew';

const TILE_TYPE_LABELS: Record<string, string> = {
  ocean: 'Ocean',
  'rayon-passage': 'Rayon passage',
  island: 'Island',
  'floating-city': 'Floating city',
  'red-tide': 'Red tide',
  'fata-morgana': 'Fata Morgana',
};

function tileLabel(type: string): string {
  return TILE_TYPE_LABELS[type] ?? type;
}

function formatYield(yields: TileYield): string {
  const entries = Object.entries(yields);
  if (entries.length === 0) return 'none';
  return entries
    .map(([id, qty]) => `${id} +${qty}`)
    .sort()
    .join(', ');
}

function buildingDisplayName(id: string): string {
  return isBuildingEntryId(id) ? getBuilding(id as BuildingEntryId).name : id;
}

const PLAYABLE_FACTION_KEYS: readonly string[] = Object.keys(FACTION_NAMES);

function displayFaction(factionId: string): string {
  if (PLAYABLE_FACTION_KEYS.includes(factionId)) {
    return FACTION_NAMES[factionId as PlayableFaction];
  }
  return factionId;
}

// Mounts while `screen === 'colony'`. Reads the selected colony from
// the roster and shows its summary, crew pool, 8-neighbour work-slot
// grid, buildings, stocks, production queue, and buildings available
// to queue. Closing routes the screen back to 'game' so the underlying
// GameScene resumes its normal interaction model.
export function ColonyOverlay(): JSX.Element {
  const colonies = useGameStore((s) => s.colonies);
  const selectedColonyId = useGameStore((s) => s.selectedColonyId);
  const colonyQueues = useGameStore((s) => s.colonyQueues);
  const homePorts = useGameStore((s) => s.homePorts);
  const units = useGameStore((s) => s.units);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSelectedColony = useGameStore((s) => s.setSelectedColony);
  const openTradeSession = useGameStore((s) => s.openTradeSession);
  const openTransferSession = useGameStore((s) => s.openTransferSession);
  const showTavernEncounter = useGameStore((s) => s.showTavernEncounter);
  const playerFaction = useGameStore((s) => s.faction);
  const currentTurn = useGameStore((s) => s.currentTurn);

  const colony = findColony(colonies, selectedColonyId);
  const queue = colony ? (colonyQueues[colony.id] ?? []) : [];
  const tradableShip = colony ? findFriendlyShipAt(units, colony.faction, colony.position) : null;
  const hasHomePort = colony ? homePorts[colony.faction] !== undefined : false;

  const handleClose = (): void => {
    setSelectedColony(null);
    setScreen('game');
  };

  // Esc closes the overlay. Mirrors the pause overlay's hotkey contract
  // so the player has a single muscle-memory close gesture across all
  // game-stage overlays. The handler reads setters via `getState()` so
  // the effect can stay mount/unmount-only without re-binding when the
  // store actions identity changes between renders.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      const state = useGameStore.getState();
      state.setSelectedColony(null);
      state.setScreen('game');
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={styles.backdrop} data-testid="colony-overlay">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={colony ? `Colony view: ${colony.id}` : 'Colony view'}
        data-testid="colony-overlay-panel"
      >
        {colony ? (
          <ColonyDetails
            colony={colony}
            queue={queue}
            tradableShip={tradableShip}
            hasHomePort={hasHomePort}
            onClose={handleClose}
            onOpenTrade={() => {
              if (tradableShip && hasHomePort) {
                openTradeSession({ colonyId: colony.id, unitId: tradableShip.id });
              }
            }}
            onOpenTransfer={() => {
              if (tradableShip) {
                openTransferSession({ colonyId: colony.id, unitId: tradableShip.id });
              }
            }}
            onVisitTavern={() => {
              const picked = selectRumours({
                context: { town: colony.id, year: currentTurn, faction: playerFaction },
                count: 3,
              });
              showTavernEncounter({
                colonyId: colony.id,
                rumourIds: picked.map((r) => r.id),
              });
            }}
          />
        ) : (
          <MissingColony onClose={handleClose} />
        )}
      </div>
    </div>
  );
}

interface ColonyDetailsProps {
  readonly colony: ColonyJSON;
  readonly queue: readonly ProductionQueueItem[];
  readonly tradableShip: UnitJSON | null;
  readonly hasHomePort: boolean;
  readonly onClose: () => void;
  readonly onOpenTrade: () => void;
  readonly onOpenTransfer: () => void;
  readonly onVisitTavern: () => void;
}

function ColonyDetails({
  colony,
  queue,
  tradableShip,
  hasHomePort,
  onClose,
  onOpenTrade,
  onOpenTransfer,
  onVisitTavern,
}: ColonyDetailsProps): JSX.Element {
  const resources = Object.entries(colony.stocks.resources).filter(([, qty]) => qty > 0);
  const artifacts = colony.stocks.artifacts;
  return (
    <>
      <header className={styles.header}>
        <h2 className={styles.title} data-testid="colony-overlay-title">
          {colony.id}
        </h2>
        <span className={styles.subtitle} data-testid="colony-overlay-faction">
          {displayFaction(colony.faction)}
        </span>
      </header>
      <dl className={styles.summary} data-testid="colony-overlay-summary">
        <SummaryCell
          label="Position"
          value={`${colony.position.x},${colony.position.y}`}
          testId="colony-overlay-position"
        />
        <SummaryCell
          label="Population"
          value={String(colony.population)}
          testId="colony-overlay-population"
        />
        <SummaryCell
          label="Crew"
          value={String(colony.crew.length)}
          testId="colony-overlay-crew-count"
        />
      </dl>

      <CrewAndTilesPanel colony={colony} />

      <section className={styles.section} data-testid="colony-overlay-buildings">
        <h3 className={styles.sectionHeader}>Buildings</h3>
        {colony.buildings.length === 0 ? (
          <p className={styles.empty} data-testid="colony-overlay-buildings-empty">
            None built
          </p>
        ) : (
          <ul className={styles.list}>
            {colony.buildings.map((id) => (
              <li key={id} className={styles.chip} data-testid={`colony-overlay-building-${id}`}>
                {id}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section} data-testid="colony-overlay-stocks">
        <h3 className={styles.sectionHeader}>Stocks</h3>
        {resources.length === 0 && artifacts.length === 0 ? (
          <p className={styles.empty} data-testid="colony-overlay-stocks-empty">
            Empty stockpile
          </p>
        ) : (
          <div className={styles.stocks}>
            {resources.map(([id, qty]) => (
              <div key={id} className={styles.stockRow} data-testid={`colony-overlay-stock-${id}`}>
                <span className={styles.stockLabel}>{id}</span>
                <span className={styles.stockValue}>{qty}</span>
              </div>
            ))}
            {artifacts.map((id) => (
              <div
                key={id}
                className={styles.stockRow}
                data-testid={`colony-overlay-artifact-${id}`}
              >
                <span className={styles.stockLabel}>{id}</span>
                <span className={styles.stockValue}>artifact</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <ProductionQueuePanel colony={colony} queue={queue} />

      <AvailableBuildingsPanel colony={colony} queue={queue} />

      {hasHomePort ? <TradePanel tradableShip={tradableShip} onOpenTrade={onOpenTrade} /> : null}

      <TransferPanel tradableShip={tradableShip} onOpenTransfer={onOpenTransfer} />

      <TavernPanel colony={colony} onVisitTavern={onVisitTavern} />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          onClick={onClose}
          data-testid="colony-overlay-close"
          autoFocus
        >
          Close
        </button>
      </div>
    </>
  );
}

interface CrewAndTilesPanelProps {
  readonly colony: ColonyJSON;
}

// Crew pool + 8-neighbour work-slot grid. Drag a crew chip onto a slot
// to assign; assignment displaces any prior occupant back to the pool,
// and a crew can also be moved tile-to-tile by dragging. Click the
// small ✕ on an assigned chip to return the crew to the pool.
function CrewAndTilesPanel({ colony }: CrewAndTilesPanelProps): JSX.Element {
  const surroundings = useGameStore((s) => s.colonySurroundings[colony.id] ?? EMPTY_SURROUNDINGS);
  const assignments = useGameStore((s) => s.tileAssignments[colony.id] ?? EMPTY_ASSIGNMENTS);
  const assignCrewToTile = useGameStore((s) => s.assignCrewToTile);
  const unassignCrewFromTile = useGameStore((s) => s.unassignCrewFromTile);
  const [draggingCrewId, setDraggingCrewId] = useState<string | null>(null);

  const assignedCrew = new Set(Object.values(assignments));
  const poolCrew = colony.crew.filter((id) => !assignedCrew.has(id));

  const handleCrewDragStart =
    (id: string) =>
    (event: DragEvent<HTMLLIElement>): void => {
      event.dataTransfer.setData(CREW_DRAG_MIME, id);
      event.dataTransfer.setData('text/plain', id);
      event.dataTransfer.effectAllowed = 'move';
      setDraggingCrewId(id);
    };

  const handleDragEnd = (): void => setDraggingCrewId(null);

  const handleTileDragOver = (event: DragEvent<HTMLLIElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleTileDrop =
    (coord: Coord) =>
    (event: DragEvent<HTMLLIElement>): void => {
      event.preventDefault();
      const crewId = event.dataTransfer.getData(CREW_DRAG_MIME) || draggingCrewId;
      if (!crewId) return;
      assignCrewToTile(colony.id, crewId, coord);
      setDraggingCrewId(null);
    };

  return (
    <>
      <section className={styles.section} data-testid="colony-overlay-crew">
        <h3 className={styles.sectionHeader}>Crew pool</h3>
        {colony.crew.length === 0 ? (
          <p className={styles.empty} data-testid="colony-overlay-crew-empty">
            No crew assigned
          </p>
        ) : poolCrew.length === 0 ? (
          <p className={styles.empty} data-testid="colony-overlay-crew-pool-empty">
            All crew working tiles
          </p>
        ) : (
          <ul className={styles.list}>
            {poolCrew.map((id) => (
              <li
                key={id}
                className={`${styles.chip} ${styles.crewDraggable}`}
                draggable
                onDragStart={handleCrewDragStart(id)}
                onDragEnd={handleDragEnd}
                data-testid={`colony-overlay-crew-${id}`}
              >
                {id}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section} data-testid="colony-overlay-tiles">
        <h3 className={styles.sectionHeader}>Worked tiles</h3>
        {surroundings.length === 0 ? (
          <p className={styles.empty} data-testid="colony-overlay-tiles-empty">
            No surrounding tiles mapped
          </p>
        ) : (
          <ul className={styles.tileGrid}>
            {surroundings.map((cell) => (
              <TileSlot
                key={coordKey(cell.coord)}
                colonyId={colony.id}
                cell={cell}
                assignedCrewId={assignments[coordKey(cell.coord)] ?? null}
                onDragOver={handleTileDragOver}
                onDrop={handleTileDrop(cell.coord)}
                onUnassign={() => unassignCrewFromTile(colony.id, cell.coord)}
                onCrewDragStart={handleCrewDragStart}
                onCrewDragEnd={handleDragEnd}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

interface TileSlotProps {
  readonly colonyId: string;
  readonly cell: SurroundingTile;
  readonly assignedCrewId: string | null;
  readonly onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLLIElement>) => void;
  readonly onUnassign: () => void;
  readonly onCrewDragStart: (id: string) => (event: DragEvent<HTMLLIElement>) => void;
  readonly onCrewDragEnd: () => void;
}

function TileSlot({
  cell,
  assignedCrewId,
  onDragOver,
  onDrop,
  onUnassign,
  onCrewDragStart,
  onCrewDragEnd,
}: TileSlotProps): JSX.Element {
  const baseYield = getTileYield(cell.type);
  const postYield = assignedCrewId ? baseYield : {};
  const slotTestId = `colony-overlay-tile-${cell.coord.x}-${cell.coord.y}`;
  return (
    <li
      className={`${styles.tileSlot} ${assignedCrewId ? styles.tileSlotOccupied : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-testid={slotTestId}
    >
      <div className={styles.tileHeader}>
        <span className={styles.tileType}>{tileLabel(cell.type)}</span>
        <span className={styles.tileCoord}>
          {cell.coord.x},{cell.coord.y}
        </span>
      </div>
      <div
        className={styles.tileYield}
        data-testid={`${slotTestId}-yield`}
        aria-label={`Yield: ${formatYield(postYield)}; if worked: ${formatYield(baseYield)}`}
      >
        <span className={styles.yieldPre} data-testid={`${slotTestId}-yield-pre`}>
          now: {formatYield(postYield)}
        </span>
        <span className={styles.yieldPost} data-testid={`${slotTestId}-yield-post`}>
          worked: {formatYield(baseYield)}
        </span>
      </div>
      {assignedCrewId ? (
        <div className={styles.tileCrewRow}>
          <span
            className={`${styles.chip} ${styles.crewDraggable}`}
            draggable
            onDragStart={onCrewDragStart(assignedCrewId)}
            onDragEnd={onCrewDragEnd}
            data-testid={`colony-overlay-crew-${assignedCrewId}`}
          >
            {assignedCrewId}
          </span>
          <button
            type="button"
            className={styles.unassignButton}
            onClick={onUnassign}
            aria-label={`Unassign ${assignedCrewId}`}
            data-testid={`${slotTestId}-unassign`}
          >
            ✕
          </button>
        </div>
      ) : null}
    </li>
  );
}

// Frozen empty-default sentinels so `useGameStore` selector identity is
// stable across renders for colonies without a snapshot/assignment yet.
const EMPTY_SURROUNDINGS: readonly SurroundingTile[] = Object.freeze([]);
const EMPTY_ASSIGNMENTS: Readonly<Record<string, string>> = Object.freeze({});

interface ProductionQueuePanelProps {
  readonly colony: ColonyJSON;
  readonly queue: readonly ProductionQueueItem[];
}

function ProductionQueuePanel({ colony, queue }: ProductionQueuePanelProps): JSX.Element {
  const cancelQueueItem = useGameStore((s) => s.cancelQueueItem);
  const reorderQueueItem = useGameStore((s) => s.reorderQueueItem);
  return (
    <section className={styles.section} data-testid="colony-overlay-queue">
      <h3 className={styles.sectionHeader}>Production queue</h3>
      {queue.length === 0 ? (
        <p className={styles.empty} data-testid="colony-overlay-queue-empty">
          No builds queued
        </p>
      ) : (
        <ul className={styles.queueList}>
          {queue.map((item, index) => (
            <li
              key={item.buildingId}
              className={styles.queueItem}
              data-testid={`colony-overlay-queue-${item.buildingId}`}
            >
              <div className={styles.queueHeader}>
                <span className={styles.queueName}>{buildingDisplayName(item.buildingId)}</span>
                <span
                  className={styles.queueProgress}
                  data-testid={`colony-overlay-queue-progress-${item.buildingId}`}
                >
                  {item.progress} / {item.effort}
                </span>
              </div>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={item.effort}
                aria-valuenow={item.progress}
              >
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(100, (item.progress / Math.max(1, item.effort)) * 100)}%`,
                  }}
                />
              </div>
              <div className={styles.queueControls}>
                <button
                  type="button"
                  className={styles.queueButton}
                  onClick={() => reorderQueueItem(colony.id, index, 'up')}
                  disabled={index === 0}
                  aria-label={`Move ${buildingDisplayName(item.buildingId)} up`}
                  data-testid={`colony-overlay-queue-up-${item.buildingId}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.queueButton}
                  onClick={() => reorderQueueItem(colony.id, index, 'down')}
                  disabled={index === queue.length - 1}
                  aria-label={`Move ${buildingDisplayName(item.buildingId)} down`}
                  data-testid={`colony-overlay-queue-down-${item.buildingId}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={styles.queueButton}
                  onClick={() => cancelQueueItem(colony.id, index)}
                  aria-label={`Cancel ${buildingDisplayName(item.buildingId)}`}
                  data-testid={`colony-overlay-queue-cancel-${item.buildingId}`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface AvailableBuildingsPanelProps {
  readonly colony: ColonyJSON;
  readonly queue: readonly ProductionQueueItem[];
}

function AvailableBuildingsPanel({ colony, queue }: AvailableBuildingsPanelProps): JSX.Element {
  const enqueueBuilding = useGameStore((s) => s.enqueueBuilding);
  const available = availableBuildings(colony, queue);
  return (
    <section className={styles.section} data-testid="colony-overlay-available">
      <h3 className={styles.sectionHeader}>Available to build</h3>
      {available.length === 0 ? (
        <p className={styles.empty} data-testid="colony-overlay-available-empty">
          No buildings unlocked
        </p>
      ) : (
        <ul className={styles.availableList}>
          {available.map((id: BuildingType) => (
            <li key={id}>
              <button
                type="button"
                className={styles.availableButton}
                onClick={() => enqueueBuilding(colony.id, id)}
                data-testid={`colony-overlay-available-${id}`}
              >
                + {buildingDisplayName(id)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface SummaryCellProps {
  readonly label: string;
  readonly value: string;
  readonly testId: string;
}

function SummaryCell({ label, value, testId }: SummaryCellProps): JSX.Element {
  return (
    <div className={styles.summaryCell}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue} data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

function MissingColony({ onClose }: { readonly onClose: () => void }): JSX.Element {
  return (
    <>
      <p className={styles.missing} data-testid="colony-overlay-missing">
        No colony selected.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          onClick={onClose}
          data-testid="colony-overlay-close"
          autoFocus
        >
          Close
        </button>
      </div>
    </>
  );
}

function findColony(colonies: readonly ColonyJSON[], selectedId: string | null): ColonyJSON | null {
  if (selectedId === null) return null;
  return colonies.find((c) => c.id === selectedId) ?? null;
}

// First friendly ship sitting on the colony's own tile. Ordering is
// roster-insertion order so a repeat session (trade or transfer)
// reopens with the same ship unless the roster changes. Null when no
// eligible ship is at the colony.
function findFriendlyShipAt(
  units: readonly UnitJSON[],
  faction: string,
  position: Coord,
): UnitJSON | null {
  for (const unit of units) {
    if (unit.faction !== faction) continue;
    if (!isShipUnitType(unit.type)) continue;
    if (unit.position.x !== position.x || unit.position.y !== position.y) continue;
    return unit;
  }
  return null;
}

interface TradePanelProps {
  readonly tradableShip: UnitJSON | null;
  readonly onOpenTrade: () => void;
}

function TradePanel({ tradableShip, onOpenTrade }: TradePanelProps): JSX.Element {
  return (
    <section className={styles.section} data-testid="colony-overlay-trade">
      <h3 className={styles.sectionHeader}>Home-port trade</h3>
      {tradableShip === null ? (
        <p className={styles.empty} data-testid="colony-overlay-trade-empty">
          Dock a trade ship here to trade
        </p>
      ) : (
        <button
          type="button"
          className={styles.availableButton}
          onClick={onOpenTrade}
          data-testid="colony-overlay-trade-open"
        >
          Trade with {tradableShip.id}
        </button>
      )}
    </section>
  );
}

interface TavernPanelProps {
  readonly colony: ColonyJSON;
  readonly onVisitTavern: () => void;
}

// Surfaces only when the colony has built a tavern. Clicking the
// button rolls a hand of 3 rumours (via `selectRumours`) and opens
// the self-mounting TavernModal via `showTavernEncounter`.
function TavernPanel({ colony, onVisitTavern }: TavernPanelProps): JSX.Element | null {
  if (!colony.buildings.includes('tavern')) return null;
  return (
    <section className={styles.section} data-testid="colony-overlay-tavern">
      <h3 className={styles.sectionHeader}>Tavern</h3>
      <button
        type="button"
        className={styles.availableButton}
        onClick={onVisitTavern}
        data-testid="colony-overlay-tavern-visit"
      >
        Visit tavern
      </button>
    </section>
  );
}

interface TransferPanelProps {
  readonly tradableShip: UnitJSON | null;
  readonly onOpenTransfer: () => void;
}

function TransferPanel({ tradableShip, onOpenTransfer }: TransferPanelProps): JSX.Element {
  return (
    <section className={styles.section} data-testid="colony-overlay-transfer">
      <h3 className={styles.sectionHeader}>Cargo transfer</h3>
      {tradableShip === null ? (
        <p className={styles.empty} data-testid="colony-overlay-transfer-empty">
          Dock a ship here to load or unload cargo
        </p>
      ) : (
        <button
          type="button"
          className={styles.availableButton}
          onClick={onOpenTransfer}
          data-testid="colony-overlay-transfer-open"
        >
          Transfer cargo with {tradableShip.id}
        </button>
      )}
    </section>
  );
}
