import { describe, it, expect } from 'vitest';
import { ALL_RESOURCE_TYPES, ResourceType, isResourceType } from './resource-type.js';

describe('ResourceType registry', () => {
  it('covers the MVP raws + processed goods', () => {
    const ids = new Set<string>(ALL_RESOURCE_TYPES);
    expect(ids.has(ResourceType.Timber)).toBe(true);
    expect(ids.has(ResourceType.Fibre)).toBe(true);
    expect(ids.has(ResourceType.Provisions)).toBe(true);
    expect(ids.has(ResourceType.Salvage)).toBe(true);
    expect(ids.has(ResourceType.Planks)).toBe(true);
    expect(ids.has(ResourceType.Forgework)).toBe(true);
  });

  it('has unique string values', () => {
    expect(new Set(ALL_RESOURCE_TYPES).size).toBe(ALL_RESOURCE_TYPES.length);
  });

  it('every value is a non-empty kebab-case string', () => {
    for (const id of ALL_RESOURCE_TYPES) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});

describe('isResourceType', () => {
  it('accepts every registered id', () => {
    for (const id of ALL_RESOURCE_TYPES) {
      expect(isResourceType(id)).toBe(true);
    }
  });

  it('rejects non-registered strings and non-strings', () => {
    expect(isResourceType('')).toBe(false);
    expect(isResourceType('unknown-resource')).toBe(false);
    expect(isResourceType(null)).toBe(false);
    expect(isResourceType(undefined)).toBe(false);
    expect(isResourceType(42)).toBe(false);
    expect(isResourceType({})).toBe(false);
  });
});
