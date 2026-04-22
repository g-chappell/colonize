import { useEffect, useMemo, useState } from 'react';
import { HomePort, type ResourceId } from '@colonize/core';
import { useGameStore } from '../store/game';
import { computeTradeTotals } from './trade-math';
import styles from './TradeScreen.module.css';

// Maximum qty the player can add per resource in a single visit.
// Keeps slider ranges bounded and prevents runaway price swings that
// would make the mid-price math saturate at its clamps.
const MAX_BUY_PER_VISIT = 20;

// Mounts while `screen === 'trade'`. Reads the active TradeSession,
// resolves the HomePort + ship from the store, and renders a table of
// tradable resources with per-resource buy/sell sliders and a running
// coin delta. Confirming applies the trade atomically via
// `commitTrade` and resets the slider state. Close routes back to the
// colony overlay the player came from.
export function TradeScreen(): JSX.Element {
  const session = useGameStore((s) => s.tradeSession);
  const homePorts = useGameStore((s) => s.homePorts);
  const units = useGameStore((s) => s.units);
  const colonies = useGameStore((s) => s.colonies);
  const closeTradeSession = useGameStore((s) => s.closeTradeSession);
  const commitTrade = useGameStore((s) => s.commitTrade);

  const colony = session ? colonies.find((c) => c.id === session.colonyId) : undefined;
  const ship = session ? units.find((u) => u.id === session.unitId) : undefined;
  const portJson = colony ? homePorts[colony.faction] : undefined;

  // Sliders map resourceId → proposed qty (positive = buy, negative =
  // sell). Re-initialised to zeros when the port identity changes so a
  // fresh visit doesn't inherit leftover non-zero values from a prior
  // session.
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  useEffect(() => {
    setQuantities({});
  }, [portJson?.id]);

  const port = useMemo(() => (portJson ? HomePort.fromJSON(portJson) : null), [portJson]);
  const totals = useMemo(
    () => (port ? computeTradeTotals(port, quantities) : null),
    [port, quantities],
  );

  // Esc closes the trade screen. Mirrors colony/pause overlays so
  // muscle memory carries across every stacked game-stage screen.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      useGameStore.getState().closeTradeSession();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSlider = (resourceId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setQuantities((prev) => ({ ...prev, [resourceId]: value }));
  };

  const handleConfirm = (): void => {
    if (!session || !port || !ship || !totals) return;
    const lines = totals.lines
      .filter((l) => l.qty !== 0)
      .map((l) => ({ resourceId: l.resourceId, qty: l.qty }));
    if (lines.length === 0) return;
    commitTrade(colony!.faction, ship.id, lines);
    setQuantities({});
  };

  const handleClose = (): void => closeTradeSession();

  if (!session || !colony || !ship || !port || !portJson || !totals) {
    return (
      <div className={styles.backdrop} data-testid="trade-screen">
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label="Trade screen"
          data-testid="trade-screen-panel"
        >
          <p className={styles.missing} data-testid="trade-screen-missing">
            No trade session.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={handleClose}
              data-testid="trade-screen-close"
              autoFocus
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.backdrop} data-testid="trade-screen">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Trade at ${colony.id}`}
        data-testid="trade-screen-panel"
      >
        <header className={styles.header}>
          <h2 className={styles.title} data-testid="trade-screen-title">
            Trade · {colony.id}
          </h2>
          <span className={styles.subtitle} data-testid="trade-screen-ship">
            {ship.id}
          </span>
        </header>

        <ul className={styles.rows} data-testid="trade-screen-rows">
          {totals.lines.map((line) => (
            <TradeRow
              key={line.resourceId}
              resourceId={line.resourceId}
              qty={line.qty}
              unitPrice={line.unitPrice}
              lineTotal={line.lineTotal}
              sellPrice={port.sellPrice(line.resourceId)}
              buyBackPrice={port.buyBackPrice(line.resourceId)}
              shipQty={ship.cargo.resources[line.resourceId] ?? 0}
              onChange={handleSlider(line.resourceId)}
            />
          ))}
        </ul>

        <footer className={styles.footer}>
          <div className={styles.profit} data-testid="trade-screen-profit">
            <span className={styles.profitLabel}>Net</span>
            <span
              className={totals.netCoin >= 0 ? styles.profitGain : styles.profitLoss}
              data-testid="trade-screen-profit-value"
            >
              {formatCoin(totals.netCoin)}
            </span>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={handleConfirm}
              disabled={totals.lines.every((l) => l.qty === 0)}
              data-testid="trade-screen-confirm"
            >
              Confirm
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={handleClose}
              data-testid="trade-screen-close"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface TradeRowProps {
  readonly resourceId: ResourceId;
  readonly qty: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly sellPrice: number;
  readonly buyBackPrice: number;
  readonly shipQty: number;
  readonly onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function TradeRow({
  resourceId,
  qty,
  unitPrice,
  lineTotal,
  sellPrice,
  buyBackPrice,
  shipQty,
  onChange,
}: TradeRowProps): JSX.Element {
  const rowTestId = `trade-row-${resourceId}`;
  return (
    <li className={styles.row} data-testid={rowTestId}>
      <div className={styles.rowHeader}>
        <span className={styles.rowLabel}>{resourceId}</span>
        <span className={styles.rowHold} data-testid={`${rowTestId}-hold`}>
          hold: {shipQty}
        </span>
      </div>
      <div className={styles.rowPrices}>
        <span data-testid={`${rowTestId}-buy-price`}>buy {sellPrice}</span>
        <span data-testid={`${rowTestId}-sell-price`}>sell {buyBackPrice}</span>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={-shipQty}
        max={MAX_BUY_PER_VISIT}
        step={1}
        value={qty}
        onChange={onChange}
        data-testid={`${rowTestId}-slider`}
        aria-label={`${resourceId} quantity — negative sells to port, positive buys from port`}
      />
      <div className={styles.rowFooter}>
        <span className={styles.rowQty} data-testid={`${rowTestId}-qty`}>
          {qty > 0 ? `+${qty}` : qty}
        </span>
        <span
          className={lineTotal >= 0 ? styles.rowTotalGain : styles.rowTotalLoss}
          data-testid={`${rowTestId}-total`}
        >
          {qty === 0 ? `@ ${unitPrice}` : formatCoin(lineTotal)}
        </span>
      </div>
    </li>
  );
}

function formatCoin(n: number): string {
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `${n}`;
}
