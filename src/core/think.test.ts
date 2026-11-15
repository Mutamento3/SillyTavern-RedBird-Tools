import { describe, expect, it } from 'vitest';
import { DEFAULT_THINK_TAGS, parseThinkTags, partialThinkOpen, prefixTag, splitThink } from './think';

const T = DEFAULT_THINK_TAGS;

describe('splitThink', () => {
  it('splits a closed block at the start', () => {
    expect(splitThink('<thinking>\n想一想\n</thinking>\n\n正文', T)).toEqual({ lead: '', think: '\n想一想\n', rest: '\n\n正文', closed: true });
  });
  it('skips leading blank lines and HTML comments', () => {
    const s = splitThink('\n<!--✦开始啦表单填写-->\n<thinking>想</thinking>正文', T);
    expect(s?.lead).toBe('\n<!--✦开始啦表单填写-->\n');
    expect(s?.think).toBe('想');
    expect(s?.rest).toBe('正文');
  });
  it('ignores case and attributes', () => {
    expect(splitThink('<Think>想</THINK>正文', T)?.rest).toBe('正文');
    expect(splitThink('<thinking class="x">想</thinking>正文', T)?.think).toBe('想');
  });
  it('folds to the end while the closing tag has not arrived', () => {
    expect(splitThink('<thinking>还在想', T)).toEqual({ lead: '', think: '还在想', rest: '', closed: false });
  });
  it('leaves story tags and tags in the middle alone', () => {
    expect(splitThink('<content>正文</content>', T)).toBeNull();
    expect(splitThink('<top>标题</top><thinking>想</thinking>', T)).toBeNull();
    expect(splitThink('正文 <thinking>想</thinking>', T)).toBeNull();
    expect(splitThink('<thinkingx>想</thinkingx>', T)).toBeNull();
  });
  it('only closes on the same tag', () => {
    expect(splitThink('<think>想</thinking>还在想', T)?.closed).toBe(false);
  });
});

describe('partialThinkOpen', () => {
  it('hides a half-written opening tag only', () => {
    expect(partialThinkOpen('<thin', T)).toBe(true);
    expect(partialThinkOpen('\n<!--x-->\n<T', T)).toBe(true);
    expect(partialThinkOpen('<', T)).toBe(true);
    expect(partialThinkOpen('<con', T)).toBe(false);
    expect(partialThinkOpen('<thinking>', T)).toBe(false);
    expect(partialThinkOpen('<thin 正文', T)).toBe(false);
  });
});

describe('parseThinkTags', () => {
  it('accepts commas, 顿号, spaces and angle brackets', () => {
    expect(parseThinkTags('thinking, <Think>、</cot> plan  plan')).toEqual(['thinking', 'think', 'cot', 'plan']);
  });
  it('drops junk', () => {
    expect(parseThinkTags(' , 1abc, 思考 ')).toEqual([]);
  });
});

describe('prefixTag', () => {
  it('takes the last tag of the prefix', () => {
    expect(prefixTag('<think>')).toBe('think');
    expect(prefixTag('<!-- Intrusion Rejected --> <think>\n')).toBe('think');
    expect(prefixTag('')).toBeNull();
    expect(prefixTag('思考：')).toBeNull();
  });
});
