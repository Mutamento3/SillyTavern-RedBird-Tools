import { describe, expect, it } from 'vitest';
import type { AttributedMessage, Category } from './attribute';
import { buildSent, fitRound, type WIInfo } from './sentItems';

/** 一条消息，里面一段一个来源：[类别, 名字, 文字, refKey?] */
function msg(index: number, segs: [Category, string, string, string?][], chatIndex?: number): AttributedMessage {
  let content = '';
  const segments = segs.map(([category, label, text, refKey]) => {
    const start = content.length;
    content += text;
    return { start, end: content.length, category, label, refKey, tokens: text.length };
  });
  return { index, role: chatIndex === undefined ? 'system' : 'user', content, kind: chatIndex === undefined ? 'prompt' : 'chat', category: segs[0][0], label: segs[0][1], chatIndex, segments, tokens: content.length };
}
const wi = (key: string, constant: boolean): WIInfo => ({ key, book: '书', constant, place: '角色定义前', matchedKeys: [] });

const round1 = [
  msg(0, [['preset', '主提示', 'aaaaaaaaaa', 'main']]),
  msg(1, [['preset', '文风', 'bbbbb', 'style']]),
  msg(2, [['wi_character', '书 · 世界观', 'cccccccccc', 'w1']]),
  msg(3, [['chat_user', '#0 你', 'hi'.repeat(5)]], 0),
  msg(4, [['chat_char', '#1 他', 'yo'.repeat(5)]], 1),
];
const round2 = [
  ...round1,
  msg(5, [['chat_user', '#2 你', 'hm'.repeat(5)]], 2),
  msg(6, [['wi_character', '书 · 宿傩', 'dddd', 'w2']]),
];

describe('fitRound', () => {
  it('never goes negative when there are more items than tokens', () => {
    const r = fitRound(Array(100).fill(1), 51);
    expect(r.every((x) => x >= 0)).toBe(true);
    expect(r.reduce((n, x) => n + x, 0)).toBe(51);
  });
  it('rounded parts add up to the target', () => {
    const r = fitRound([1, 1, 1], 100);
    expect(r.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('buildSent', () => {
  it('groups neighbours of the same kind and keeps the order', () => {
    const v = buildSent({ messages: round1, wi: [wi('w1', true)], total: 45 }, null);
    expect(v.groups.map((g) => [g.part, g.items.length])).toEqual([['preset', 2], ['wi', 1], ['chat', 2]]);
    expect(v.groups.reduce((n, g) => n + g.tokens, 0)).toBe(45);
    expect(v.items[2].label).toBe('世界观');
    expect(v.items[3].label).toBe('第 0 楼');
    expect(v.delta).toBeNull();
    expect(v.cutGroup).toBeNull();
  });

  it('marks what is new since the last round and where the two rounds start to differ', () => {
    const prev = { messages: round1, wi: [wi('w1', true)], total: 45 };
    const v = buildSent({ messages: round2, wi: [wi('w1', true), wi('w2', false)], total: 59 }, prev);
    expect(v.items.find((i) => i.label === '第 2 楼')?.status).toBe('new');
    expect(v.items.find((i) => i.label === '宿傩')?.status).toBe('new');
    expect(v.items.find((i) => i.label === '第 1 楼')?.status).toBe('same');
    // 前 5 条一样：分隔线在第 2 楼前面，单独起一组
    expect(v.same).toBe(45);
    expect(v.groups[v.cutGroup!].items[0].label).toBe('第 2 楼');
    expect(v.delta).toBe(14);
  });

  it('a changed preset entry breaks the cache from there', () => {
    const changed = [round1[0], msg(1, [['preset', '文风', 'BBBBB', 'style']]), ...round1.slice(2)];
    const v = buildSent({ messages: changed, wi: [wi('w1', true)], total: 45 }, { messages: round1, wi: [wi('w1', true)], total: 45 });
    expect(v.items[1].status).toBe('changed');
    expect(v.same).toBe(10);
    // 「文风」从第一组里拆出来，分隔线落在两组之间
    expect(v.groups.map((g) => g.items.length)).toEqual([1, 1, 1, 2]);
    expect(v.cutGroup).toBe(1);
    // 内容改了、长度没变：多出来的是 0
    expect(v.delta).toBe(0);
  });

  it('unchanged parts add nothing even when the two rounds scale differently', () => {
    // 接口这一轮给的总数是估算的 2 倍，上一轮是 1 倍：只算新增的第 2 楼（20）和「宿傩」（8）
    const v = buildSent({ messages: round2, wi: [wi('w1', true), wi('w2', false)], total: 118 }, { messages: round1, wi: [wi('w1', true)], total: 45 });
    expect(v.delta).toBe(28);
  });

  it('entries sent last round but not this round count as less', () => {
    const v = buildSent({ messages: round1, wi: [wi('w1', true)], total: 45 }, { messages: round2, wi: [wi('w1', true), wi('w2', false)], total: 59 });
    expect(v.delta).toBe(-14);
  });
});
