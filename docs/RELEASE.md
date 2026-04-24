# RELEASE.md — Colonize build + submission runbook

Step-by-step procedure for producing signed iOS and Android builds of
Colonize and submitting them to the App Store and Google Play Store.
Assumes a single maintainer with Apple Developer + Google Play Console
accounts already active.

Scope: first-time production submission. Subsequent release cuts
collapse to the "Cut a release" section near the end.

Canon tier: **[DRAFT]** — first pass, revisit after the first real
submission and fold in anything the review queues teach us.

Last updated: 2026-04-24.

---

## 1. Prerequisites

### 1.1 Developer accounts

- **Apple Developer Program** — $99/yr. Enroll at
  https://developer.apple.com/programs/. Account approval can take a
  few business days.
- **Google Play Console** — $25 one-time. Enroll at
  https://play.google.com/console/signup.
- Both accounts must be active before you can create app listings.

### 1.2 Machine / tooling

- **macOS machine** for iOS builds. The iOS toolchain is macOS-only.
- **Xcode** — latest stable from the Mac App Store. Required to archive
  and upload iOS builds.
- **Android Studio** (Hedgehog or later) — for running the Android
  Gradle release build and inspecting the resulting AAB.
- **Java 17 JDK** — required by the current Android Gradle Plugin.
- **Node 20 + npm** — matches the repo `package.json` engine field.
- **ImageMagick** or a similar CLI (`sips` on macOS works) — for
  resizing captured screenshots to the per-device resolutions in
  `packages/content/store/screenshots/README.md`.

### 1.3 Repo state

- On `main`, clean working tree, `npm install` done.
- All green: `npm run typecheck && npm run lint && npm test && npm run build`.
- Latest web build materialised at `apps/web/dist/` — `apps/mobile`'s
  `capacitor.config.ts` points `webDir` at `../web/dist`.

---

## 2. Pre-flight checks

Run these before you touch the signing config. Catching a missing store
asset here is cheap; catching it after you've uploaded a build and
Apple rejects it is not.

### 2.1 Store metadata pack is resolved

Under `packages/content/store/` the pack is committed as **[DRAFT]** —
confirm every placeholder has been resolved:

- `metadata.md` — replace `[support url]` and `[support email]` with
  real values. The privacy and marketing URLs should already be live
  behind `colonize.blacksail.dev`.
- `descriptions.md` — read the copy start to finish. Verify the hero
  pitch matches `apps/web/src/marketing/LandingPage.tsx` (this is
  enforced by convention, not by a test — human eyes needed).
- `keywords.md` — Apple 100-char budget: run `wc -m` on the keyword
  line and confirm ≤ 100 characters.
- `age-rating.md` — no placeholders; answer set is frozen.
- `packages/content/legal.md` — resolve `[contact email]` and any
  other bracketed placeholder. `/privacy` and `/terms` on
  `colonize.blacksail.dev` must serve the resolved copy before
  submission — Apple and Google both crawl the privacy URL during
  review.

### 2.2 Screenshots captured

Spec: `packages/content/store/screenshots/README.md`. Four scenes
(`map`, `colony`, `council`, `combat`) × the device-size matrix in
that file. PNGs are gitignored; they live locally under
`packages/content/store/screenshots/<device>/<N>-<scene>.png`.

Capture procedure (manual until `scripts/store-pack.mjs` exists):

1. Boot `npm run dev --workspace=apps/web`.
2. Load a hand-crafted save file that composes well — see the four
   scene descriptions in the screenshots README for what each frame
   should show.
3. Use Chrome DevTools → device toolbar → custom size to match the
   target resolution. Capture with "Capture full size screenshot".
4. Save to the gitignored path matching the filename convention in
   the README.
5. Repeat for every row in the device-size matrix.

For Google Play only: produce the `play-feature-graphic.png`
(1024 × 500) and `play-hi-res-icon.png` (512 × 512). The feature
graphic is stylised banner art, not a raw gameplay capture — the
screenshots README recommends reusing the OTK heraldic motif from
`apps/web/src/menu/MainMenu.tsx`.

