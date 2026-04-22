import { useEffect } from 'react';
import type { BuildingType, ColonyJSON } from '@colonize/core';
import { getBuilding, isBuildingEntryId, type BuildingEntryId } from '@colonize/content';
import { FACTION_NAMES, useGameStore, type PlayableFaction } from '../store/game';
import { availableBuildings, type ProductionQueueItem } from './build-queue';
import styles from './ColonyOverlay.module.css';

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
// the roster and shows its summary, crew, buildings, stocks, production
// queue, and buildings available to queue. The tile-work panel stays a
// placeholder until TASK-042 (tile yields) lands. Closing routes the
// screen back to 'game' so the underlying GameScene resumes its normal
// interaction model.
export function ColonyOverlay(): JSX.Element {
  const colonies = useGameStore((s) => s.colonies);
  const selectedColonyId = useGameStore((s) => s.selectedColonyId);
  const colonyQueues = useGameStore((s) => s.colonyQueues);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSelectedColony = useGameStore((s) => s.setSelectedColony);

  const colony = findColony(colonies, selectedColonyId);
  const queue = colony ? (colonyQueues[colony.id] ?? []) : [];

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
          <ColonyDetails colony={colony} queue={queue} onClose={handleClose} />
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
  readonly onClose: () => void;
}

function ColonyDetails({ colony, queue, onClose }: ColonyDetailsProps): JSX.Element {
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

      <section className={styles.section} data-testid="colony-overlay-crew">
        <h3 className={styles.sectionHeader}>Crew assigned</h3>
        {colony.crew.length === 0 ? (
          <p className={styles.empty} data-testid="colony-overlay-crew-empty">
            No crew assigned
          </p>
        ) : (
          <ul className={styles.list}>
            {colony.crew.map((id) => (
              <li key={id} className={styles.chip} data-testid={`colony-overlay-crew-${id}`}>
                {id}
              </li>
            ))}
          </ul>
        )}
      </section>

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

      <section className={styles.section} data-testid="colony-overlay-tiles">
        <h3 className={styles.sectionHeader}>Worked tiles</h3>
        <p className={styles.placeholder}>Tile-yield model lands with TASK-042</p>
      </section>

      <ProductionQueuePanel colony={colony} queue={queue} />

      <AvailableBuildingsPanel colony={colony} queue={queue} />

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
