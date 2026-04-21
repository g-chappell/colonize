export type AudioStemBus = 'sfx' | 'bgm';

export interface AudioStemEntry {
  readonly key: string;
  readonly bus: AudioStemBus;
  readonly file: string;
  readonly durationMs: number;
  readonly loop: boolean;
}

// Placeholder silent stems. Real composition lands in a later epic —
// until then the web app loads these so the audio manager has
// something to exercise (especially the iOS prime path, which needs a
// decoded buffer available the moment the user gesture fires).
export const AUDIO_STEMS: readonly AudioStemEntry[] = [
  { key: 'ui-click', bus: 'sfx', file: 'ui-click.wav', durationMs: 80, loop: false },
  { key: 'ui-prime', bus: 'sfx', file: 'ui-prime.wav', durationMs: 50, loop: false },
  { key: 'bgm-menu', bus: 'bgm', file: 'bgm-menu.wav', durationMs: 2000, loop: true },
];

export const AUDIO_PUBLIC_BASE = '/audio/';

const AUDIO_KEYS: readonly string[] = AUDIO_STEMS.map((s) => s.key);

export function isAudioStemKey(value: unknown): value is string {
  return typeof value === 'string' && AUDIO_KEYS.includes(value);
}

export function getAudioStem(key: string): AudioStemEntry {
  const found = AUDIO_STEMS.find((s) => s.key === key);
  if (!found) {
    throw new Error(`getAudioStem: unknown audio stem key: ${key}`);
  }
  return found;
}

export function audioStemUrl(stem: AudioStemEntry): string {
  return `${AUDIO_PUBLIC_BASE}${stem.file}`;
}
