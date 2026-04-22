import type { ArchiveCharterId, CharterBonusAxis } from '@colonize/core';
import { CharterBonusAxis as CharterBonusAxisEnum, getArchiveCharter } from '@colonize/core';
import {
  getArchiveCharterFlavour,
  getCouncilThresholdFlavour,
  type ArchiveCharterFlavourId,
} from '@colonize/content';
import { useGameStore } from '../store/game';
import styles from './CouncilPickModal.module.css';

// Self-mounting Council pick-2 modal (slice-driven overlay per
// CLAUDE.md). Mounts while `councilPick !== null`. The orchestrator
// that drains `ChimesLedger.pendingEvents` (a future task) calls
// `openCouncilPick(factionId, threshold)` to open the modal; the
// player dismisses it by adopting one of the two offered charters via
// the Adopt button.
export function CouncilPickModal(): JSX.Element | null {
  const session = useGameStore((s) => s.councilPick);
  const selectCharter = useGameStore((s) => s.selectCharter);

  if (!session) return null;

  const thresholdFlavour = getCouncilThresholdFlavour(session.threshold);
  const [firstId, secondId] = session.hand;

  return (
    <div className={styles.backdrop} data-testid="council-pick">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Council convocation: ${thresholdFlavour.heading}`}
        data-testid="council-pick-panel"
      >
        <h2 className={styles.title} data-testid="council-pick-title">
          {thresholdFlavour.heading}
        </h2>
        <p className={styles.preamble} data-testid="council-pick-preamble">
          {thresholdFlavour.preamble}
        </p>
        <div className={styles.hand}>
          <CharterCard charterId={firstId} onAdopt={selectCharter} />
          <CharterCard charterId={secondId} onAdopt={selectCharter} />
        </div>
      </div>
    </div>
  );
}

interface CharterCardProps {
  readonly charterId: ArchiveCharterId;
  readonly onAdopt: (id: ArchiveCharterId) => void;
}

function CharterCard({ charterId, onAdopt }: CharterCardProps): JSX.Element {
  const core = getArchiveCharter(charterId);
  const flavour = getArchiveCharterFlavour(charterId as ArchiveCharterFlavourId);
  return (
    <div
      className={styles.card}
      data-testid={`council-pick-card-${charterId}`}
      data-register={flavour.register}
    >
      <h3 className={styles.cardName} data-testid={`council-pick-card-name-${charterId}`}>
        {flavour.name}
      </h3>
      <p className={styles.cardEffect} data-testid={`council-pick-card-effect-${charterId}`}>
        {formatEffect(core.effect.axis, core.effect.delta)}
      </p>
      <p className={styles.cardSummary}>{flavour.summary}</p>
      <p className={styles.cardDescription}>{flavour.description}</p>
      <button
        type="button"
        className={styles.adopt}
        onClick={() => onAdopt(charterId)}
        data-testid={`council-pick-adopt-${charterId}`}
      >
        Adopt
      </button>
    </div>
  );
}

// Render a charter's scalar delta against its axis. Additive axes get
// "+N" in the axis's natural unit; multiplicative axes get "+N%" on
// the implicit base of 1.0. The list is exhaustive across
// `CharterBonusAxis` so adding a new axis fails the build until this
// surface is updated.
function formatEffect(axis: CharterBonusAxis, delta: number): string {
  switch (axis) {
    case CharterBonusAxisEnum.CombatMorale:
      return `+${delta} combat morale`;
    case CharterBonusAxisEnum.RecruitmentSpeed:
      return `+${delta}% recruitment speed`;
    case CharterBonusAxisEnum.ColonyProduction:
      return `+${Math.round(delta * 100)}% colony production`;
    case CharterBonusAxisEnum.ShipyardCostReduction:
      return `-${Math.round(delta * 100)}% shipyard cost`;
    case CharterBonusAxisEnum.RaidLoot:
      return `+${Math.round(delta * 100)}% raid loot`;
    case CharterBonusAxisEnum.TradeMargin:
      return `+${Math.round(delta * 100)}% trade margin`;
    case CharterBonusAxisEnum.ExplorationVision:
      return `+${delta} vision`;
    case CharterBonusAxisEnum.ShipSpeed:
      return `+${delta} ship speed`;
    case CharterBonusAxisEnum.DiplomacyPressure:
      return `+${delta} diplomacy pressure`;
    case CharterBonusAxisEnum.RumourYield:
      return `+${Math.round(delta * 100)}% rumour yield`;
  }
}
