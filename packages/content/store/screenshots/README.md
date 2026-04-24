# Screenshots — device matrix + capture spec

The stores reject a submission that omits a required device-size
screenshot set. This file enumerates exactly what's required, what the
four in-game scenes should depict (in sync with the four placeholders
already on `apps/web/src/marketing/LandingPage.tsx`), and the file-
naming convention the packaging script will rely on.

Canon tier: [DRAFT].

Actual PNGs are *not* committed — capture pipeline isn't settled and
checked-in binaries bloat the content workspace. `screenshots/*.png`
is gitignored; a future `scripts/store-pack.mjs` will either stage
captured PNGs from a local `screenshots/` output or pull them from an
asset bucket at submission time.

---

## Required device-size matrix

### Apple App Store

Apple requires at least one screenshot at the **largest display size**
in each family (iPhone + iPad) that the app supports. Submitting only
the largest sizes — 6.7" iPhone + 12.9" iPad — is valid; Apple down-
scales for smaller devices automatically. Still recommended: include
the 6.5" fallback for older iPhone 11 Pro Max / XS Max users so App
Store Connect accepts the build if Apple changes the largest-size
definition mid-submission (they have before).

| Family | Size class              | Resolution (px, landscape)    | Count           |
| ------ | ----------------------- | ----------------------------- | --------------- |
| iPhone | 6.7" (required largest) | 2778 × 1284                   | 4 (one per scene) |
| iPhone | 6.5" (recommended)      | 2688 × 1242                   | 4 (one per scene) |
| iPad   | 12.9" (required largest)| 2732 × 2048                   | 4 (one per scene) |

All portrait alternatives are optional for a landscape-preferred game —
skip at MVP, re-visit if Apple's review asks.

### Google Play

| Family         | Minimum resolution | Count                         |
| -------------- | ------------------ | ----------------------------- |
| Phone          | 1080 × 1920        | Min 2, max 8 (ship 4)         |
| 7" tablet      | 1024 × 1600        | Min 1, max 8 (ship 2)         |
| 10" tablet     | 1440 × 2560        | Min 1, max 8 (ship 2)         |
| Feature graphic| 1024 × 500         | Exactly 1 (required, not gameplay) |
| Hi-res icon    | 512 × 512          | Exactly 1 (required)          |

The feature graphic is a banner — typically stylised artwork, not a
raw gameplay screenshot. Reuse the OTK heraldic motif from
`apps/web/src/menu/MainMenu.tsx` (paired dragons) over a dusk-sea
background.

### Web / press kit

| Surface                     | Resolution          | Count |
| --------------------------- | ------------------- | ----- |
| Landing page carousel slot  | 1920 × 1080         | 4 (replaces the placeholder `.screenshot` figures) |
| Press-kit hero              | 3840 × 2160 (4K)    | 1     |
| Open-graph preview          | 1200 × 630          | 1     |

---

## The four scenes

Identical to `SCREENSHOTS` in
`apps/web/src/marketing/LandingPage.tsx`. Do not diverge. Captions are
authoritative here; LandingPage pulls from this list when the asset
epic lands.

| id       | Caption (salt-and-rum)                          | What to compose                                                                                           |
| -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `map`    | Sail the drowned archipelago.                   | Overworld tilemap, mid-run. 2–3 islands visible, player fleet on the move, Concord patrol in the distance. |
| `colony` | Build a colony on a salted reef.                | Colony management screen. At least one Shipyard + Chapel + Tavern in queue. Resource bar visible.         |
| `council`| Draw charters at the Kraken Council.            | Kraken Council modal (TASK-066) mid-draw. Two charter cards face-up, hand of two.                          |
| `combat` | Broadsides under eldritch skies.                | Ship combat, mid-engagement. Player sloop/privateer vs Concord corvette. Weather/lighting leans eldritch. |

Each scene becomes one screenshot per required device size above — so
four scenes × six Apple sizes + four scenes × three Android densities =
the full capture matrix.

## File-naming convention

```
screenshots/
  apple-iphone-6.7/
    1-map.png
    2-colony.png
    3-council.png
    4-combat.png
  apple-iphone-6.5/
    1-map.png
    ...
  apple-ipad-12.9/
    ...
  play-phone/
    1-map.png
    ...
  play-tablet-7/
    ...
  play-tablet-10/
    ...
  play-feature-graphic.png
  play-hi-res-icon.png
  web-landing/
    1-map.png
    ...
  press-kit/
    hero-3840x2160.png
    og-1200x630.png
```

The leading index (`1-` / `2-` / ...) fixes the carousel order both
stores present to the user. Apple and Play both honour filename order
when uploads happen via CLI / REST — at MVP we're still manual-
upload, so the index is also the human's checklist.

## Capture pipeline — MVP

Until `scripts/store-pack.mjs` exists:

1. Boot the web dev server on a throwaway branch seeded with a known
   save file (see `apps/web/public/dev-saves/` if TASK-090's runbook
   adds one).
2. Resize the browser to the device target (Chrome DevTools → device
   toolbar → custom size).
3. Use Chrome's "Capture full size screenshot" for each scene.
4. Drop the PNG at the filename above.
5. Re-run for every device size.

Once the scripted pipeline exists, the TASK-090 RELEASE runbook will
describe the invocation — not this file.
