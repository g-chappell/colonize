import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CONCORD_TENSION_THRESHOLDS, TurnPhase, UnitType, type UnitJSON } from '@colonize/core';
import { getTitheFlavour } from '@colonize/content';
import { bus } from '../bus';
import { turnController } from '../game/turn-controller';
import { useGameStore } from '../store/game';
import {
  AiThinkingIndicator,
  ConcordTensionChip,
  EndTurnButton,
  FactionChip,
  Hud,
  ResourceBar,
  UnitStatsPanel,
  YearDisplay,
} from './Hud';

const EMPTY_CARGO = { resources: {}, artifacts: [] } as const;

const sampleSloop: UnitJSON = {
  id: 'u-sloop',
  faction: 'otk',
  position: { x: 7, y: 12 },
  type: UnitType.Sloop,
  movement: 3,
  cargo: EMPTY_CARGO,
};

const sampleSettler: UnitJSON = {
  id: 'u-settler',
  faction: 'bloodborne',
  position: { x: 2, y: 9 },
  type: UnitType.Settler,
  movement: 1,
  cargo: EMPTY_CARGO,
};

describe('Hud', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    turnController.reset();
  });

  afterEach(() => {
    bus.clear();
  });

  it('renders the full HUD layout', () => {
    render(<Hud />);
    expect(screen.getByTestId('hud')).toBeInTheDocument();
    expect(screen.getByTestId('hud-year')).toBeInTheDocument();
    expect(screen.getByTestId('hud-faction')).toBeInTheDocument();
    expect(screen.getByTestId('hud-resources')).toBeInTheDocument();
    expect(screen.getByTestId('hud-end-turn')).toBeInTheDocument();
    expect(screen.getByTestId('hud-menu-button')).toBeInTheDocument();
    expect(screen.getByTestId('hud-diplomacy-button')).toBeInTheDocument();
    expect(screen.getByTestId('hud-routes-button')).toBeInTheDocument();
    expect(screen.getByTestId('hud-concord-tension')).toBeInTheDocument();
  });

  describe('MenuButton', () => {
    it('transitions to the pause screen when clicked', () => {
      useGameStore.getState().setScreen('game');
      render(<Hud />);
      fireEvent.click(screen.getByTestId('hud-menu-button'));
      expect(useGameStore.getState().screen).toBe('pause');
    });
  });

  describe('DiplomacyButton', () => {
    it('opens the diplomacy screen when clicked', () => {
      useGameStore.getState().setScreen('game');
      render(<Hud />);
      fireEvent.click(screen.getByTestId('hud-diplomacy-button'));
      expect(useGameStore.getState().screen).toBe('diplomacy');
    });
  });

  describe('RoutesButton', () => {
    it('opens the routes screen when clicked', () => {
      useGameStore.getState().setScreen('game');
      render(<Hud />);
      fireEvent.click(screen.getByTestId('hud-routes-button'));
      expect(useGameStore.getState().screen).toBe('routes');
    });
  });

  describe('CodexButton', () => {
    it('routes to the codex screen when clicked', () => {
      useGameStore.getState().setScreen('game');
      render(<Hud />);
      fireEvent.click(screen.getByTestId('hud-codex-button'));
      expect(useGameStore.getState().screen).toBe('codex');
    });
  });

  describe('YearDisplay', () => {
    it('renders NW + epoch year on turn zero', () => {
      render(<YearDisplay />);
      const year = screen.getByTestId('hud-year');
      expect(year).toHaveTextContent('NW');
      expect(year).toHaveTextContent('2191');
    });

    it('adds the current turn to the epoch year', () => {
      useGameStore.getState().setCurrentTurn(7);
      render(<YearDisplay />);
      expect(screen.getByTestId('hud-year')).toHaveTextContent('2198');
    });
  });

  describe('FactionChip', () => {
    it('displays the default faction name', () => {
      render(<FactionChip />);
      expect(screen.getByTestId('hud-faction')).toHaveTextContent('Order of the Kraken');
    });

    it('updates when the store faction changes', () => {
      useGameStore.getState().setFaction('bloodborne');
      render(<FactionChip />);
      expect(screen.getByTestId('hud-faction')).toHaveTextContent('Bloodborne Legion');
    });
  });

  describe('ConcordTensionChip', () => {
    it('renders the baseline (tier 0) label and 0/100 value on a fresh game', () => {
      render(<ConcordTensionChip />);
      const chip = screen.getByTestId('hud-concord-tension');
      const max = CONCORD_TENSION_THRESHOLDS[CONCORD_TENSION_THRESHOLDS.length - 1]!;
      expect(chip).toHaveTextContent('Concord');
      expect(screen.getByTestId('hud-concord-tension-tier')).toHaveTextContent(
        getTitheFlavour(0).tierLabel,
      );
      expect(screen.getByTestId('hud-concord-tension-value')).toHaveTextContent(`0/${max}`);
      expect(chip).toHaveAttribute('data-tier', '0');
      expect(chip).toHaveAttribute('aria-valuenow', '0');
      expect(chip).toHaveAttribute('aria-valuemax', String(max));
    });

    it('reflects the tier label after thresholds have been crossed', () => {
      useGameStore.setState({
        concordTension: {
          tension: 60,
          thresholds: [...CONCORD_TENSION_THRESHOLDS],
          crossed: [25, 50],
          pending: [],
        },
      });
      render(<ConcordTensionChip />);
      expect(screen.getByTestId('hud-concord-tension-tier')).toHaveTextContent(
        getTitheFlavour(2).tierLabel,
      );
      expect(screen.getByTestId('hud-concord-tension-value')).toHaveTextContent('60/100');
      expect(screen.getByTestId('hud-concord-tension')).toHaveAttribute('data-tier', '2');
    });

    it('clamps to tier 4 when every threshold has been crossed', () => {
      useGameStore.setState({
        concordTension: {
          tension: 130,
          thresholds: [...CONCORD_TENSION_THRESHOLDS],
          crossed: [25, 50, 75, 100],
          pending: [],
        },
      });
      render(<ConcordTensionChip />);
      expect(screen.getByTestId('hud-concord-tension')).toHaveAttribute('data-tier', '4');
      expect(screen.getByTestId('hud-concord-tension-tier')).toHaveTextContent(
        getTitheFlavour(4).tierLabel,
      );
    });

    it('clamps aria-valuenow to the ladder maximum even when tension exceeds it', () => {
      useGameStore.setState({
        concordTension: {
          tension: 200,
          thresholds: [...CONCORD_TENSION_THRESHOLDS],
          crossed: [25, 50, 75, 100],
          pending: [],
        },
      });
      render(<ConcordTensionChip />);
      const max = CONCORD_TENSION_THRESHOLDS[CONCORD_TENSION_THRESHOLDS.length - 1]!;
      expect(screen.getByTestId('hud-concord-tension')).toHaveAttribute(
        'aria-valuenow',
        String(max),
      );
    });
  });

  describe('ResourceBar', () => {
    it('renders all three resource slots with placeholder values', () => {
      render(<ResourceBar />);
      expect(screen.getByText('Salt')).toBeInTheDocument();
      expect(screen.getByText('Rum')).toBeInTheDocument();
      expect(screen.getByText('Iron')).toBeInTheDocument();
      expect(screen.getAllByText('—')).toHaveLength(3);
    });
  });

  describe('AiThinkingIndicator', () => {
    it('is hidden while the player acts', () => {
      render(<AiThinkingIndicator />);
      expect(screen.queryByTestId('hud-ai-thinking')).not.toBeInTheDocument();
    });

    it('is visible during the AI phase', () => {
      useGameStore.getState().setPhase(TurnPhase.AI);
      render(<AiThinkingIndicator />);
      const indicator = screen.getByTestId('hud-ai-thinking');
      expect(indicator).toHaveTextContent(/ai thinking/i);
      expect(indicator).toHaveAttribute('role', 'status');
    });

    it('is hidden once phase returns to player-action', () => {
      useGameStore.getState().setPhase(TurnPhase.AI);
      render(<AiThinkingIndicator />);
      expect(screen.getByTestId('hud-ai-thinking')).toBeInTheDocument();
      act(() => {
        useGameStore.getState().setPhase(TurnPhase.PlayerAction);
      });
      expect(screen.queryByTestId('hud-ai-thinking')).not.toBeInTheDocument();
    });
  });

  describe('UnitStatsPanel', () => {
    it('renders nothing when no unit is selected', () => {
      render(<UnitStatsPanel />);
      expect(screen.queryByTestId('hud-unit-stats')).not.toBeInTheDocument();
    });

    it('renders nothing when the selected id is not in the roster', () => {
      useGameStore.getState().setUnits([sampleSloop]);
      useGameStore.getState().setSelectedUnit('u-missing');
      render(<UnitStatsPanel />);
      expect(screen.queryByTestId('hud-unit-stats')).not.toBeInTheDocument();
    });

    it('shows the selected unit name, faction, position, and movement', () => {
      useGameStore.getState().setUnits([sampleSloop]);
      useGameStore.getState().setSelectedUnit(sampleSloop.id);
      render(<UnitStatsPanel />);
      expect(screen.getByTestId('hud-unit-stats-name')).toHaveTextContent('Sloop');
      expect(screen.getByTestId('hud-unit-stats-faction')).toHaveTextContent('Order of the Kraken');
      expect(screen.getByTestId('hud-unit-stats-position')).toHaveTextContent('7,12');
      expect(screen.getByTestId('hud-unit-stats-movement')).toHaveTextContent('3/4');
    });

    it('updates when the selection changes', () => {
      useGameStore.getState().setUnits([sampleSloop, sampleSettler]);
      useGameStore.getState().setSelectedUnit(sampleSloop.id);
      render(<UnitStatsPanel />);
      expect(screen.getByTestId('hud-unit-stats-name')).toHaveTextContent('Sloop');
      act(() => {
        useGameStore.getState().setSelectedUnit(sampleSettler.id);
      });
      expect(screen.getByTestId('hud-unit-stats-name')).toHaveTextContent('Settler');
      expect(screen.getByTestId('hud-unit-stats-faction')).toHaveTextContent('Bloodborne Legion');
      expect(screen.getByTestId('hud-unit-stats-movement')).toHaveTextContent('1/1');
    });

    it('falls back to the raw faction id for non-playable factions', () => {
      const npc: UnitJSON = {
        id: 'u-npc',
        faction: 'rayon-concord',
        position: { x: 1, y: 1 },
        type: UnitType.Frigate,
        movement: 3,
        cargo: EMPTY_CARGO,
      };
      useGameStore.getState().setUnits([npc]);
      useGameStore.getState().setSelectedUnit(npc.id);
      render(<UnitStatsPanel />);
      expect(screen.getByTestId('hud-unit-stats-faction')).toHaveTextContent('rayon-concord');
    });

    it('disappears when the selection clears', () => {
      useGameStore.getState().setUnits([sampleSloop]);
      useGameStore.getState().setSelectedUnit(sampleSloop.id);
      render(<UnitStatsPanel />);
      expect(screen.getByTestId('hud-unit-stats')).toBeInTheDocument();
      act(() => {
        useGameStore.getState().setSelectedUnit(null);
      });
      expect(screen.queryByTestId('hud-unit-stats')).not.toBeInTheDocument();
    });
  });

  describe('EndTurnButton', () => {
    it('enters the AI phase synchronously when clicked', async () => {
      render(<EndTurnButton />);
      fireEvent.click(screen.getByTestId('hud-end-turn'));
      expect(useGameStore.getState().phase).toBe(TurnPhase.AI);
      await waitFor(() => expect(useGameStore.getState().phase).toBe(TurnPhase.PlayerAction));
    });

    it('lands back on player-action with an incremented turn', async () => {
      render(<EndTurnButton />);
      fireEvent.click(screen.getByTestId('hud-end-turn'));
      await waitFor(() => {
        expect(useGameStore.getState().phase).toBe(TurnPhase.PlayerAction);
      });
      expect(useGameStore.getState().currentTurn).toBe(1);
    });

    it('is disabled while the AI is resolving its phase', () => {
      useGameStore.getState().setPhase(TurnPhase.AI);
      render(<EndTurnButton />);
      expect(screen.getByTestId('hud-end-turn')).toBeDisabled();
    });

    it('emits turn:advanced with the new turn after a full cycle', async () => {
      const received: number[] = [];
      bus.on('turn:advanced', (payload) => received.push(payload.turn));
      render(<EndTurnButton />);
      fireEvent.click(screen.getByTestId('hud-end-turn'));
      await waitFor(() => expect(received).toEqual([1]));
      fireEvent.click(screen.getByTestId('hud-end-turn'));
      await waitFor(() => expect(received).toEqual([1, 2]));
    });
  });
});
