import { describe, it, expect } from 'vitest';
import { CargoHold, type CargoHoldJSON } from './cargo-hold.js';

describe('CargoHold construction', () => {
  it('defaults to an empty hold', () => {
    const hold = new CargoHold();
    expect(hold.isEmpty).toBe(true);
    expect(hold.resourceTotal).toBe(0);
    expect(hold.artifacts).toEqual([]);
  });

  it('accepts seed resources and artifacts', () => {
    const hold = new CargoHold({
      resources: { timber: 3, provisions: 5 },
      artifacts: ['kraken-talisman'],
    });
    expect(hold.getQuantity('timber')).toBe(3);
    expect(hold.getQuantity('provisions')).toBe(5);
    expect(hold.hasArtifact('kraken-talisman')).toBe(true);
    expect(hold.resourceTotal).toBe(8);
    expect(hold.isEmpty).toBe(false);
  });

  it('ignores zero-qty seed entries', () => {
    const hold = new CargoHold({ resources: { timber: 0 } });
    expect(hold.getQuantity('timber')).toBe(0);
    expect(hold.isEmpty).toBe(true);
  });

  it('deduplicates repeated seed artifacts (set semantics)', () => {
    const hold = new CargoHold({ artifacts: ['shard', 'shard', 'compass'] });
    expect(hold.artifacts).toEqual(['compass', 'shard']);
  });

  it.each([
    ['non-integer qty', { timber: 1.5 }, RangeError],
    ['negative qty', { timber: -1 }, RangeError],
    ['empty resource id', { '': 1 }, TypeError],
  ])('rejects invalid seed resources (%s)', (_label, resources, ctor) => {
    expect(() => new CargoHold({ resources })).toThrow(ctor);
  });

  it('rejects an empty artifact id in seed', () => {
    expect(() => new CargoHold({ artifacts: [''] })).toThrow(TypeError);
  });
});

describe('CargoHold.addResource / removeResource', () => {
  it('adds to existing qty', () => {
    const hold = new CargoHold();
    hold.addResource('timber', 2);
    hold.addResource('timber', 3);
    expect(hold.getQuantity('timber')).toBe(5);
  });

  it('addResource 0 is a no-op', () => {
    const hold = new CargoHold();
    hold.addResource('timber', 0);
    expect(hold.getQuantity('timber')).toBe(0);
    expect(hold.isEmpty).toBe(true);
  });

  it('removeResource subtracts and drops the key when zero', () => {
    const hold = new CargoHold({ resources: { timber: 5 } });
    hold.removeResource('timber', 3);
    expect(hold.getQuantity('timber')).toBe(2);
    hold.removeResource('timber', 2);
    expect(hold.getQuantity('timber')).toBe(0);
    expect(hold.isEmpty).toBe(true);
  });

  it('removeResource 0 is a no-op', () => {
    const hold = new CargoHold({ resources: { timber: 5 } });
    hold.removeResource('timber', 0);
    expect(hold.getQuantity('timber')).toBe(5);
  });

  it('removeResource throws when qty exceeds current', () => {
    const hold = new CargoHold({ resources: { timber: 2 } });
    expect(() => hold.removeResource('timber', 3)).toThrow(RangeError);
    expect(hold.getQuantity('timber')).toBe(2);
  });

  it('removeResource throws when the resource is absent', () => {
    const hold = new CargoHold();
    expect(() => hold.removeResource('timber', 1)).toThrow(RangeError);
  });

  it.each([
    ['negative qty', -1, RangeError],
    ['fractional qty', 0.5, RangeError],
  ])('addResource rejects invalid qty (%s)', (_label, qty, ctor) => {
    const hold = new CargoHold();
    expect(() => hold.addResource('timber', qty)).toThrow(ctor);
  });
});

describe('CargoHold artifacts', () => {
  it('addArtifact is idempotent (set semantics)', () => {
    const hold = new CargoHold();
    hold.addArtifact('kraken-talisman');
    hold.addArtifact('kraken-talisman');
    expect(hold.artifacts).toEqual(['kraken-talisman']);
  });

  it('removeArtifact drops it', () => {
    const hold = new CargoHold({ artifacts: ['kraken-talisman'] });
    hold.removeArtifact('kraken-talisman');
    expect(hold.hasArtifact('kraken-talisman')).toBe(false);
  });

  it('removeArtifact throws when the artifact is absent', () => {
    const hold = new CargoHold();
    expect(() => hold.removeArtifact('kraken-talisman')).toThrow(Error);
  });

  it('rejects an empty artifact id', () => {
    const hold = new CargoHold();
    expect(() => hold.addArtifact('')).toThrow(TypeError);
    expect(() => hold.removeArtifact('')).toThrow(TypeError);
  });
});

