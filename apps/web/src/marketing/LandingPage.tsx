import { navigateTo, navigateToPlay } from './use-path-route';
import type { RoutePath } from './path-route';
import styles from './LandingPage.module.css';

// Marketing landing page served at `/`. The `/play` route renders the
// existing game shell (menu → prologue → faction-select → game). Hero
// copy pulls from the OTK tonal registers (salt-and-rum + eldritch)
// documented in CLAUDE.md; trailer + screenshots are intentional
// placeholder surfaces — when the art epic ships, the <video> src and
// each `.screenshot` background swap in without touching markup.
interface Screenshot {
  readonly id: string;
  readonly caption: string;
}

const SCREENSHOTS: readonly Screenshot[] = [
  { id: 'map', caption: 'Sail the drowned archipelago.' },
  { id: 'colony', caption: 'Build a colony on a salted reef.' },
  { id: 'council', caption: 'Draw charters at the Kraken Council.' },
  { id: 'combat', caption: 'Broadsides under eldritch skies.' },
];

interface StoreBadge {
  readonly id: string;
  readonly label: string;
  readonly sublabel: string;
}

const STORE_BADGES: readonly StoreBadge[] = [
  { id: 'web', label: 'Play in Browser', sublabel: 'PC & Laptop' },
  { id: 'ios', label: 'Coming to iOS', sublabel: 'App Store' },
  { id: 'android', label: 'Coming to Android', sublabel: 'Google Play' },
];

export function LandingPage(): JSX.Element {
  return (
    <main className={styles.landing} data-testid="landing-page">
      <section className={styles.hero} data-testid="landing-hero">
        <h1 className={styles.heroTitle}>Colonize</h1>
        <p className={styles.heroEra}>NW 2191 · Early Liberty Era</p>
        <p className={styles.heroPitch}>
          A 2D retro 4X on a drowned world. Raise a colony, run the Concord tithe, and decide what
          to do when the deep answers back. Hic sunt dracones.
        </p>
        <div className={styles.ctaRow}>
          <button
            type="button"
            className={styles.cta}
            onClick={navigateToPlay}
            data-testid="landing-cta-play"
          >
            Set Sail
          </button>
          <a
            className={`${styles.cta} ${styles.ctaSecondary}`}
            href="#trailer"
            data-testid="landing-cta-trailer"
          >
            Watch Trailer
          </a>
        </div>
      </section>

      <section className={styles.trailer} id="trailer" data-testid="landing-trailer">
        <div className={styles.trailerFallback} data-testid="landing-trailer-placeholder">
          Trailer weighing anchor — footage posts alongside the first public build.
        </div>
      </section>

      <section className={styles.carousel} data-testid="landing-carousel">
        <p className={styles.carouselHeading}>Screenshots</p>
        <div className={styles.carouselTrack} data-testid="landing-carousel-track">
          {SCREENSHOTS.map((shot) => (
            <figure
              key={shot.id}
              className={styles.screenshot}
              data-testid={`landing-screenshot-${shot.id}`}
            >
              <figcaption>{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.badges} data-testid="landing-badges">
        {STORE_BADGES.map((badge) => (
          <span key={badge.id} className={styles.badge} data-testid={`landing-badge-${badge.id}`}>
            <strong>{badge.label}</strong>
            <em>{badge.sublabel}</em>
          </span>
        ))}
      </section>

      <footer className={styles.footer} data-testid="landing-footer">
        <p className={styles.footerTagline}>
          Order of the Kraken · Post-Collapse · Fragmentary Canon
        </p>
        <nav className={styles.footerLinks}>
          <FooterLink route="privacy" label="Privacy Policy" testId="landing-link-privacy" />
          <span aria-hidden="true" className={styles.footerSeparator}>
            ·
          </span>
          <FooterLink route="terms" label="Terms of Service" testId="landing-link-terms" />
        </nav>
      </footer>
    </main>
  );
}

interface FooterLinkProps {
  readonly route: RoutePath;
  readonly label: string;
  readonly testId: string;
}

function FooterLink({ route, label, testId }: FooterLinkProps): JSX.Element {
  const href = route === 'landing' ? '/' : `/${route}`;
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    navigateTo(route);
  };
  return (
    <a href={href} onClick={onClick} className={styles.footerLink} data-testid={testId}>
      {label}
    </a>
  );
}
