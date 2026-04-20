import { create } from 'zustand';
import type { GameVersion } from '@colonize/core';
import { CORE_VERSION } from '@colonize/core';

export interface GameState {
  gameVersion: GameVersion;
  currentTurn: number;
  setCurrentTurn: (turn: number) => void;
  advanceTurn: () => void;
  reset: () => void;
}

const initialState = {
  gameVersion: CORE_VERSION,
  currentTurn: 0,
} as const;

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setCurrentTurn: (turn) => set({ currentTurn: turn }),
  advanceTurn: () => set((state) => ({ currentTurn: state.currentTurn + 1 })),
  reset: () => set({ ...initialState }),
}));
