export { BootScene } from './boot-scene';
export { GameScene, FOG_OVERLAY_DEPTH, type GameSceneInitData } from './game-scene';
export {
  AUDIO_REGISTRY_KEY,
  createGame,
  startGameScene,
  type CreateGameOptions,
} from './create-game';
export { AudioManager, loadAudioStems, type SoundManager } from './audio-manager';
export {
  type AudioBus,
  type AudioState,
  type AudioStateInit,
  type BgmTransition,
  canPlay,
  createAudioState,
  effectiveVolume,
  planBgmTransition,
  withCurrentBgm,
  withMuted,
  withPrimed,
  withVolume,
} from './audio-state';
export { ATLAS_KEYS, ATLAS_PATHS, SCENE_KEYS } from './asset-keys';
export {
  TILE_SIZE,
  TILE_RENDER_SCALE,
  TILE_FRAMES,
  OCEAN_ANIMATION_KEY,
  OCEAN_ANIMATION_FRAMES,
  OCEAN_ANIMATION_FRAMERATE,
  frameForTile,
} from './tile-atlas';
export {
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_KEY_PAN_SPEED,
  CAMERA_WHEEL_ZOOM_FACTOR,
} from './camera-controls';
export { FogOverlay } from './fog-overlay';
export {
  FOG_ALPHA_UNSEEN,
  FOG_ALPHA_SEEN,
  FOG_ALPHA_VISIBLE,
  FOG_COLOR,
  FOG_REVEAL_DURATION_MS,
  FogOverlayState,
  fogAlphaFor,
  interpolateFogAlpha,
} from './fog-overlay-state';
