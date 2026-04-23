import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { getBlackMarketOffering, type BlackMarketOffering } from '@colonize/content';
import { useGameStore } from '../store/game';
import { BlackMarketModal } from './BlackMarketModal';

function showEncounter(offerings: readonly BlackMarketOffering[]): void {
  useGameStore.setState({ blackMarketEncounter: { offerings } });
}

describe('BlackMarketModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no encounter is pending', () => {
    const { container } = render(<BlackMarketModal />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the Blackwater Collective header and Tortuga place chrome', () => {
    showEncounter([getBlackMarketOffering('buy-timber-bundle')]);
    render(<BlackMarketModal />);
    expect(screen.getByTestId('black-market-title')).toHaveTextContent(/Blackwater Collective/i);
    expect(screen.getByTestId('black-market-place')).toHaveTextContent(/Tortuga/i);
    expect(screen.getByTestId('black-market-summary').textContent ?? '').not.toHaveLength(0);
  });

  it('renders a row per trade offering with its price, quantity, and pitch', () => {
    const buy = getBlackMarketOffering('buy-forgework-crate');
    const sell = getBlackMarketOffering('sell-salvage-load');
    showEncounter([buy, sell]);
    render(<BlackMarketModal />);

    const buyRow = screen.getByTestId(`black-market-offer-${buy.id}`);
    expect(buyRow).toHaveTextContent(`${buy.priceChimes} Chimes`);
    expect(buyRow).toHaveTextContent(/Forgework/i);
    expect(screen.getByTestId(`black-market-pitch-${buy.id}`).textContent ?? '').toMatch(
      /Rayon stamp/,
    );

    const sellRow = screen.getByTestId(`black-market-offer-${sell.id}`);
    expect(sellRow).toHaveTextContent(`${sell.priceChimes} Chimes`);
    expect(sellRow).toHaveTextContent(/Salvage/i);
  });

  it('uses "Asks" for buy offers and "Pays" for sell offers', () => {
    const buy = getBlackMarketOffering('buy-planks-parcel');
    const sell = getBlackMarketOffering('sell-provisions-cask');
    showEncounter([buy, sell]);
    render(<BlackMarketModal />);
    expect(screen.getByTestId(`black-market-line-${buy.id}`)).toHaveTextContent(/Asks/i);
    expect(screen.getByTestId(`black-market-line-${sell.id}`)).toHaveTextContent(/Pays/i);
  });

  it('omits the Talisman aside when no talisman offer is present', () => {
    showEncounter([getBlackMarketOffering('buy-timber-bundle')]);
    render(<BlackMarketModal />);
    expect(screen.queryByTestId('black-market-talisman')).toBeNull();
  });

  it('shows the Kraken Talisman aside with its high Chime price when offered', () => {
    const talisman = getBlackMarketOffering('talisman-kraken');
    showEncounter([getBlackMarketOffering('buy-timber-bundle'), talisman]);
    render(<BlackMarketModal />);
    expect(screen.getByTestId('black-market-talisman-name')).toHaveTextContent(/Kraken Talisman/i);
    expect(screen.getByTestId('black-market-talisman-price')).toHaveTextContent(
      `${talisman.priceChimes} Chimes`,
    );
  });

  it('dismisses the encounter on Leave click', () => {
    showEncounter([getBlackMarketOffering('buy-timber-bundle')]);
    render(<BlackMarketModal />);
    fireEvent.click(screen.getByTestId('black-market-leave'));
    expect(useGameStore.getState().blackMarketEncounter).toBeNull();
  });

  it('renders only the Talisman aside when the encounter is a single-artefact stall', () => {
    const talisman = getBlackMarketOffering('talisman-kraken');
    showEncounter([talisman]);
    render(<BlackMarketModal />);
    expect(screen.queryByTestId('black-market-stalls')).toBeNull();
    expect(screen.getByTestId('black-market-talisman')).toBeInTheDocument();
  });
});
