import { useEffect, useState } from 'react';
import type { ResourceId } from '@colonize/core';
import { getTidewaterPartyFlavour } from '@colonize/content';
import { useGameStore } from '../store/game';
import styles from './TidewaterPartyModal.module.css';

// Mounts while `tidewaterPartyEvent !== null`. Slice-driven
// self-mounting overlay per CLAUDE.md — the trigger orchestrator (a
// future task wires the on-map action) calls
// `showTidewaterPartyEvent(event)`; this modal handles the player's
// choice and clears the slice. Local `useState` tracks the
// good-selection dropdown; the event payload drives the filtered
// menu so the modal never needs to know where the cargo lives.
export function TidewaterPartyModal(): JSX.Element | null {
  const event = useGameStore((s) => s.tidewaterPartyEvent);
  const confirmTidewaterParty = useGameStore((s) => s.confirmTidewaterParty);
  const dismissTidewaterPartyEvent = useGameStore((s) => s.dismissTidewaterPartyEvent);
  const [selected, setSelected] = useState<ResourceId | ''>('');

  // Reset the selection whenever the event slice clears so a
  // subsequent event opens with no stale choice.
  useEffect(() => {
    if (!event) setSelected('');
  }, [event]);

  if (!event) return null;

  const flavour = getTidewaterPartyFlavour();
  const eligible = Object.entries(event.availableCargo)
    .filter(([, qty]) => qty >= event.dumpQty)
    .sort(([a], [b]) => a.localeCompare(b));
  const hasChoice = eligible.length > 0;
  const confirmDisabled = !hasChoice || selected === '';

  return (
    <div className={styles.backdrop} data-testid="tidewater-party">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={flavour.heading}
        data-testid="tidewater-party-panel"
      >
        <span className={styles.dateline} data-testid="tidewater-party-dateline">
          {flavour.dateline}
        </span>
        <h2 className={styles.title} data-testid="tidewater-party-title">
          {flavour.heading}
        </h2>
        <p className={styles.summary} data-testid="tidewater-party-summary">
          {flavour.summary}
        </p>
        <div className={styles.consequence} data-testid="tidewater-party-consequence">
          <div className={styles.consequenceRow}>
            <span className={styles.consequenceValue}>{event.dumpQty}</span>
            <span className={styles.consequenceLabel}>crates overboard</span>
          </div>
          <div className={styles.consequenceRow}>
            <span className={styles.consequenceValue}>{event.freezeTurns}</span>
            <span className={styles.consequenceLabel}>turns of reprieve</span>
          </div>
          <div className={styles.consequenceRow}>
            <span className={styles.consequenceValue}>+{event.irePenalty}</span>
            <span className={styles.consequenceLabel}>Concord ire</span>
          </div>
        </div>
        {hasChoice ? (
          <label className={styles.chooser} data-testid="tidewater-party-chooser">
            <span className={styles.chooserLabel}>{flavour.chooseGoodLabel}</span>
            <select
              className={styles.select}
              value={selected}
              onChange={(ev) => setSelected(ev.target.value as ResourceId | '')}
              data-testid="tidewater-party-select"
            >
              <option value="" disabled>
                —
              </option>
              {eligible.map(([resourceId, qty]) => (
                <option key={resourceId} value={resourceId}>
                  {titleCase(resourceId)} (have {qty})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className={styles.noCargo} data-testid="tidewater-party-no-cargo">
            No hold carries enough cargo for the gesture. The tidewater must wait.
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={dismissTidewaterPartyEvent}
            data-testid="tidewater-party-cancel"
          >
            {flavour.cancelLabel}
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={() => {
              if (selected === '') return;
              confirmTidewaterParty(selected, event.dumpQty);
            }}
            disabled={confirmDisabled}
            data-testid="tidewater-party-confirm"
          >
            {flavour.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function titleCase(id: string): string {
  return id
    .split('-')
    .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join(' ');
}
