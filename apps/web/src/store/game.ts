import { create } from 'zustand';
import type {
  BuildingType,
  ColonyJSON,
  Coord,
  GameVersion,
  RumourOutcome,
  TileType,
  TurnPhase,
  UnitJSON,
} from '@colonize/core';
import { CORE_VERSION, TurnPhase as TurnPhaseEnum } from '@colonize/core';
import {
  buildingEffort,
  colonyProductionValue,
  tickProductionQueue,
  type ProductionQueueItem,
} from '../colony/build-queue';

export type PlayableFaction = 'otk' | 'ironclad' | 'phantom' | 'bloodborne';

export const FACTION_NAMES: Record<PlayableFaction, string> = {
  otk: 'Order of the Kraken',
  ironclad: 'Ironclad Syndicate',
  phantom: 'Phantom Corsairs',
  bloodborne: 'Bloodborne Legion',
};

export type Screen = 'menu' | 'faction-select' | 'game' | 'pause' | 'colony';

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

// One cell in a colony's 8-neighbour ring — the snapshot the colony
// overlay renders as a work-slot. Populated by whoever discovers the
// colony (founding action today, cloud-save reload later) via
// `setColonySurroundings`; the overlay only reads. Kept out of
// ColonyJSON for the same reason as `colonyQueues`: per-session UI
// state, not save-format-bound. A future core roster task re-homes
// tile-work into `@colonize/core` with a save-version migration.
export interface SurroundingTile {
  readonly coord: Coord;
  readonly type: TileType;
}