### 2.3 Version bump

Two files to touch:

- `apps/mobile/android/app/build.gradle` — bump `versionCode` by +1
  (monotonic integer, every submission) and update `versionName` to
  the semver you're shipping (lines 10–11).
- `apps/mobile/ios/App/App.xcodeproj` — Xcode handles iOS versioning via
  build settings (`MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`),
  which `Info.plist` references by variable (lines 20 and 22). Open the
  project in Xcode → App target → General → bump "Version" (marketing)
  and "Build" (project version; monotonic).

Keep the two platforms in lockstep on marketing version. Build numbers
are independent; Apple requires monotonic increase per train.

### 2.4 Privacy / data disclosures match reality

- **Apple Privacy nutrition label** data types — enumerated in
  `packages/content/store/metadata.md` under "App Store Connect". Open
  App Store Connect → your app → App Privacy and confirm each
  checkbox matches. Do NOT leave any axis blank — Apple auto-rejects
  incomplete privacy disclosures.
- **Play Data Safety form** — same axes, same answers. Play Console →
  App content → Data safety.
- If the IAP set or ads SDK has changed since `metadata.md` was last
  written, update the doc _and_ both stores' forms. Legal exposure
  follows inconsistency, not the doc itself.

---

## 3. Android release build

### 3.1 Generate a release keystore (first-time only)

The repo ships no keystore and no signing block — first-time setup is
part of the runbook. A lost or re-generated keystore locks you out of
updating the Play listing forever; back it up before uploading
anything signed with it.

```bash
keytool -genkey -v \
  -keystore ~/keystores/colonize-release.jks \
  -alias colonize-release \
  -keyalg RSA -keysize 4096 -validity 10000
```

You will be prompted for a keystore password and key password. Record
both in a password manager immediately.

**Back up the keystore to at least two locations** (encrypted cloud
backup + offline copy). Play Play App Signing can enroll this key —
recommended — so Google holds the upload key and you keep the
_signing_ key in escrow. Enable in Play Console → Setup → App signing
on the first upload.

### 3.2 Wire signing into Gradle

