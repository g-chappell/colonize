import { create } from 'zustand';
import type { GameVersion } from '@colonize/core';
import { CORE_VERSION } from '@colonize/core';

export type PlayableFaction = 'otk' | 'ironclad' | 'phantom' | 'bloodborne';

export const FACTION_NAMES: Record<PlayableFaction, string> = {
  otk: 'Order of the Kraken',
  ironclad: 'Ironclad Syndicate',
  phantom: 'Phantom Corsairs',
  bloodborne: 'Bloodborne Legion',
};

export type Screen = 'menu' | 'faction-select' | 'game';

export interface GameState {
  gameVersion: GameVersion;
  currentTurn: number;
  faction: PlayableFaction;
  screen: Screen;
  setCurrentTurn: (turn: number) => void;
  advanceTurn: () => void;
  setFaction: (faction: PlayableFaction) => void;
  setScreen: (screen: Screen) => void;
  reset: () => void;
}

const initialState = {
  gameVersion: CORE_VERSION,
  currentTurn: 0,
  faction: 'otk' as PlayableFaction,
  screen: 'menu' as Screen,
} as const;

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setCurrentTurn: (turn) => set({ currentTurn: turn }),
  advanceTurn: () => set((state) => ({ currentTurn: state.currentTurn + 1 })),
  setFaction: (faction) => set({ faction }),
  setScreen: (screen) => set({ screen }),
  reset: () => set({ ...initialState }),
}));
