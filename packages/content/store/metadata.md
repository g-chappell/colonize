# Store metadata

Non-copy fields the store submission forms require. Kept separate from
`descriptions.md` so a copy-pass edit never bumps a bundle id by
accident and vice-versa.

Canon tier: [DRAFT].

---

## Identity

| Field          | Value                                    | Source                                |
| -------------- | ---------------------------------------- | ------------------------------------- |
| Display name   | `Colonize`                               | `apps/mobile/capacitor.config.ts`     |
| Bundle id      | `dev.blacksail.colonize`                 | `apps/mobile/capacitor.config.ts`     |
| Publisher      | Blacksail                                | —                                     |
| Copyright line | `© 2026 Blacksail`                      | —                                     |
| Marketing URL  | `https://colonize.blacksail.dev/`        | `project.json.deploy.target`          |
| Support URL    | `[support url]`                          | to-decide (likely `/support` landing) |
| Support email  | `[support email]`                        | to-decide                             |
| Privacy URL    | `https://colonize.blacksail.dev/privacy` | `apps/web/src/marketing/PrivacyPage`  |
| Terms URL      | `https://colonize.blacksail.dev/terms`   | `apps/web/src/marketing/TermsPage`    |

## Categories

| Store      | Primary  | Secondary  |
| ---------- | -------- | ---------- |
| App Store  | Games    | Strategy   |
| Apple sub  | Strategy | Simulation |
| Play Store | Strategy | Simulation |

## Release channel plan

| Phase          | App Store channel            | Play Store channel           |
| -------------- | ---------------------------- | ---------------------------- |
| Internal smoke | TestFlight internal          | Internal testing             |
| Closed preview | TestFlight external (invite) | Closed testing (opt-in link) |
| Public beta    | —                            | Open testing                 |
| Production     | App Store                    | Production                   |

Sequence the App Store review submission _before_ the Play Store public
rollout — Apple's review queue is the long pole, and a rollback on Play
is faster than a rollback on Apple if the two diverge.

## Pricing

Free with opt-in IAP + opt-in ads on mobile. Free with opt-in IAP (no
ads) on web. Exact IAP SKUs live in the IAP registry (TASK-086) and do
not belong in this file.

## Device support

| Target  | Minimum OS           | Orientation          | Notes                                    |
| ------- | -------------------- | -------------------- | ---------------------------------------- |
| iPhone  | iOS 15               | Portrait + landscape | Both — landscape preferred for game view |
| iPad    | iPadOS 15            | Portrait + landscape | Landscape preferred                      |
| Android | API 24 (Android 7.0) | Portrait + landscape | Landscape preferred                      |
| Web     | Evergreen            | Landscape            | Breakpoints in `apps/web/src/App.css`    |

Confirm the iOS / Android minimums against Capacitor 7.0's own minimums
at submission time; Capacitor occasionally bumps the floor.

## App Store / Play Store-specific fields

### App Store Connect

- Primary language: English (UK)
- Localisations at launch: English (UK), English (US).
- Export compliance: uses only standard encryption (HTTPS). File
  `ITSEncryptionExportComplianceCode` → not required; declare "uses
  only standard encryption" in the export compliance questionnaire.
- Data types collected (per Apple's Privacy nutrition label):
  - Contact info — Email address (opt-in, linked to user, not used for
    tracking).
  - Diagnostics — Crash data (opt-in, not linked to user).
  - Identifiers — Advertising identifier (mobile ads SDK only, opt-in,
    used for third-party advertising per the SDK's own disclosure).
  - Nothing else.

### Play Console

- Default language: English (United Kingdom).
- Localisations at launch: English (United Kingdom), English
  (United States).
- Target audience: 13+ (mirrors the IARC age-rating answers; see
  `age-rating.md`). Do not select "also appeals to children" — the
  eldritch tonal register disqualifies the children-also flag.
- Data safety disclosures: identical axis-by-axis to the Apple privacy
  label above.
- Government / financial apps? No.
