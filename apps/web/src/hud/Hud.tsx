import { TurnPhase, UnitType, getUnitTypeDefinition } from '@colonize/core';
import type { UnitJSON } from '@colonize/core';
import { findUnitById } from '../game/unit-input';
import { turnController } from '../game/turn-controller';
import { FACTION_NAMES, useGameStore, type PlayableFaction } from '../store/game';
import styles from './Hud.module.css';

const NW_EPOCH_YEAR = 2191;

const RESOURCE_SLOTS = [
  { key: 'salt', label: 'Salt' },
  { key: 'rum', label: 'Rum' },
  { key: 'iron', label: 'Iron' },
] as const;

// Display names for the unit-type strings stored in UnitJSON. Lives
// here (not in @colonize/content) until the HUD has a richer unit
// codex that justifies a shared content table.
const UNIT_TYPE_NAMES: Readonly<Record<UnitType, string>> = {
  [UnitType.Scout]: 'Scout',
  [UnitType.Settler]: 'Settler',
  [UnitType.FoundingShip]: 'Founding Ship',
  [UnitType.Sloop]: 'Sloop',
  [UnitType.Brig]: 'Brig',
  [UnitType.Frigate]: 'Frigate',
  [UnitType.ShipOfTheLine]: 'Ship of the Line',
  [UnitType.Privateer]: 'Privateer',
  [UnitType.Cartographer]: 'Cartographer',
  [UnitType.Explorer]: 'Explorer',
  [UnitType.Marines]: 'Marines',
  [UnitType.Dragoons]: 'Dragoons',
  [UnitType.Pikemen]: 'Pikemen',
};

const PLAYABLE_FACTION_KEYS: readonly string[] = Object.keys(FACTION_NAMES);

function displayFaction(factionId: string): string {
  if (PLAYABLE_FACTION_KEYS.includes(factionId)) {
    return FACTION_NAMES[factionId as PlayableFaction];
  }
  return factionId;
}

export function Hud(): JSX.Element {
  return (
    <div className={styles.hud} data-testid="hud">
      <div className={styles.topLeft}>
        <YearDisplay />
        <FactionChip />
      </div>
      <div className={styles.topCenter}>
        <AiThinkingIndicator />
      </div>
      <div className={styles.topRight}>
        <RoutesButton />
        <DiplomacyButton />
        <MenuButton />
        <ResourceBar />
      </div>
      <div className={styles.bottomLeft}>
        <UnitStatsPanel />
      </div>
      <div className={styles.bottomRight}>
        <EndTurnButton />
      </div>
    </div>
  );
}

export function MenuButton(): JSX.Element {
  const setScreen = useGameStore((s) => s.setScreen);
  return (
    <button
      type="button"
      className={styles.menuButton}
      onClick={() => setScreen('pause')}
      aria-label="Open pause menu"
      data-testid="hud-menu-button"
    >
      ☰
    </button>
  );
}

export function DiplomacyButton(): JSX.Element {
  const openDiplomacy = useGameStore((s) => s.openDiplomacy);
  return (
    <button
      type="button"
      className={styles.menuButton}
      onClick={() => openDiplomacy()}
      aria-label="Open diplomacy screen"
      data-testid="hud-diplomacy-button"
    >
      ⚖
    </button>
  );
}

export function RoutesButton(): JSX.Element {
  const openRouteScreen = useGameStore((s) => s.openRouteScreen);
  return (
    <button
      type="button"
      className={styles.menuButton}
      onClick={() => openRouteScreen()}
      aria-label="Open merchant route builder"
      data-testid="hud-routes-button"
    >
      ⚓
    </button>
  );
}

export function YearDisplay(): JSX.Element {
  const turn = useGameStore((s) => s.currentTurn);
  return (
    <div className={styles.year} data-testid="hud-year">
      <span className={styles.yearLabel}>NW</span>
      <span className={styles.yearValue}>{NW_EPOCH_YEAR + turn}</span>
    </div>
  );
}

export function FactionChip(): JSX.Element {
  const faction = useGameStore((s) => s.faction);
  return (
    <div className={styles.factionChip} data-testid="hud-faction">
      {FACTION_NAMES[faction]}
    </div>
  );
}

export function ResourceBar(): JSX.Element {
  return (
    <ul className={styles.resourceBar} data-testid="hud-resources">
      {RESOURCE_SLOTS.map((slot) => (
        <li key={slot.key} className={styles.resource}>
          <span className={styles.resourceLabel}>{slot.label}</span>
          <span className={styles.resourceValue}>—</span>
        </li>
      ))}
    </ul>
  );
}

export function AiThinkingIndicator(): JSX.Element | null {
  const phase = useGameStore((s) => s.phase);
  if (phase !== TurnPhase.AI) return null;
  return (
    <div className={styles.aiThinking} data-testid="hud-ai-thinking" role="status">
      AI thinking…
    </div>
  );
}

export function UnitStatsPanel(): JSX.Element | null {
  const selectedUnitId = useGameStore((s) => s.selectedUnitId);
  const units = useGameStore((s) => s.units);
  const unit = findUnitById(selectedUnitId, units);
  if (!unit) return null;
  return <UnitStatsCard unit={unit} />;
}

function UnitStatsCard({ unit }: { unit: UnitJSON }): JSX.Element {
  const maxMovement = getUnitTypeDefinition(unit.type).baseMovement;
  return (
    <div className={styles.unitStats} data-testid="hud-unit-stats">
      <div className={styles.unitStatsName} data-testid="hud-unit-stats-name">
        {UNIT_TYPE_NAMES[unit.type]}
      </div>
      <div className={styles.unitStatsRow}>
        <span className={styles.unitStatsLabel}>Faction</span>
        <span className={styles.unitStatsValue} data-testid="hud-unit-stats-faction">
          {displayFaction(unit.faction)}
        </span>
      </div>
      <div className={styles.unitStatsRow}>
        <span className={styles.unitStatsLabel}>Position</span>
        <span className={styles.unitStatsValue} data-testid="hud-unit-stats-position">
          {unit.position.x},{unit.position.y}
        </span>
      </div>
      <div className={styles.unitStatsRow}>
        <span className={styles.unitStatsLabel}>Movement</span>
        <span className={styles.unitStatsValue} data-testid="hud-unit-stats-movement">
          {unit.movement}/{maxMovement}
        </span>
      </div>
    </div>
  );
}

export function EndTurnButton(): JSX.Element {
  const phase = useGameStore((s) => s.phase);
  const disabled = phase !== TurnPhase.PlayerAction;
  const handleClick = (): void => {
    turnController.endPlayerTurn();
  };
  return (
    <button
      type="button"
      className={styles.endTurn}
      onClick={handleClick}
      disabled={disabled}
      data-testid="hud-end-turn"
    >
      End Turn
    </button>
  );
}
