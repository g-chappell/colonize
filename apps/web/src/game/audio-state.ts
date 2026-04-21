// Pure-TS sibling for audio-manager.ts. Holds the state machine and
// decision logic so unit tests never need to import Phaser. Import
// closure: nothing framework-specific — only std TS types.

export type AudioBus = 'sfx' | 'bgm';

export interface AudioState {
  readonly primed: boolean;
  readonly muted: boolean;
  readonly sfxVolume: number;
  readonly bgmVolume: number;
  readonly currentBgm: string | null;
}

export interface AudioStateInit {
  readonly primed?: boolean;
  readonly muted?: boolean;
  readonly sfxVolume?: number;
  readonly bgmVolume?: number;
  readonly currentBgm?: string | null;
}

const DEFAULTS: AudioState = {
  primed: false,
  muted: false,
  sfxVolume: 0.8,
  bgmVolume: 0.5,
  currentBgm: null,
};

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function createAudioState(init: AudioStateInit = {}): AudioState {
  return {
    primed: init.primed ?? DEFAULTS.primed,
    muted: init.muted ?? DEFAULTS.muted,
    sfxVolume: clampVolume(init.sfxVolume ?? DEFAULTS.sfxVolume),
    bgmVolume: clampVolume(init.bgmVolume ?? DEFAULTS.bgmVolume),
    currentBgm: init.currentBgm ?? DEFAULTS.currentBgm,
  };
}

export function withPrimed(state: AudioState): AudioState {
  if (state.primed) return state;
  return { ...state, primed: true };
}

export function withMuted(state: AudioState, muted: boolean): AudioState {
  if (state.muted === muted) return state;
  return { ...state, muted };
}

export function withVolume(state: AudioState, bus: AudioBus, volume: number): AudioState {
  const clamped = clampVolume(volume);
  if (bus === 'sfx') {
    if (state.sfxVolume === clamped) return state;
    return { ...state, sfxVolume: clamped };
  }
  if (state.bgmVolume === clamped) return state;
  return { ...state, bgmVolume: clamped };
}

export function withCurrentBgm(state: AudioState, key: string | null): AudioState {
  if (state.currentBgm === key) return state;
  return { ...state, currentBgm: key };
}

// Effective playback gain for the given bus. Returns 0 when muted or
// not yet primed (iOS-safe default: never schedule audio before the
// user gesture that unlocks the AudioContext).
export function effectiveVolume(state: AudioState, bus: AudioBus): number {
  if (!state.primed || state.muted) return 0;
  return bus === 'sfx' ? state.sfxVolume : state.bgmVolume;
}

export function canPlay(state: AudioState, bus: AudioBus): boolean {
  return effectiveVolume(state, bus) > 0;
}

// Decision emitted by `planBgmTransition`: describes what the Phaser
// wrapper should do after a playBgm() request. Kept data-only so tests
// pin decision logic without mocking Phaser.
export type BgmTransition =
  | { readonly kind: 'noop' }
  | { readonly kind: 'start'; readonly key: string }
  | { readonly kind: 'stop'; readonly from: string }
  | { readonly kind: 'switch'; readonly from: string; readonly to: string };

export function planBgmTransition(state: AudioState, requested: string | null): BgmTransition {
  const current = state.currentBgm;
  if (requested === null) {
    return current === null ? { kind: 'noop' } : { kind: 'stop', from: current };
  }
  if (current === null) {
    return { kind: 'start', key: requested };
  }
  if (current === requested) {
    return { kind: 'noop' };
  }
  return { kind: 'switch', from: current, to: requested };
}
