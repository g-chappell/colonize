import { describe, expect, it } from 'vitest';

import {
  canPlay,
  createAudioState,
  effectiveVolume,
  planBgmTransition,
  withCurrentBgm,
  withMuted,
  withPrimed,
  withVolume,
} from './audio-state';

describe('audio-state / createAudioState', () => {
  it('returns safe defaults when no init given', () => {
    const s = createAudioState();
    expect(s.primed).toBe(false);
    expect(s.muted).toBe(false);
    expect(s.currentBgm).toBeNull();
    expect(s.sfxVolume).toBeGreaterThan(0);
    expect(s.bgmVolume).toBeGreaterThan(0);
  });

  it('clamps volumes to [0, 1]', () => {
    expect(createAudioState({ sfxVolume: -5 }).sfxVolume).toBe(0);
    expect(createAudioState({ bgmVolume: 2 }).bgmVolume).toBe(1);
    expect(createAudioState({ sfxVolume: Number.NaN }).sfxVolume).toBe(0);
  });

  it('treats the initial state as frozen-by-convention (mutations produce new objects)', () => {
    const s = createAudioState();
    const next = withPrimed(s);
    expect(next).not.toBe(s);
    expect(s.primed).toBe(false);
    expect(next.primed).toBe(true);
  });
});

describe('audio-state / transitions', () => {
  it('withPrimed is idempotent once primed', () => {
    const a = withPrimed(createAudioState());
    const b = withPrimed(a);
    expect(b).toBe(a);
  });

  it('withMuted returns same ref when value matches', () => {
    const s = createAudioState();
    expect(withMuted(s, false)).toBe(s);
    const muted = withMuted(s, true);
    expect(muted.muted).toBe(true);
    expect(withMuted(muted, true)).toBe(muted);
  });

  it('withVolume clamps and narrows by bus', () => {
    const s = createAudioState({ sfxVolume: 0.5, bgmVolume: 0.5 });
    expect(withVolume(s, 'sfx', 1.5).sfxVolume).toBe(1);
    expect(withVolume(s, 'sfx', 1.5).bgmVolume).toBe(0.5);
    expect(withVolume(s, 'bgm', -1).bgmVolume).toBe(0);
    expect(withVolume(s, 'sfx', 0.5)).toBe(s);
  });

  it('withCurrentBgm tracks the active bgm key', () => {
    const s = createAudioState();
    const a = withCurrentBgm(s, 'bgm-menu');
    expect(a.currentBgm).toBe('bgm-menu');
    const b = withCurrentBgm(a, null);
    expect(b.currentBgm).toBeNull();
    expect(withCurrentBgm(a, 'bgm-menu')).toBe(a);
  });
});

describe('audio-state / effectiveVolume + canPlay', () => {
  it('returns 0 while not primed', () => {
    const s = createAudioState({ sfxVolume: 1, bgmVolume: 1 });
    expect(effectiveVolume(s, 'sfx')).toBe(0);
    expect(effectiveVolume(s, 'bgm')).toBe(0);
    expect(canPlay(s, 'sfx')).toBe(false);
  });

  it('returns 0 while muted even when primed', () => {
    const s = withMuted(withPrimed(createAudioState({ sfxVolume: 1 })), true);
    expect(effectiveVolume(s, 'sfx')).toBe(0);
    expect(canPlay(s, 'sfx')).toBe(false);
  });

  it('returns per-bus volume when primed and not muted', () => {
    const s = withPrimed(createAudioState({ sfxVolume: 0.7, bgmVolume: 0.3 }));
    expect(effectiveVolume(s, 'sfx')).toBeCloseTo(0.7);
    expect(effectiveVolume(s, 'bgm')).toBeCloseTo(0.3);
    expect(canPlay(s, 'bgm')).toBe(true);
  });
});

describe('audio-state / planBgmTransition', () => {
  it('start when nothing is playing and a key is requested', () => {
    const s = createAudioState();
    expect(planBgmTransition(s, 'bgm-menu')).toEqual({ kind: 'start', key: 'bgm-menu' });
  });

  it('noop when the requested key already plays', () => {
    const s = withCurrentBgm(createAudioState(), 'bgm-menu');
    expect(planBgmTransition(s, 'bgm-menu')).toEqual({ kind: 'noop' });
  });

  it('switch when a different key is requested', () => {
    const s = withCurrentBgm(createAudioState(), 'bgm-menu');
    expect(planBgmTransition(s, 'bgm-battle')).toEqual({
      kind: 'switch',
      from: 'bgm-menu',
      to: 'bgm-battle',
    });
  });

  it('stop when null is requested and something is playing', () => {
    const s = withCurrentBgm(createAudioState(), 'bgm-menu');
    expect(planBgmTransition(s, null)).toEqual({ kind: 'stop', from: 'bgm-menu' });
  });

  it('noop when null is requested and nothing is playing', () => {
    expect(planBgmTransition(createAudioState(), null)).toEqual({ kind: 'noop' });
  });
});
