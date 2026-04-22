import { create } from 'zustand';
import type {
  ArchiveCharterId,
  BuildingType,
  CharterHand,
  ColonyJSON,
  CombatOutcome,
  ConcordFleetCampaignJSON,
  Coord,
  DiplomacyAction,
  DiplomacyAttemptOutcome,
  FactionChartersJSON,
  GameVersion,
  HomePortJSON,
  RelationsMatrixJSON,
  ResourceId,
  RumourOutcome,
  TileType,
  TurnPhase,
  UnitJSON,
} from '@colonize/core';
import {
  CORE_VERSION,
  FactionCharters,
  HomePort,
  RelationsMatrix,
  TurnPhase as TurnPhaseEnum,
  attemptDiplomacyAction,
} from '@colonize/core';
import {
  buildingEffort,
  colonyProductionValue,
  tickProductionQueue,
  type ProductionQueueItem,
} from '../colony/build-queue';
import {
  sovereigntyMilestoneCrossed,
  type SovereigntyMilestone,
} from '../sovereignty/sovereignty-progress';

export type PlayableFaction = 'otk' | 'ironclad' | 'phantom' | 'bloodborne';

export const FACTION_NAMES: Record<PlayableFaction, string> = {
  otk: 'Order of the Kraken',
  ironclad: 'Ironclad Syndicate',
  phantom: 'Phantom Corsairs',
  bloodborne: 'Bloodborne Legion',
};

export type Screen =
  | 'menu'
  | 'faction-select'
  | 'game'
  | 'pause'
  | 'colony'
  | 'trade'
  | 'transfer'
  | 'diplomacy';

// Active trade session (which ship is trading at which colony's home
// port). Non-null while `screen === 'trade'`; cleared by
// `closeTradeSession`. Opening trade routes the screen to 'trade';
// closing routes back to 'colony' so the player returns to the colony
// detail view they came from. The UI reads the full HomePort from
// `homePorts[colony.faction]`.
export interface TradeSession {
  readonly colonyId: string;
  readonly unitId: string;
}

// One line in a confirmed trade: positive qty = player bought qty
// from the port; negative qty = player sold |qty| to the port.
// Fed into `commitTrade` which updates both the HomePort's netVolume
// and the ship's cargo.
export interface TradeCommitLine {
  readonly resourceId: ResourceId;
  readonly qty: number;
}

// Active cargo-transfer session (manual load/unload between a ship and
// a friendly colony). Non-null while `screen === 'transfer'`; cleared
// by `closeTransferSession`. Opening routes the screen to 'transfer';
// closing routes back to 'colony' so the player returns to the colony
// detail view they came from.
export interface TransferSession {
  readonly colonyId: string;
  readonly unitId: string;
}

// One line in a confirmed cargo transfer: positive qty moves |qty|
// units of `resourceId` from the colony stockpile into the ship cargo;
// negative qty moves |qty| units from the ship into the colony.
// Fed into `commitCargoTransfer`.
export interface TransferCommitLine {
  readonly resourceId: ResourceId;
  readonly qty: number;
}

