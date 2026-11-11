import { describe, expect, it } from 'vitest';
import { detectJson, scriptWaitsForTheme } from './importKind';

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
  it('recognises a 酒馆助手 script, a folder of them and the old format', () => {
    expect(detectJson({ type: 'script', name: 'A', content: 'x', enabled: true })).toBe('script');
    expect(detectJson({ type: 'folder', name: 'F', scripts: [] })).toBe('script');
    expect(detectJson({ name: 'A', content: 'x', buttons: [] })).toBe('script');
  });
  it('returns unknown otherwise', () => {
    expect(detectJson({ foo: 1 })).toBe('unknown');
    expect(detectJson(null)).toBe('unknown');
  });
});

describe('scriptWaitsForTheme', () => {
  const script = "const on = getComputedStyle(document.body).getPropertyValue('--cld-ui').trim() === '1';";
  it('pairs a script with the 美化 that sets the variable it waits for', () => {
    expect(scriptWaitsForTheme(script, 'body { --cld-ui:1; --cld-accent:#c56543; }')).toBe(true);
  });
  it('does not pair with a 美化 that does not set it', () => {
    expect(scriptWaitsForTheme(script, 'body { --other:1; }')).toBe(false);
    expect(scriptWaitsForTheme('console.log(1)', 'body { --cld-ui:1; }')).toBe(false);
  });
  it("ignores SillyTavern's own --SmartTheme variables", () => {
    expect(scriptWaitsForTheme("x.getPropertyValue('--SmartThemeBodyColor')", ':root{--SmartThemeBodyColor:red}')).toBe(false);
  });
});
