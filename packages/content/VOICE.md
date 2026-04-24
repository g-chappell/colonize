# VOICE — OTK tonal registers

Colonize carries three tonal registers across its user-visible copy.
Every piece of narrative / UI flavour — modal summaries, rumour blurbs,
tooltips, codex entries, stance descriptions — sits in exactly one.
Tags drive palette picks, icon choices, and future localisation lanes.

The three registers are the canon of the OTK Universe Reference. They
are not interchangeable moods; they reflect _which corner of the post-
Collapse water world is talking_.

## 1. Salt-and-rum

**Voice:** pirate-harbour vernacular. Weathered, plain-spoken, a little
theatrical. The register of the boatswain on deck, the factor at the
dock, the herald reading a ledger. Warm woods, tar, rum, parchment, a
hand around a cup.

**When to use:** routine civic business (tithes, council meetings,
harbour gossip), recruitment and camaraderie, human-scale threats
(press-gangs, rival crews, Syndicate debt-collectors), the baseline
register of the Order itself.

**Avoid:** abstract mysticism, technical specification, sterile system
prose.

**Touchstones in the codebase:** `TITHE_FLAVOURS` tier 0–2
(`concord-tithe-flavour.ts`), `TIDEWATER_PARTY_FLAVOUR`
(`tidewater-party.ts`), the salt-and-rum slice of `OTK_PALETTE`
(rum_amber, bloodflag_red, parchment).

## 2. Eldritch

**Voice:** hushed, ominous, older-than-words. The register of the abyss,
the Kraken-Wind, the things that watch from beyond the lighthouse. Ink
violets, bioluminescent cyans, the sudden cold.

**When to use:** Concord escalation past the ultimatum line, Kraken /
abyssal invocations, frontier-of-the-map awe, anything touching the
unresolved `[OPEN]` canon (surface as "fragmentary" — never fabricate).
Stance shifts where the player is drawing on the abyss directly.

**Avoid:** cozy warmth, bright humour, technical confidence.

**Touchstones in the codebase:** `TITHE_FLAVOURS` tier 3–4 (ultimatum
beat), `ABYSSAL_STANCE_FLAVOURS` stance:abyssal, `FRONTIER_MOTIF_REGISTER`
(the fog-of-war motif), the eldritch slice of `OTK_PALETTE`
(abyssal_teal, void_indigo, bioluminescent_cyan).

## 3. Salvaged-futurism

**Voice:** brisk, technical, a touch sardonic. The register of the
Syndicate engineer, the Phantom Corsairs' salvaged pulse-cannon
operator, the Concord writ clerk when he's reading specifications
rather than threats. Oxidised orange, fission green, coolant blue.

**When to use:** shipyard / construction copy, salvaged-tech artifacts,
pulse-weapon combat flavour, Syndicate faction surfaces, any tooltip
describing a mechanical specification. The "how the thing works"
register, distinct from "what the thing is" (salt-and-rum) and "what
the thing portends" (eldritch).

**Avoid:** lyricism, superstition, folk idiom.

**Touchstones in the codebase:** `FACTIONS` — Ironclad Syndicate entry,
the salvaged-futurism slice of `OTK_PALETTE` (oxide_orange, neon_cyan,
fission_green), salvaged-futurism `PRICE_SHOCKS` entries.

## Tagging rules

Every user-visible content entry defined under `packages/content/src/`
that ships flavour strings carries a `register: ToneRegister` field.
Modules that pin to a single register for the whole file (e.g.
`frontier-motifs.ts`) declare a module-level
`FRONTIER_MOTIF_REGISTER`-style constant instead of repeating the tag
per entry.

The lint rule in `register-coverage.test.ts` fails the build if:

- a tagged registry adds an entry without a `register` field;
- an entry's `register` value is not one of the three canonical values;
- the tagged-registry list itself drifts from the canonical count.

When adding a new tagged registry, add an import + entry to
`TAGGED_REGISTRIES` in that test file and bump `CANONICAL_TAGGED_REGISTRY_COUNT`.

## Choosing a register

A practical decision tree:

1. Is the string about _mechanical specification_ — a stat, a shipyard
   build, a salvaged artifact's function? **Salvaged-futurism.**
2. Is the string about _threat from beyond_ — the abyss, the Kraken,
   the Concord at the ultimatum line, unresolved `[OPEN]` canon?
   **Eldritch.**
3. Otherwise: **salt-and-rum.** This is the default OTK voice; most
   routine flavour lives here.

Shifts within a single registry (a five-tier tithe ladder that opens
salt-and-rum and closes eldritch) are expected and encouraged — the
register tag attaches per-entry, not per-module, precisely so one
escalation ladder can cross a register line.
