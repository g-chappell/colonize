import { navigateTo } from './use-path-route';
import styles from './LegalPage.module.css';

// Terms of service page served at `/terms`. Copy mirrors the [DRAFT]
// text in `packages/content/legal.md`; anything in square brackets
// (`[support email]`, `[contact email]`) is a pre-launch placeholder.
// Legal counsel review is pending before go-live.
export function TermsPage(): JSX.Element {
  const onBack = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    navigateTo('landing');
  };

  return (
    <main className={styles.page} data-testid="terms-page">
      <article className={styles.article}>
        <a href="/" className={styles.backLink} onClick={onBack} data-testid="terms-back-link">
          ← Back to Colonize
        </a>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated · 2026-04-24 · Draft</p>

        <h2>Summary</h2>
        <p>
          Colonize is a single-player game (multiplayer planned for a later release). Play it, enjoy
          it, and respect the other eventual players and the infrastructure that keeps the service
          running.
        </p>

        <h2>Permitted use</h2>
        <p>
          You may install and play Colonize on any device for which an official build is available,
          for personal, non-commercial use. Your save files are yours.
        </p>

        <h2>Prohibited use</h2>
        <ul>
          <li>Distributing modified copies of the game binaries.</li>
          <li>
            Automating account creation, ad-farming, or any activity designed to game future
            monetisation systems.
          </li>
          <li>Using exploits to obtain an unfair advantage in the planned multiplayer modes.</li>
          <li>
            Attempting to disrupt, overwhelm, or reverse-engineer the server infrastructure beyond
            what is necessary for interoperability and permitted by applicable law.
          </li>
        </ul>

        <h2>Warranty</h2>
        <p>
          Colonize is provided &quot;as is&quot; without warranty of any kind, express or implied.
          We will do our best to keep the cloud-save service available once it launches, but we
          cannot guarantee uninterrupted availability.
        </p>

        <h2>Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, our liability to you for any claim
          arising out of your use of Colonize is limited to the amount you paid us for the game in
          the preceding twelve months (which may be zero).
        </p>

        <h2>Contact</h2>
        <ul>
          <li>Gameplay issues: [support email]</li>
          <li>Privacy / data requests: [contact email]</li>
        </ul>

        <p className={styles.footerNote}>Order of the Kraken · Fragmentary Canon</p>
      </article>
    </main>
  );
}
