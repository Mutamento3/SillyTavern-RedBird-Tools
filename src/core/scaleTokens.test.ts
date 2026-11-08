import { describe, expect, it } from 'vitest';
import { scaleTokens, type AttributionResult } from './attribute';

const base = (): AttributionResult => ({
  messages: [
    { index: 0, role: 'system', content: 'a', kind: 'prompt', category: 'preset', label: 'a', segments: [{ category: 'preset', tokens: 60 }], tokens: 60 },
    { index: 1, role: 'user', content: 'b', kind: 'chat', category: 'chat', label: 'b', segments: [{ category: 'chat', tokens: 40 }], tokens: 40 },
  ],
  totals: { preset: 60, chat: 40 },
  totalTokens: 100,
  aligned: true,
} as unknown as AttributionResult);

describe('scaleTokens', () => {
  it('uses the host total and keeps the proportions', () => {
    const r = scaleTokens(base(), 140);
    expect(r.totalTokens).toBe(140);
    expect(r.messages.map((m) => m.tokens)).toEqual([84, 56]);
    expect(r.messages[0].segments[0].tokens).toBe(84);
    expect((r.totals as Record<string, number>).chat).toBe(56);
  });
  it('leaves the estimate alone without a host total', () => {
    const b = base();
    expect(scaleTokens(b, 0)).toBe(b);
    expect(scaleTokens(b, NaN)).toBe(b);
  });
});
