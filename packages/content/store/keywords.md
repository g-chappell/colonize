# Store keywords

Search-ranking inputs for both stores. The App Store keyword field is a
100-character budget (commas count); the Play Store has no dedicated
keyword field — search surfaces the long description, so the Play-side
entry below is a list of the terms the description must keep in natural
English.

Canon tier: [DRAFT].

---

## Apple App Store — `keywords` (100 char max, comma-separated, no spaces after commas)

```
pirate,4x,strategy,retro,colony,sail,ocean,turn-based,empire,sandbox,civ,kraken
```

(79 chars.)

Notes:

- Apple explicitly disallows repeating the app name in the keyword
  field; `colonize` is left out. The title already carries it.
- Competitor names (`civilization`, `colonization`) are disallowed.
  `civ` is a genre abbreviation, not a protected mark, but re-check at
  submission — Apple's automated review has flagged short forms before.
- Apple's metadata guidelines forbid listing a keyword already on the
  subtitle. Double-check `retro` / `ocean` / `world` aren't in the
  final-final subtitle text before submission.

## Google Play — natural-language terms the long description must preserve

No dedicated keyword field. Ensure the long description organically
includes:

- `4X` / `retro 4X` — genre anchor.
- `turn-based strategy` — category anchor.
- `pirate` / `piracy` — setting anchor.
- `colony` / `colonisation` / `colony management` — mechanic anchor.
- `Kraken` — flavour anchor, ties to OTK / faction-search.
- `Concord tithe` — unique-to-this-game anchor, survives long-tail search.
- `single-player` / `offline` — mobile-store filter intent.

Do not keyword-stuff. Natural prose only — the Play Store demotes
listings whose description reads like a tag list.
