# Age-rating questionnaire answers

Answers for both age-rating questionnaires. IARC covers Google Play,
Microsoft, and several regional boards in one pass; Apple runs its own
questionnaire in App Store Connect. Both are driven by the same
gameplay, so the answers must stay consistent — if a future content
update changes one, update the other in the same PR.

Canon tier: [DRAFT] — confirm once MVP gameplay is locked and a
reviewer has played a full run.

Expected results:

- **IARC / Google Play** — PEGI 7 / ESRB Everyone 10+ / USK 6 (mild
  fantasy violence, no blood, no language).
- **Apple App Store** — 9+.

---

## IARC (Google Play, Xbox, Nintendo, PEGI, ESRB, USK, ...)

### Violence

- **Realistic violence?** No.
- **Fantasy violence?** Yes — turn-based ship combat against AI
  factions and sea monsters. Stylised pixel-art; hulls take damage and
  sink, no depicted human casualties.
- **Blood?** No.
- **Gore / dismemberment?** No.
- **Violence against humans / animals?** No — combat is ship-vs-ship
  or ship-vs-monster; no on-screen human figures in the combat view at
  MVP.
- **Cruelty / torture?** No.

### Fear / horror

- **Horror themes?** Mild. The "eldritch" tonal register surfaces via
  codex text (fragmentary rumours of abyssal things) and ambient
  imagery. No jump-scares, no graphic monstrosity, no persistent dread
  UI. Abyssal-horror combat is deliberately out of MVP scope; the game
  implies the threat without depicting it.

### Sex / nudity

- None.

### Language

- Mild, nautical — "damn", "hell", "by the deep", period-appropriate
  pirate idiom. No strong profanity. No slurs.

### Controlled substances

- **Alcohol?** Referenced textually in the salt-and-rum voice register
  (rum, grog, taverns as colony buildings). Not depicted being
  consumed by any on-screen character. No mechanical buff from
  drinking.
- **Tobacco?** No.
- **Drugs?** No.

### Gambling

- **Simulated gambling?** No. The Kraken Council's charter-draw is a
  deterministic card reveal, not a wager of in-game resources.
- **Real-money gambling?** No.
- **Loot boxes?** No — IAPs are explicit cosmetic / convenience
  purchases (see `packages/content/legal.md` and TASK-086's IAP flow);
  no randomised item rewards.

### User interaction

- **Users can interact online?** No at MVP (single-player only).
  Multiplayer is an explicit post-MVP scope item — when it lands, the
  questionnaire will be re-submitted.
- **Users exchange location?** No.
- **Users exchange user-generated content?** No at MVP.

### Commercial features

- **Advertising?** Yes on mobile builds. Opt-in banner and rewarded ads
  through a third-party SDK (TASK-084 / TASK-085). No ads in the web
  build. Disclose as "contains ads" on both store listings.
- **In-app purchases?** Yes (TASK-086). Disclose as "contains IAPs" on
  both store listings.

---

## Apple age-rating questionnaire (App Store Connect)

Apple's wording differs slightly but covers the same axes. Map each
axis to an answer from the IARC section above:

| Axis                                        | Answer          |
| ------------------------------------------- | --------------- |
| Cartoon or Fantasy Violence                 | Infrequent/Mild |
| Realistic Violence                          | None            |
| Prolonged Graphic / Sadistic Violence       | None            |
| Profanity or Crude Humor                    | Infrequent/Mild |
| Mature / Suggestive Themes                  | None            |
| Horror / Fear Themes                        | Infrequent/Mild |
| Medical / Treatment Information             | None            |
| Alcohol, Tobacco, or Drug Use or References | Infrequent/Mild |
| Sexual Content or Nudity                    | None            |
| Graphic Sexual Content and Nudity           | None            |
| Simulated Gambling                          | None            |
| Contests                                    | None            |
| Unrestricted Web Access                     | No              |
| Gambling and Contests (legacy field)        | No              |
| Made for Kids?                              | No (not target) |

Expected Apple rating: **9+**. If Apple's review bumps to 12+, accept —
do not try to tone down the eldritch codex copy to chase a lower
rating, since the flavour is load-bearing for the brand.
