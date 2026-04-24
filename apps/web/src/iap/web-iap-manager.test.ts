import { describe, expect, it } from 'vitest';

import { WebIapManager } from './web-iap-manager';

describe('WebIapManager', () => {
  it('advertises backend="web"', () => {
    const mgr = new WebIapManager();
    expect(mgr.backend).toBe('web');
  });

  it('initialise then purchase returns skipped/unavailable', async () => {
    const mgr = new WebIapManager();
    await mgr.initialize();
    const outcome = await mgr.purchase('com.colonize.remove_ads');
    expect(outcome).toEqual({ kind: 'skipped', reason: 'unavailable' });
  });
});
