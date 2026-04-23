import { describe, expect, it } from 'vitest';
import { SPARROW_DIARY, SPARROW_EPILOGUE } from './prologue.js';

describe('Sparrow diary prologue', () => {
  it('provides the canonical sixteen diary entries', () => {
    expect(SPARROW_DIARY.length).toBe(16);
  });

  it('has unique ids so the UI can key off them', () => {
    const ids = SPARROW_DIARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has non-empty dateline + body for every entry', () => {
    for (const entry of SPARROW_DIARY) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.dateline.length).toBeGreaterThan(0);
      expect(entry.body.length).toBeGreaterThan(0);
    }
  });

  it("opens in Port Royal and ends with Sparrow's final entry", () => {
    const first = SPARROW_DIARY[0];
    const last = SPARROW_DIARY[SPARROW_DIARY.length - 1];
    expect(first?.dateline).toMatch(/Port Royal/i);
    expect(last?.id).toBe('final-entry');
  });

  it('the captains epilogue carries a non-empty title and body', () => {
    expect(SPARROW_EPILOGUE.title.length).toBeGreaterThan(0);
    expect(SPARROW_EPILOGUE.body.length).toBeGreaterThan(0);
  });
});
