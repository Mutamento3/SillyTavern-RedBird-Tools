import { describe, expect, it } from 'vitest';
import { floorStats, fmtDuration, fmtMoney, parseUsage, phaseOf, readSide, readTiming, readUsage, sideCost, splitClock, usageFrom } from './usage';

describe('parseUsage', () => {
  it('reads the last usage block from a stream', () => {
    const text = [
      'data: {"id":"gen-1","choices":[{"delta":{"content":"hi"}}]}',
      '',
      'data: {"id":"gen-1","model":"anthropic/claude","choices":[],"usage":{"prompt_tokens":190000,"completion_tokens":4200,"cost":0.34,"prompt_tokens_details":{"cached_tokens":31000}}}',
      'data: [DONE]',
    ].join('\n');
    const u = usageFrom(parseUsage(text)!);
    expect(u).toEqual({ model: 'anthropic/claude', input: 190000, cached: 31000, output: 4200, reasoning: null, cost: 0.34 });
  });
  it('reads a whole JSON reply', () => {
    expect(parseUsage('{"id":"x","model":"m","usage":{"prompt_tokens":10,"completion_tokens":2}}')?.id).toBe('x');
  });
  it('reads a direct Claude (Anthropic) stream', () => {
    const text = [
      'event: message_start',
      'data: {"type":"message_start","message":{"id":"msg_1","model":"claude-opus-4-6","usage":{"input_tokens":200,"cache_read_input_tokens":30000,"cache_creation_input_tokens":800,"output_tokens":1}}}',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}',
      'event: message_delta',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":950}}',
    ].join('\n');
    expect(usageFrom(parseUsage(text)!)).toEqual({ model: 'claude-opus-4-6', input: 31000, cached: 30000, output: 950, reasoning: null, cost: null });
  });
  it('no usage: null', () => {
    expect(parseUsage('data: {"choices":[]}\ndata: [DONE]')).toBeNull();
  });
  it('cache field missing vs zero', () => {
    expect(usageFrom(parseUsage('{"usage":{"prompt_tokens":5}}')!).cached).toBeNull();
    expect(usageFrom(parseUsage('{"usage":{"prompt_tokens":5,"prompt_tokens_details":{"cached_tokens":0}}}')!).cached).toBe(0);
  });
});

describe('readUsage', () => {
  it('prefers our own record', () => {
    const own = { model: 'a', input: 1, cached: null, output: 1, reasoning: null, cost: null };
    expect(readUsage({ rbt_usage: own, cost_meter: { input: 9 } })).toBe(own);
  });
  it('reads the old 红鸟 · 花费 record', () => {
    expect(readUsage({ cost_meter: { model: 'm', cost: 0.2, input: 100, cached: 0, output: 5, reasoning: 0 }, cost_meter_side: { cost: 0.01, count: 2 } }))
      .toEqual({ model: 'm', input: 100, cached: 0, output: 5, reasoning: 0, cost: 0.2, side: { '': { count: 2, cost: 0.01, input: 0, output: 0, ms: 0, model: '' } } });
  });
  it('nothing recorded', () => {
    expect(readUsage({})).toBeNull();
    expect(readUsage(undefined)).toBeNull();
  });
});

describe('side', () => {
  it('old total-only record becomes one unnamed row', () => {
    expect(readSide({ count: 1, cost: 0.03 })).toEqual({ '': { count: 1, cost: 0.03, input: 0, output: 0, ms: 0, model: '' } });
  });
  it('sums plugin costs', () => {
    const a = { count: 1, cost: 0.02, input: 1, output: 1, ms: 1, model: '' };
    expect(sideCost({ x: a, y: { ...a, cost: 0.01 } })).toBeCloseTo(0.03);
    expect(sideCost({ x: { ...a, cost: null } })).toBeNull();
    expect(sideCost(undefined)).toBeNull();
  });
});

