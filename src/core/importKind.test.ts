import { describe, expect, it } from 'vitest';
import { detectJson } from './importKind';

describe('detectJson', () => {
  it('recognises a Chat Completion preset', () => {
    expect(detectJson({ temperature: 1, prompts: [], prompt_order: [] })).toBe('preset');
  });
  it('recognises a worldbook', () => {
    expect(detectJson({ entries: { 0: { key: ['a'], content: 'x' } } })).toBe('world');
  });
  it('recognises one regex script and a list of them', () => {
    expect(detectJson({ scriptName: 'a', findRegex: '/x/', replaceString: '' })).toBe('regex');
    expect(detectJson([{ scriptName: 'a', findRegex: '/x/' }])).toBe('regex');
  });
  it('recognises character cards (v1 and v2/v3)', () => {
    expect(detectJson({ name: 'A', first_mes: 'hi' })).toBe('character');
    expect(detectJson({ spec: 'chara_card_v3', data: { first_mes: 'hi', character_book: { entries: [] } } })).toBe('character');
  });
  it('does not take a card with an embedded book for a worldbook', () => {
    expect(detectJson({ spec: 'chara_card_v2', data: { first_mes: '' }, entries: {} })).toBe('character');
  });
  it('recognises a UI theme (美化)', () => {
    expect(detectJson({ name: 'X', main_text_color: 'rgb(1,1,1)', custom_css: '' })).toBe('theme');
    expect(detectJson({ name: 'X', custom_css: 'body{}' })).toBe('theme');
  });
  it('returns unknown otherwise', () => {
    expect(detectJson({ foo: 1 })).toBe('unknown');
    expect(detectJson(null)).toBe('unknown');
  });
});
