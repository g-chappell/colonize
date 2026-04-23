import { useEffect, useState } from 'react';
import { getTitheFlavour, type ConcordTensionTier } from '@colonize/content';
import { useGameStore } from '../store/game';
import styles from './TithePaymentModal.module.css';

// Mounts while `titheNotification !== null`. Slice-driven self-mounting
// overlay per CLAUDE.md — the orchestrator that drives per-turn tithe
// computation (a future task) calls `showTitheNotification(amount)`;
// this modal handles the player's choice and clears the slice.
//
// Two phases, tracked by local `useState` rather than a second store
// slice (the boycott-acknowledgement copy is purely cosmetic — the
// tension raise has already happened, so the slice would survive a
// dismiss-and-reopen with no semantic meaning):
//
//   1. 'choice' — heading + summary copy + Pay/Boycott buttons
//   2. 'boycotted' — boycott flavour copy + a single dismiss button
//
// The flavour copy is read from `@colonize/content` keyed on the
// player's *current* tension tier (number of thresholds already
// crossed), so each refusal escalates the tone. The Pay path skips the
// confirmation phase — there is no "you paid" beat in the canon.
export function TithePaymentModal(): JSX.Element | null {
  const notification = useGameStore((s) => s.titheNotification);
  const tensionSnapshot = useGameStore((s) => s.concordTension);
  const payTithe = useGameStore((s) => s.payTithe);
  const boycottTithe = useGameStore((s) => s.boycottTithe);
  const [phase, setPhase] = useState<'choice' | 'boycotted'>('choice');

  // Reset to the choice view whenever the notification slice clears so a
  // subsequent notification opens fresh — defence-in-depth against a
  // direct setState path that bypasses the acknowledge handler.
  useEffect(() => {
    if (!notification) setPhase('choice');
  }, [notification]);

  if (!notification) return null;

  const tier = clampTensionTier(tensionSnapshot.crossed.length);
  const flavour = getTitheFlavour(tier);

  if (phase === 'choice') {
    return (
      <div className={styles.backdrop} data-testid="tithe-payment">
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label={`Concord tithe: ${flavour.heading}`}
          data-testid="tithe-payment-panel"
        >
          <span className={styles.tier} data-testid="tithe-payment-tier">
            {flavour.tierLabel}
          </span>
          <h2 className={styles.title} data-testid="tithe-payment-title">
            {flavour.heading}
          </h2>
          <p className={styles.summary} data-testid="tithe-payment-summary">
            {flavour.summary}
          </p>
          <div className={styles.amount} data-testid="tithe-payment-amount">
            <span className={styles.amountValue}>{notification.amount}</span>
            <span className={styles.amountLabel}>coins due</span>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.pay}
              onClick={payTithe}
              data-testid="tithe-payment-pay"
              autoFocus
            >
              Pay the tithe
            </button>
            <button
              type="button"
              className={styles.boycott}
              onClick={() => setPhase('boycotted')}
              data-testid="tithe-payment-boycott"
            >
              Boycott
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.backdrop} data-testid="tithe-payment">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Boycott consequence"
        data-testid="tithe-payment-panel"
      >
        <span className={styles.tier} data-testid="tithe-payment-tier">
          {flavour.tierLabel} · Refused
        </span>
        <h2 className={styles.title} data-testid="tithe-payment-title">
          The Tithe Refused
        </h2>
        <p className={styles.boycottFlavour} data-testid="tithe-payment-boycott-flavour">
          {flavour.boycottFlavour}
        </p>
        <button
          type="button"
          className={styles.dismiss}
          onClick={() => {
            boycottTithe();
            setPhase('choice');
          }}
          data-testid="tithe-payment-acknowledge"
          autoFocus
        >
          Stand defiant
        </button>
      </div>
    </div>
  );
}

function clampTensionTier(crossedCount: number): ConcordTensionTier {
  if (crossedCount <= 0) return 0;
  if (crossedCount >= 4) return 4;
  return crossedCount as ConcordTensionTier;
}