// Active Council pick session — the modal data for a two-charter draw
// that the player must resolve before it dismisses. Non-null while the
// Council modal is showing. Filled by `openCouncilPick` (which draws a
// hand from the faction's available pool) and cleared by
// `selectCharter` or `dismissCouncilPick`. The UI treats this as an
// unbidden event-modal (slice-driven self-mounting overlay per
// CLAUDE.md), NOT a `Screen` literal — the player was mid-something
// when the chime threshold crossed, and a resolved pick returns them
// there.
export interface CouncilPickSession {
  readonly factionId: string;
  readonly threshold: number;
  readonly hand: CharterHand;
}

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
  // Outcome of a combat engagement that has been resolved but not yet
  // dismissed by the player. Non-null while the combat overlay is
  // showing; cleared by `dismissCombatOutcome`. A future combat
  // orchestrator calls `showCombatOutcome` after `resolveCombat` from
  // @colonize/core returns.
  combatOutcome: CombatOutcome | null;
  // Per-faction home-port roster, keyed by faction id. Populated by
  // the spawning flow (downstream task) from HOMEPORT_STARTING_PRICES
  // in @colonize/content; stays empty until then. `commitTrade` and
  // the trade screen read this slice, never reaching into @colonize/core
  // for initialisation.
  homePorts: Readonly<Record<string, HomePortJSON>>;
  // Active trade session (which ship is trading at which colony).
  // Non-null while `screen === 'trade'`; cleared by `closeTradeSession`.
  tradeSession: TradeSession | null;
  // Active cargo-transfer session (which ship is loading/unloading at
  // which colony). Non-null while `screen === 'transfer'`; cleared by
  // `closeTransferSession`.
  transferSession: TransferSession | null;
  // Per-faction Archive-Charter ledger, keyed by faction id. Each value
  // is a plain FactionChartersJSON snapshot (available + selected). A
  // missing key means the faction has not yet been seeded — the store
  // lazily seeds on first `openCouncilPick`, so tests and the founding
  // flow do not have to remember to call `seedFactionCharters` up-front.
  factionCharters: Readonly<Record<string, FactionChartersJSON>>;
  // Active Council pick-2 session. Non-null while the Council modal
  // should be mounted. See `CouncilPickSession` above for the shape.
  councilPick: CouncilPickSession | null;
  // Per-faction-pair relations + cooldowns, plain JSON for zustand
  // round-trip compatibility. Gameplay code reconstitutes a
  // RelationsMatrix instance via `RelationsMatrix.fromJSON` when it
  // needs the methods; the diplomacy screen just reads the snapshot.
  relations: RelationsMatrixJSON;
  // Most recent diplomacy-attempt outcome, surfaced in the diplomacy
  // screen as "last action" text. Cleared by `dismissDiplomacyOutcome`
  // or replaced on the next attempt. Not persisted in the save format
  // (cosmetic session state only).
  lastDiplomacyOutcome: DiplomacyAttemptOutcome | null;
  // Active Concord Fleet campaign snapshot — non-null while the
  // Sovereignty War is ongoing. Populated by the declare-sovereignty
  // orchestration (a future task) with a freshly-constructed
  // ConcordFleetCampaign.toJSON(); the HUD tint + progress bar read
  // this slice, and `tickSovereigntyWar` advances `turnsElapsed` each
  // turn. Cleared on victory/defeat by `endSovereigntyWar`.
  sovereigntyWar: ConcordFleetCampaignJSON | null;
  // Most recent narrative beat milestone triggered by a Sovereignty
  // campaign tick. Non-null while the beat modal is showing; cleared
  // by `dismissSovereigntyBeat`. Treated as an unbidden event-modal
  // (slice-driven self-mounting overlay per CLAUDE.md) — does not
  // gate on a Screen literal.
  sovereigntyBeat: SovereigntyMilestone | null;
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
  // Seed the faction's charter pool with the full 20-charter roster
  // unless already seeded. Safe to call multiple times — re-seeding a
  // faction that has already drawn / picked is a no-op, so this is
  // idempotent from the caller's point of view.
  seedFactionCharters: (factionId: string) => void;
  // Open a Council pick-2 session for `factionId` at `threshold`,
  // drawing two charters from the faction's available pool via
  // `FactionCharters.drawHand`. No-op if a session is already active
  // (the prior session must be resolved first), if the faction has
  // fewer than two charters available, or if the threshold is not
  // positive. Uses `rng` for the draw; defaults to `Math.random` so
  // tests can pass a seeded rng.
  openCouncilPick: (factionId: string, threshold: number, rng?: () => number) => void;
  // Commit the active Council pick: move the chosen charter into the
  // faction's selected list, drop it from available, and clear the
  // session so the modal dismisses. Silently skips when no session is
  // active or when `charterId` is not one of the two currently offered
  // (defence-in-depth for malformed input; the modal's buttons only
  // fire one of the two legitimate ids).
  selectCharter: (charterId: ArchiveCharterId) => void;
  showRumourReveal: (outcome: RumourOutcome) => void;
  dismissRumourReveal: () => void;
  showCombatOutcome: (outcome: CombatOutcome) => void;
  dismissCombatOutcome: () => void;
  setHomePort: (factionId: string, port: HomePortJSON) => void;
  openTradeSession: (session: TradeSession) => void;
  closeTradeSession: () => void;
  // Applies a trade atomically: mutates the home-port's net volume
  // (which shifts the mid-price for future trades) AND the ship's
  // cargo resources in the same store update, so a re-render can't
  // observe one without the other. Lines with qty === 0 are ignored.
  commitTrade: (factionId: string, unitId: string, lines: readonly TradeCommitLine[]) => void;
  openTransferSession: (session: TransferSession) => void;
  closeTransferSession: () => void;
  // Applies a manual cargo transfer atomically: positive line qty moves
  // resources from the colony stockpile into the ship cargo, negative
  // moves them back. Lines are clamped to the available source on each
  // side; lines with qty === 0 or non-integer qty are ignored. Both
  // store slices update in one set so a re-render can't observe a
  // partial transfer.
  commitCargoTransfer: (
    colonyId: string,
    unitId: string,
    lines: readonly TransferCommitLine[],
  ) => void;
  // Replace the relations snapshot wholesale. Used by save-load and
  // tests that want to seed starting relations without going through
  // individual mutations.
  setRelations: (relations: RelationsMatrixJSON) => void;
  // Open / close the diplomacy overlay. Open routes the screen to
  // 'diplomacy'; close routes back to 'game' (diplomacy is launched
  // from the HUD, not from a screen-chain that would want to route
  // elsewhere).
  openDiplomacy: () => void;
  closeDiplomacy: () => void;
  // Attempt a diplomacy action against `target`. Reconstitutes the
  // RelationsMatrix from the store snapshot, invokes
  // `attemptDiplomacyAction` from @colonize/core, writes the resulting
  // snapshot back, and records the outcome for the UI. Returns the
  // outcome so the caller can surface immediate feedback (flavour
  // flash, modal result).
  attemptDiplomacy: (target: string, action: DiplomacyAction) => DiplomacyAttemptOutcome;
  dismissDiplomacyOutcome: () => void;
  setAudioVolume: (bus: AudioBus, volume: number) => void;
  setAudioMuted: (muted: boolean) => void;
  // Start a Sovereignty War campaign by installing the supplied
  // ConcordFleetCampaignJSON snapshot. Clears any stale beat so the
  // modal doesn't linger from a previous run. Replaces any existing
  // campaign — callers must `endSovereigntyWar()` first if they want
  // defence against accidental overwrite.
  startSovereigntyWar: (campaign: ConcordFleetCampaignJSON) => void;
  // Advance the active campaign by one turn. No-op when no campaign
  // is active. Auto-fires a narrative beat when a 25/50/75/100%
  // milestone is crossed on this tick; the modal component reads
  // `sovereigntyBeat` and shows the copy. Only the highest milestone
  // crossed by a single tick fires — a jump from 2 → 7 on a 12-turn
  // campaign triggers the 50% beat and skips 25% so the player is not
  // bombarded with stacked dismissals.
  tickSovereigntyWar: () => void;
  // End the active campaign. Clears both the campaign snapshot and
  // any pending beat. Called by the victory/loss engine (future task)
  // once the campaign resolves.
  endSovereigntyWar: () => void;
  // Manual trigger for a narrative beat — used by tests and by future
  // orchestration that wants to re-show a milestone message without
  // re-ticking the campaign counter.
  showSovereigntyBeat: (milestone: SovereigntyMilestone) => void;
  dismissSovereigntyBeat: () => void;
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
  combatOutcome: null as CombatOutcome | null,
  factionCharters: {} as Readonly<Record<string, FactionChartersJSON>>,
  councilPick: null as CouncilPickSession | null,
  homePorts: {} as Readonly<Record<string, HomePortJSON>>,
  tradeSession: null as TradeSession | null,
  transferSession: null as TransferSession | null,
  relations: { entries: [] } as RelationsMatrixJSON,
  lastDiplomacyOutcome: null as DiplomacyAttemptOutcome | null,
  sovereigntyWar: null as ConcordFleetCampaignJSON | null,
  sovereigntyBeat: null as SovereigntyMilestone | null,
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
  seedFactionCharters: (factionId) =>
    set((state) => {
      if (factionId in state.factionCharters) return {};
      const fc = new FactionCharters();
      return { factionCharters: { ...state.factionCharters, [factionId]: fc.toJSON() } };
    }),
  openCouncilPick: (factionId, threshold, rng) =>
    set((state) => {
      if (state.councilPick !== null) return {};
      if (!Number.isFinite(threshold) || threshold <= 0) return {};
      const existing = state.factionCharters[factionId];
      const fc = existing ? FactionCharters.fromJSON(existing) : new FactionCharters();
      const available = fc.available;
      if (available.length < 2) return {};
      const hand = FactionCharters.drawHand(available, rng);
      const nextCharters = existing
        ? state.factionCharters
        : { ...state.factionCharters, [factionId]: fc.toJSON() };
      return {
        factionCharters: nextCharters,
        councilPick: { factionId, threshold, hand },
      };
    }),
  selectCharter: (charterId) =>
    set((state) => {
      const session = state.councilPick;
      if (!session) return {};
      if (charterId !== session.hand[0] && charterId !== session.hand[1]) return {};
      const snapshot = state.factionCharters[session.factionId];
      if (!snapshot) return {};
      const fc = FactionCharters.fromJSON(snapshot);
      if (!fc.isAvailable(charterId)) return {};
      fc.pick(charterId);
      return {
        factionCharters: { ...state.factionCharters, [session.factionId]: fc.toJSON() },
        councilPick: null,
      };
    }),
  showRumourReveal: (outcome) => set({ rumourReveal: outcome }),
  dismissRumourReveal: () => set({ rumourReveal: null }),
  showCombatOutcome: (outcome) => set({ combatOutcome: outcome }),
  dismissCombatOutcome: () => set({ combatOutcome: null }),
  setHomePort: (factionId, port) =>
    set((state) => ({ homePorts: { ...state.homePorts, [factionId]: port } })),
  openTradeSession: (session) =>
    set({ tradeSession: { colonyId: session.colonyId, unitId: session.unitId }, screen: 'trade' }),
  closeTradeSession: () => set({ tradeSession: null, screen: 'colony' }),
  commitTrade: (factionId, unitId, lines) =>
    set((state) => {
      const portJson = state.homePorts[factionId];
      const unit = state.units.find((u) => u.id === unitId);
      if (!portJson || !unit) return {};
      const nonZero = lines.filter((l) => l.qty !== 0);
      if (nonZero.length === 0) return {};
      const port = HomePort.fromJSON(portJson);
      const nextResources: Record<string, number> = { ...unit.cargo.resources };
      for (const line of nonZero) {
        if (!Number.isInteger(line.qty)) continue;
        if (!port.trades(line.resourceId)) continue;
        if (line.qty > 0) {
          port.recordPlayerPurchase(line.resourceId, line.qty);
          nextResources[line.resourceId] = (nextResources[line.resourceId] ?? 0) + line.qty;
        } else {
          const sellQty = -line.qty;
          const have = nextResources[line.resourceId] ?? 0;
          if (sellQty > have) continue;
          port.recordPlayerSale(line.resourceId, sellQty);
          const remaining = have - sellQty;
          if (remaining === 0) delete nextResources[line.resourceId];
          else nextResources[line.resourceId] = remaining;
        }
      }
      const nextUnits = state.units.map((u) =>
        u.id === unitId ? { ...u, cargo: { ...u.cargo, resources: nextResources } } : u,
      );
      return {
        homePorts: { ...state.homePorts, [factionId]: port.toJSON() },
        units: nextUnits,
      };
    }),
  openTransferSession: (session) =>
    set({
      transferSession: { colonyId: session.colonyId, unitId: session.unitId },
      screen: 'transfer',
    }),
  closeTransferSession: () => set({ transferSession: null, screen: 'colony' }),
  commitCargoTransfer: (colonyId, unitId, lines) =>
    set((state) => {
      const colony = state.colonies.find((c) => c.id === colonyId);
      const unit = state.units.find((u) => u.id === unitId);
      if (!colony || !unit) return {};
      const nonZero = lines.filter((l) => l.qty !== 0 && Number.isInteger(l.qty));
      if (nonZero.length === 0) return {};
      const nextShipResources: Record<string, number> = { ...unit.cargo.resources };
      const nextColonyResources: Record<string, number> = { ...colony.stocks.resources };
      let mutated = false;
      for (const line of nonZero) {
        if (typeof line.resourceId !== 'string' || line.resourceId.length === 0) continue;
        if (line.qty > 0) {
          const have = nextColonyResources[line.resourceId] ?? 0;
          const move = Math.min(line.qty, have);
          if (move <= 0) continue;
          const remaining = have - move;
          if (remaining === 0) delete nextColonyResources[line.resourceId];
          else nextColonyResources[line.resourceId] = remaining;
          nextShipResources[line.resourceId] = (nextShipResources[line.resourceId] ?? 0) + move;
          mutated = true;
        } else {
          const sendQty = -line.qty;
          const have = nextShipResources[line.resourceId] ?? 0;
          const move = Math.min(sendQty, have);
          if (move <= 0) continue;
          const remaining = have - move;
          if (remaining === 0) delete nextShipResources[line.resourceId];
          else nextShipResources[line.resourceId] = remaining;
          nextColonyResources[line.resourceId] = (nextColonyResources[line.resourceId] ?? 0) + move;
          mutated = true;
        }
      }
      if (!mutated) return {};
      const nextUnits = state.units.map((u) =>
        u.id === unitId ? { ...u, cargo: { ...u.cargo, resources: nextShipResources } } : u,
      );
      const nextColonies = state.colonies.map((c) =>
        c.id === colonyId ? { ...c, stocks: { ...c.stocks, resources: nextColonyResources } } : c,
      );
      return { units: nextUnits, colonies: nextColonies };
    }),
  setRelations: (relations) => set({ relations }),
  openDiplomacy: () => set({ screen: 'diplomacy' }),
  closeDiplomacy: () => set({ screen: 'game' }),
  attemptDiplomacy: (target, action) => {
    const state = useGameStore.getState();
    const matrix = RelationsMatrix.fromJSON(state.relations);
    const outcome = attemptDiplomacyAction({
      matrix,
      proposer: state.faction,
      target,
      action,
      // TurnManager.turn starts at 1 (attempt.ts asserts positive integer).
      // currentTurn in the store starts at 0 until the first advance, so
      // clamp to 1 for a freshly-loaded game where no turn has ticked yet.
      currentTurn: Math.max(1, state.currentTurn),
    });
    set({ relations: matrix.toJSON(), lastDiplomacyOutcome: outcome });
    return outcome;
  },
  dismissDiplomacyOutcome: () => set({ lastDiplomacyOutcome: null }),
  setAudioVolume: (bus, volume) =>
    set((state) => ({
      settings:
        bus === 'sfx'
          ? { ...state.settings, sfxVolume: clampVolume(volume) }
          : { ...state.settings, bgmVolume: clampVolume(volume) },
    })),
  setAudioMuted: (muted) => set((state) => ({ settings: { ...state.settings, muted } })),
  startSovereigntyWar: (campaign) => set({ sovereigntyWar: campaign, sovereigntyBeat: null }),
  tickSovereigntyWar: () =>
    set((state) => {
      const current = state.sovereigntyWar;
      if (!current) return {};
      const prevElapsed = current.turnsElapsed;
      const nextElapsed = prevElapsed + 1;
      const nextCampaign: ConcordFleetCampaignJSON = { ...current, turnsElapsed: nextElapsed };
      const crossed = sovereigntyMilestoneCrossed(prevElapsed, nextElapsed, current.turnsRequired);
      return {
        sovereigntyWar: nextCampaign,
        ...(crossed !== null ? { sovereigntyBeat: crossed } : {}),
      };
    }),
  endSovereigntyWar: () => set({ sovereigntyWar: null, sovereigntyBeat: null }),
  showSovereigntyBeat: (milestone) => set({ sovereigntyBeat: milestone }),
  dismissSovereigntyBeat: () => set({ sovereigntyBeat: null }),
  reset: () => set({ ...initialState }),
}));
