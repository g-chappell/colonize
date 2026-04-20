import { describe, it, expect } from 'vitest';
import { HealthResponse, SHARED_SCHEMA_VERSION } from './index.js';

describe('@colonize/shared', () => {
  it('exposes a schema version', () => {
    expect(SHARED_SCHEMA_VERSION).toBe(1);
  });

  it('round-trips a HealthResponse via Zod', () => {
    const sample = { ok: true, version: '0.0.0', uptime: 0 };
    const parsed = HealthResponse.parse(sample);
    expect(parsed).toEqual(sample);
  });
});
