import { describe, expect, it } from 'vitest';
import {
  backupFileName,
  booksMatch,
  cardBookEntries,
  detectContacts,
  diffBooks,
  findOrphans,
  guessRegexExtension,
  mergeRecords,
  parseArchive,
  splitLinks,
  worldBookEntries,
} from './cards';

describe('detectContacts', () => {
  it('finds discord handles including typos and prefixes seen on real cards', () => {
    expect(detectContacts('作者：陈小耶Yeah\r\nDisocrd：chen_yeah')).toEqual([{ kind: 'discord', value: 'chen_yeah' }]);
    expect(detectContacts('discord旅程@m111')).toEqual([{ kind: 'discord', value: 'm111' }]);
    expect(detectContacts('DC: some.user')).toEqual([{ kind: 'discord', value: 'some.user' }]);
  });
  it('separates qq and qq groups', () => {
    expect(detectContacts('Signal（qq：206949571 群：893821637）')).toEqual([
      { kind: 'qqgroup', value: '893821637' },
      { kind: 'qq', value: '206949571' },
    ]);
    expect(detectContacts('medlar(qq:2476305297)')).toEqual([{ kind: 'qq', value: '2476305297' }]);
  });
  it('picks up urls and ignores plain names', () => {
    expect(detectContacts('见 https://discord.com/channels/1/2）')).toEqual([{ kind: 'url', value: 'https://discord.com/channels/1/2' }]);
    expect(detectContacts('山崖')).toEqual([]);
  });
});

describe('splitLinks', () => {
  it('splits text around urls', () => {
    expect(splitLinks('推荐预设见 https://a.com/x 。谢谢')).toEqual([{ text: '推荐预设见 ' }, { url: 'https://a.com/x' }, { text: ' 。谢谢' }]);
    expect(splitLinks('没有链接')).toEqual([{ text: '没有链接' }]);
  });
});

describe('diffBooks', () => {
  const card = cardBookEntries({ entries: [{ content: 'A', keys: ['a'] }, { content: 'B\r\n', keys: ['b'] }] });
  it('matches identical content regardless of line endings', () => {
    const world = worldBookEntries({ entries: { 0: { content: 'B', key: ['b'] }, 1: { content: 'A', key: ['a'] } } });
    const d = diffBooks(card, world);
    expect(d.same).toBe(2);
    expect(booksMatch(d)).toBe(true);
  });
  it('reports entries that only exist on one side', () => {
    const world = worldBookEntries({ entries: { 0: { content: 'A' }, 1: { content: 'C', comment: '新加的' }, 2: { content: 'C' } } });
    const d = diffBooks(card, world);
    expect(d).toMatchObject({ card: 2, world: 3, same: 1 });
    expect(d.onlyCard.map((e) => e.content)).toEqual(['B']);
    expect(d.onlyWorld.map((e) => e.content)).toEqual(['C', 'C']);
  });
});

describe('guessRegexExtension', () => {
  const exts = ['JS-Slash-Runner', 'VisualNoval', 'st-chatu8', 'ST-Prompt-Template'];
  it('uses the longest extension-name prefix', () => {
    expect(guessRegexExtension('st-chatu8-隐藏imgthink', exts)).toBe('st-chatu8');
  });
  it('matches capital-letter acronyms', () => {
    expect(guessRegexExtension('VN注入折叠(显示)', exts)).toBe('VisualNoval');
  });
  it('returns null when unsure', () => {
    expect(guessRegexExtension('去除思维链', exts)).toBeNull();
    expect(guessRegexExtension('ST美化', exts)).toBeNull();
  });
});

describe('findOrphans', () => {
  it('offers re-link candidates by card name', () => {
    const records = { 'old.png': { cardName: '五条悟' }, 'kept.png': { cardName: '季淮北' } };
    const chars = [{ avatar: '五条悟1.png', name: '五条悟' }, { avatar: 'kept.png', name: '季淮北' }];
    expect(findOrphans(records, chars)).toEqual([{ avatar: 'old.png', cardName: '五条悟', candidates: ['五条悟1.png'] }]);
  });
});

describe('archive', () => {
  it('rejects foreign json', () => {
    expect(() => parseArchive('{"a":1}')).toThrow();
  });
  it('merge keeps the newer record, overwrite replaces', () => {
    const cur = { a: { t: '2026-01-02' }, b: { t: '2026-01-01' } };
    const inc = { a: { t: '2026-01-01' }, c: { t: '2026-01-03' } };
    expect(mergeRecords(cur, inc, 'merge', (v) => v.t)).toEqual({ a: { t: '2026-01-02' }, b: { t: '2026-01-01' }, c: { t: '2026-01-03' } });
    expect(mergeRecords(cur, inc, 'overwrite')).toEqual(inc);
  });
});

describe('backupFileName', () => {
  it('only uses characters ST accepts', () => {
    const n = backupFileName('🦇吸血鬼宇宙世界书1.0', new Date('2026-11-06T01:02:03Z'));
    expect(n).toMatch(/^[A-Za-z0-9_.-]+$/);
    expect(n.startsWith('rbt-world-backup-20261106-010203-')).toBe(true);
  });
});
