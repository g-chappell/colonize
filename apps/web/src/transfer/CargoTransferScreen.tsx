import { useEffect, useMemo, useState } from 'react';
import type { ResourceId } from '@colonize/core';
import { useGameStore } from '../store/game';
import { computeTransferRows, type TransferRow } from './transfer-math';
import styles from './CargoTransferScreen.module.css';

// Mounts while `screen === 'transfer'`. Reads the active TransferSession,
// resolves the colony + ship from the store, and renders one slider per
// resource present on either side. Sliders centre on zero with min =
// -shipQty (move all of ship → colony) and max = +colonyQty (pull
// everything from colony → ship). Confirming applies the transfer
// atomically via `commitCargoTransfer`. Close routes back to the
// colony overlay the player came from.
export function CargoTransferScreen(): JSX.Element {
  const session = useGameStore((s) => s.transferSession);
  const colonies = useGameStore((s) => s.colonies);
  const units = useGameStore((s) => s.units);
  const closeTransferSession = useGameStore((s) => s.closeTransferSession);
  const commitCargoTransfer = useGameStore((s) => s.commitCargoTransfer);

  const colony = session ? colonies.find((c) => c.id === session.colonyId) : undefined;
  const ship = session ? units.find((u) => u.id === session.unitId) : undefined;

  // Sliders map resourceId → proposed qty (positive = colony → ship,
  // negative = ship → colony). Re-initialised to zeros when the
  // colony+ship pair changes so a fresh visit doesn't carry forward
  // leftover sliders, and again after every confirm.
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const sessionKey = session ? `${session.colonyId}::${session.unitId}` : '';
  useEffect(() => {
    setQuantities({});
  }, [sessionKey]);

  const rows: readonly TransferRow[] = useMemo(
    () => (ship && colony ? computeTransferRows(ship.cargo, colony.stocks) : []),
    [ship, colony],
  );

  // Esc closes the transfer screen. Mirrors the colony / pause / trade
  // overlays so muscle memory carries across every stacked overlay.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      useGameStore.getState().closeTransferSession();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSlider = (resourceId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setQuantities((prev) => ({ ...prev, [resourceId]: value }));
  };

  const handleConfirm = (): void => {
    if (!session || !colony || !ship) return;
    const lines = rows
      .map((row) => ({
        resourceId: row.resourceId as ResourceId,
        qty: quantities[row.resourceId] ?? 0,
      }))
      .filter((l) => l.qty !== 0);
    if (lines.length === 0) return;
    commitCargoTransfer(colony.id, ship.id, lines);
    setQuantities({});
  };

  const handleClose = (): void => closeTransferSession();

  if (!session || !colony || !ship) {
    return (
      <div className={styles.backdrop} data-testid="transfer-screen">
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label="Cargo transfer"
          data-testid="transfer-screen-panel"
        >
          <p className={styles.missing} data-testid="transfer-screen-missing">
            No transfer session.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={handleClose}
              data-testid="transfer-screen-close"
              autoFocus
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const anyNonZero = rows.some((r) => (quantities[r.resourceId] ?? 0) !== 0);

  return (
    <div className={styles.backdrop} data-testid="transfer-screen">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Cargo transfer at ${colony.id}`}
        data-testid="transfer-screen-panel"
      >
        <header className={styles.header}>
          <h2 className={styles.title} data-testid="transfer-screen-title">
            Transfer · {colony.id}
          </h2>
          <span className={styles.subtitle} data-testid="transfer-screen-ship">
            {ship.id}
          </span>
        </header>

        {rows.length === 0 ? (
          <p className={styles.empty} data-testid="transfer-screen-empty">
            Nothing to transfer — both holds are empty.
          </p>
        ) : (
          <ul className={styles.rows} data-testid="transfer-screen-rows">
            {rows.map((row) => (
              <TransferSlot
                key={row.resourceId}
                row={row}
                qty={quantities[row.resourceId] ?? 0}
                onChange={handleSlider(row.resourceId)}
              />
            ))}
          </ul>
        )}

        <footer className={styles.footer}>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={handleConfirm}
              disabled={!anyNonZero}
              data-testid="transfer-screen-confirm"
            >
              Confirm
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={handleClose}
              data-testid="transfer-screen-close"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface TransferSlotProps {
  readonly row: TransferRow;
  readonly qty: number;
  readonly onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function TransferSlot({ row, qty, onChange }: TransferSlotProps): JSX.Element {
  const rowTestId = `transfer-row-${row.resourceId}`;
  const direction = qty === 0 ? 'idle' : qty > 0 ? 'colony → ship' : 'ship → colony';
  return (
    <li className={styles.row} data-testid={rowTestId}>
      <div className={styles.rowHeader}>
        <span className={styles.rowLabel}>{row.resourceId}</span>
        <span className={styles.rowDirection} data-testid={`${rowTestId}-direction`}>
          {direction}
        </span>
      </div>
      <div className={styles.rowSides}>
        <span className={styles.sideShip} data-testid={`${rowTestId}-ship`}>
          ship: {row.shipQty}
        </span>
        <span className={styles.sideColony} data-testid={`${rowTestId}-colony`}>
          colony: {row.colonyQty}
        </span>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={-row.shipQty}
        max={row.colonyQty}
        step={1}
        value={qty}
        onChange={onChange}
        data-testid={`${rowTestId}-slider`}
        aria-label={`${row.resourceId} transfer — negative moves to colony, positive moves to ship`}
      />
      <div className={styles.rowFooter}>
        <span className={styles.rowQty} data-testid={`${rowTestId}-qty`}>
          {qty > 0 ? `+${qty}` : qty}
        </span>
      </div>
    </li>
  );
}
