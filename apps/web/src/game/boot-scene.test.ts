import { describe, it, expect } from 'vitest';

import { ATLAS_KEYS, ATLAS_PATHS, SCENE_KEYS } from './asset-keys';

describe('game asset keys', () => {
  it('exposes the atlas and scene keys used across the game code', () => {
    expect(ATLAS_KEYS.core).toBe('atlas-core');
    expect(SCENE_KEYS.boot).toBe('BootScene');
    expect(SCENE_KEYS.game).toBe('GameScene');
  });

  it('points the core atlas at the public paths prepare-assets copies into place', () => {
    expect(ATLAS_PATHS.core.png).toBe('/atlas/core/spritesheet.png');
    expect(ATLAS_PATHS.core.json).toBe('/atlas/core/spritesheet.json');
  });
});
