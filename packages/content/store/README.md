# Store — Colonize submission pack

Human-authored source-of-truth for the material a human submits to the
Apple App Store and Google Play Store when Colonize ships. Not consumed
at runtime by the game — this directory is read by a human (or by a
future `scripts/store-pack.mjs` packaging script) and dropped into App
Store Connect / the Play Console.

Canon tier: **[DRAFT]** — marketing pass + legal review pending before
submission. Any placeholder in square brackets (`[contact email]`,
`[support url]`, `[release date]`) is to be resolved at submission time.

Last updated: 2026-04-24.

## Files

- `descriptions.md` — short + long descriptions for both stores (salt-
  and-rum tonal register; pulls hero copy from
  `apps/web/src/marketing/LandingPage.tsx` verbatim so the landing page
  and the stores stay in sync).
- `keywords.md` — Apple keywords field (100-char budget) + Play Store
  search hints.
- `age-rating.md` — IARC (Play) + Apple age-rating questionnaire answers,
  with the expected resulting rating so a reviewer can spot drift at
  submission time.
- `metadata.md` — app name, subtitle, bundle id, categories, support /
  marketing URLs, release channel plan.
- `screenshots/README.md` — spec for the required device-size matrix +
  which in-game scenes to capture + file-naming convention. Actual PNGs
  land under `screenshots/` and are gitignored until captured.

## Source alignment

User-visible copy (hero pitch, screenshot captions, tagline) matches
`apps/web/src/marketing/LandingPage.tsx`. Change either, and the other
has to follow in the same PR — the stores and the landing page must not
drift.

Legal copy (privacy summary, data-collection statement) draws from
`packages/content/legal.md`. Same rule: one source of truth, copy
propagates.

Voice: salt-and-rum default (per `packages/content/VOICE.md`), with a
measured eldritch beat in the long description to preview tone without
spoiling canon `[OPEN]` items. No invented canon — every claim here
already sits in `lore/OTK.md` or in `LandingPage.tsx`.
