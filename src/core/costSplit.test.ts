import { describe, expect, it } from 'vitest';
import type { AttributedMessage, Category } from './attribute';
import { cacheBreak, costRows, sentParts } from './costSplit';
import type { ReplyUsage } from './usage';

const msg = (index: number, content: string, segs: [Category, string, number][]): AttributedMessage => {
  let at = 0;
  return {
    index, role: 'system', content, kind: 'prompt', category: segs[0][0], label: segs[0][1],
    segments: segs.map(([category, label, tokens]) => { const len = Math.round((content.length * tokens) / segs.reduce((n, s) => n + s[2], 0)); const s = { start: at, end: at + len, category, label, tokens }; at += len; return s; }),
    tokens: segs.reduce((n, s) => n + s[2], 0),
  };
};

describe('sentParts', () => {
  it('groups by source, scales to the API count, and puts the cache on the earliest parts', () => {
    const ms = [msg(0, 'p'.repeat(20), [['preset', 'Main', 20]]), msg(1, 'w'.repeat(10), [['wi_global', '书', 10]]), msg(2, 'c'.repeat(70), [['chat_char', '聊天', 70]])];
    expect(sentParts(ms, 200, 50)).toEqual([
      { part: 'preset', tokens: 40, cached: 40 },
      { part: 'wi', tokens: 20, cached: 10 },
      { part: 'chat', tokens: 140, cached: 0 },
    ]);
  });
});

const usage = (o: Partial<ReplyUsage> = {}): ReplyUsage => ({ model: 'm', input: 1000, cached: 200, output: 300, reasoning: 100, cost: null, ...o });

describe('costRows', () => {
  const price = { prompt: 3e-6, completion: 15e-6, cacheRead: 0.3e-6 };
  it('splits the API total by price and marks the parts as estimated', () => {
    const rows = costRows(usage({ cost: 0.006 }), [{ part: 'chat', tokens: 1000, cached: 200 }], price);
    // 原价：发送 800×3 + 200×0.3 = 2460，思考 100×15 = 1500，正文 200×15 = 3000（单位 1e-6）；按比例缩放到 0.006
    const k = 0.006 / (2460e-6 + 1500e-6 + 3000e-6);
    expect(rows.map((r) => [r.kind, r.tokens, r.estimated])).toEqual([['write', 200, true], ['send', 1000, true], ['think', 100, true]]);
    expect(rows[0].money).toBeCloseTo(3000e-6 * k);
    expect(rows.reduce((n, r) => n + (r.money ?? 0), 0)).toBeCloseTo(0.006);
  });
  it('plugins are exact and listed by plugin', () => {
    const side = { 'third-party/img': { count: 1, cost: 0.02, input: 600, output: 30, ms: 12000, model: 'g' } };
    const rows = costRows(usage({ cost: 0.006, side }), null, price);
    expect(rows[0]).toMatchObject({ kind: 'plugin', key: 'third-party/img', money: 0.02, estimated: false, tokens: 630 });
  });
  it('without a price only tokens are shown, biggest first', () => {
    const rows = costRows(usage({ cost: 0.5 }), null, null);
    expect(rows.map((r) => [r.kind, r.money])).toEqual([['send', null], ['write', null], ['think', null]]);
  });
});

describe('cacheBreak', () => {
  const a = msg(0, 'AAAA', [['preset', 'Main', 40]]);
  const b = msg(1, 'BBBB', [['wi_global', '世界书 · 风车镇', 20]]);
  const c = msg(2, 'CCCC', [['chat_char', '聊天', 60]]);
  it('finds where this round starts to differ', () => {
    const b2 = msg(1, 'BBXX', [['wi_global', '世界书 · 风车镇', 20]]);
    expect(cacheBreak([a, b, c], [a, b2, c])).toEqual({ same: 50, at: { label: '世界书 · 风车镇', category: 'wi_global' } });
  });
  it('only new messages at the end: not broken', () => {
    expect(cacheBreak([a, b], [a, b, c])).toEqual({ same: 60, at: null });
  });
});
