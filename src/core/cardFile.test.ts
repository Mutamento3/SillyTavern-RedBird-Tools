import { describe, expect, it } from 'vitest';
import { cardFromPng, looksLikeCardBook, pngTextChunks, summarizeCard, worldEntryCount } from './cardFile';

/** A minimal PNG: signature + one tEXt chunk per entry + IEND (CRCs are not checked). */
function png(chunks: Record<string, string>): Uint8Array {
  const parts: number[] = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type: string, data: number[]) => {
    const len = data.length;
    parts.push((len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255);
    for (const ch of type) parts.push(ch.charCodeAt(0));
    parts.push(...data, 0, 0, 0, 0);
  };
  for (const [k, v] of Object.entries(chunks)) chunk('tEXt', [...k].map((c) => c.charCodeAt(0)).concat([0], [...v].map((c) => c.charCodeAt(0))));
  chunk('IEND', []);
  return new Uint8Array(parts);
}
const b64 = (o: unknown) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))));

describe('PNG cards', () => {
  const v2 = { spec: 'chara_card_v2', data: { name: '回响之城', first_mes: '你好', character_book: { name: '回响之城', entries: [{}, {}, {}] }, extensions: { regex_scripts: [{}, {}] } } };

  it('reads tEXt chunks and the embedded card (with Chinese text)', () => {
    const bytes = png({ chara: b64(v2) });
    expect(Object.keys(pngTextChunks(bytes))).toEqual(['chara']);
    expect(summarizeCard(cardFromPng(bytes))).toEqual({ name: '回响之城', bookName: '回响之城', bookEntries: 3, regexCount: 2 });
  });

  it('prefers ccv3 over chara', () => {
    const bytes = png({ chara: b64({ name: '旧' }), ccv3: b64({ data: { name: '新' } }) });
    expect(summarizeCard(cardFromPng(bytes))?.name).toBe('新');
  });

  it('returns nothing for a non-PNG or a PNG without card data', () => {
    expect(cardFromPng(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(cardFromPng(png({ Comment: 'hi' }))).toBeNull();
  });
});

describe('matching a worldbook file to the card', () => {
  const card = { name: 'A', bookName: '回响之城 设定', bookEntries: 40, regexCount: 0 };
  it('same name, or about the same size, means probably the same book', () => {
    expect(looksLikeCardBook(card, '回响之城_设定', 10)).toBe(true);
    expect(looksLikeCardBook(card, '别的书', 41)).toBe(true);
    expect(looksLikeCardBook(card, '别的书', 12)).toBe(false);
    expect(looksLikeCardBook({ ...card, bookEntries: 0 }, '回响之城 设定', 40)).toBe(false);
  });
  it('counts entries in both object and array form', () => {
    expect(worldEntryCount({ entries: { 0: {}, 1: {} } })).toBe(2);
    expect(worldEntryCount({ entries: [{}] })).toBe(1);
  });
});
