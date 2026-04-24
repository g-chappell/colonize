import { navigateTo } from './use-path-route';
import styles from './LegalPage.module.css';

// Privacy policy page served at `/privacy`. Copy mirrors the [DRAFT]
// text in `packages/content/legal.md`; anything in square brackets
// (`[contact email]`) is a pre-launch placeholder. Legal counsel
// review is pending before go-live — do not link this page from
// monetised surfaces without clearing the placeholders first.
export function PrivacyPage(): JSX.Element {
  const onBack = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    navigateTo('landing');
  };

  return (
    <main className={styles.page} data-testid="privacy-page">
      <article className={styles.article}>
        <a href="/" className={styles.backLink} onClick={onBack} data-testid="privacy-back-link">
          ← Back to Colonize
        </a>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated · 2026-04-24 · Draft</p>

        <p>
          Colonize respects your privacy. The game runs primarily client-side, and the scope of what
          reaches our servers is deliberately small.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Email address</strong> — only if you opt in to the newsletter or, later, create
            a cloud-save account. Stored encrypted. Never sold, never shared with third parties for
            marketing.
          </li>
          <li>
            <strong>Ad metrics</strong> — the mobile builds (iOS and Android) display opt-in banner
            and rewarded ads through a third-party advertising SDK. Anonymous impression / click /
            conversion counts are transmitted to that SDK per its own privacy policy. No personally
            identifying information leaves your device through Colonize in the process.
          </li>
          <li>
            <strong>Crash reports</strong> — if you consent on first launch, anonymous technical
            crash traces are sent so we can fix bugs. No save-file contents, no account information.
          </li>
        </ul>

        <h2>What we do not collect</h2>
        <ul>
          <li>
            Real name, postal address, or payment data beyond what the app-store (Apple / Google)
            handles on their side.
          </li>
          <li>Device location, contacts, or anything outside the active game session.</li>
          <li>
            Save files — your campaign stays on your device unless you explicitly enable cloud save.
          </li>
        </ul>

        <h2>Your rights</h2>
        <p>
          You may request deletion of any account email on file by writing to [contact email].
          Accounts with no cloud-save activity are purged automatically after twelve months of
          inactivity.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          Material changes will be surfaced in-game on the next launch. The date at the top of this
          page reflects the most recent revision.
        </p>

        <p className={styles.footerNote}>Order of the Kraken · Fragmentary Canon</p>
      </article>
    </main>
  );
}
