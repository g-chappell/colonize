import { create } from 'zustand';
import type { GameVersion, TurnPhase, UnitJSON } from '@colonize/core';
import { CORE_VERSION, TurnPhase as TurnPhaseEnum } from '@colonize/core';

export type PlayableFaction = 'otk' | 'ironclad' | 'phantom' | 'bloodborne';

export const FACTION_NAMES: Record<PlayableFaction, string> = {
  otk: 'Order of the Kraken',
  ironclad: 'Ironclad Syndicate',
  phantom: 'Phantom Corsairs',
  bloodborne: 'Bloodborne Legion',
};

export type Screen = 'menu' | 'faction-select' | 'game';

// Persisted across scene re-entries within a single game session so
// the player returns to wherever they were last looking. Reset clears
// it so a new game starts at the default focus.
export interface CameraView {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly zoom: number;
}

export interface GameState {
  gameVersion: GameVersion;
  currentTurn: number;
  phase: TurnPhase;
  faction: PlayableFaction;
  screen: Screen;
  cameraView: CameraView | null;
  // Plain-data unit roster (UnitJSON, not Unit instances) — zustand
  // state must be cloneable for devtools / time-travel and not all
  // class instances survive that round-trip. The roster owner (a
  // future task) reconstitutes Unit instances on demand for game
  // logic; renderers and HUD just read the JSON.
  units: readonly UnitJSON[];
  selectedUnitId: string | null;
  setCurrentTurn: (turn: number) => void;
  advanceTurn: () => void;
  setPhase: (phase: TurnPhase) => void;
  setFaction: (faction: PlayableFaction) => void;
  setScreen: (screen: Screen) => void;
  setCameraView: (view: CameraView) => void;
  clearCameraView: () => void;
  setUnits: (units: readonly UnitJSON[]) => void;
  setSelectedUnit: (unitId: string | null) => void;
  reset: () => void;
}

const initialState = {
  gameVersion: CORE_VERSION,
  currentTurn: 0,
  phase: TurnPhaseEnum.PlayerAction as TurnPhase,
  faction: 'otk' as PlayableFaction,
  screen: 'menu' as Screen,
  cameraView: null as CameraView | null,
  units: [] as readonly UnitJSON[],
  selectedUnitId: null as string | null,
} as const;

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setCurrentTurn: (turn) => set({ currentTurn: turn }),
  advanceTurn: () => set((state) => ({ currentTurn: state.currentTurn + 1 })),
  setPhase: (phase) => set({ phase }),
  setFaction: (faction) => set({ faction }),
  setScreen: (screen) => set({ screen }),
  setCameraView: (view) => set({ cameraView: view }),
  clearCameraView: () => set({ cameraView: null }),
  setUnits: (units) => set({ units }),
  setSelectedUnit: (unitId) => set({ selectedUnitId: unitId }),
  reset: () => set({ ...initialState }),
}));
