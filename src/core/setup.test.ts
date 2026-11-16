import { describe, expect, it } from 'vitest';
import { leavePlan, migrateProfile, type ProfileLike } from './setup';

type P = ProfileLike & { cardName: string; preset?: unknown; theme?: string };
const mig = (p: P, l: Parameters<typeof migrateProfile>[1] = live) => migrateProfile(p, l);

const live = {
  worldsOn: ['文风', '古风'],
  regex: [
    { id: 'a', name: '去省略号', on: true },
    { id: 'b', name: '中文引号', on: false },
    { id: 'c', name: '', on: true },
    { id: 'd', name: '去省略号', on: false },
  ],
};

describe('migrateProfile', () => {
  it('keeps new-format profiles as they are', () => {
    const p: P = { cardName: 'x', preset: { api: 'openai', name: 'P' } };
    expect(mig(p)).toBe(p);
  });

  it('turns the old world list into on/off overrides with the same result', () => {
    const out = mig({ cardName: 'x', savedAt: 't', globalWorlds: ['古风', '另一本'] }, live);
    expect(out.worlds).toEqual({ 古风: true, 另一本: true, 文风: false });
    expect(out.globalWorlds).toBeUndefined();
    expect(out.savedAt).toBeUndefined();
  });

  it('an empty old list means every open book is off', () => {
    expect(mig({ cardName: 'x', globalWorlds: [] }, live).worlds).toEqual({ 文风: false, 古风: false });
  });

  it('maps regex names to every id with that name, unnamed ones included', () => {
    const out = mig({ cardName: 'x', globalRegexEnabled: ['去省略号', '(未命名正则)'] }, live);
    expect(out.regex).toEqual({ a: true, c: true, d: true });
  });

  it('regex that are on now but not in the old list become off', () => {
    const out = mig({ cardName: 'x', globalRegexEnabled: ['中文引号'] }, live);
    expect(out.regex).toEqual({ a: false, b: true, c: false });
  });

  it('keeps preset, model and theme', () => {
    const out = mig({ cardName: 'x', savedAt: 't', preset: { api: 'o', name: 'P' }, theme: 'T', globalWorlds: [] }, { worldsOn: [], regex: [] });
    expect(out).toEqual({ cardName: 'x', preset: { api: 'o', name: 'P' }, theme: 'T' });
  });
});

describe('leavePlan', () => {
  const eq = (_k: string, a: unknown, b: unknown) => a === b;
  it('restores what is still as we set it', () => {
    const r = leavePlan({ preset: { before: 'G', after: 'C' } }, { preset: 'C' }, new Set(['preset']), eq);
    expect(r).toEqual({ restore: { preset: 'G' }, save: {} });
  });
  it('a 本卡专用 item changed elsewhere is saved to the card, then restored', () => {
    const r = leavePlan({ preset: { before: 'G', after: 'C' } }, { preset: 'D' }, new Set(['preset']), eq);
    expect(r).toEqual({ restore: { preset: 'G' }, save: { preset: 'D' } });
  });
  it('a rule-based change the player changed again counts as global: left alone', () => {
    const r = leavePlan({ 'w:别的卡的书': { before: true, after: false } }, { 'w:别的卡的书': true }, new Set(), eq);
    expect(r).toEqual({ restore: {}, save: {} });
  });
  it('skips items that no longer exist', () => {
    const r = leavePlan({ 'r:gone': { before: true, after: false } }, {}, new Set(['r:gone']), eq);
    expect(r).toEqual({ restore: {}, save: {} });
  });
});