Create `apps/mobile/android/keystore.properties` (gitignored — confirm
it's in `.gitignore` before staging):

```
storeFile=/absolute/path/to/colonize-release.jks
storePassword=...
keyAlias=colonize-release
keyPassword=...
```

Edit `apps/mobile/android/app/build.gradle` — add a `signingConfigs`
block above `buildTypes` and reference it from the `release` build
type. Do not commit credentials; the file reads the gitignored
properties. This is a one-time edit — the resulting Gradle change is
safe to commit; only `keystore.properties` stays out.

Verify `.gitignore` includes `keystore.properties` and `*.jks` under
`apps/mobile/android/` before you commit the Gradle change.

### 3.3 Build the AAB

From repo root:

```bash
# Build the web bundle and sync native projects
npm run build --workspace=apps/mobile

# Produce the signed Android App Bundle
cd apps/mobile/android
./gradlew bundleRelease
```

Output: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.

Sanity-check the signed AAB:

```bash
# Verify signature
jarsigner -verify -verbose -certs app-release.aab

# Inspect the manifest versionCode / versionName
unzip -p app-release.aab BundleConfig.pb | hexdump -C | head
# Or use bundletool if installed: bundletool dump manifest --bundle=app-release.aab
```

### 3.4 Upload to Play Console

1. Play Console → your app → Production (or Internal testing if this
   is the first-ever upload — see `metadata.md` release channel plan).
2. Create release → upload `app-release.aab`.
3. Fill in release notes (under 500 chars; changelog, not marketing).
4. Save → Review release → Start rollout.

First upload triggers Play's bytecode scan. Expect warnings about
permissions, target SDK, or deprecated APIs; address as they surface.

---

## 4. iOS release build

### 4.1 Apple signing setup (first-time only)

1. Sign in to https://developer.apple.com/account with your Apple
   Developer account.
2. Certificates, Identifiers & Profiles → Identifiers → register a new
   App ID with bundle id `dev.blacksail.colonize`. Enable the
   capabilities the build uses (Push, IAP — check
   `apps/mobile/capacitor.config.ts` and the IAP flow wiring from
   TASK-086 before you commit to the checkbox set).
3. Certificates → create a new "Apple Distribution" certificate.
   Download and install in Keychain.
4. Profiles → create a new "App Store" provisioning profile for the
   App ID + Distribution certificate. Download.

Xcode can automate most of this via "Automatically manage signing"
under the target's Signing & Capabilities tab — acceptable for a solo
developer. The manual path above is the fallback if automatic signing
flakes (it sometimes does on first-run).

### 4.2 Archive the build

From repo root:

```bash
# Build the web bundle and sync native projects
npm run build --workspace=apps/mobile

# Open the iOS project
npm run open:ios --workspace=apps/mobile
```

In Xcode:

1. Target → App → Signing & Capabilities → confirm Team is set and a
   Distribution provisioning profile is picked.
2. Scheme → `App`. Destination → "Any iOS Device (arm64)". Never
   archive against a simulator destination — the archive will be
   rejected at upload.
3. Product menu → Archive. Wait for the build (several minutes first
   time; subsequent archives are faster).
4. Organizer window opens. Select the archive → Distribute App → App
   Store Connect → Upload.
5. Xcode walks through signing + export compliance — answer "uses
   only standard encryption" per `metadata.md` § App Store Connect.
6. Upload completes (~1–5 min depending on network). Build appears in
   App Store Connect → Your app → TestFlight within 10–30 min once
   Apple's back-end processes it.

### 4.3 App Store Connect listing

1. App Store Connect → Apps → new app → fill in bundle id, SKU (any
   string; suggest `colonize-ios-v1`), primary language (English UK
   per `metadata.md`).
2. App Information → categories, age rating (run the questionnaire
   using answers from `packages/content/store/age-rating.md`), privacy
   URL.
3. Pricing and Availability → Free. Availability: all territories
   unless there's a reason to restrict.
4. App Privacy → data types, per `metadata.md` § App Store Connect.
5. Prepare for Submission → fill in:
   - Promotional text + description from `descriptions.md`.
   - Keywords from `keywords.md` (one comma-separated line; ≤ 100
     chars).
   - Support URL + Marketing URL from `metadata.md`.
   - Screenshots: upload the 6.7" iPhone + 12.9" iPad sets
     (`apple-iphone-6.7/` + `apple-ipad-12.9/` from the screenshots
     README). Optional: 6.5" for older device fallback.
   - Build → select the build uploaded in step 4.2.
   - Copyright → `© 2026 Blacksail` (per `metadata.md`).
6. Submit for Review.

---

## 5. Release channel sequencing

Per `packages/content/store/metadata.md` § Release channel plan, ship
in the following order. Don't collapse stages — each one has caught
distinct classes of bug on other projects.

1. **Apple TestFlight internal** — build goes live automatically to
   your own test account once Apple processes the upload. Smoke test
   on a real device.
2. **Apple TestFlight external** (invite-only) — invite a handful of
   playtesters. Apple does a lightweight review before opening
   external TestFlight; usually ~24h.
3. **Play Internal testing** — Play Console → Testing → Internal
   testing → new release with the AAB. Immediate; tester list manually
   curated.
4. **Play Closed testing (opt-in link)** — same AAB, shared link.
5. **Play Open testing (public beta)** — Play Console → Open testing.
   No gate.
6. **App Store submission** — submit the build you've been TestFlighting.
   Apple's review queue is typically 24–48h but can stretch to a week.
7. **Play Production** — only after App Store approval. A rollback
   on Play is faster than on Apple (see § 7); staggering Apple first
   means an Apple-side issue won't trigger an all-stores rollback.

---

## 6. Post-submission

### 6.1 Waiting on review

- Apple sends email on state transitions (Waiting for Review → In
  Review → Approved/Rejected). Rejections include a Resolution Center
  message; read the whole thing, fix the specific violation, bump
  build number, re-archive, resubmit.
- Play surfaces review state in Play Console → Publishing overview.
  Policy rejections link to the specific clause.

### 6.2 Day-of-launch checklist

- `colonize.blacksail.dev`, `/privacy`, `/terms` all return 200 and
  render the resolved copy.
- Analytics / crash reporting receivers (if wired) are live and
  tagged with the release version.
- Status page (if any) reflects GA.
- A "we're live" email to the early TestFlight + Play internal group
  (optional but cheap goodwill).

---

## 7. Rollback

### 7.1 Play Store

- Play Console → Production → Releases → halt rollout (if staged
  rollout is enabled). Then publish a prior build as a new release
  with bumped `versionCode`.
- A halted rollout stops new installs of the bad build but doesn't
  pull it from devices that already installed it.

### 7.2 App Store

Apple does not support rollback of an approved build. Options:

- Submit a hotfix as an expedited review (request via App Store
  Connect → Contact Us → App Review → expedited).
- For a live-breaking regression, remove the app from sale
  (App Store Connect → Pricing → "Remove from sale") while you fix.
  This doesn't uninstall from existing devices — same limitation as
  Play.

### 7.3 Both

If the regression is in the web bundle served by the Capacitor
wrapper (rare — `webDir: '../web/dist'` means the web build is
stapled into the native bundle at `npm run build --workspace=apps/mobile`
time; a native build ships a _snapshot_ of the web bundle and can't
hot-update), the fix has to ship as a new native build.

---

## 8. Cut a release (subsequent releases)

After the first submission has landed, subsequent releases collapse
to:

1. Merge all intended changes to `main`, CI green, deploy green.
2. Bump `versionCode` + `versionName` (Android, § 2.3) and the Xcode
   Version + Build numbers (iOS, § 2.3). Commit.
3. `npm run build --workspace=apps/mobile`.
4. `cd apps/mobile/android && ./gradlew bundleRelease` → upload AAB
   to Play Internal testing → promote once smoke-tested.
5. `npm run open:ios --workspace=apps/mobile` → Xcode Archive →
   upload to App Store Connect → promote through TestFlight → submit.
6. Release notes in both stores (changelog, not marketing).
7. Sequence: TestFlight → App Store submission → Play Production,
   per § 5.

No runbook entry changes unless a new signing asset, a new store
account, or a new disclosure surface is added.

---

## 9. Known gaps / TODOs

These are not blockers for _writing_ the runbook — they are real
unfinished work the reader needs to do before the first submission.

- **Android signing keystore + Gradle block** — § 3.1 and § 3.2
  describe the setup but no keystore or signing block currently
  exists in the repo.
- **iOS signing** — § 4.1 describes first-time setup; certificates
  and provisioning profile are not yet created under the Apple
  account.
- **Screenshot pipeline** — manual capture procedure documented in
  § 2.2. A scripted `scripts/store-pack.mjs` is referenced in
  `packages/content/store/README.md` but doesn't exist yet.
- **Feature graphic + hi-res icon assets** — the 1024 × 500 banner
  and 512 × 512 icon are not in-repo. Commissioned design or a hand-
  built asset using the OTK heraldry from
  `apps/web/src/menu/MainMenu.tsx` is required before Play upload.
- **Legal placeholders** — `[contact email]`, `[support email]`,
  `[support url]` in `packages/content/legal.md` and
  `packages/content/store/metadata.md` must be resolved.
- **App Store Connect + Play Console app listings** — app records
  themselves haven't been created in either console yet. § 3.4 and
  § 4.3 assume they exist.

Each gap becomes a checkbox the first human run through this runbook
clears. Subsequent runs skip this section.