// Stable string key for an `{x,y}` coord so we can index tile
// assignments by a primitive. Exported for the overlay.
export function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
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
  // Plain-data colony roster (ColonyJSON, not Colony instances) — same
  // rationale as `units`: zustand state must round-trip through
  // structuredClone for devtools; class instances do not. The roster
  // owner (founding action / cloud save reload) is responsible for
  // pushing fresh ColonyJSON snapshots whenever a colony mutates.
  colonies: readonly ColonyJSON[];
  selectedColonyId: string | null;
  // Per-colony production queue, keyed by colony id. Not part of
  // ColonyJSON (save format) yet — TASK-041 scopes this to a web-only
  // slice until a roster task re-homes it into @colonize/core with a
  // save-version migration. Ordering is player-controlled via
  // reorderQueueItem; the head item is the one ticking.
  colonyQueues: Readonly<Record<string, readonly ProductionQueueItem[]>>;
  // Snapshot of each colony's 8-neighbour ring (coord + tile type)
  // so the overlay can render work-slots without reaching into the
  // Phaser-side GameMap. Populated per-colony; empty until the
  // founding flow pushes a snapshot.
  colonySurroundings: Readonly<Record<string, readonly SurroundingTile[]>>;
  // Crew-to-tile assignment, keyed `colonyId -> coordKey -> crewId`.
  // Each crew id appears at most once per colony; each tile holds at
  // most one crew. Dropping a crew on an occupied tile displaces the
  // prior occupant back to the pool; moving a crew between tiles
  // vacates its previous tile.
  tileAssignments: Readonly<Record<string, Readonly<Record<string, string>>>>;
  // Outcome of a rumour tile that has been resolved but not yet
  // acknowledged by the player. Non-null while the reveal modal is
  // showing; cleared on dismiss. The resolver (a future task) will
  // call `showRumourReveal` when a unit enters a rumour tile.
  rumourReveal: RumourOutcome | null;
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
  setColonies: (colonies: readonly ColonyJSON[]) => void;
  setSelectedColony: (colonyId: string | null) => void;
  setColonySurroundings: (colonyId: string, cells: readonly SurroundingTile[]) => void;
  assignCrewToTile: (colonyId: string, crewId: string, coord: Coord) => void;
  unassignCrewFromTile: (colonyId: string, coord: Coord) => void;
  enqueueBuilding: (colonyId: string, buildingId: BuildingType) => void;
  cancelQueueItem: (colonyId: string, index: number) => void;
  reorderQueueItem: (colonyId: string, index: number, direction: 'up' | 'down') => void;
  // Advances every colony's queue head by that colony's production
  // value, promoting completed items into the colony's building list.
  // Invoked once per full turn cycle by turn-controller.
  tickColonyQueues: () => void;
  // Commits a move by updating the unit's position + deducting the
  // spent movement cost. Emitted once the sprite tween finishes so the
  // store snapshot stays in sync with the on-screen visual.
  commitMove: (unitId: string, position: Coord, movementCost: number) => void;
  showRumourReveal: (outcome: RumourOutcome) => void;
  dismissRumourReveal: () => void;
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
  colonies: [] as readonly ColonyJSON[],
  selectedColonyId: null as string | null,
  colonyQueues: {} as Readonly<Record<string, readonly ProductionQueueItem[]>>,
  colonySurroundings: {} as Readonly<Record<string, readonly SurroundingTile[]>>,
  tileAssignments: {} as Readonly<Record<string, Readonly<Record<string, string>>>>,
  rumourReveal: null as RumourOutcome | null,
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
  setColonies: (colonies) => set({ colonies }),
  setSelectedColony: (colonyId) => set({ selectedColonyId: colonyId }),
  setColonySurroundings: (colonyId, cells) =>
    set((state) => ({
      colonySurroundings: { ...state.colonySurroundings, [colonyId]: cells },
    })),
  assignCrewToTile: (colonyId, crewId, coord) =>
    set((state) => {
      const colony = state.colonies.find((c) => c.id === colonyId);
      if (!colony || !colony.crew.includes(crewId)) return {};
      const existing = state.tileAssignments[colonyId] ?? {};
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(existing)) {
        if (v !== crewId) next[k] = v;
      }
      next[coordKey(coord)] = crewId;
      return { tileAssignments: { ...state.tileAssignments, [colonyId]: next } };
    }),
  unassignCrewFromTile: (colonyId, coord) =>
    set((state) => {
      const existing = state.tileAssignments[colonyId];
      if (!existing) return {};
      const key = coordKey(coord);
      if (!(key in existing)) return {};
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(existing)) {
        if (k !== key) next[k] = v;
      }
      const updated: Record<string, Readonly<Record<string, string>>> = {
        ...state.tileAssignments,
      };
      if (Object.keys(next).length === 0) delete updated[colonyId];
      else updated[colonyId] = next;
      return { tileAssignments: updated };
    }),
  enqueueBuilding: (colonyId, buildingId) =>
    set((state) => {
      const colony = state.colonies.find((c) => c.id === colonyId);
      if (!colony) return {};
      const existing = state.colonyQueues[colonyId] ?? [];
      if (colony.buildings.includes(buildingId)) return {};
      if (existing.some((item) => item.buildingId === buildingId)) return {};
      const next: readonly ProductionQueueItem[] = [
        ...existing,
        { buildingId, progress: 0, effort: buildingEffort(buildingId) },
      ];
      return { colonyQueues: { ...state.colonyQueues, [colonyId]: next } };
    }),
  cancelQueueItem: (colonyId, index) =>
    set((state) => {
      const existing = state.colonyQueues[colonyId];
      if (!existing || index < 0 || index >= existing.length) return {};
      const next = existing.filter((_, i) => i !== index);
      const updatedQueues: Record<string, readonly ProductionQueueItem[]> = {
        ...state.colonyQueues,
      };
      if (next.length === 0) delete updatedQueues[colonyId];
      else updatedQueues[colonyId] = next;
      return { colonyQueues: updatedQueues };
    }),
  reorderQueueItem: (colonyId, index, direction) =>
    set((state) => {
      const existing = state.colonyQueues[colonyId];
      if (!existing || existing.length < 2) return {};
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || index >= existing.length) return {};
      if (swapWith < 0 || swapWith >= existing.length) return {};
      const next = [...existing];
      [next[index], next[swapWith]] = [next[swapWith]!, next[index]!];
      return { colonyQueues: { ...state.colonyQueues, [colonyId]: next } };
    }),
  tickColonyQueues: () =>
    set((state) => {
      const updatedQueues: Record<string, readonly ProductionQueueItem[]> = {
        ...state.colonyQueues,
      };
      const completionsByColony = new Map<string, BuildingType[]>();
      let queuesChanged = false;
      for (const colony of state.colonies) {
        const queue = state.colonyQueues[colony.id];
        if (!queue || queue.length === 0) continue;
        const result = tickProductionQueue(queue, colonyProductionValue(colony));
        if (result.next === queue && result.completed.length === 0) continue;
        queuesChanged = true;
        if (result.next.length === 0) delete updatedQueues[colony.id];
        else updatedQueues[colony.id] = result.next;
        if (result.completed.length > 0) {
          completionsByColony.set(colony.id, [...result.completed]);
        }
      }
      if (!queuesChanged) return {};
      const nextColonies =
        completionsByColony.size === 0
          ? state.colonies
          : state.colonies.map((colony) => {
              const finished = completionsByColony.get(colony.id);
              if (!finished || finished.length === 0) return colony;
              const buildings = [...colony.buildings];
              for (const id of finished) {
                if (!buildings.includes(id)) buildings.push(id);
              }
              buildings.sort();
              return { ...colony, buildings };
            });
      return { colonyQueues: updatedQueues, colonies: nextColonies };
    }),
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
  showRumourReveal: (outcome) => set({ rumourReveal: outcome }),
  dismissRumourReveal: () => set({ rumourReveal: null }),
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
