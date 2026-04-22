import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DiplomacyAction, RelationsMatrix } from '@colonize/core';
import { useGameStore } from '../store/game';
import { DiplomacyScreen } from './DiplomacyScreen';

function seedRelations(mutate: (m: RelationsMatrix) => void): void {
  const m = new RelationsMatrix();
  mutate(m);
  useGameStore.getState().setRelations(m.toJSON());
}

describe('DiplomacyScreen', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().setFaction('otk');
    useGameStore.getState().setCurrentTurn(3);
    useGameStore.getState().openDiplomacy();
  });

  it('routes the screen to diplomacy when openDiplomacy is called', () => {
    expect(useGameStore.getState().screen).toBe('diplomacy');
  });

  it('renders a card for every peer faction but not the player', () => {
    render(<DiplomacyScreen />);
    expect(screen.queryByTestId('diplomacy-card-otk')).not.toBeInTheDocument();
    expect(screen.getByTestId('diplomacy-card-ironclad')).toBeInTheDocument();
    expect(screen.getByTestId('diplomacy-card-phantom')).toBeInTheDocument();
    expect(screen.getByTestId('diplomacy-card-bloodborne')).toBeInTheDocument();
  });

  it('defaults every card to neutral · 0 with no recent action', () => {
    render(<DiplomacyScreen />);
    expect(screen.getByTestId('diplomacy-card-ironclad-stance')).toHaveTextContent('neutral · 0');
    expect(screen.getByTestId('diplomacy-card-ironclad-last')).toHaveTextContent(
      'Last: no recent action.',
    );
  });

  it('renders a button per diplomacy action on each card', () => {
    render(<DiplomacyScreen />);
    for (const action of [
      'declare-war',
      'propose-peace',
      'propose-alliance',
      'gift-resources',
      'denounce',
      'share-intel',
    ]) {
      expect(screen.getByTestId(`diplomacy-card-ironclad-action-${action}`)).toBeInTheDocument();
    }
  });

  it('disables an action button when the pair is on cooldown for it', () => {
    seedRelations((m) => {
      m.setCooldown('otk', 'ironclad', DiplomacyAction.ProposeAlliance, 10);
    });
    render(<DiplomacyScreen />);
    const alliance = screen.getByTestId(
      'diplomacy-card-ironclad-action-propose-alliance',
    ) as HTMLButtonElement;
    expect(alliance.disabled).toBe(true);
    expect(
      screen.getByTestId('diplomacy-card-ironclad-action-propose-alliance-cooldown'),
    ).toHaveTextContent('turn 10');
  });

  it('opens the confirmation modal when an action is clicked', () => {
    render(<DiplomacyScreen />);
    fireEvent.click(screen.getByTestId('diplomacy-card-ironclad-action-gift-resources'));
    expect(screen.getByTestId('diplomacy-modal')).toBeInTheDocument();
    expect(screen.getByTestId('diplomacy-modal-title')).toHaveTextContent('Gift Resources');
    expect(screen.getByTestId('diplomacy-modal-title')).toHaveTextContent('Ironclad Syndicate');
    expect(screen.getByTestId('diplomacy-modal-cost')).toBeInTheDocument();
    expect(screen.getByTestId('diplomacy-modal-flavour').textContent?.length ?? 0).toBeGreaterThan(
      20,
    );
  });

  it('cancel closes only the modal, not the screen', () => {
    render(<DiplomacyScreen />);
    fireEvent.click(screen.getByTestId('diplomacy-card-ironclad-action-gift-resources'));
    fireEvent.click(screen.getByTestId('diplomacy-modal-cancel'));
    expect(screen.queryByTestId('diplomacy-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('diplomacy-screen')).toBeInTheDocument();
    expect(useGameStore.getState().screen).toBe('diplomacy');
  });

  it('confirm commits an attempt: updates relations matrix + last outcome + closes modal', () => {
    render(<DiplomacyScreen />);
    fireEvent.click(screen.getByTestId('diplomacy-card-ironclad-action-gift-resources'));
    fireEvent.click(screen.getByTestId('diplomacy-modal-confirm'));

    const state = useGameStore.getState();
    expect(state.lastDiplomacyOutcome?.action).toBe(DiplomacyAction.GiftResources);
    expect(state.lastDiplomacyOutcome?.target).toBe('ironclad');
    expect(state.lastDiplomacyOutcome?.status).toBe('accepted');

    const matrix = RelationsMatrix.fromJSON(state.relations);
    expect(matrix.getScore('otk', 'ironclad')).toBe(15);
    expect(
      matrix.getCooldownExpiry('otk', 'ironclad', DiplomacyAction.GiftResources),
    ).toBeGreaterThan(state.currentTurn);

    expect(screen.queryByTestId('diplomacy-modal')).not.toBeInTheDocument();
  });

  it('shows the updated last-action summary on the target card after a confirm', () => {
    render(<DiplomacyScreen />);
    fireEvent.click(screen.getByTestId('diplomacy-card-ironclad-action-gift-resources'));
    fireEvent.click(screen.getByTestId('diplomacy-modal-confirm'));
    expect(screen.getByTestId('diplomacy-card-ironclad-last')).toHaveTextContent(
      'gift-resources — accepted (+15)',
    );
  });

  it('reflects a declined outcome when relations are below the accept threshold', () => {
    seedRelations((m) => {
      m.setScore('otk', 'ironclad', 0);
    });
    render(<DiplomacyScreen />);
    fireEvent.click(screen.getByTestId('diplomacy-card-ironclad-action-propose-alliance'));
    fireEvent.click(screen.getByTestId('diplomacy-modal-confirm'));

    const state = useGameStore.getState();
    expect(state.lastDiplomacyOutcome?.status).toBe('declined');
    expect(screen.getByTestId('diplomacy-card-ironclad-last')).toHaveTextContent(
      'propose-alliance — declined',
    );
  });

  it('closes back to the game screen on close button', () => {
    render(<DiplomacyScreen />);
    fireEvent.click(screen.getByTestId('diplomacy-screen-close'));
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('Esc closes the modal first, then the screen on a second press', () => {
    render(<DiplomacyScreen />);
    fireEvent.click(screen.getByTestId('diplomacy-card-ironclad-action-gift-resources'));
    expect(screen.getByTestId('diplomacy-modal')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('diplomacy-modal')).not.toBeInTheDocument();
    expect(useGameStore.getState().screen).toBe('diplomacy');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('reflects a pre-shifted score via stance chip', () => {
    seedRelations((m) => {
      m.setScore('otk', 'phantom', 75);
      m.setScore('otk', 'bloodborne', -75);
    });
    render(<DiplomacyScreen />);
    expect(screen.getByTestId('diplomacy-card-phantom-stance')).toHaveTextContent('allied · 75');
    expect(screen.getByTestId('diplomacy-card-bloodborne-stance')).toHaveTextContent(
      'hostile · -75',
    );
  });
});
