import { describe, expect, it } from 'vitest';
import { leavePlan, migrateProfile, migrateWorlds, worldDefault, type ProfileLike } from './setup';

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

describe('worlds v2 (0.6.19)', () => {
  const f = { global: new Set(['文风', '星落山庄设定', '自己的']), others: new Set(['星落山庄设定']), mine: new Set(['自己的', '人偶店']) };

  it('default: global books on, other cards\' books off, own books on', () => {
    expect(worldDefault('文风', f)).toBe(true);
    expect(worldDefault('星落山庄设定', f)).toBe(false);
    expect(worldDefault('自己的', f)).toBe(true);
    expect(worldDefault('不是全局', f)).toBe(false);
  });

  it('follows the migration table', () => {
    const out = migrateWorlds({
      只这张卡: true, // on, not global → attach
      人偶店: true, // on, not global, already this card's → just drop
      星落山庄设定: true, // on, global, other card's → keep
      文风: true, // same as default → drop
      停掉的: false, // off, not global → drop
    }, f);
    expect(out.attach).toEqual(['只这张卡']);
    expect(out.worlds).toEqual({ 星落山庄设定: true });
    expect(migrateWorlds({ 文风: false }, f).worlds).toEqual({ 文风: false });
  });

  it('drops deleted books when the book list is known', () => {
    expect(migrateWorlds({ 文风: false, 没了: true }, f, new Set(['文风'])).attach).toEqual([]);
    expect(migrateWorlds({ 文风: false, 没了: true }, f, new Set(['文风'])).worlds).toEqual({ 文风: false });
  });
});
