import type { RumourOutcome } from '@colonize/core';
import { getRumourOutcomeFlavour, type RumourOutcomeFlavourEntry } from '@colonize/content';
import { useGameStore, type PlayableFaction } from '../store/game';
import styles from './RumourRevealModal.module.css';

// Mounts while `rumourReveal !== null`. The rumour resolver (a future
// task) fills the store field when a unit enters a rumour tile; the
// player dismisses via the claim button, which clears the field and
// lets the next unit-entry trigger a fresh reveal.
export function RumourRevealModal(): JSX.Element | null {
  const outcome = useGameStore((s) => s.rumourReveal);
  const faction = useGameStore((s) => s.faction);
  const dismiss = useGameStore((s) => s.dismissRumourReveal);

  if (!outcome) return null;

  const flavour = getRumourOutcomeFlavour(outcome.category);
  const bodyText = resolveFlavourText(flavour, outcome, faction);
  const rewardText = resolveRewardText(outcome);

  return (
    <div className={styles.backdrop} data-testid="rumour-reveal">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Rumour outcome: ${flavour.title}`}
        data-testid="rumour-reveal-panel"
      >
        <h2 className={styles.title} data-testid="rumour-reveal-title">
          {flavour.title}
        </h2>
        <p className={styles.flavour} data-testid="rumour-reveal-flavour">
          {bodyText}
        </p>
        <div className={styles.reward} data-testid="rumour-reveal-reward">
          <span className={styles.rewardLabel}>{flavour.rewardLabel}</span>
          <span className={styles.rewardValue} data-testid="rumour-reveal-reward-value">
            {rewardText}
          </span>
        </div>
        <button
          type="button"
          className={styles.claim}
          onClick={dismiss}
          data-testid="rumour-reveal-claim"
          autoFocus
        >
          Claim
        </button>
      </div>
    </div>
  );
}

function resolveFlavourText(
  flavour: RumourOutcomeFlavourEntry,
  outcome: RumourOutcome,
  faction: PlayableFaction,
): string {
  if (
    outcome.category === 'LegendaryWreck' &&
    outcome.reward.kind === 'legendary-blueprint' &&
    faction === 'otk' &&
    flavour.otkFlavour
  ) {
    return flavour.otkFlavour;
  }
  return flavour.flavour;
}

function resolveRewardText(outcome: RumourOutcome): string {
  switch (outcome.category) {
    case 'ArchiveCache':
      return `+${outcome.libertyChimes} Liberty Chimes`;
    case 'LegendaryWreck':
      if (outcome.reward.kind === 'legendary-blueprint') {
        return 'Legendary Ship blueprint';
      }
      return `+${outcome.reward.amount} Salvage`;
    case 'KrakenShrine':
      return `+${outcome.reputationDelta} Kraken reputation`;
    case 'FataMorganaMirage':
      return mirageText(outcome.variant);
  }
}

function mirageText(variant: 'nothing' | 'bonus' | 'hazard'): string {
  switch (variant) {
    case 'nothing':
      return 'Nothing — the vision fades';
    case 'bonus':
      return 'A true landfall revealed';
    case 'hazard':
      return 'A reef where there should be none';
  }
}
