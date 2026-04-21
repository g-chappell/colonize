<!-- DO NOT EDIT — this file is generated from roadmap/roadmap.yml -->
<!-- To add tasks: edit roadmap/roadmap.yml, then run `node roadmap/render.mjs` -->
<!-- Or run /roadmap-add or /pm-brainstorm from Claude Code. -->

# Colonize — Roadmap

_Created: 2026-04-20_

## Summary

- **Total tasks:** 90
- **Done:** 15 (17%)
- **Ready:** 75
- **In progress:** 0
- **Blocked:** 0

---

## EPIC-01 — Platform foundation

Web + mobile + server skeleton. TypeScript monorepo with npm workspaces,
Vite web app, Capacitor mobile wrapper, Fastify server. Shared tooling
(TS project references, ESLint flat config, Vitest, Prettier). Wires
the deploy pipeline from main → VPS docker compose.

- **STORY-01** — Web app shell
  > Scaffold apps/web as a Vite + React app that renders a placeholder
  > screen. Typecheck + test + build all green locally and in CI.
  - :white_check_mark: **TASK-001** — Scaffold root TS tooling (tsconfig.base, ESLint, Prettier)  `high` `small` · [PR](https://github.com/g-chappell/colonize/pull/2)
    > Add tsconfig.base.json (strict), root tsconfig.json with
    > project references, eslint.config.js (flat), .prettierrc.
    > Install typescript, eslint, prettier, @typescript-eslint/* as
    > root devDeps. Commit package-lock.json update.
  - :white_check_mark: **TASK-002** — Scaffold apps/web with Vite + React + TS  `high` `small` _(web)_ · [PR](https://github.com/g-chappell/colonize/pull/3)  
    _depends on: TASK-001_
    > Create apps/web with package.json (workspace name
    > @colonize/web), Vite config, React 18, basic App component
    > that renders "Colonize — NW 2191". Wire npm run dev / build /
    > test / typecheck scripts. Verify port 5173 dev server starts.

- **STORY-02** — Mobile wrapper
  > Capacitor scaffold in apps/mobile pointing at apps/web's build
  > output. iOS + Android projects generated; build verified locally.
  - :white_check_mark: **TASK-003** — Scaffold apps/mobile with Capacitor + add iOS/Android  `high` `medium` _(mobile)_ · [PR](https://github.com/g-chappell/colonize/pull/4)  
    _depends on: TASK-002_
    > Create apps/mobile with capacitor.config.ts (appId
    > dev.blacksail.colonize, webDir ../web/dist). Run npx cap add
    > ios + npx cap add android. Verify npx cap sync works after a
    > web build. Commit ios/ and android/ directories.

- **STORY-03** — Shared packages scaffold
  > packages/core (pure TS game logic), packages/shared (Zod DTOs),
  > packages/content (assets + lore). All typecheck clean with
  > project references working end-to-end.
  - :white_check_mark: **TASK-004** — Scaffold packages/core, packages/shared, packages/content  `high` `small` _(core, shared, content)_ · [PR](https://github.com/g-chappell/colonize/pull/6)  
    _depends on: TASK-001_
    > Create three workspaces with package.json (composite: true in
    > their tsconfigs), index.ts exporting a placeholder symbol
    > each. Add them to root tsconfig.json references. Verify tsc
    > -b succeeds at root.
  - :white_check_mark: **TASK-005** — Wire shared state store (Zustand) in apps/web  `high` `small` _(web, core)_ · [PR](https://github.com/g-chappell/colonize/pull/7)  
    _depends on: TASK-002, TASK-004_
    > Install zustand in apps/web. Create src/store/game.ts with a
    > minimal store (slice: gameVersion, currentTurn). Import a
    > type from packages/core to verify cross-workspace imports
    > work via project references + paths alias.

- **STORY-04** — Server skeleton + CI/deploy wiring
  > apps/server as a Fastify app with /health. Docker build from
  > docker/Dockerfile succeeds locally. GitHub Actions workflow
  > deploys to VPS on merge-to-main via ssh + scripts/deploy.sh.
  - :white_check_mark: **TASK-006** — Scaffold apps/server with Fastify + /health endpoint  `high` `small` _(server, shared)_ · [PR](https://github.com/g-chappell/colonize/pull/10)  
    _depends on: TASK-004_
    > Create apps/server with Fastify, pino, tsx for dev, tsc for
    > build. Expose GET /health returning { ok: true, version,
    > uptime }. Add dev/build/start scripts. Bind to process.env
    > APP_PORT || 3000.
  - :white_check_mark: **TASK-007** — Wire apps/server to serve apps/web static build  `high` `small` _(server, web)_ · [PR](https://github.com/g-chappell/colonize/pull/12)  
    _depends on: TASK-006_
    > Add @fastify/static to apps/server. In production, serve
    > apps/web/dist as root and fall through unknown routes to
    > index.html for SPA routing. Verify the Dockerfile artifact
    > copies both dist trees.
  - :white_check_mark: **TASK-008** — Add GitHub Actions deploy workflow (main → VPS)  `high` `medium` · [PR](https://github.com/g-chappell/colonize/pull/14)  
    _depends on: TASK-007_
    > Create .github/workflows/deploy.yml triggered on push to
    > main. Uses appleboy/ssh-action or similar to ssh root@
    > 72.61.207.12 and run cd /opt/colonize && git pull && bash
    > scripts/deploy.sh. Requires SSH_PRIVATE_KEY + SSH_HOST
    > secrets configured in repo settings. Document the secret
    > names in the PR.

## EPIC-02 — Retro art pipeline & UI shell

The look-and-feel layer: pixel-art tile atlas pipeline, HUD chrome,
screen navigation, and audio hooks. Separates React DOM chrome from
Phaser canvas with a shared event bus.

- **STORY-05** — Tile atlas pipeline
  > Pipeline for converting loose PNGs into packed atlases + JSON
  > metadata, consumed by Phaser at runtime. Includes palette
  > definition for retro consistency.
  - :white_check_mark: **TASK-009** — Define OTK retro palette + pipeline script  `high` `medium` _(content)_ · [PR](https://github.com/g-chappell/colonize/pull/15)  
    _depends on: TASK-004_
    > Pick a constrained retro palette (32–64 colours) appropriate
    > to the three tonal registers (salt-and-rum warm, eldritch
    > teal/violet, salvaged-futurism steel/amber). Write
    > packages/content/scripts/pack-atlas.mjs (wraps
    > free-tex-packer or similar) producing spritesheet.png +
    > spritesheet.json. Document in packages/content/README.md.
  - :white_check_mark: **TASK-010** — Load placeholder atlas in Phaser boot scene  `high` `small` _(web, content)_ · [PR](https://github.com/g-chappell/colonize/pull/16)  
    _depends on: TASK-002, TASK-009_
    > Add Phaser 3 to apps/web. Create a BootScene that loads the
    > packaged atlas + shows a loading bar. On load complete,
    > transition to a MainMenuScene placeholder.

- **STORY-06** — HUD chrome
  > React-based HUD overlay: resource bar, minimap placeholder,
  > end-turn button, year/era display. Communicates with Phaser via
  > a shared event bus.
  - :white_check_mark: **TASK-011** — Create event bus in apps/web/src/bus.ts  `high` `small` _(web)_ · [PR](https://github.com/g-chappell/colonize/pull/18)  
    _depends on: TASK-010_
    > Simple typed pub/sub (mitt or hand-rolled). Events typed via
    > packages/shared. Used by React HUD and Phaser scenes to
    > communicate without tight coupling.
  - :white_check_mark: **TASK-012** — Build HUD components (resource bar, year, end-turn)  `high` `medium` _(web)_ · [PR](https://github.com/g-chappell/colonize/pull/19)  
    _depends on: TASK-011_
    > React components rendering on top of the Phaser canvas via
    > CSS absolute positioning. Read from game store
    > (TASK-005). Include NW year display, faction chip,
    > resource-bar placeholders, end-turn button. Tailwind or CSS
    > modules — pick and document.

- **STORY-07** — Screen navigation
  > Top-level app flow between screens: Splash → Main Menu → Faction
  > Select → In-Game → Pause overlay. Implemented as Phaser scene
  > transitions for canvas states + React routes for menu states.
  - :white_check_mark: **TASK-013** — Main menu screen (React)  `high` `small` _(web)_ · [PR](https://github.com/g-chappell/colonize/pull/20)  
    _depends on: TASK-012_
    > React page with New Game / Continue / Settings / Codex /
    > Quit buttons. Style with OTK heraldry (paired dragons, hic
    > sunt dracones motto). Wire New Game to go to faction select.
  - :white_check_mark: **TASK-014** — Faction select screen  `high` `medium` _(web, content)_ · [PR](https://github.com/g-chappell/colonize/pull/21)  
    _depends on: TASK-013_
    > Four-panel select: OTK / Ironclad / Phantom / Bloodborne.
    > Each panel shows faction crest, 2-sentence lore blurb, and
    > a one-line bonus description. Pick → start new game.
    > Content strings in packages/content/factions.ts.

- **STORY-08** — Audio hooks
  > Phaser audio manager wired through an SFX bus and a BGM bus.
  > Priming tap for iOS autoplay restrictions. BGM stems by mood
  > (sea / tavern / combat / event).
  - :black_circle: **TASK-015** — Audio manager with SFX + BGM buses  `med` `medium` _(web, content)_  
    _depends on: TASK-010_
    > Wrap Phaser.Sound with typed play()/playBgm()/stopBgm().
    > Prime audio on first user interaction (critical for iOS).
    > Placeholder stems in packages/content/audio/ — can be
    > silent/short for now; real composition is later.
  - :black_circle: **TASK-016** — Pause overlay (React) + resume  `med` `small` _(web)_  
    _depends on: TASK-013, TASK-015_
    > Esc / menu-icon opens pause overlay: Resume, Settings, Save,
    > Quit-to-menu. Calls phaser.scene.pause() while open.
    > Settings include audio bus volumes (writes to store).

## EPIC-03 — World & map

The game world: procedural generation of the ocean map, Rayon
Passage, floating-city nodes, islands, Red Tide zones, and Fata
Morgana tiles. Fog of war. Camera / pan / zoom including mobile
touch. All tiles fixed at map-gen; no island-emergence.

- **STORY-09** — Map data model
  > Framework-free representation of the map in packages/core:
  > tile types, coords, neighbours. Serializable.
  - :white_check_mark: **TASK-017** — Tile type enum + Map model in packages/core  `high` `medium` _(core)_ · [PR](https://github.com/g-chappell/colonize/pull/22)  
    _depends on: TASK-004_
    > Define TileType (Ocean, RayonPassage, Island, FloatingCity,
    > RedTide, FataMorgana). Map class with get(x,y), neighbours,
    > toJSON/fromJSON. Unit tests for coord math and
    > serialization.
  - :black_circle: **TASK-018** — Procedural map generator  `high` `large` _(core)_  
    _depends on: TASK-017_
    > Seedable generator: places a central Rayon Passage corridor
    > with 5–8 floating-city nodes, scatters 8–15 islands of
    > varied sizes, 1–3 Red Tide zones, a handful of Fata Morgana
    > tiles. Parameters: seed, size, faction-start positions.
    > Deterministic for same seed.

- **STORY-10** — Map rendering
  > Phaser tilemap renderer fed by the core Map model. Tiles use
  > the art-pipeline atlas. Smooth performance on low-end mobile
  > targets.
  - :black_circle: **TASK-019** — Phaser GameScene + tile renderer  `high` `large` _(web, core, content)_  
    _depends on: TASK-010, TASK-018_
    > GameScene loads a Map from core, renders each tile via the
    > atlas. Supports variable tile sizes (animated water
    > frames). Camera follows a target; uses culling for
    > off-screen tiles.
  - :black_circle: **TASK-020** — Camera controls: pan / zoom / mobile touch  `high` `medium` _(web)_  
    _depends on: TASK-019_
    > Mouse drag to pan, wheel to zoom, arrow keys to pan on
    > desktop. Single-finger drag pan + pinch zoom on mobile.
    > Clamp zoom to sensible min/max. Remember last camera
    > position per game.

- **STORY-11** — Fog of war
  > Per-faction visibility: unexplored tiles are hidden; previously
  > explored tiles are dimmed ("last seen" snapshot). Line of
  > sight from units + colonies.
  - :black_circle: **TASK-021** — Visibility model in core (unseen / seen / visible)  `high` `medium` _(core)_  
    _depends on: TASK-017_
    > Per-faction 2D grid with state: unseen (hidden), seen (last
    > observed snapshot, dimmed), visible (currently in LoS).
    > Update on unit move / colony placement. Serializable.
  - :black_circle: **TASK-022** — Fog overlay in GameScene renderer  `high` `medium` _(web)_  
    _depends on: TASK-019, TASK-021_
    > Phaser overlay layer darkens seen tiles and hides unseen.
    > Animated reveal when a tile transitions unseen→seen.
    > Performance-conscious: use a single render-texture mask
    > rather than per-tile sprites.

- **STORY-12** — Rayon Passage start region
  > Always-revealed known-sea corridor at game start, representing
  > the existing spine of civilisation. Player starts with Rayon
  > Passage visible; frontier + islands are fog-of-war.
  - :black_circle: **TASK-023** — Mark Rayon Passage tiles as 'seen' at game start  `med` `small` _(core)_  
    _depends on: TASK-021_
    > Initial visibility state: every Rayon Passage tile +
    > floating-city node is at least 'seen' at turn 0 for all
    > factions. Everything else starts 'unseen'. Covered by
    > visibility unit tests.

## EPIC-04 — Turn engine, units & movement

The heart of a 4X game loop: player turn → AI turns → events →
next year. Unit entities, ship classes, pathfinding, sailing
rules including wind, currents, and Red Tide impassability.

- **STORY-13** — Turn loop
  > Turn state machine: ActivePlayer → AIPlayers[] → WorldEvents
  > → Year+1. Yearly calendar matches NW dates (starting at NW
  > 2191). End-turn button advances.
  - :black_circle: **TASK-024** — Turn state machine in packages/core  `high` `medium` _(core)_  
    _depends on: TASK-017_
    > TurnManager with phases: Start → PlayerAction → AI →
    > WorldEvents → End. Hooks for phase-enter/exit. Deterministic
    > given same state + inputs. Unit tests for phase
    > transitions.
  - :black_circle: **TASK-025** — End-turn button wiring + year display  `high` `small` _(web, core)_  
    _depends on: TASK-012, TASK-024_
    > HUD end-turn button dispatches to TurnManager. Year display
    > shows current NW year (start 2191). Show "AI thinking…"
    > indicator during AI phases.

- **STORY-14** — Unit entities & stats
  > Unit model: id, faction, position, type, stats (crew,
  > supplies, condition). Movement points regenerate per turn.
  > Serializable.
  - :black_circle: **TASK-026** — Unit model + movement points  `high` `medium` _(core)_  
    _depends on: TASK-017_
    > Unit class: id, faction, pos, type, stats. Movement points
    > set at turn start per unit type. Deduct on move. Unit
    > tests.
  - :black_circle: **TASK-027** — Ship classes (Sloop, Brig, Frigate, ShipOfTheLine, Privateer)  `high` `small` _(core, content)_  
    _depends on: TASK-026_
    > UnitType definitions for base ship classes with distinct
    > stats (hull, guns, crew capacity, base move). Placeholder
    > for OTK Legendary Ship slots (unlocked later). Data in
    > packages/content/units.ts.

- **STORY-15** — Pathfinding + sailing rules
  > A* pathfinding on the ocean map. Wind zones give +/- move-cost
  > modifiers. Red Tide tiles impassable without Kraken Talisman.
  - :black_circle: **TASK-028** — A* pathfinding with tile cost modifiers  `high` `medium` _(core)_  
    _depends on: TASK-017, TASK-026_
    > Pathfinder returning tile-by-tile path + total cost. Per-
    > tile cost from map (ocean = 1, Red Tide = ∞ unless unit
    > has RedTideImmunity flag). Unit tests with a small map.
  - :black_circle: **TASK-029** — Wind / current zones  `med` `medium` _(core)_  
    _depends on: TASK-028_
    > Add optional WindZone + CurrentZone layers to the map
    > (seeded at gen). Modify sailing move-cost by direction
    > travelled vs wind direction. Tested on a small map.

- **STORY-16** — Unit interaction in GameScene
  > Click to select unit; click destination to move. Path preview
  > highlights route. Animation moves sprite along path at
  > reasonable speed.
  - :black_circle: **TASK-030** — Unit sprite rendering + click-to-select  `high` `medium` _(web, core)_  
    _depends on: TASK-019, TASK-026_
    > GameScene renders units from store. Click selects (emits
    > event via bus); selection highlights sprite + shows stats
    > panel in HUD.
  - :black_circle: **TASK-031** — Click-to-move with path preview + animation  `high` `medium` _(web, core)_  
    _depends on: TASK-030, TASK-028_
    > Second click proposes path (via TASK-028); confirm commits
    > move. Sprite tweens along path; camera can follow. Handles
    > partial moves when path cost > remaining MP.

## EPIC-05 — Exploration & discoveries

What there is to find on the frontier: Archive caches, legendary
shipwrecks, Kraken shrines, Fata Morgana outcomes. Rewards:
Salvage tech, Abyssal materia, bloodline artifacts, Legendary
Ship blueprints (OTK-only).

- **STORY-17** — Rumour-tile mechanic
  > Hidden contents on certain tiles. Revealed when a unit enters.
  > Outcomes pull from a weighted table per tile-type.
  - :black_circle: **TASK-032** — Rumour-tile entity in core + generator integration  `high` `medium` _(core)_  
    _depends on: TASK-018, TASK-026_
    > RumourTile associated with a map position. Map generator
    > sprinkles them in unexplored regions. On entry, resolve()
    > returns a typed RumourOutcome.
  - :black_circle: **TASK-033** — Rumour outcome table + UI reveal modal  `high` `medium` _(core, web, content)_  
    _depends on: TASK-032_
    > Outcome types: ArchiveCache (Liberty Chimes), LegendaryWreck
    > (Legendary blueprint for OTK, salvage for others),
    > KrakenShrine (reputation w/ Kraken faction-stance shifts),
    > FataMorganaMirage (nothing / bonus / hazard). React modal
    > shows flavour text + rewards. Text in packages/content.

- **STORY-18** — Treasures as carried items
  > Salvage tech + Abyssal materia as transportable resources that
  > convert to in-colony benefits when delivered.
  - :black_circle: **TASK-034** — Carried-cargo model on units + delivery flow  `high` `medium` _(core)_  
    _depends on: TASK-026_
    > Units have a CargoHold (typed map of resource→qty + unique
    > artifacts). Transfer happens when entering a friendly
    > colony. Unique artifacts produce permanent colony bonuses.

- **STORY-19** — Legendary shipwrecks → blueprint unlocks
  > The six Legendary Ships of the Golden Age. OTK unlocks a
  > rebuild blueprint on discovery; other factions get a salvage
  > payout instead.
  - :black_circle: **TASK-035** — Legendary Ship blueprint system  `med` `medium` _(core, content)_  
    _depends on: TASK-027, TASK-033_
    > Six legendary ships (Queen Anne's Revenge, Black Pearl,
    > Flying Dutchman, Whydah, Ranger, Revenge) in content. Core
    > tracks which are discovered + which blueprints have been
    > redeemed (OTK only). Post-redeem: the class becomes
    > buildable in OTK shipyards with the legendary stats.

- **STORY-20** — Scouting unit types
  > Cartographer + Explorer: longer sight range, higher movement,
  > weaker combat. Essential for early exploration.
  - :black_circle: **TASK-036** — Cartographer + Explorer unit types  `med` `small` _(core, content)_  
    _depends on: TASK-027_
    > Two new UnitTypes with sight radius 2× normal, higher MP,
    > minimal guns. Recruitable from tavern in a starting
    > colony. Flavour text references Sparrow's diary voice.
  - :black_circle: **TASK-037** — Map-edge cue: 'hic sunt dracones' tile-edge motif  `low` `small` _(web, content)_  
    _depends on: TASK-022_
    > On map tiles at the edge of explored territory, occasionally
    > render a subtle dragon sigil + motto in the fog. Flavour
    > only; no mechanical effect. Pulls from content palette.

## EPIC-06 — Colonies, resources & professions

The colony layer: founding floating cities vs island settlements,
building trees, tile-work assignment, resource chains, the crew
profession system (crew roles, training, learning from other
factions).

- **STORY-21** — Colony founding
  > Found a colony at a floating-city node (bonus) or on an
  > island tile (requires dedicated founding unit). Colony has a
  > population, treasury, production queue.
  - :black_circle: **TASK-038** — Colony entity + founding action  `high` `medium` _(core)_  
    _depends on: TASK-017, TASK-026_
    > Colony with id, faction, position, population, crew
    > roster, buildings, stocks. FoundColony action consumes a
    > Founding Ship unit at a valid tile. Unit tests.
  - :black_circle: **TASK-039** — Colony view (React + Phaser inset)  `high` `large` _(web, core)_  
    _depends on: TASK-038, TASK-030_
    > Dedicated screen showing a colony's tiles, workers
    > assigned, buildings, stocks, production queue. Accessible
    > by clicking a colony sprite on the main map.

- **STORY-22** — Building tree
  > Buildings unlock production: Tavern, Shipyard, Forge, Archive-
  > study Hall, Chapel-of-Kraken, Distillery, Gun Deck, Warehouse,
  > Rope-walk, etc. Prerequisites + costs in content.
  - :black_circle: **TASK-040** — Building definitions + prerequisites in content  `high` `medium` _(content, core)_  
    _depends on: TASK-038_
    > Define ~15 starter buildings with cost, prereq, effect
    > (e.g. Shipyard enables ship construction; Chapel-of-Kraken
    > grants Talisman blessings). Data in content/buildings.ts;
    > logic in core.
  - :black_circle: **TASK-041** — Building construction queue UI  `high` `medium` _(web)_  
    _depends on: TASK-039, TASK-040_
    > In colony view, allow queuing buildings. Show progress,
    > allow cancel/reorder. Turn-over ticks queue forward by
    > colony production value.

- **STORY-23** — Tile-work assignment
  > Crew members can be assigned to work on surrounding ocean /
  > land / coast tiles, producing base resources (Provisions,
  > Timber, Shot-and-Powder, Salvage, etc.).
  - :black_circle: **TASK-042** — Tile-work model + yields  `high` `medium` _(core, content)_  
    _depends on: TASK-038_
    > Each tile type has a base yield vector (fishing waters →
    > Provisions; kelp forest → Fibre; shoals → Salvage; coastal
    > grove → Timber). Assigning a crew produces yield per turn.
    > Bonuses by profession (see STORY-24).
  - :black_circle: **TASK-043** — Drag-assign crew to tiles in colony view  `high` `medium` _(web)_  
    _depends on: TASK-039, TASK-042_
    > Drag a crew tile onto a working-slot on a surrounding
    > tile. Show pre/post yield deltas. Unassign returns to pool.

- **STORY-24** — Resource chains
  > Raw → processed → finished goods. Timber → Planks → Ship
  > components; Provisions + Sugar → Rum (trade good); Salvage +
  > Forgework → Forgework items; Abyssal materia (risk/reward).
  - :black_circle: **TASK-044** — Resource types + chain definitions  `high` `medium` _(core, content)_  
    _depends on: TASK-040, TASK-042_
    > Resource enum + recipe table (inputs + building + output).
    > Turn tick converts queued recipes. Failure modes
    > (insufficient inputs) report in colony event log.

- **STORY-25** — Crew professions
  > Crew members have a profession: Deckhand (generic),
  > Shipwright, Gunner, Cartographer, Scholar, Quartermaster,
  > Loremaster. Each grants yield bonuses in matching buildings/
  > tiles. Trainable via schools or Archive pilgrimages.
  - :black_circle: **TASK-045** — Profession model + yield multipliers  `high` `medium` _(core, content)_  
    _depends on: TASK-042, TASK-044_
    > Profession enum. Each profession has +X% bonus to specific
    > yield or building. Crew has current profession; can have
    > training-in-progress.
  - :black_circle: **TASK-046** — Training buildings (School, Archive-study Hall)  `med` `medium` _(core, content)_  
    _depends on: TASK-045_
    > School trains generic Deckhand → chosen profession over N
    > turns. Archive-study Hall trains rarer Scholar /
    > Loremaster. Captured crew can be "learned from" — 1-shot
    > conversion.

## EPIC-07 — Trade

Inter-colony cargo hauling, home-port trading (faction-specific
"Old World" equivalents), price dynamics, automated merchant
routes. The economic backbone of the mid-game.

- **STORY-26** — Home-port trade screen
  > Each faction has a home-port (OTK: Port Royal; others:
  > equivalents). Player can buy/sell goods at prices that flex
  > with supply/demand.
  - :black_circle: **TASK-047** — HomePort entity + price model  `high` `medium` _(core)_  
    _depends on: TASK-044_
    > HomePort with price-per-good that moves inversely to
    > volume sold. Bounded prices. Buy-back prices < sell prices
    > (spread). Per-faction starting prices in content.
  - :black_circle: **TASK-048** — Home-port trade UI  `high` `medium` _(web)_  
    _depends on: TASK-047, TASK-039_
    > Trade screen accessible when a trade-capable ship is in a
    > home-port colony. Show all tradable goods with current
    > prices, buy/sell sliders, running profit.

- **STORY-27** — Inter-colony hauling
  > Load cargo at one colony, move to another, unload — the
  > default gameplay loop for growing the economy.
  - :black_circle: **TASK-049** — Manual load/unload actions in colony view  `high` `medium` _(web, core)_  
    _depends on: TASK-039, TASK-034_
    > With a ship in a colony, open cargo transfer panel.
    > Move goods colony ↔ ship. Sail to another colony, open
    > same panel, transfer off. Uses CargoHold from TASK-034.

- **STORY-28** — Automated merchant routes
  > Save a multi-stop route (loadA → unloadA → ... → loadN →
  > unloadN → repeat); ship runs it on autopilot every turn until
  > told to stop.
  - :black_circle: **TASK-050** — Merchant route data model + turn executor  `med` `medium` _(core)_  
    _depends on: TASK-049, TASK-028_
    > Route = ordered stops, each with load/unload actions.
    > Ship's AutoRoute state ticks forward each turn. Breaks if
    > the route becomes invalid (colony destroyed, ship
    > captured).
  - :black_circle: **TASK-051** — Route-builder UI  `med` `medium` _(web)_  
    _depends on: TASK-050_
    > Pick colonies, configure per-stop actions, save/name
    > route, assign to ship. Edit/duplicate routes. Visualize
    > route on map with connecting lines.

- **STORY-29** — Price dynamics & market events
  > Home-port prices drift with volume and occasional shock events
  > (news of Red Tide ruins Silver trade; Kraken sighting spikes
  > demand for charms, etc.).
  - :black_circle: **TASK-052** — Price-drift tick + event-triggered shocks  `med` `medium` _(core, content)_  
    _depends on: TASK-047_
    > Slow drift each turn toward baseline; shock events move a
    > single good's price sharply with a flavour message. Event
    > table in content.

## EPIC-08 — Combat & warfare

Ship-vs-ship naval combat, island-ground combat, raiding trade
routes, colony fortifications. The stick to the carrot of trade.

- **STORY-30** — Ship combat resolver
  > Two ships on adjacent tiles can engage. Resolver considers
  > hull, guns, crew, morale. Outcomes: sunk, captured, crippled,
  > fled.
  - :black_circle: **TASK-053** — Combat resolver in packages/core  `high` `large` _(core)_  
    _depends on: TASK-027_
    > Pure-function takes attacker + defender + context → outcome
    > + damaged states. Randomness seeded for replay. Covers
    > broadsides, boarding, ramming, fleeing options. Heavy
    > unit-test coverage.
  - :black_circle: **TASK-054** — Combat UI: cinematic resolver + log  `high` `medium` _(web)_  
    _depends on: TASK-053_
    > On engagement, show a short cinematic (sprites exchanging
    > fire), then a log panel with step-by-step resolution.
    > "Skip" option fast-forwards.

- **STORY-31** — Ground combat on islands
  > Marine / Dragoon-analog / Cannon units disembark to capture
  > island settlements. Smaller-scale ground resolver.
  - :black_circle: **TASK-055** — Ground unit types + ground-combat resolver  `high` `medium` _(core, content)_  
    _depends on: TASK-053_
    > Three ground types with rock-paper-scissors balance.
    > Ground resolver variant of TASK-053 with terrain modifiers.
    > Embark/disembark actions on ships.

- **STORY-32** — Raiding trade routes
  > Privateer units can intercept merchant routes, stealing cargo
  > without a full combat if intercept is unopposed.
  - :black_circle: **TASK-056** — Privateer raid action + merchant-route vulnerability  `med` `medium` _(core)_  
    _depends on: TASK-050, TASK-053_
    > Privateer can ambush a tile; merchant ships passing
    > through are raided (cargo stolen, ship undamaged if no
    > escort). Phantom Corsairs faction gets a bonus here.

- **STORY-33** — Fortifications
  > Colonies can build walls, harbour booms, and coastal batteries.
  > Modify defender stats in combat resolvers.
  - :black_circle: **TASK-057** — Fortification buildings + combat modifiers  `med` `medium` _(core, content)_  
    _depends on: TASK-040, TASK-053_
    > Three fortification buildings with ascending defense
    > bonuses. Modify defender stats when colony is attacked.
    > Visually reflected on colony sprite.

## EPIC-09 — Diplomacy & faction stances

Relations with rival playable factions + stances toward Abyssal
sites. NPC-only factions appear as encounters (Pale Watch,
Abyssal Brotherhood, Sons of Scylla, Scarlet Forge, Blackwater
Collective).

- **STORY-34** — Rival diplomacy
  > War, peace, alliance, trade pact, tribute. Each has
  > consequences and cooldowns. Basic AI accepts/declines based
  > on relations and standing.
  - :black_circle: **TASK-058** — Diplomacy actions + relations matrix  `high` `medium` _(core)_  
    _depends on: TASK-024_
    > Per-faction-pair relations score [-100, 100]. Actions
    > shift score + lock cooldowns. Basic decision rules for
    > AI's accept/decline.
  - :black_circle: **TASK-059** — Diplomacy screen (React)  `high` `medium` _(web)_  
    _depends on: TASK-058_
    > Per-faction panels: current relations, last action, offer
    > new pact. Modal confirms with relevant costs/gifts.
    > Flavour text per action in content.

- **STORY-35** — Abyssal-site stance
  > Each player faction has a default stance toward Abyssal sites
  > (OTK venerates, Sons of Scylla venerates Scylla specifically,
  > others fear). Player stance can shift based on site
  > interactions.
  - :black_circle: **TASK-060** — Abyssal stance system + event triggers  `med` `medium` _(core, content)_  
    _depends on: TASK-017_
    > Per-faction stance: Venerate / Tolerate / Plunder / Guard.
    > Actions at Abyssal tiles shift stance. Stance affects
    > event outcomes (Kraken-stir probability, Pale Watch
    > aggression).

- **STORY-36** — NPC encounter factions
  > Pale Watch patrols near Abyssal sites; Abyssal Brotherhood
  > cultists raid; Sons of Scylla ambush; Scarlet Forge shows up
  > as a rare tech-trader; Blackwater Collective as a black-market
  > vendor in Tortuga.
  - :black_circle: **TASK-061** — NPC faction templates + encounter rules  `med` `medium` _(core, content)_  
    _depends on: TASK-058, TASK-060_
    > Each NPC faction has a spawn rule, encounter behaviour,
    > and flavour text. Minimal AI — fixed behaviours. Not
    > diplomatic entities (can't sign treaties).
  - :black_circle: **TASK-062** — Tortuga black-market vendor UI  `med` `small` _(web, content)_  
    _depends on: TASK-061, TASK-048_
    > In Tortuga colony, Blackwater Collective vendor offers
    > rare-good buy/sell at odd prices + occasional Kraken
    > Talisman at high cost. Flavour-heavy text.

- **STORY-37** — Faction-unique bonuses
  > Each of the four playables has mechanical identity: OTK
  > (bloodline/legendary), Ironclad (production), Phantom (raid
  > stealth), Bloodborne (combat/recruit).
  - :black_circle: **TASK-063** — Implement per-faction bonus hooks  `high` `medium` _(core, content)_  
    _depends on: TASK-038, TASK-053_
    > Bonus application points in economy, combat, and map
    > systems. OTK: Red Tide traversal + Legendary blueprints.
    > Ironclad: +production, cheaper shipyards. Phantom:
    > stealth on open ocean, raid bonus. Bloodborne: +combat,
    > free soldier/turn per colony.
  - :black_circle: **TASK-064** — Faction-select bonus tooltip polish  `low` `small` _(web, content)_  
    _depends on: TASK-014, TASK-063_
    > Tooltip hover on faction-select cards enumerates the
    > specific bonuses. Flavour quote from canon beneath each.

## EPIC-10 — Concord meta-layer & Sovereignty endgame

The meta-game shape: Liberty Chimes → Elders Council → Archive
Charters; Rayon Concord tithes with rising escalation; Tidewater
Party boycott; Declaration of Sovereignty triggering the Concord
Fleet invasion. Victory conditions engine.

- **STORY-38** — Liberty Chimes → Archive Charters
  > Colony Chapel-of-Kraken / equivalent building produces Liberty
  > Chimes (Liberty-Bells analog). Accumulate Chimes to trigger
  > Elders Council events that offer 2-of-N Archive Charters to
  > pick.
  - :black_circle: **TASK-065** — Liberty Chimes production + Council threshold  `high` `medium` _(core, content)_  
    _depends on: TASK-040_
    > Chimes produced per turn per qualifying building. At each
    > threshold, trigger Council event. Events defer until
    > player returns from busy actions.
  - :black_circle: **TASK-066** — Archive Charter pool + pick-2 UI  `high` `medium` _(web, core, content)_  
    _depends on: TASK-065_
    > ~20 charters with permanent bonuses (e.g. Pirata Codex
    > Fragment — +X morale in combat; Bloodline Writ — +Y
    > recruitment speed). Council UI offers two drawn from
    > pool; pick one, removed from draw.

- **STORY-39** — Concord tithes
  > Per-turn passive drain on player treasury, scaling with
  > empire size. Represents Rayon Concord authority; thematically
  > pressures player toward the Sovereignty endgame.
  - :black_circle: **TASK-067** — Tithe calculator + tension meter  `high` `medium` _(core)_  
    _depends on: TASK-044_
    > Per-turn tithe = f(total colony population + revenue).
    > Scale up over game years. Refusing to pay (via boycott)
    > raises a tension meter which eventually triggers Concord
    > ultimatum.
  - :black_circle: **TASK-068** — Tithe notification + payment UI  `med` `small` _(web)_  
    _depends on: TASK-067_
    > Per-turn notification shows tithe due, pay/boycott
    > choice. Tension meter in HUD. Boycott flavour text from
    > content.

- **STORY-40** — Tidewater Party boycott event
  > Discrete scripted event: player dumps cargo to reset tension
  > briefly at a cost; adds lore beat.
  - :black_circle: **TASK-069** — Tidewater Party event flow  `med` `small` _(core, web, content)_  
    _depends on: TASK-067_
    > Modal event — confirm dump of N cargo of a chosen good.
    > Tension drops to 0 for M turns; Concord ire rises
    > permanently. Flavour: "Tidewater Party at Barataria Bay."

- **STORY-41** — Declaration of Sovereignty + Concord Fleet
  > Player triggers Sovereignty at will once ready. Concord Fleet
  > (REF-analog, surface-only) spawns at map edge and invades.
  > Defeat or survive long enough = victory.
  - :black_circle: **TASK-070** — Sovereignty trigger + Concord Fleet spawn  `high` `large` _(core, content)_  
    _depends on: TASK-055, TASK-063_
    > Trigger action (requires minimum year + tension or
    > charters). Spawn Concord Fleet: escalating waves of
    > surface ships + ground troops for island landings.
    > Survive T turns (configurable by difficulty).
  - :black_circle: **TASK-071** — Sovereignty War UI overlay + progress tracker  `high` `medium` _(web)_  
    _depends on: TASK-070_
    > Red-tinted HUD state during Sovereignty War. Progress bar
    > toward survival goal. Concord Fleet movement visible on
    > map. Narrative beats at 25/50/75/100% progress.

- **STORY-42** — Victory & loss conditions
  > Four victory paths (Prosperity, Discovery, Sovereignty,
  > Conquest). Loss states (treasury bankrupt, fleet eliminated,
  > capital lost). Victory/loss screens with faction-appropriate
  > flavour.
  - :black_circle: **TASK-072** — Victory/loss engine + game-over screen  `high` `medium` _(core, web, content)_  
    _depends on: TASK-024, TASK-066, TASK-070_
    > Check conditions per turn. When hit, freeze play + show
    > game-over screen with stats, faction-appropriate epilogue
    > text, and replay option.
  - :black_circle: **TASK-073** — Balance pass: tune thresholds for all 4 victory paths  `med` `medium` _(core, content)_  
    _depends on: TASK-072_
    > Play-test all four paths at target difficulty; adjust
    > thresholds so each is reachable but none trivial. Document
    > target win-times in content/balance.md.

## EPIC-11 — Narrative, tutorial & flavour integration

The soul of the game: Sparrow's Diary prologue, tavern rumour
system, in-game Codex, onboarding tutorial campaign, and the
three-register flavour-text pipeline (salt-and-rum · eldritch ·
salvaged-futurism).

- **STORY-43** — Sparrow prologue
  > Static/cinematic opener set in NW 2191: Sparrow's Diary
  > entries framing the Endeavour's return and the player's
  > assumption of the successor role.
  - :black_circle: **TASK-074** — Prologue scene + pageable diary UI  `high` `medium` _(web, content)_  
    _depends on: TASK-013_
    > Page-by-page diary presentation with period typography,
    > parchment background, subtle audio. Skip button present.
    > Text assembled from canon (16 diary entries excerpted).

- **STORY-44** — Tavern rumour system
  > When the player visits a colony tavern, surface a mix of
  > hand-authored and procedural rumours. Some are pure flavour;
  > some are hints toward Archive caches or faction opportunities.
  - :black_circle: **TASK-075** — Tavern encounter UI + rumour data model  `med` `medium` _(web, core, content)_  
    _depends on: TASK-040_
    > "Visit Tavern" action in colony view opens a scene with
    > 3 rumours + flavour ambience. Rumour table in content
    > with triggers (town, year, faction, random).
  - :black_circle: **TASK-076** — Rumour → map-marker hint pipeline  `med` `small` _(core, web)_  
    _depends on: TASK-075, TASK-032_
    > Some rumours drop a subtle map marker pointing roughly
    > toward an Archive cache or wreck. Marker is directional,
    > not exact. Pays off on exploration.

- **STORY-45** — Codex / in-game lore browser
  > Browsable encyclopedia of OTK Universe Reference entries.
  > Unlocked over time as the player discovers related content.
  > [OPEN] items surfaced as "fragmentary" with blurred text.
  - :black_circle: **TASK-077** — Codex viewer + entry unlock hooks  `med` `medium` _(web, content)_  
    _depends on: TASK-013_
    > Side-drawer Codex. Entries grouped by section (Factions,
    > Abyssal Horrors, Legendary Ships, Locations, Bloodlines,
    > etc.). Unlock triggers hooked into game events.
  - :black_circle: **TASK-078** — Render [OPEN] entries as 'fragmentary' placeholders  `low` `small` _(web, content)_  
    _depends on: TASK-077_
    > Any Codex entry marked [OPEN] renders with a torn-
    > parchment visual + partial blurred text. Flags to the
    > player that canon is deliberately unresolved here.

- **STORY-46** — Tutorial campaign
  > First ~20 turns walks the player through core systems:
  > colony founding, trade, exploration, a first combat, an
  > Archive recovery, and a taste of the tithe tension. Tutorial
  > can be skipped on new game.
  - :black_circle: **TASK-079** — Tutorial campaign trigger + step engine  `high` `medium` _(core, web)_  
    _depends on: TASK-025, TASK-072_
    > New-game option 'Tutorial'. Scripted events fire at turn
    > X, triggering highlight arrows + instructional modals.
    > Player can skip at any step.
  - :black_circle: **TASK-080** — Tutorial step authoring (12–15 steps)  `med` `large` _(content)_  
    _depends on: TASK-079_
    > Author step content: what to do, what it teaches, brief
    > narrative framing (Mr Jackson from the Endeavour's crew as
    > tutor voice — diary canon). Each step <50 words.

- **STORY-47** — Three-register flavour-text pipeline
  > Tag every UI surface with an appropriate tonal register
  > (salt-and-rum / eldritch / salvaged-futurism) so future
  > content authoring stays coherent.
  - :black_circle: **TASK-081** — Content register-tagging infra + lint rule  `low` `small` _(content)_  
    _depends on: TASK-004_
    > Content strings carry a `register` tag. Lint check
    > ensures every user-visible string is tagged. Documented
    > voice guide in packages/content/VOICE.md.

## EPIC-12 — Monetization, accounts, cloud save, store release

Turn the game into a shippable product: account system, cross-
device cloud save, non-invasive ads with IAP to remove, store
listings + submissions for App Store and Play Store, marketing
site.

- **STORY-48** — Account + cloud save
  > Optional account (email magic-link or OAuth). When signed in,
  > saves sync across web + mobile. Offline play still works.
  - :black_circle: **TASK-082** — Account + session endpoints in apps/server  `high` `medium` _(server, shared)_  
    _depends on: TASK-006_
    > /auth/magic-link + /auth/verify + /me endpoints. Session
    > cookie. Schema in shared. Postgres-backed users table
    > with Drizzle or Kysely (pick in PR).
  - :black_circle: **TASK-083** — Cloud save endpoints + client sync  `high` `medium` _(server, web, shared, core)_  
    _depends on: TASK-082_
    > PUT/GET /saves/:slot. Client syncs after each turn (debounced).
    > Merge strategy: last-writer-wins with a version counter.
    > Offline edits replayed on reconnect.

- **STORY-49** — Ad integration
  > Interstitial every N turns (configurable). Never during
  > Sovereignty War or narrative beats. AdMob on mobile, Google
  > Ad Manager on web.
  - :black_circle: **TASK-084** — Ad manager abstraction in apps/web + Capacitor plugin wire-up  `med` `medium` _(web, mobile)_  
    _depends on: TASK-003_
    > Single AdManager interface. Web backend (Ad Manager) +
    > mobile backend (@capacitor-community/admob). Respect the
    > "no ads during war/narrative" rule via a guard flag.
  - :black_circle: **TASK-085** — Per-N-turn interstitial + cooldown  `med` `small` _(core, web)_  
    _depends on: TASK-084_
    > End-of-turn hook: if N turns since last ad + no guard
    > flag active, show interstitial. Adjust N per game-length
    > (default 10).

- **STORY-50** — IAP — Remove Ads + cosmetics
  > One-time IAP for 'Remove Ads'. Additional cosmetics-only IAPs
  > (ship skins, palette variants). No pay-to-win.
  - :black_circle: **TASK-086** — IAP flow (web + mobile) + server-side receipt validation  `med` `large` _(web, mobile, server, shared)_  
    _depends on: TASK-082, TASK-084_
    > Configure products in App Store Connect + Play Console.
    > Client purchase → server receipt validation → user entitlement
    > flag set. 'Remove Ads' entitlement suppresses AdManager.

- **STORY-51** — Marketing site
  > Landing page at colonize.blacksail.dev root (before game
  > loads) with launch trailer, screenshots, store links, press
  > kit, privacy policy, terms.
  - :black_circle: **TASK-087** — Marketing landing route in apps/web  `med` `medium` _(web, content)_  
    _depends on: TASK-014_
    > / renders landing (marketing), /play renders the game.
    > Hero trailer video, screenshot carousel, store badges,
    > call-to-action.
  - :black_circle: **TASK-088** — Privacy policy + terms pages  `med` `small` _(web, content)_  
    _depends on: TASK-087_
    > Two static pages. Privacy: what we collect (email on opt-
    > in; ad metrics). Terms: standard game ToS. Link from
    > landing footer. Draft content in content/legal.md.

- **STORY-52** — Store submission
  > Prepare + submit App Store and Play Store builds. Screenshots,
  > metadata, age rating, review responses. Requires human
  > intervention (Apple / Google accounts).
  - :black_circle: **TASK-089** — Screenshots + store metadata pack  `low` `medium` _(content)_  
    _depends on: TASK-087_
    > Generate required screenshot sets for all device sizes.
    > Write short + long descriptions, keywords, age rating
    > answers. All in content/store/.
  - :black_circle: **TASK-090** — Build + submission runbook  `low` `medium`  
    _depends on: TASK-086, TASK-089_
    > docs/RELEASE.md: exact steps to produce signed
    > iOS/Android builds and submit. Includes required Apple /
    > Google account steps. Last task before shipping.
