/**
 * 读角色卡文件里的内容（纯函数，可单测）：PNG 卡把卡的数据以 base64 JSON 存在 tEXt 块里
 * （v2 叫 "chara"，v3 叫 "ccv3"）；JSON 卡就是同样的数据去掉了图片。
 * 用来在导入前认出「PNG 和 JSON 是同一张卡」「这本世界书是不是卡里自带的那本」。
 */

/** tEXt chunks of a PNG: keyword → text. Empty when it is not a PNG. */
export function pngTextChunks(bytes: Uint8Array): Record<string, string> {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 8 || sig.some((b, i) => bytes[i] !== b)) return {};
  const out: Record<string, string> = {};
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 8;
  while (p + 12 <= bytes.length) {
    const len = view.getUint32(p);
    const type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    const start = p + 8;
    const end = start + len;
    if (end + 4 > bytes.length) break;
    if (type === 'tEXt') {
      let z = start;
      while (z < end && bytes[z] !== 0) z++;
      const key = String.fromCharCode(...bytes.subarray(start, z));
      let text = '';
      for (let i = z + 1; i < end; i++) text += String.fromCharCode(bytes[i]);
      out[key] = text;
    }
    if (type === 'IEND') break;
    p = end + 4;
  }
  return out;
}

function base64Json(b64: string): unknown {
  const bin = atob(b64.trim());
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** The card JSON inside a PNG card, or null. Prefers v3 ("ccv3") over v2 ("chara"). */
export function cardFromPng(bytes: Uint8Array): unknown | null {
  const t = pngTextChunks(bytes);
  for (const key of ['ccv3', 'chara']) {
    if (!t[key]) continue;
    try { return base64Json(t[key]); } catch { /* try the next one */ }
  }
  return null;
}

export interface CardSummary {
  name: string;
  /** Name of the lorebook built into the card ('' if none). */
  bookName: string;
  bookEntries: number;
  /** 卡里自带世界书每条的「指纹」（备注 + 关键词），用来和单独的世界书文件比内容。 */
  bookPrints?: string[];
  regexCount: number;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {});

export function summarizeCard(j: unknown): CardSummary | null {
  const o = obj(j);
  const d = obj(o.data);
  const name = String(d.name ?? o.name ?? '').trim();
  if (!name) return null;
  const book = obj(d.character_book ?? o.character_book);
  const entries = book.entries;
  const bookEntries = Array.isArray(entries) ? entries.length : entries && typeof entries === 'object' ? Object.keys(entries).length : 0;
  const rx = obj(d.extensions ?? o.extensions).regex_scripts;
  return { name, bookName: String(book.name ?? '').trim(), bookEntries, bookPrints: entryPrints(entries), regexCount: Array.isArray(rx) ? rx.length : 0 };
}

/**
 * 每条的指纹：备注 + 关键词，去掉空白和标点后小写。卡里的书（keys / comment）和世界书文件（key / comment）字段名不一样，都认。
 */
export function entryPrints(entries: unknown): string[] {
  const list = Array.isArray(entries) ? entries : entries && typeof entries === 'object' ? Object.values(entries as Obj) : [];
  return list.map((e) => {
    const x = obj(e);
    const keys = x.keys ?? x.key;
    const k = Array.isArray(keys) ? keys.map(String).join('|') : String(keys ?? '');
    return norm(`${String(x.comment ?? x.name ?? '')}#${k}`);
  }).filter((f) => f !== '#');
}

/** Fingerprints of a standalone worldbook file. */
export function worldEntryPrints(j: unknown): string[] {
  return entryPrints(obj(j).entries);
}

/** Entry count of a standalone worldbook file. */
export function worldEntryCount(j: unknown): number {
  const e = obj(j).entries;
  return Array.isArray(e) ? e.length : e && typeof e === 'object' ? Object.keys(e).length : 0;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-—·.，,。()（）[\]【】《》]+/g, '');

/**
 * Is this worldbook file probably the same book the card already carries?
 * - Same name: yes.
 * - Different name: about the same number of entries AND most entries the same (by comment + keys).
 *   Only comparing counts treated a small extra book（卡里 3 条、附加的 2 条）as the card's own.
 *   Without fingerprints on either side, the counts must match exactly.
 */
export function looksLikeCardBook(card: CardSummary, worldName: string, worldEntries: number, worldPrints?: string[]): boolean {
  if (!card.bookEntries) return false;
  if (card.bookName && norm(card.bookName) === norm(worldName)) return true;
  const diff = Math.abs(card.bookEntries - worldEntries);
  if (diff > Math.max(1, Math.round(card.bookEntries * 0.05))) return false;
  const a = card.bookPrints;
  if (!a?.length || !worldPrints?.length) return diff === 0 && card.bookEntries >= 3;
  const mine = new Set(a);
  const same = worldPrints.filter((f) => mine.has(f)).length;
  return same / Math.max(a.length, worldPrints.length) >= 0.6;
}
