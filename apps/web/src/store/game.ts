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

export interface GameState {
  gameVersion: GameVersion;
  currentTurn: number;
  faction: PlayableFaction;
  setCurrentTurn: (turn: number) => void;
  advanceTurn: () => void;
  setFaction: (faction: PlayableFaction) => void;
  reset: () => void;
}

const initialState = {
  gameVersion: CORE_VERSION,
  currentTurn: 0,
  faction: 'otk' as PlayableFaction,
} as const;

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setCurrentTurn: (turn) => set({ currentTurn: turn }),
  advanceTurn: () => set((state) => ({ currentTurn: state.currentTurn + 1 })),
  setFaction: (faction) => set({ faction }),
  reset: () => set({ ...initialState }),
}));
