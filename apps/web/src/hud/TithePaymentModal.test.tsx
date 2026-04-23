import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CONCORD_TENSION_THRESHOLDS } from '@colonize/core';
import { getTitheFlavour } from '@colonize/content';
import { useGameStore } from '../store/game';
import { TithePaymentModal } from './TithePaymentModal';

function showTithe(amount: number): void {
  useGameStore.getState().showTitheNotification({ amount });
}

function setCrossedThresholds(count: number): void {
  const crossed = CONCORD_TENSION_THRESHOLDS.slice(0, count);
  const lastCrossed = crossed.length > 0 ? crossed[crossed.length - 1]! : 0;
  useGameStore.setState({
    concordTension: {
      tension: lastCrossed,
      thresholds: [...CONCORD_TENSION_THRESHOLDS],
      crossed: [...crossed],
      pending: [],
    },
  });
}

describe('TithePaymentModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no tithe notification is pending', () => {
    const { container } = render(<TithePaymentModal />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the baseline (tier 0) heading + amount when no thresholds are crossed', () => {
    showTithe(35);
    render(<TithePaymentModal />);
    const baseline = getTitheFlavour(0);
    expect(screen.getByTestId('tithe-payment-tier')).toHaveTextContent(baseline.tierLabel);
    expect(screen.getByTestId('tithe-payment-title')).toHaveTextContent(baseline.heading);
    expect(screen.getByTestId('tithe-payment-summary')).toHaveTextContent(baseline.summary);
    expect(screen.getByTestId('tithe-payment-amount')).toHaveTextContent('35');
    expect(screen.getByTestId('tithe-payment-amount')).toHaveTextContent(/coins due/i);
  });

  it('escalates the heading copy as the player crosses tension thresholds', () => {
    setCrossedThresholds(2);
    showTithe(50);
    render(<TithePaymentModal />);
    const tier2 = getTitheFlavour(2);
    expect(screen.getByTestId('tithe-payment-title')).toHaveTextContent(tier2.heading);
    expect(screen.getByTestId('tithe-payment-tier')).toHaveTextContent(tier2.tierLabel);
  });

  it('clamps to tier 4 once every threshold has been crossed', () => {
    setCrossedThresholds(4);
    showTithe(80);
    render(<TithePaymentModal />);
    const ultimatum = getTitheFlavour(4);
    expect(screen.getByTestId('tithe-payment-title')).toHaveTextContent(ultimatum.heading);
  });

  it('clears the notification slice when Pay is clicked', () => {
    showTithe(20);
    render(<TithePaymentModal />);
    fireEvent.click(screen.getByTestId('tithe-payment-pay'));
    expect(useGameStore.getState().titheNotification).toBeNull();
  });

  it('does not raise tension when Pay is clicked', () => {
    showTithe(20);
    render(<TithePaymentModal />);
    fireEvent.click(screen.getByTestId('tithe-payment-pay'));
    expect(useGameStore.getState().concordTension.tension).toBe(0);
    expect(useGameStore.getState().concordTension.crossed).toEqual([]);
  });

  it('switches to the boycott confirmation phase when Boycott is clicked', () => {
    showTithe(20);
    render(<TithePaymentModal />);
    fireEvent.click(screen.getByTestId('tithe-payment-boycott'));
    expect(screen.getByTestId('tithe-payment-boycott-flavour')).toBeInTheDocument();
    expect(screen.queryByTestId('tithe-payment-pay')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tithe-payment-boycott')).not.toBeInTheDocument();
  });

  it('does not raise tension or clear the notification on the first Boycott click', () => {
    showTithe(30);
    render(<TithePaymentModal />);
    fireEvent.click(screen.getByTestId('tithe-payment-boycott'));
    expect(useGameStore.getState().titheNotification).not.toBeNull();
    expect(useGameStore.getState().concordTension.tension).toBe(0);
  });

  it('reads the boycott flavour from the current tier copy', () => {
    setCrossedThresholds(1);
    showTithe(40);
    render(<TithePaymentModal />);
    fireEvent.click(screen.getByTestId('tithe-payment-boycott'));
    const tier1 = getTitheFlavour(1);
    expect(screen.getByTestId('tithe-payment-boycott-flavour')).toHaveTextContent(
      tier1.boycottFlavour,
    );
  });

  it('raises tension by the tithe amount and clears the slice on Stand defiant', () => {
    showTithe(30);
    render(<TithePaymentModal />);
    fireEvent.click(screen.getByTestId('tithe-payment-boycott'));
    fireEvent.click(screen.getByTestId('tithe-payment-acknowledge'));
    expect(useGameStore.getState().titheNotification).toBeNull();
    expect(useGameStore.getState().concordTension.tension).toBe(30);
  });

  it('records crossed thresholds when a single boycott exceeds the next ladder rung', () => {
    showTithe(60);
    render(<TithePaymentModal />);
    fireEvent.click(screen.getByTestId('tithe-payment-boycott'));
    fireEvent.click(screen.getByTestId('tithe-payment-acknowledge'));
    const snapshot = useGameStore.getState().concordTension;
    expect(snapshot.crossed).toEqual([25, 50]);
  });

  it('floors fractional amounts when raising tension', () => {
    showTithe(25.9);
    render(<TithePaymentModal />);
    fireEvent.click(screen.getByTestId('tithe-payment-boycott'));
    fireEvent.click(screen.getByTestId('tithe-payment-acknowledge'));
    expect(useGameStore.getState().concordTension.tension).toBe(25);
  });
});