describe('floorStats', () => {
  const rec = (o: object) => ({ rbt_usage: { model: 'm', input: 1000, cached: 200, output: 50, reasoning: null, cost: 0.1, wait: 1000, think: 0, write: 4000, ...o } });
  it('one bar per AI floor: all versions and plugins add up, the shown version gives input and time', () => {
    const chat = [
      { is_user: true, mes: 'hi' },
      { mes: 'a', extra: rec({ cost: 0.2 }), swipe_info: [{ extra: rec({}) }, { extra: rec({ cost: 0.2, side: { x: { count: 1, cost: 0.05, input: 10, output: 5, ms: 1, model: '' } } }) }] },
      { mes: 'old reply, no record', extra: {} },
    ];
    const [f] = floorStats(chat);
    expect(floorStats(chat)).toHaveLength(1);
    expect(f.floor).toBe(1);
    expect(f.cost).toBeCloseTo(0.35);
    expect(f.side).toBeCloseTo(0.05);
    expect(f).toMatchObject({ priced: 2, used: 2, tokens: 2 * 1050 + 15, input: 1000, cached: 200 });
    expect(f.timing?.total).toBe(5000);
  });
});

describe('readTiming', () => {
  it('uses our own split', () => {
    const m = { extra: { rbt_usage: { model: '', input: 0, cached: null, output: 0, reasoning: null, cost: null, wait: 70000, think: 40000, write: 47000 } } };
    expect(readTiming(m)).toEqual({ wait: 70000, think: 40000, write: 47000, total: 157000, ok: true });
  });
  it('falls back to what ST saved', () => {
    const m = { gen_started: '2026-11-25T10:00:00.000Z', gen_finished: '2026-11-25T10:02:37.000Z', extra: { time_to_first_token: 70000, reasoning_duration: 110000 } };
    expect(readTiming(m)).toEqual({ total: 157000, wait: 70000, think: 40000, write: 47000, ok: true });
  });
  it('flags impossible records', () => {
    const fast = { gen_started: '2026-11-25T10:00:00.000Z', gen_finished: '2026-11-25T10:00:00.500Z', extra: {} };
    expect(readTiming(fast, 9426)?.ok).toBe(false);
    const neg = { gen_started: '2026-11-25T10:00:10.000Z', gen_finished: '2026-11-25T10:00:00.000Z', extra: {} };
    expect(readTiming(neg)?.ok).toBe(false);
  });
  it('no times: null', () => {
    expect(readTiming({ extra: {} })).toBeNull();
  });
});

describe('clock', () => {
  it('phases follow what arrived', () => {
    expect(phaseOf({ start: 0, thinkAt: null, writeAt: null, lastAt: 0 })).toBe('wait');
    expect(phaseOf({ start: 0, thinkAt: 5, writeAt: null, lastAt: 5 })).toBe('think');
    expect(phaseOf({ start: 0, thinkAt: 5, writeAt: 9, lastAt: 9 })).toBe('write');
  });
  it('splits into wait / think / write', () => {
    expect(splitClock({ start: 0, thinkAt: 70, writeAt: 110, lastAt: 150 }, 157)).toEqual({ wait: 70, think: 40, write: 47 });
    expect(splitClock({ start: 0, thinkAt: null, writeAt: 30, lastAt: 90 }, 100)).toEqual({ wait: 30, think: 0, write: 70 });
    expect(splitClock({ start: 0, thinkAt: null, writeAt: null, lastAt: 0 }, 100)).toEqual({ wait: 100, think: 0, write: 0 });
  });
});

describe('format', () => {
  it('durations', () => {
    expect(fmtDuration(54_000)).toBe('54 秒');
    expect(fmtDuration(127_000)).toBe('2 分 7 秒');
  });
  it('money', () => {
    expect(fmtMoney(0.343)).toBe('$0.34');
    expect(fmtMoney(0.025)).toBe('$0.025');
    expect(fmtMoney(0.0042)).toBe('$0.0042');
  });
});