describe('CargoHold.transferTo', () => {
  it('moves every resource qty + every artifact to other, leaving this empty', () => {
    const a = new CargoHold({
      resources: { timber: 3, provisions: 1 },
      artifacts: ['shard'],
    });
    const b = new CargoHold({ resources: { timber: 2 } });
    a.transferTo(b);
    expect(a.isEmpty).toBe(true);
    expect(b.getQuantity('timber')).toBe(5);
    expect(b.getQuantity('provisions')).toBe(1);
    expect(b.hasArtifact('shard')).toBe(true);
  });

  it('no-op when the source is empty', () => {
    const a = new CargoHold();
    const b = new CargoHold({ resources: { timber: 2 } });
    a.transferTo(b);
    expect(b.getQuantity('timber')).toBe(2);
    expect(b.resourceTotal).toBe(2);
  });

  it('rejects self-transfer', () => {
    const a = new CargoHold({ resources: { timber: 1 } });
    expect(() => a.transferTo(a)).toThrow(Error);
    expect(a.getQuantity('timber')).toBe(1);
  });

  it('rejects non-CargoHold argument', () => {
    const a = new CargoHold();
    expect(() => a.transferTo({} as CargoHold)).toThrow(TypeError);
  });
});

describe('CargoHold iteration + accessors', () => {
  it('entries yields every resource with qty', () => {
    const hold = new CargoHold({ resources: { timber: 2, provisions: 3 } });
    const seen = new Map<string, number>();
    for (const [id, qty] of hold.entries()) seen.set(id, qty);
    expect(seen.get('timber')).toBe(2);
    expect(seen.get('provisions')).toBe(3);
    expect(seen.size).toBe(2);
  });

  it('artifacts accessor returns a defensive copy', () => {
    const hold = new CargoHold({ artifacts: ['shard'] });
    const view = hold.artifacts;
    (view as string[]).push('forged');
    expect(hold.artifacts).toEqual(['shard']);
  });

  it('clear empties the hold', () => {
    const hold = new CargoHold({ resources: { timber: 1 }, artifacts: ['shard'] });
    hold.clear();
    expect(hold.isEmpty).toBe(true);
  });
});

describe('CargoHold.toJSON / fromJSON', () => {
  it('round-trips a typical hold', () => {
    const hold = new CargoHold({
      resources: { timber: 2, provisions: 5 },
      artifacts: ['kraken-talisman'],
    });
    const json = hold.toJSON();
    expect(json).toEqual({
      resources: { provisions: 5, timber: 2 },
      artifacts: ['kraken-talisman'],
    });
    const revived = CargoHold.fromJSON(json);
    expect(revived.getQuantity('timber')).toBe(2);
    expect(revived.getQuantity('provisions')).toBe(5);
    expect(revived.hasArtifact('kraken-talisman')).toBe(true);
  });

  it('toJSON output is deterministic (keys sorted alphabetically)', () => {
    const a = new CargoHold();
    a.addResource('timber', 1);
    a.addResource('provisions', 1);
    const b = new CargoHold();
    b.addResource('provisions', 1);
    b.addResource('timber', 1);
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it('toJSON is JSON-serialisable and lossless', () => {
    const hold = new CargoHold({ resources: { timber: 4 }, artifacts: ['shard'] });
    const text = JSON.stringify(hold.toJSON());
    const revived = CargoHold.fromJSON(JSON.parse(text) as CargoHoldJSON);
    expect(revived.toJSON()).toEqual(hold.toJSON());
  });

  it('fromJSON rejects a non-object payload', () => {
    expect(() => CargoHold.fromJSON(null as unknown as CargoHoldJSON)).toThrow(TypeError);
  });

  it('fromJSON rejects a malformed resources payload', () => {
    const bad = { resources: null, artifacts: [] } as unknown as CargoHoldJSON;
    expect(() => CargoHold.fromJSON(bad)).toThrow(TypeError);
  });

  it('fromJSON rejects a malformed artifacts payload', () => {
    const bad = { resources: {}, artifacts: 'nope' } as unknown as CargoHoldJSON;
    expect(() => CargoHold.fromJSON(bad)).toThrow(TypeError);
  });

  it('revived hold is independent of the source', () => {
    const a = new CargoHold({ resources: { timber: 1 } });
    const b = CargoHold.fromJSON(a.toJSON());
    a.addResource('timber', 5);
    expect(b.getQuantity('timber')).toBe(1);
  });
});
