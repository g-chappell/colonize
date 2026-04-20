// OTK retro palette — 48 hand-picked colours organised by tonal register.
// One source of truth; consumed by atlas authoring tools, UI theming,
// and any future palette-locked rendering.

export type ToneRegister = 'salt-and-rum' | 'eldritch' | 'salvaged-futurism';

export interface PaletteEntry {
  name: string;
  hex: `#${string}`;
  register: ToneRegister;
}

// Salt-and-rum — warm, weathered, pirate-flag and parchment tones.
const SALT_AND_RUM: PaletteEntry[] = [
  { name: 'pitch_black', hex: '#0a0a0a', register: 'salt-and-rum' },
  { name: 'gunmetal', hex: '#1f1d1c', register: 'salt-and-rum' },
  { name: 'charcoal', hex: '#2e2a26', register: 'salt-and-rum' },
  { name: 'ash_grey', hex: '#4d463f', register: 'salt-and-rum' },
  { name: 'sea_salt', hex: '#d3c8b3', register: 'salt-and-rum' },
  { name: 'bleached_canvas', hex: '#ece1c4', register: 'salt-and-rum' },
  { name: 'parchment', hex: '#f3e8c6', register: 'salt-and-rum' },
  { name: 'driftwood', hex: '#8a6f4d', register: 'salt-and-rum' },
  { name: 'rum_amber', hex: '#c08642', register: 'salt-and-rum' },
  { name: 'whiskey', hex: '#6e3f1c', register: 'salt-and-rum' },
  { name: 'bilge_red', hex: '#6e1f1f', register: 'salt-and-rum' },
  { name: 'bloodflag_red', hex: '#b03a2e', register: 'salt-and-rum' },
  { name: 'brass', hex: '#c79a3a', register: 'salt-and-rum' },
  { name: 'copper', hex: '#a55a2a', register: 'salt-and-rum' },
  { name: 'coral_pink', hex: '#d97757', register: 'salt-and-rum' },
  { name: 'ochre_dust', hex: '#b58a3a', register: 'salt-and-rum' },
];

// Eldritch — abyssal teals, ink violets, bioluminescent cyans.
const ELDRITCH: PaletteEntry[] = [
  { name: 'abyss_black', hex: '#060812', register: 'eldritch' },
  { name: 'void_indigo', hex: '#0c1230', register: 'eldritch' },
  { name: 'abyssal_teal', hex: '#103a4c', register: 'eldritch' },
  { name: 'deep_kelp', hex: '#14464a', register: 'eldritch' },
  { name: 'ink_violet', hex: '#1f1438', register: 'eldritch' },
  { name: 'bruise_violet', hex: '#3a1e54', register: 'eldritch' },
  { name: 'dusk_purple', hex: '#5c3074', register: 'eldritch' },
  { name: 'pale_moon', hex: '#b6c8c1', register: 'eldritch' },
  { name: 'moon_phosphor', hex: '#8fe4d2', register: 'eldritch' },
  { name: 'bioluminescent_cyan', hex: '#4af0e0', register: 'eldritch' },
  { name: 'ghost_jade', hex: '#6ab39d', register: 'eldritch' },
  { name: 'chitin_green', hex: '#43705a', register: 'eldritch' },
  { name: 'spectral_silver', hex: '#9ab2bf', register: 'eldritch' },
  { name: 'nightsky_blue', hex: '#1e3a64', register: 'eldritch' },
  { name: 'twilight_blue', hex: '#305f87', register: 'eldritch' },
  { name: 'tidewater_glow', hex: '#76d6c5', register: 'eldritch' },
];

// Salvaged-futurism — steel, oxidised orange, coolant blue, fission green.
const SALVAGED_FUTURISM: PaletteEntry[] = [
  { name: 'iron_dark', hex: '#1a1c1f', register: 'salvaged-futurism' },
  { name: 'gun_steel', hex: '#353a40', register: 'salvaged-futurism' },
  { name: 'riveted_steel', hex: '#4d5560', register: 'salvaged-futurism' },
  { name: 'polished_steel', hex: '#7e8794', register: 'salvaged-futurism' },
  { name: 'pewter', hex: '#a3a9b1', register: 'salvaged-futurism' },
  { name: 'chrome', hex: '#cdd2d6', register: 'salvaged-futurism' },
  { name: 'oxide_orange', hex: '#b8541b', register: 'salvaged-futurism' },
  { name: 'rust_red', hex: '#7a3a1f', register: 'salvaged-futurism' },
  { name: 'safety_amber', hex: '#e08e2c', register: 'salvaged-futurism' },
  { name: 'caution_yellow', hex: '#d8b13a', register: 'salvaged-futurism' },
  { name: 'workshop_oil', hex: '#2a2418', register: 'salvaged-futurism' },
  { name: 'copper_wire', hex: '#c4773a', register: 'salvaged-futurism' },
  { name: 'coolant_blue', hex: '#2e7eb8', register: 'salvaged-futurism' },
  { name: 'alloy_blue', hex: '#4a8fb5', register: 'salvaged-futurism' },
  { name: 'neon_cyan', hex: '#2adfff', register: 'salvaged-futurism' },
  { name: 'fission_green', hex: '#79e26a', register: 'salvaged-futurism' },
];

export const OTK_PALETTE: readonly PaletteEntry[] = [
  ...SALT_AND_RUM,
  ...ELDRITCH,
  ...SALVAGED_FUTURISM,
];

export const PALETTE_BY_REGISTER: Readonly<Record<ToneRegister, readonly PaletteEntry[]>> = {
  'salt-and-rum': SALT_AND_RUM,
  eldritch: ELDRITCH,
  'salvaged-futurism': SALVAGED_FUTURISM,
};

export function getPaletteEntry(name: string): PaletteEntry | undefined {
  return OTK_PALETTE.find((c) => c.name === name);
}
