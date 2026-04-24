import { describe, expect, it } from 'vitest';
import { InMemoryEntitlementRepository } from './in-memory-repository.js';

describe('InMemoryEntitlementRepository', () => {
  const userA = 'u-aaaaaaaa-0000-4000-8000-000000000000';
  const userB = 'u-bbbbbbbb-0000-4000-8000-000000000000';

  it('grants and lists entitlements for a user', async () => {
    const repo = new InMemoryEntitlementRepository();
    const now = new Date('2026-04-24T00:00:00.000Z');

    const record = await repo.grant({
      userId: userA,
      entitlement: 'remove_ads',
      productId: 'com.colonize.remove_ads',
      platform: 'ios',
      now,
    });

    expect(record).toEqual({
      userId: userA,
      entitlement: 'remove_ads',
      productId: 'com.colonize.remove_ads',
      platform: 'ios',
      validatedAt: now,
    });

    const list = await repo.listForUser(userA);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(record);
  });

  it('upserts on re-grant — preserves one row per (userId, entitlement)', async () => {
    const repo = new InMemoryEntitlementRepository();
    const first = new Date('2026-04-24T00:00:00.000Z');
    const second = new Date('2026-04-25T00:00:00.000Z');

    await repo.grant({
      userId: userA,
      entitlement: 'remove_ads',
      productId: 'com.colonize.remove_ads',
      platform: 'ios',
      now: first,
    });
    await repo.grant({
      userId: userA,
      entitlement: 'remove_ads',
      productId: 'com.colonize.remove_ads',
      platform: 'android',
      now: second,
    });

    const list = await repo.listForUser(userA);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      platform: 'android',
      validatedAt: second,
    });
  });

  it('scopes list results to the requested user', async () => {
    const repo = new InMemoryEntitlementRepository();
    const now = new Date('2026-04-24T00:00:00.000Z');

    await repo.grant({
      userId: userA,
      entitlement: 'remove_ads',
      productId: 'com.colonize.remove_ads',
      platform: 'ios',
      now,
    });

    expect(await repo.listForUser(userA)).toHaveLength(1);
    expect(await repo.listForUser(userB)).toEqual([]);
  });
});
