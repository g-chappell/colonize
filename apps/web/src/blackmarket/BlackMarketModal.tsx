import {
  getBlackMarketOffering,
  getNpcFactionFlavour,
  getResource,
  isBlackMarketTalismanOffer,
  type BlackMarketOffering,
} from '@colonize/content';
import { useGameStore } from '../store/game';
import styles from './BlackMarketModal.module.css';

// Mounts while `blackMarketEncounter !== null`. A Tortuga encounter
// orchestrator (future task) fills the store slice with a rolled subset
// of `BLACK_MARKET_OFFERINGS`; the player browses the stall and walks
// away via the dismiss button. Buy / sell transactions are not wired
// to cargo or Chimes yet — this task is the display layer only. The
// stall's flavour header reads the Blackwater-Collective NPC-faction
// entry so the tone stays in sync with the NPC roster in content.
export function BlackMarketModal(): JSX.Element | null {
  const encounter = useGameStore((s) => s.blackMarketEncounter);
  const dismiss = useGameStore((s) => s.dismissBlackMarketEncounter);

  if (!encounter) return null;

  const faction = getNpcFactionFlavour('blackwater');
  const offerings = encounter.offerings.map((o) => getBlackMarketOffering(o.id));
  const tradeOfferings = offerings.filter((o) => !isBlackMarketTalismanOffer(o));
  const talismanOffering = offerings.find(isBlackMarketTalismanOffer);

  return (
    <div className={styles.backdrop} data-testid="black-market">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Black market: ${faction.name}`}
        data-testid="black-market-panel"
      >
        <header className={styles.header}>
          <p className={styles.place} data-testid="black-market-place">
            Tortuga · Salt-stained back-alley
          </p>
          <h2 className={styles.title} data-testid="black-market-title">
            {faction.name}
          </h2>
          <p className={styles.summary} data-testid="black-market-summary">
            {faction.summary}
          </p>
        </header>

        {tradeOfferings.length > 0 && (
          <ul className={styles.stalls} data-testid="black-market-stalls">
            {tradeOfferings.map((offer) => (
              <li
                key={offer.id}
                className={styles.stall}
                data-testid={`black-market-offer-${offer.id}`}
              >
                <OfferingHeader offer={offer} />
                <p className={styles.pitch} data-testid={`black-market-pitch-${offer.id}`}>
                  {offer.pitch}
                </p>
              </li>
            ))}
          </ul>
        )}

        {talismanOffering && (
          <aside
            className={styles.talisman}
            data-testid="black-market-talisman"
            aria-label="Kraken Talisman"
          >
            <p className={styles.talismanLabel}>Beneath the counter</p>
            <p className={styles.talismanName} data-testid="black-market-talisman-name">
              Kraken Talisman
            </p>
            <p className={styles.pitch} data-testid="black-market-talisman-pitch">
              {talismanOffering.pitch}
            </p>
            <p className={styles.talismanPrice} data-testid="black-market-talisman-price">
              {talismanOffering.priceChimes} Chimes
            </p>
          </aside>
        )}

        <button
          type="button"
          className={styles.leave}
          onClick={dismiss}
          data-testid="black-market-leave"
          autoFocus
        >
          Leave the stall
        </button>
      </div>
    </div>
  );
}

function OfferingHeader({ offer }: { offer: BlackMarketOffering }): JSX.Element | null {
  if (isBlackMarketTalismanOffer(offer)) return null;
  const resource = getResource(offer.resourceId);
  // `buy` = Blackwater is selling to the player (player pays Chimes,
  // receives the resource); `sell` = Blackwater is buying from the
  // player (player gives up the resource, receives Chimes).
  const verb = offer.kind === 'buy' ? 'Asks' : 'Pays';
  return (
    <p className={styles.line} data-testid={`black-market-line-${offer.id}`}>
      <span className={styles.verb}>{verb}</span>{' '}
      <span className={styles.price}>{offer.priceChimes} Chimes</span> for{' '}
      <span className={styles.resource}>
        {offer.quantity} {resource.name}
      </span>
    </p>
  );
}
