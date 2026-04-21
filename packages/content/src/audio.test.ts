import { describe, expect, it } from 'vitest';

import {
  AUDIO_PUBLIC_BASE,
  AUDIO_STEMS,
  audioStemUrl,
  getAudioStem,
  isAudioStemKey,
} from './audio.js';

describe('audio / stem registry', () => {
  it('declares at least one stem per bus', () => {
    expect(AUDIO_STEMS.some((s) => s.bus === 'sfx')).toBe(true);
    expect(AUDIO_STEMS.some((s) => s.bus === 'bgm')).toBe(true);
  });

  it('has unique keys', () => {
    const keys = AUDIO_STEMS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has positive durations', () => {
    for (const s of AUDIO_STEMS) {
      expect(s.durationMs).toBeGreaterThan(0);
    }
  });

  it('marks bgm stems as loop by default', () => {
    for (const s of AUDIO_STEMS) {
      if (s.bus === 'bgm') expect(s.loop).toBe(true);
    }
  });

  it('isAudioStemKey narrows only declared keys', () => {
    expect(isAudioStemKey('ui-click')).toBe(true);
    expect(isAudioStemKey('does-not-exist')).toBe(false);
    expect(isAudioStemKey(42)).toBe(false);
  });

  it('getAudioStem returns the registry entry', () => {
    const stem = getAudioStem('bgm-menu');
    expect(stem.bus).toBe('bgm');
    expect(stem.loop).toBe(true);
  });

  it('getAudioStem throws on an unknown key', () => {
    expect(() => getAudioStem('no-such-key')).toThrow(/unknown audio stem key/);
  });

  it('audioStemUrl composes a web-root-relative path', () => {
    const stem = getAudioStem('ui-click');
    expect(audioStemUrl(stem)).toBe(`${AUDIO_PUBLIC_BASE}${stem.file}`);
    expect(audioStemUrl(stem).startsWith('/audio/')).toBe(true);
  });
});
