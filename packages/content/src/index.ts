export const CONTENT_VERSION = '0.0.0';

export const PROJECT_TAGLINE = 'NW 2191 · Early Liberty Era';

export {
  OTK_PALETTE,
  PALETTE_BY_REGISTER,
  getPaletteEntry,
  type PaletteEntry,
  type ToneRegister,
} from './palette.js';

export { FACTIONS, getFaction, type FactionEntry, type PlayableFactionId } from './factions.js';

export {
  SHIP_CLASSES,
  OTK_LEGENDARY_SHIP_SLOTS,
  getShipClass,
  isShipClassId,
  type ShipClassEntry,
  type ShipClassId,
  type LegendaryShipSlot,
} from './units.js';

export {
  AUDIO_STEMS,
  AUDIO_PUBLIC_BASE,
  audioStemUrl,
  getAudioStem,
  isAudioStemKey,
  type AudioStemBus,
  type AudioStemEntry,
} from './audio.js';
