import { create } from 'zustand';
import type { Coord, GameVersion, TurnPhase, UnitJSON } from '@colonize/core';
import { CORE_VERSION, TurnPhase as TurnPhaseEnum } from '@colonize/core';

export type PlayableFaction = 'otk' | 'ironclad' | 'phantom' | 'bloodborne';

export const FACTION_NAMES: Record<PlayableFaction, string> = {
  otk: 'Order of the Kraken',
  ironclad: 'Ironclad Syndicate',
  phantom: 'Phantom Corsairs',
  bloodborne: 'Bloodborne Legion',
};

export type Screen = 'menu' | 'faction-select' | 'game' | 'pause';

// User-editable game settings that survive pause/resume. Audio volumes
// mirror the `AudioState` defaults in apps/web/src/game/audio-state.ts —
// kept in sync here so the pause-overlay sliders have somewhere to write
// that is independent of the Phaser audio manager (which lives on the
// game registry and is not accessible from React tests).
export type AudioBus = 'sfx' | 'bgm';

export interface SettingsState {
  readonly sfxVolume: number;
  readonly bgmVolume: number;
  readonly muted: boolean;
}

// Persisted across scene re-entries within a single game session so
// the player returns to wherever they were last looking. Reset clears
// it so a new game starts at the default focus.
export interface CameraView {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly zoom: number;
}

// A proposed (but not yet committed) move for the selected unit. The
// first click selects a unit; a subsequent click on a destination tile
// pathfinds and stashes the result here so GameScene can render a path
// preview. A second click on the same destination commits the move;
// changing selection, re-clicking the unit's own tile, or re-selecting
// clears the proposal.
export interface ProposedMove {
  readonly unitId: string;
  readonly path: readonly Coord[];
  readonly cost: number;
  // Index into `path` of the furthest tile the unit can actually reach
  // this turn (path.length - 1 when fully affordable, smaller when the
  // full path would exceed remaining MP).
  readonly reachable: number;
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
  proposedMove: ProposedMove | null;
  settings: SettingsState;
  setCurrentTurn: (turn: number) => void;
  advanceTurn: () => void;
  setPhase: (phase: TurnPhase) => void;
  setFaction: (faction: PlayableFaction) => void;
  setScreen: (screen: Screen) => void;
  setCameraView: (view: CameraView) => void;
  clearCameraView: () => void;
  setUnits: (units: readonly UnitJSON[]) => void;
  setSelectedUnit: (unitId: string | null) => void;
  setProposedMove: (move: ProposedMove | null) => void;
  // Commits a move by updating the unit's position + deducting the
  // spent movement cost. Emitted once the sprite tween finishes so the
  // store snapshot stays in sync with the on-screen visual.
  commitMove: (unitId: string, position: Coord, movementCost: number) => void;
  setAudioVolume: (bus: AudioBus, volume: number) => void;
  setAudioMuted: (muted: boolean) => void;
  reset: () => void;
}

// Mirrors `DEFAULTS` in apps/web/src/game/audio-state.ts. Duplicated
// rather than imported so the store stays importable from test files
// that must not pull Phaser into their module graph.
const DEFAULT_SETTINGS: SettingsState = {
  sfxVolume: 0.8,
  bgmVolume: 0.5,
  muted: false,
};

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
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
  proposedMove: null as ProposedMove | null,
  settings: DEFAULT_SETTINGS,
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
  setSelectedUnit: (unitId) =>
    set((state) => ({
      selectedUnitId: unitId,
      // Changing selection always invalidates any proposed move — a
      // path preview for unit A must not linger when unit B becomes
      // active.
      proposedMove: state.selectedUnitId === unitId ? state.proposedMove : null,
    })),
  setProposedMove: (move) => set({ proposedMove: move }),
  commitMove: (unitId, position, movementCost) =>
    set((state) => ({
      units: state.units.map((u) =>
        u.id === unitId
          ? {
              ...u,
              position: { x: position.x, y: position.y },
              movement: Math.max(0, u.movement - movementCost),
            }
          : u,
      ),
      proposedMove: null,
    })),
  setAudioVolume: (bus, volume) =>
    set((state) => ({
      settings:
        bus === 'sfx'
          ? { ...state.settings, sfxVolume: clampVolume(volume) }
          : { ...state.settings, bgmVolume: clampVolume(volume) },
    })),
  setAudioMuted: (muted) => set((state) => ({ settings: { ...state.settings, muted } })),
  reset: () => set({ ...initialState }),
}));
