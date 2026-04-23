import { describe, it, expect } from 'vitest';
import { InMemoryAuthRepository } from './in-memory-repository.js';

function fixedDate(iso: string): Date {
  return new Date(iso);
}

describe('InMemoryAuthRepository — users', () => {
  it('finds a user by email after createUser, case-insensitive', async () => {
    const repo = new InMemoryAuthRepository();
    const created = await repo.createUser({
      id: 'u-1',
      email: 'Captain@OTK.example',
      createdAt: fixedDate('2026-04-23T00:00:00Z'),
    });

    expect(created.email).toBe('captain@otk.example');
    expect(await repo.findUserByEmail('CAPTAIN@otk.example')).toEqual(created);
    expect(await repo.findUserById('u-1')).toEqual(created);
  });

  it('returns null for unknown email and id', async () => {
    const repo = new InMemoryAuthRepository();
    expect(await repo.findUserByEmail('nobody@otk.example')).toBeNull();
    expect(await repo.findUserById('u-missing')).toBeNull();
  });

  it('rejects duplicate user creation by email', async () => {
    const repo = new InMemoryAuthRepository();
    await repo.createUser({
      id: 'u-1',
      email: 'a@b.co',
      createdAt: fixedDate('2026-04-23T00:00:00Z'),
    });
    await expect(
      repo.createUser({
        id: 'u-2',
        email: 'A@B.CO',
        createdAt: fixedDate('2026-04-23T00:00:00Z'),
      }),
    ).rejects.toThrow(/user_already_exists/);
  });
});

describe('InMemoryAuthRepository — magic links', () => {
  async function seed() {
    const repo = new InMemoryAuthRepository();
    await repo.createUser({
      id: 'u-1',
      email: 'a@b.co',
      createdAt: fixedDate('2026-04-23T00:00:00Z'),
    });
    return repo;
  }

  it('consumeMagicLink returns userId once and null after', async () => {
    const repo = await seed();
    await repo.createMagicLink({
      token: 'tok-1',
      userId: 'u-1',
      expiresAt: fixedDate('2026-04-23T01:00:00Z'),
    });

    const first = await repo.consumeMagicLink('tok-1', fixedDate('2026-04-23T00:30:00Z'));
    expect(first).toEqual({ userId: 'u-1' });

    const second = await repo.consumeMagicLink('tok-1', fixedDate('2026-04-23T00:31:00Z'));
    expect(second).toBeNull();
  });

  it('consumeMagicLink rejects an expired token', async () => {
    const repo = await seed();
    await repo.createMagicLink({
      token: 'tok-1',
      userId: 'u-1',
      expiresAt: fixedDate('2026-04-23T00:10:00Z'),
    });
    expect(await repo.consumeMagicLink('tok-1', fixedDate('2026-04-23T00:30:00Z'))).toBeNull();
  });

  it('consumeMagicLink returns null for an unknown token', async () => {
    const repo = await seed();
    expect(await repo.consumeMagicLink('nope', fixedDate('2026-04-23T00:00:00Z'))).toBeNull();
  });
});

describe('InMemoryAuthRepository — sessions', () => {
  async function seed() {
    const repo = new InMemoryAuthRepository();
    await repo.createUser({
      id: 'u-1',
      email: 'a@b.co',
      createdAt: fixedDate('2026-04-23T00:00:00Z'),
    });
    return repo;
  }

  it('findActiveSession returns the session before expiry, null after', async () => {
    const repo = await seed();
    await repo.createSession({
      token: 's-1',
      userId: 'u-1',
      expiresAt: fixedDate('2026-04-23T01:00:00Z'),
    });

    expect(await repo.findActiveSession('s-1', fixedDate('2026-04-23T00:30:00Z'))).toMatchObject({
      token: 's-1',
      userId: 'u-1',
    });
    expect(await repo.findActiveSession('s-1', fixedDate('2026-04-23T01:00:01Z'))).toBeNull();
  });

  it('deleteSession removes the session', async () => {
    const repo = await seed();
    await repo.createSession({
      token: 's-1',
      userId: 'u-1',
      expiresAt: fixedDate('2026-04-23T01:00:00Z'),
    });
    await repo.deleteSession('s-1');
    expect(await repo.findActiveSession('s-1', fixedDate('2026-04-23T00:30:00Z'))).toBeNull();
  });

  it('findActiveSession is null for an unknown token', async () => {
    const repo = await seed();
    expect(await repo.findActiveSession('s-missing', fixedDate('2026-04-23T00:30:00Z'))).toBeNull();
  });
});
