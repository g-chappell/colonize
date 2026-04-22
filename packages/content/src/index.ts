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
  ALL_LEGENDARY_SHIP_IDS,
  GROUND_CLASSES,
  getShipClass,
  getLegendaryShip,
  getGroundClass,
  isShipClassId,
  isLegendaryShipId,
  isGroundClassId,
  type ShipClassEntry,
  type ShipClassId,
  type LegendaryShipSlot,
  type LegendaryShipId,
  type GroundClassEntry,
  type GroundClassId,
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

export {
  RUMOUR_OUTCOME_FLAVOURS,
  getRumourOutcomeFlavour,
  type RumourOutcomeCategoryId,
  type RumourOutcomeFlavourEntry,
} from './rumour-outcomes.js';

export {
  BUILDINGS,
  getBuilding,
  isBuildingEntryId,
  type BuildingEntry,
  type BuildingEntryId,
} from './buildings.js';

export {
  TILE_YIELDS,
  getTileYieldEntry,
  isTileYieldEntryId,
  type TileYieldEntry,
  type TileYieldEntryId,
} from './tile-yields.js';

export {
  RESOURCES,
  getResource,
  isResourceEntryId,
  type ResourceEntry,
  type ResourceEntryId,
} from './resources.js';

export {
  PROFESSIONS,
  getProfession,
  isProfessionEntryId,
  type ProfessionEntry,
  type ProfessionEntryId,
} from './professions.js';

export {
  HOMEPORT_STARTING_PRICES,
  getHomePortStartingPrices,
  type ResourcePriceTable,
} from './homeport-prices.js';

export {
  DIPLOMACY_ACTION_FLAVOURS,
  getDiplomacyActionFlavour,
  isDiplomacyActionId,
  type DiplomacyActionId,
  type DiplomacyActionFlavourEntry,
} from './diplomacy-flavour.js';
