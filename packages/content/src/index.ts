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
  SPECIALIST_CLASSES,
  getShipClass,
  getLegendaryShip,
  getGroundClass,
  getSpecialistClass,
  isShipClassId,
  isLegendaryShipId,
  isGroundClassId,
  isSpecialistClassId,
  type ShipClassEntry,
  type ShipClassId,
  type LegendaryShipSlot,
  type LegendaryShipId,
  type GroundClassEntry,
  type GroundClassId,
  type SpecialistClassEntry,
  type SpecialistClassId,
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
  PRICE_SHOCKS,
  getPriceShock,
  isPriceShockId,
  listPriceShocksForResource,
  type PriceShockDirection,
  type PriceShockEvent,
} from './price-shocks.js';

export {
  DIPLOMACY_ACTION_FLAVOURS,
  getDiplomacyActionFlavour,
  isDiplomacyActionId,
  type DiplomacyActionId,
  type DiplomacyActionFlavourEntry,
} from './diplomacy-flavour.js';

export {
  COUNCIL_THRESHOLD_FLAVOURS,
  LIBERTY_CHIMES_SUMMARY,
  getCouncilThresholdFlavour,
  isCouncilThresholdValue,
  type CouncilThresholdFlavour,
} from './chimes-flavour.js';

export {
  TITHE_FLAVOURS,
  CONCORD_TENSION_TIER_VALUES,
  getTitheFlavour,
  isConcordTensionTier,
  type ConcordTensionTier,
  type TitheFlavour,
} from './concord-tithe-flavour.js';

export {
  TIDEWATER_PARTY_DUMP_QTY,
  TIDEWATER_PARTY_FREEZE_TURNS,
  TIDEWATER_PARTY_IRE_PENALTY,
  TIDEWATER_PARTY_FLAVOUR,
  getTidewaterPartyFlavour,
  type TidewaterPartyFlavour,
} from './tidewater-party.js';

export {
  ARCHIVE_CHARTER_FLAVOURS,
  getArchiveCharterFlavour,
  isArchiveCharterFlavourId,
  type ArchiveCharterFlavour,
  type ArchiveCharterFlavourId,
} from './charters.js';

export {
  CONCORD_CAMPAIGN_DIFFICULTIES,
  getConcordCampaignDifficulty,
  isConcordCampaignDifficultyId,
  type ConcordCampaignDifficulty,
  type ConcordCampaignDifficultyId,
  type ConcordCampaignWave,
} from './concord-campaign.js';

export {
  EPILOGUES,
  ALL_ENDGAME_RESULT_IDS,
  getEpilogue,
  type EndgameResultId,
  type EpilogueEntry,
} from './epilogues.js';

export { SPARROW_DIARY, SPARROW_EPILOGUE, type DiaryEntry } from './prologue.js';

export {
  TUTORIAL_STEPS,
  getTutorialStep,
  isTutorialStepId,
  type TutorialStep,
  type TutorialStepId,
} from './tutorial-steps.js';

export {
  ABYSSAL_STANCE_FLAVOURS,
  getAbyssalStanceFlavour,
  isAbyssalStanceId,
  type AbyssalStanceFlavourEntry,
  type AbyssalStanceId,
} from './abyssal-stance.js';

export {
  NPC_FACTION_FLAVOURS,
  getNpcFactionFlavour,
  isNpcFactionId,
  type NpcFactionFlavourEntry,
  type NpcFactionId,
} from './npc-factions.js';

export {
  TAVERN_RUMOURS,
  getTavernRumour,
  isTavernRumourId,
  eligibleTavernRumours,
  tavernRumourWeight,
  collectTavernRumourHints,
  type TavernRumourHint,
  type TavernRumourId,
  type TavernRumourEntry,
  type TavernRumourTrigger,
  type TavernContext,
} from './tavern-rumours.js';

export {
  BLACK_MARKET_OFFERINGS,
  BLACK_MARKET_BUY_CHIMES_PER_UNIT_FLOOR,
  BLACK_MARKET_SELL_CHIMES_PER_UNIT_CEILING,
  getBlackMarketOffering,
  isBlackMarketOfferingId,
  isBlackMarketTalismanOffer,
  type BlackMarketBuyOffer,
  type BlackMarketOffering,
  type BlackMarketOfferingId,
  type BlackMarketSellOffer,
  type BlackMarketTalismanOffer,
} from './black-market.js';
