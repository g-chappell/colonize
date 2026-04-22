import { useEffect, useMemo, useState } from 'react';
import { RelationsMatrix, type DiplomacyAction } from '@colonize/core';
import { getDiplomacyActionFlavour } from '@colonize/content';
import { FACTION_NAMES, useGameStore, type PlayableFaction } from '../store/game';
import {
  computeDiplomacyPanels,
  type DiplomacyActionRow,
  type DiplomacyFactionPanel,
  type RelationsStance,
} from './diplomacy-math';
import styles from './DiplomacyScreen.module.css';

// Ordered list of every playable faction id. The diplomacy screen
// filters out the player's own faction; what remains is the set of
// peers. Non-playable factions (NPC encounter-only per MVP scope) do
// not appear on this screen.
const PLAYABLE_FACTION_IDS: readonly PlayableFaction[] = [
  'otk',
  'ironclad',
  'phantom',
  'bloodborne',
];

const STANCE_STYLES: Readonly<Record<RelationsStance, string>> = {
  hostile: styles.stanceHostile!,
  tense: styles.stanceTense!,
  neutral: styles.stanceNeutral!,
  warm: styles.stanceWarm!,
  allied: styles.stanceAllied!,
};

// Mounts while `screen === 'diplomacy'`. Reads the relations matrix +
// the player's faction from the store, renders one card per peer
// faction with a stance chip, the last-action summary (if any), and a
// button per diplomacy action. Clicking an action opens a confirmation
// modal with flavour + cost label; confirming calls
// `attemptDiplomacy` on the store, surfaces the outcome briefly via
// the panel's last-action summary, and closes the modal.
export function DiplomacyScreen(): JSX.Element {
  const relationsJson = useGameStore((s) => s.relations);
  const playerFaction = useGameStore((s) => s.faction);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const lastOutcome = useGameStore((s) => s.lastDiplomacyOutcome);
  const closeDiplomacy = useGameStore((s) => s.closeDiplomacy);
  const attemptDiplomacy = useGameStore((s) => s.attemptDiplomacy);

  const [pending, setPending] = useState<{
    readonly target: PlayableFaction;
    readonly action: DiplomacyAction;
  } | null>(null);

  const matrix = useMemo(() => RelationsMatrix.fromJSON(relationsJson), [relationsJson]);
  const panels = useMemo(
    () =>
      computeDiplomacyPanels({
        matrix,
        proposer: playerFaction,
        targets: PLAYABLE_FACTION_IDS,
        currentTurn: Math.max(1, currentTurn),
        lastOutcome,
      }),
    [matrix, playerFaction, currentTurn, lastOutcome],
  );

  // Esc closes the confirmation modal first if it's open, otherwise
  // closes the whole screen. Mirrors trade/colony overlays so muscle
  // memory carries across every stacked game-stage screen.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      const state = useGameStore.getState();
      if (pending !== null) {
        setPending(null);
        return;
      }
      state.closeDiplomacy();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pending]);

  const handleClose = (): void => closeDiplomacy();
  const handleOpenAction = (target: PlayableFaction, action: DiplomacyAction): void =>
    setPending({ target, action });
  const handleCancel = (): void => setPending(null);
  const handleConfirm = (): void => {
    if (!pending) return;
    attemptDiplomacy(pending.target, pending.action);
    setPending(null);
  };

  return (
    <div className={styles.backdrop} data-testid="diplomacy-screen">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Diplomacy"
        data-testid="diplomacy-screen-panel"
      >
        <header className={styles.header}>
          <h2 className={styles.title} data-testid="diplomacy-screen-title">
            Diplomacy
          </h2>
          <span className={styles.subtitle} data-testid="diplomacy-screen-player">
            {FACTION_NAMES[playerFaction]}
          </span>
        </header>

        {panels.length === 0 ? (
          <p className={styles.missing} data-testid="diplomacy-screen-missing">
            No rival powers in range.
          </p>
        ) : (
          <ul className={styles.factionGrid} data-testid="diplomacy-screen-factions">
            {panels.map((p) => (
              <FactionCard
                key={p.factionId}
                panel={p}
                onAction={(action) => handleOpenAction(p.factionId as PlayableFaction, action)}
              />
            ))}
          </ul>
        )}

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.button}
            onClick={handleClose}
            data-testid="diplomacy-screen-close"
          >
            Close
          </button>
        </footer>
      </div>

      {pending && (
        <ConfirmModal
          target={pending.target}
          action={pending.action}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

interface FactionCardProps {
  readonly panel: DiplomacyFactionPanel;
  readonly onAction: (action: DiplomacyAction) => void;
}

function FactionCard({ panel, onAction }: FactionCardProps): JSX.Element {
  const cardTestId = `diplomacy-card-${panel.factionId}`;
  const name = FACTION_NAMES[panel.factionId as PlayableFaction] ?? panel.factionId;
  const stanceClass = STANCE_STYLES[panel.stance];
  return (
    <li className={styles.factionCard} data-testid={cardTestId}>
      <div className={styles.factionHeader}>
        <span className={styles.factionName} data-testid={`${cardTestId}-name`}>
          {name}
        </span>
        <span
          className={`${styles.stanceChip} ${stanceClass}`}
          data-testid={`${cardTestId}-stance`}
        >
          {panel.stance} · {panel.score}
        </span>
      </div>
      <div className={styles.factionMeta}>
        {panel.lastActionSummary ? (
          <span className={styles.lastAction} data-testid={`${cardTestId}-last`}>
            Last: {panel.lastActionSummary}
          </span>
        ) : (
          <span
            className={`${styles.lastAction} ${styles.lastActionEmpty}`}
            data-testid={`${cardTestId}-last`}
          >
            Last: no recent action.
          </span>
        )}
      </div>
      <div className={styles.actionGrid} data-testid={`${cardTestId}-actions`}>
        {panel.rows.map((row) => (
          <ActionButton
            key={row.action}
            cardTestId={cardTestId}
            row={row}
            onClick={() => onAction(row.action)}
          />
        ))}
      </div>
    </li>
  );
}

interface ActionButtonProps {
  readonly cardTestId: string;
  readonly row: DiplomacyActionRow;
  readonly onClick: () => void;
}

function ActionButton({ cardTestId, row, onClick }: ActionButtonProps): JSX.Element {
  const flavour = getDiplomacyActionFlavour(row.action);
  const toneClass =
    row.acceptedScoreDelta > 0
      ? styles.actionFriendly
      : row.acceptedScoreDelta < 0
        ? styles.actionHostile
        : '';
  return (
    <button
      type="button"
      className={`${styles.actionButton} ${toneClass}`}
      onClick={onClick}
      disabled={row.onCooldown}
      data-testid={`${cardTestId}-action-${row.action}`}
      aria-label={`${flavour.title} — ${flavour.summary}`}
    >
      <span className={styles.actionLabel}>{flavour.title}</span>
      {row.onCooldown && row.cooldownUntil !== null ? (
        <span
          className={styles.actionCooldown}
          data-testid={`${cardTestId}-action-${row.action}-cooldown`}
        >
          cooldown · turn {row.cooldownUntil}
        </span>
      ) : null}
    </button>
  );
}

interface ConfirmModalProps {
  readonly target: PlayableFaction;
  readonly action: DiplomacyAction;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

function ConfirmModal({ target, action, onCancel, onConfirm }: ConfirmModalProps): JSX.Element {
  const flavour = getDiplomacyActionFlavour(action);
  const targetName = FACTION_NAMES[target] ?? target;
  return (
    <div className={styles.modalBackdrop} data-testid="diplomacy-modal">
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-label={`${flavour.title} against ${targetName}`}
        data-testid="diplomacy-modal-panel"
      >
        <h3 className={styles.modalTitle} data-testid="diplomacy-modal-title">
          {flavour.title} · {targetName}
        </h3>
        <p className={styles.modalSummary} data-testid="diplomacy-modal-summary">
          {flavour.summary}
        </p>
        <p className={styles.modalFlavour} data-testid="diplomacy-modal-flavour">
          {flavour.flavour}
        </p>
        <div className={styles.modalMeta}>
          <span className={styles.modalMetaLabel}>Cost</span>
          <span data-testid="diplomacy-modal-cost">{flavour.costLabel}</span>
        </div>
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.button}
            onClick={onConfirm}
            data-testid="diplomacy-modal-confirm"
            autoFocus
          >
            {flavour.confirmLabel}
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={onCancel}
            data-testid="diplomacy-modal-cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
