import type Phaser from 'phaser';
import { AUDIO_STEMS, audioStemUrl, getAudioStem, type AudioStemEntry } from '@colonize/content';

import {
  type AudioBus,
  type AudioState,
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

// Phaser.Sound bound to the game instance. Decision logic lives in the
// pure sibling `audio-state.ts`; this class is strictly the wiring —
// it turns state transitions into Phaser.Sound calls and listens for
// Phaser's unlock event to flip `primed`.

export type SoundManager = Phaser.Sound.BaseSoundManager;

export class AudioManager {
  private readonly sound: SoundManager;
  private state: AudioState;
  private bgmInstance: Phaser.Sound.BaseSound | null = null;

  constructor(sound: SoundManager, init?: Parameters<typeof createAudioState>[0]) {
    this.sound = sound;
    this.state = createAudioState(init);

    // Phaser's WebAudioSoundManager flips `locked` until a user
    // gesture unlocks the AudioContext. Base class / noAudio mode has
    // no such gate, so treat it as already primed.
    const locked = (sound as { locked?: boolean }).locked === true;
    if (locked) {
      sound.once('unlocked', () => {
        this.state = withPrimed(this.state);
        // If a BGM was requested before the unlock, it was queued via
        // currentBgm but never actually started — kick it off now.
        const queued = this.state.currentBgm;
        if (queued !== null) {
          this.startBgmNow(queued);
        }
      });
    } else {
      this.state = withPrimed(this.state);
    }
  }

  static listStems(): readonly AudioStemEntry[] {
    return AUDIO_STEMS;
  }

  getState(): AudioState {
    return this.state;
  }

  play(key: string): void {
    const stem = getAudioStem(key);
    if (stem.bus !== 'sfx') {
      throw new Error(`AudioManager.play: ${key} is a ${stem.bus} stem; use playBgm instead`);
    }
    if (!canPlay(this.state, 'sfx')) return;
    this.sound.play(key, { volume: effectiveVolume(this.state, 'sfx') });
  }

  playBgm(key: string): void {
    const stem = getAudioStem(key);
    if (stem.bus !== 'bgm') {
      throw new Error(`AudioManager.playBgm: ${key} is a ${stem.bus} stem; use play instead`);
    }
    const transition = planBgmTransition(this.state, key);
    this.applyBgm(transition);
  }

  stopBgm(): void {
    const transition = planBgmTransition(this.state, null);
    this.applyBgm(transition);
  }

  setVolume(bus: AudioBus, volume: number): void {
    this.state = withVolume(this.state, bus, volume);
    if (bus === 'bgm' && this.bgmInstance !== null) {
      const withVol = this.bgmInstance as Phaser.Sound.BaseSound & { volume?: number };
      withVol.volume = effectiveVolume(this.state, 'bgm');
    }
  }

  setMuted(muted: boolean): void {
    const prev = this.state.muted;
    this.state = withMuted(this.state, muted);
    if (prev === muted) return;
    if (muted) {
      if (this.bgmInstance !== null) this.bgmInstance.pause();
    } else if (this.bgmInstance !== null) {
      this.bgmInstance.resume();
    }
  }

  // Force-prime without waiting for Phaser's 'unlocked' event. Used by
  // tests and by manual flows that have already confirmed the user
  // gesture another way.
  forcePrime(): void {
    this.state = withPrimed(this.state);
    if (this.state.currentBgm !== null && this.bgmInstance === null) {
      this.startBgmNow(this.state.currentBgm);
    }
  }

  destroy(): void {
    if (this.bgmInstance !== null) {
      this.bgmInstance.stop();
      this.bgmInstance.destroy();
      this.bgmInstance = null;
    }
  }

  private applyBgm(transition: BgmTransition): void {
    switch (transition.kind) {
      case 'noop':
        return;
      case 'stop':
        this.stopBgmNow();
        this.state = withCurrentBgm(this.state, null);
        return;
      case 'start':
        this.state = withCurrentBgm(this.state, transition.key);
        if (this.state.primed) this.startBgmNow(transition.key);
        return;
      case 'switch':
        this.stopBgmNow();
        this.state = withCurrentBgm(this.state, transition.to);
        if (this.state.primed) this.startBgmNow(transition.to);
        return;
    }
  }

  private startBgmNow(key: string): void {
    const stem = getAudioStem(key);
    this.bgmInstance = this.sound.add(key, {
      loop: stem.loop,
      volume: effectiveVolume(this.state, 'bgm'),
    });
    this.bgmInstance.play();
  }

  private stopBgmNow(): void {
    if (this.bgmInstance === null) return;
    this.bgmInstance.stop();
    this.bgmInstance.destroy();
    this.bgmInstance = null;
  }
}

// Scene-facing helper: queue every stem onto a loader. Called from
// BootScene after the atlas preload so the sound cache is populated
// before gameplay starts.
export function loadAudioStems(loader: Phaser.Loader.LoaderPlugin): void {
  for (const stem of AUDIO_STEMS) {
    if (loader.cacheManager.audio?.exists(stem.key)) continue;
    loader.audio(stem.key, audioStemUrl(stem));
  }
}
