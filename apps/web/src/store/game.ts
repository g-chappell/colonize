import { create } from 'zustand';
import {
  initialUnlockedCodexEntryIds,
  type BlackMarketOffering,
  type TavernRumourId,
  type TutorialStepId,
} from '@colonize/content';
import type {
  ArchiveCharterId,
  AutoRouteJSON,
  BuildingType,
  CharterHand,
  ColonyJSON,
  CombatOutcome,
  ConcordFleetCampaignJSON,
  ConcordTensionMeterJSON,
  ConcordUltimatumEvent,
  Coord,
  DiplomacyAction,
  DiplomacyAttemptOutcome,
  EndgameOutcome,
  FactionChartersJSON,
  GameVersion,
  HomePortJSON,
  MapHint,
  MerchantRouteJSON,
  RelationsMatrixJSON,
  ResourceId,
  RumourOutcome,
  TileType,
  TurnPhase,
  UnitJSON,
} from '@colonize/core';
import {
  AutoRoute,
  AutoRouteStatus,
  CONCORD_TENSION_THRESHOLDS,
  CORE_VERSION,
  ConcordTensionMeter,
  FactionCharters,
  HomePort,
  MerchantRoute,
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
import { resolveTavernHints } from '../tavern/resolve-rumour-hints';

export type PlayableFaction = 'otk' | 'ironclad' | 'phantom' | 'bloodborne';

export const FACTION_NAMES: Record<PlayableFaction, string> = {
  otk: 'Order of the Kraken',
  ironclad: 'Ironclad Syndicate',
  phantom: 'Phantom Corsairs',
  bloodborne: 'Bloodborne Legion',
};

export type Screen =
  | 'menu'
  | 'prologue'
  | 'faction-select'
  | 'game'
  | 'pause'
  | 'colony'
  | 'trade'
  | 'transfer'
  | 'diplomacy'
  | 'routes'
  | 'codex'
  | 'game-over';

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

// Tortuga black-market vendor snapshot — the modal data for a single
// Blackwater Collective visit. Non-null while the vendor modal is
// mounted; cleared by `dismissBlackMarketEncounter`. The encounter is
// treated as an unbidden event-modal (slice-driven self-mounting
// overlay per CLAUDE.md) rather than a `Screen` literal: the player
// was mid-something (exploring, on a route) when the stall surfaced,
// and walking away from it returns them to exactly where they stood.
// The offerings snapshot is a concrete subset the Blackwater roller
// will pick from `BLACK_MARKET_OFFERINGS`; here the slice just holds
// whatever list the opener passed in.
export interface BlackMarketEncounter {
  readonly offerings: readonly BlackMarketOffering[];
}

// Tavern encounter snapshot — modal data for a single "Visit Tavern"
// scene (TASK-075). Non-null while the tavern modal is mounted; the
// player walks away via `dismissTavernEncounter` which clears the
// slice. The opener (today the colony overlay's Visit Tavern button)
// pre-rolls the rumour ids via the pure `selectRumours` sibling and
// passes them in here. Treated as an unbidden event-modal
// (slice-driven self-mounting overlay per CLAUDE.md): the player was
// inside the colony view when they triggered it, and dismissing
// returns them to that same overlay because no `Screen` literal flips.
export interface TavernEncounter {
  readonly colonyId: string;
  readonly rumourIds: readonly TavernRumourId[];
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

// Per-turn Concord tithe notification — the modal data for a single
// "tithe due" prompt. Non-null while the tithe modal is mounted; the
// player resolves it by paying (which clears the slice; treasury
// deduction is a future orchestrator concern) or by boycotting (which
// raises the player faction's `concordTension` meter by `amount` and
// clears the slice). Treated as an unbidden event-modal (slice-driven
// self-mounting overlay per CLAUDE.md): the player was mid-something
// when the tithe came due, and resolving it returns them there.
export interface TitheNotification {
  readonly amount: number;
  readonly gameYear?: number;
}

// Pending Tidewater Party event — modal data for a single "dump cargo
// to buy reprieve" prompt (STORY-40). Non-null while the modal is
// mounted; cleared by `confirmTidewaterParty` (after the
// tension-clamp + ire-raise fires) or `dismissTidewaterPartyEvent`
// (no side effects). The caller that opens the event supplies
// `availableCargo` — the good-to-quantity snapshot of whatever hold
// the dump comes out of (ship cargo at a coastal anchorage today, a
// future-task colony stockpile path later). The modal filters to the
// goods with `>= dumpQty` and lets the player pick one.
export interface TidewaterPartyEvent {
  readonly availableCargo: Readonly<Record<ResourceId, number>>;
  readonly dumpQty: number;
  readonly freezeTurns: number;
  readonly irePenalty: number;
}

// Record of the most-recent dump, surfaced so a future orchestrator
// (the ship-cargo removal path) can observe what was dumped without
// scraping the modal's state. `confirmTidewaterParty` writes this
// alongside the tension-clamp; `clearLastTidewaterDump` acknowledges
// + clears. Cosmetic session state — not persisted.
export interface TidewaterDumpRecord {
  readonly resourceId: ResourceId;
  readonly qty: number;
}

// Default snapshot for the Concord tension meter — mirrors the empty
// state of `new ConcordTensionMeter()`. Frozen so callers cannot
// mutate the shared default; `set` clones via `toJSON()` whenever
// `boycottTithe` raises tension.
const DEFAULT_CONCORD_TENSION_SNAPSHOT: ConcordTensionMeterJSON = Object.freeze({
  tension: 0,
  thresholds: Object.freeze([...CONCORD_TENSION_THRESHOLDS]),
  crossed: Object.freeze([]),
  pending: Object.freeze([]),
  ire: 0,
  freezeTurnsRemaining: 0,
}) as ConcordTensionMeterJSON;

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
  // Player-authored merchant-route catalogue, keyed by route id. The
  // `id` doubles as the display name — the route-builder screen slugs
  // the typed name and stores the resulting id. Per-ship AutoRoute
  // assignments live in the sibling slice below; the two update
  // together when a route is deleted (orphan AutoRoutes are pruned
  // atomically).
  merchantRoutes: Readonly<Record<string, MerchantRouteJSON>>;
  // AutoRoute assignments keyed by ship unit id — 1:1 with a ship.
  // Non-existent key means the ship is manually piloted. A route id
  // referenced here must appear in `merchantRoutes`; `deleteRoute`
  // enforces this by pruning every AutoRoute that pointed at the
  // deleted route in the same `set` call.
  autoRoutes: Readonly<Record<string, AutoRouteJSON>>;
  // Per-faction Archive-Charter ledger, keyed by faction id. Each value
  // is a plain FactionChartersJSON snapshot (available + selected). A
  // missing key means the faction has not yet been seeded — the store
  // lazily seeds on first `openCouncilPick`, so tests and the founding
  // flow do not have to remember to call `seedFactionCharters` up-front.
  factionCharters: Readonly<Record<string, FactionChartersJSON>>;
  // Active Council pick-2 session. Non-null while the Council modal
  // should be mounted. See `CouncilPickSession` above for the shape.
  councilPick: CouncilPickSession | null;
  // Active Blackwater-Collective black-market stall. Non-null while
  // the Tortuga vendor modal is mounted; filled by
  // `showBlackMarketEncounter` (the encounter orchestrator, a future
  // task) and cleared by `dismissBlackMarketEncounter` when the
  // player walks away.
  blackMarketEncounter: BlackMarketEncounter | null;
  // Active tavern encounter — see TavernEncounter above. Non-null
  // while the tavern modal is mounted.
  tavernEncounter: TavernEncounter | null;
  // Map-hint leads currently surfaced on the HUD. Populated by the
  // tavern-dismiss flow (TASK-076) — each rumour with `hint` metadata
  // produces one `MapHint` pinned to the tavern colony. Entries
  // accumulate across tavern visits; `sourceRumourId` de-duplicates
  // re-rolls of the same rumour. Cleared on `reset` (and exposed via
  // `clearMapHints` for a future "mark resolved" orchestrator).
  mapHints: readonly MapHint[];
  // Per-turn Concord tithe notification — see TitheNotification above.
  // Non-null while the payment modal is mounted; cleared by `payTithe`
  // or `boycottTithe`. The orchestrator that drives per-turn tithe
  // computation (a future task) calls `showTitheNotification(amount)`
  // at the start of each turn when the player faction has any colony
  // presence; the modal handles the player's choice.
  titheNotification: TitheNotification | null;
  // Player-faction Concord tension snapshot. Persisted as a plain JSON
  // shape so the store stays cloneable for save-load; `boycottTithe`
  // reconstitutes a ConcordTensionMeter via `fromJSON` to call `raise`,
  // then writes the updated snapshot back. The HUD chip reads this
  // slice directly without reconstituting the meter (it only needs the
  // numeric tension + crossed-thresholds count).
  concordTension: ConcordTensionMeterJSON;
  // Active Tidewater Party modal payload — see TidewaterPartyEvent
  // above. Non-null while the modal is mounted; `confirmTidewaterParty`
  // or `dismissTidewaterPartyEvent` clears it.
  tidewaterPartyEvent: TidewaterPartyEvent | null;
  // Most-recent Tidewater dump — the (good, qty) pair the player
  // committed to on the most recent confirm. Non-null from
  // `confirmTidewaterParty` until `clearLastTidewaterDump` runs;
  // lets a ship-cargo orchestrator observe the dump without inspecting
  // the cleared event.
  lastTidewaterDump: TidewaterDumpRecord | null;
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
  // Resolved victory-or-defeat outcome. Non-null while the game-over
  // terminal screen is mounted. Populated by `declareEndgame` (called
  // from the turn-controller's TurnPhase.End exit hook when a win / loss
  // condition resolves) and cleared by `reset`. The `'game-over'` Screen
  // literal and this slice travel together — setting one without the
  // other is a bug — so `declareEndgame` flips both in a single set.
  endgame: EndgameOutcome | null;
  // Tutorial engine state. `tutorialEnabled` is flipped on at new-game
  // time from the FactionSelect toggle; `tutorialStep` is the currently
  // mounted instructional modal (slice-driven self-mounting per
  // CLAUDE.md — not a Screen literal, because tutorial callouts fire
  // during whatever the player was doing); `firedTutorialSteps` is the
  // fired-ledger that prevents the same scripted event from re-firing
  // every turn. The trigger policy (which step fires when) is the pure
  // `nextTutorialStep` sibling in apps/web/src/tutorial/tutorial-trigger.ts.
  tutorialEnabled: boolean;
  tutorialStep: TutorialStepId | null;
  firedTutorialSteps: readonly TutorialStepId[];
  // Codex entry ids the player has revealed. Seeded from
  // `initialUnlockedCodexEntryIds()` in `@colonize/content` at game
  // start and by `reset` — entries flagged `unlockedFromStart: true`
  // in the registry. Extended by `unlockCodexEntry` (idempotent; no-op
  // if the id is already present). The Codex viewer groups + renders
  // entries by category, skipping any whose id does not appear here.
  codexUnlocked: readonly string[];
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
  showBlackMarketEncounter: (encounter: BlackMarketEncounter) => void;
  dismissBlackMarketEncounter: () => void;
  // Open the tavern encounter modal with `encounter` — no-op if one
  // is already active so a double-click on the colony overlay's
  // Visit Tavern button cannot stack two modals on top of each other.
  showTavernEncounter: (encounter: TavernEncounter) => void;
  // Dismiss the active tavern encounter. Before clearing the slice,
  // resolves any rumours with `hint` metadata into `MapHint` values
  // pinned to the tavern colony's position and appends them to
  // `mapHints` (de-duplicated by sourceRumourId). A dismiss while no
  // encounter is mounted is a no-op.
  dismissTavernEncounter: () => void;
  // Append hint leads to `mapHints`. Entries sharing a sourceRumourId
  // with an incoming hint are dropped before the append so re-visiting
  // the same rumour never stacks. No-op on an empty input list.
  addMapHints: (hints: readonly MapHint[]) => void;
  // Clear every lead from `mapHints`. Used by a future orchestrator
  // that marks a rumour as resolved and by `reset`.
  clearMapHints: () => void;
  // Mount the per-turn tithe notification with `amount` coins due. The
  // optional `gameYear` is forwarded so tests / future orchestration can
  // pin the modal copy to a calendar slice. No-op when a notification
  // is already active — only the first per-turn call wins, so a
  // double-fire from a spurious orchestrator tick cannot stack two
  // modals on top of each other.
  showTitheNotification: (notification: TitheNotification) => void;
  // Resolve the active tithe notification by paying. Clears the slice
  // without touching the tension meter. Treasury deduction is deferred
  // to the orchestrator that owns the player wallet — the modal only
  // signals intent. No-op when no notification is active.
  payTithe: () => void;
  // Resolve the active tithe notification by boycotting. Reconstitutes
  // the player faction's tension meter, raises by the notification
  // amount, writes the updated snapshot back, and clears the slice.
  // Returns the freshly-crossed ultimatum events so a future orchestrator
  // can chain into the Concord-escalation modal without re-deriving
  // them from the snapshot diff. No-op (returns []) when no notification
  // is active.
  boycottTithe: () => readonly ConcordUltimatumEvent[];
  // Open the Tidewater Party modal with `event` — no-op if one is
  // already active (mirrors `showTitheNotification` so a spurious
  // double-fire cannot stack two modals).
  showTidewaterPartyEvent: (event: TidewaterPartyEvent) => void;
  // Commit the active Tidewater Party: clamp tension to 0, install the
  // freeze window, raise ire, clear the event, and record the
  // `{ resourceId, qty }` the player committed to so a cargo-removal
  // orchestrator can observe it. Silently no-ops when no event is
  // active, when `qty` is not a positive integer, when `qty` is less
  // than the event's `dumpQty`, or when `resourceId` is not among the
  // event's eligible goods — defence-in-depth against malformed input;
  // the modal UI only offers valid choices.
  confirmTidewaterParty: (resourceId: ResourceId, qty: number) => void;
  // Cancel the active Tidewater Party without side effects — clears
  // the event slice only.
  dismissTidewaterPartyEvent: () => void;
  // Acknowledge + clear the `lastTidewaterDump` record. Orchestrators
  // that act on the dump call this after removing the cargo so a
  // subsequent observer does not double-apply.
  clearLastTidewaterDump: () => void;
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
  // Open / close the route-builder overlay. Open routes the screen to
  // 'routes'; close routes back to 'game'. The overlay is launched
  // from the HUD, so closing returns to map view, not the colony
  // overlay.
  openRouteScreen: () => void;
  closeRouteScreen: () => void;
  // Save a merchant route (create-or-replace by id). Validates the
  // route via `MerchantRoute.fromJSON` — malformed input is silently
  // skipped so a caller can defence-in-depth an UI that already
  // enforces constraints. The AutoRoute slice is untouched; callers
  // reassign a ship explicitly via `assignRouteToShip` afterwards.
  saveMerchantRoute: (route: MerchantRouteJSON) => void;
  // Delete a merchant route and prune every AutoRoute that pointed
  // at it, in a single atomic `set` so a re-render cannot observe
  // orphaned AutoRoute entries referencing a missing route.
  deleteMerchantRoute: (routeId: string) => void;
  // Assign a route to a ship. The AutoRoute starts at stop 0 with
  // status 'active'. Reassignment replaces any existing AutoRoute
  // on the same ship (the prior route is simply dropped — the ship
  // never runs two routes at once). Silently skips when the route
  // id is unknown or the ship is missing from the roster.
  assignRouteToShip: (unitId: string, routeId: string) => void;
  // Clear the AutoRoute entry for a ship. No-op when the ship has
  // no assignment.
  unassignRoute: (unitId: string) => void;
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
  // Lock the game into the game-over terminal screen with the supplied
  // outcome. Atomic: the `endgame` slice and `screen` literal flip in a
  // single `set` so a re-render cannot observe one without the other.
  // No-op when an endgame is already declared — only the first trigger
  // wins (a subsequent tick that would also resolve never replaces the
  // original outcome).
  declareEndgame: (outcome: EndgameOutcome) => void;
  // Enable or disable the tutorial engine. Flipping on clears the
  // fired-ledger so a fresh tutorial run starts from step one; flipping
  // off also dismisses any currently mounted step so the callout
  // disappears immediately.
  setTutorialEnabled: (enabled: boolean) => void;
  // Mount the step with the given id. Records the id in the fired
  // ledger so the same step never re-fires. No-op when another step is
  // already mounted (the orchestrator should drain the current modal
  // before opening the next).
  showTutorialStep: (id: TutorialStepId) => void;
  // Clear the currently mounted step without touching the fired ledger
  // (player dismissed the single callout, tutorial continues).
  dismissTutorialStep: () => void;
  // Player chose to skip the rest of the tutorial. Disables the engine
  // AND clears the currently mounted step; the fired ledger is left in
  // place so re-enabling mid-game resumes from where it stopped.
  skipTutorial: () => void;
  // Add `entryId` to the unlocked set. Idempotent — redundant calls
  // with an already-unlocked id are a no-op (prevents stale bus re-fires
  // from growing the array). Does not validate `entryId` against the
  // registry; a non-registry id is stored and ignored by the viewer,
  // which is the cheapest defence against typos without coupling the
  // store to content.
  unlockCodexEntry: (entryId: string) => void;
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
  blackMarketEncounter: null as BlackMarketEncounter | null,
  tavernEncounter: null as TavernEncounter | null,
  mapHints: [] as readonly MapHint[],
  titheNotification: null as TitheNotification | null,
  concordTension: DEFAULT_CONCORD_TENSION_SNAPSHOT,
  tidewaterPartyEvent: null as TidewaterPartyEvent | null,
  lastTidewaterDump: null as TidewaterDumpRecord | null,
  homePorts: {} as Readonly<Record<string, HomePortJSON>>,
  tradeSession: null as TradeSession | null,
  transferSession: null as TransferSession | null,
  merchantRoutes: {} as Readonly<Record<string, MerchantRouteJSON>>,
  autoRoutes: {} as Readonly<Record<string, AutoRouteJSON>>,
  relations: { entries: [] } as RelationsMatrixJSON,
  lastDiplomacyOutcome: null as DiplomacyAttemptOutcome | null,
  sovereigntyWar: null as ConcordFleetCampaignJSON | null,
  sovereigntyBeat: null as SovereigntyMilestone | null,
  endgame: null as EndgameOutcome | null,
  tutorialEnabled: false,
  tutorialStep: null as TutorialStepId | null,
  firedTutorialSteps: [] as readonly TutorialStepId[],
  codexUnlocked: initialUnlockedCodexEntryIds(),
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
  showBlackMarketEncounter: (encounter) => set({ blackMarketEncounter: encounter }),
  dismissBlackMarketEncounter: () => set({ blackMarketEncounter: null }),
  showTavernEncounter: (encounter) =>
    set((state) => (state.tavernEncounter === null ? { tavernEncounter: encounter } : {})),
  dismissTavernEncounter: () =>
    set((state) => {
      const encounter = state.tavernEncounter;
      if (encounter === null) return {};
      const colony = state.colonies.find((c) => c.id === encounter.colonyId);
      if (!colony) return { tavernEncounter: null };
      const added = resolveTavernHints(colony.position, encounter.rumourIds);
      if (added.length === 0) return { tavernEncounter: null };
      const incoming = new Set(added.map((h) => h.sourceRumourId));
      const surviving = state.mapHints.filter((h) => !incoming.has(h.sourceRumourId));
      return { tavernEncounter: null, mapHints: [...surviving, ...added] };
    }),
  addMapHints: (hints) =>
    set((state) => {
      if (hints.length === 0) return {};
      const incoming = new Set(hints.map((h) => h.sourceRumourId));
      const surviving = state.mapHints.filter((h) => !incoming.has(h.sourceRumourId));
      return { mapHints: [...surviving, ...hints] };
    }),
  clearMapHints: () => set((state) => (state.mapHints.length === 0 ? {} : { mapHints: [] })),
  showTitheNotification: (notification) =>
    set((state) => (state.titheNotification === null ? { titheNotification: notification } : {})),
  payTithe: () =>
    set((state) => (state.titheNotification === null ? {} : { titheNotification: null })),
  boycottTithe: () => {
    const state = useGameStore.getState();
    const notification = state.titheNotification;
    if (notification === null) return [];
    const meter = ConcordTensionMeter.fromJSON(state.concordTension);
    const crossed = meter.raise(Math.max(0, Math.floor(notification.amount)));
    set({ concordTension: meter.toJSON(), titheNotification: null });
    return crossed;
  },
  showTidewaterPartyEvent: (event) =>
    set((state) => (state.tidewaterPartyEvent === null ? { tidewaterPartyEvent: event } : {})),
  confirmTidewaterParty: (resourceId, qty) => {
    const state = useGameStore.getState();
    const event = state.tidewaterPartyEvent;
    if (event === null) return;
    if (!Number.isInteger(qty) || qty <= 0) return;
    if (qty < event.dumpQty) return;
    const have = event.availableCargo[resourceId];
    if (have === undefined || have < qty) return;
    const meter = ConcordTensionMeter.fromJSON(state.concordTension);
    meter.triggerTidewaterParty({
      freezeTurns: event.freezeTurns,
      irePenalty: event.irePenalty,
    });
    set({
      concordTension: meter.toJSON(),
      tidewaterPartyEvent: null,
      lastTidewaterDump: { resourceId, qty },
    });
  },
  dismissTidewaterPartyEvent: () =>
    set((state) => (state.tidewaterPartyEvent === null ? {} : { tidewaterPartyEvent: null })),
  clearLastTidewaterDump: () =>
    set((state) => (state.lastTidewaterDump === null ? {} : { lastTidewaterDump: null })),
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
  openRouteScreen: () => set({ screen: 'routes' }),
  closeRouteScreen: () => set({ screen: 'game' }),
  saveMerchantRoute: (route) =>
    set((state) => {
      let validated: MerchantRouteJSON;
      try {
        validated = MerchantRoute.fromJSON(route).toJSON();
      } catch {
        return {};
      }
      return {
        merchantRoutes: { ...state.merchantRoutes, [validated.id]: validated },
      };
    }),
  deleteMerchantRoute: (routeId) =>
    set((state) => {
      if (!(routeId in state.merchantRoutes)) return {};
      const nextRoutes: Record<string, MerchantRouteJSON> = {};
      for (const [id, r] of Object.entries(state.merchantRoutes)) {
        if (id !== routeId) nextRoutes[id] = r;
      }
      const nextAutoRoutes: Record<string, AutoRouteJSON> = {};
      for (const [unitId, ar] of Object.entries(state.autoRoutes)) {
        if (ar.routeId !== routeId) nextAutoRoutes[unitId] = ar;
      }
      return { merchantRoutes: nextRoutes, autoRoutes: nextAutoRoutes };
    }),
  assignRouteToShip: (unitId, routeId) =>
    set((state) => {
      if (!(routeId in state.merchantRoutes)) return {};
      if (!state.units.some((u) => u.id === unitId)) return {};
      const ar = new AutoRoute({
        unitId,
        routeId,
        currentStopIndex: 0,
        status: AutoRouteStatus.Active,
        brokenReason: null,
      });
      return { autoRoutes: { ...state.autoRoutes, [unitId]: ar.toJSON() } };
    }),
  unassignRoute: (unitId) =>
    set((state) => {
      if (!(unitId in state.autoRoutes)) return {};
      const next: Record<string, AutoRouteJSON> = {};
      for (const [uid, ar] of Object.entries(state.autoRoutes)) {
        if (uid !== unitId) next[uid] = ar;
      }
      return { autoRoutes: next };
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
  declareEndgame: (outcome) =>
    set((state) => {
      if (state.endgame !== null) return {};
      return { endgame: outcome, screen: 'game-over' as Screen };
    }),
  setTutorialEnabled: (enabled) =>
    set(
      enabled
        ? { tutorialEnabled: true, firedTutorialSteps: [], tutorialStep: null }
        : { tutorialEnabled: false, tutorialStep: null },
    ),
  showTutorialStep: (id) =>
    set((state) => {
      if (state.tutorialStep !== null) return {};
      if (state.firedTutorialSteps.includes(id)) {
        return { tutorialStep: id };
      }
      return {
        tutorialStep: id,
        firedTutorialSteps: [...state.firedTutorialSteps, id],
      };
    }),
  dismissTutorialStep: () => set({ tutorialStep: null }),
  skipTutorial: () => set({ tutorialEnabled: false, tutorialStep: null }),
  unlockCodexEntry: (entryId) =>
    set((state) => {
      if (state.codexUnlocked.includes(entryId)) return {};
      return { codexUnlocked: [...state.codexUnlocked, entryId] };
    }),
  reset: () =>
    set({
      ...initialState,
      // `initialState` was captured at module init; re-evaluate the
      // unlocked seed on reset so a content-hot-reload in dev cannot
      // leak a stale snapshot into a fresh game.
      codexUnlocked: initialUnlockedCodexEntryIds(),
    }),
}));
