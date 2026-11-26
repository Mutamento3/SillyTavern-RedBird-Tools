/** Rough token estimate: CJK ≈ 1 token per char, other text ≈ 3.6 chars per token. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let cjk = 0;
  let other = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (
      (c >= 0x3000 && c <= 0x9fff)
      || (c >= 0xac00 && c <= 0xd7af)
      || (c >= 0xff00 && c <= 0xffef)
      || (c >= 0xf900 && c <= 0xfaff)
    ) cjk++;
    else if (c > 32) other++;
  }
  return Math.ceil(cjk + other / 3.6);
}

/** Chat completion content can be a string or an array of parts (multimodal). */
export function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === 'string' ? p : p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text ?? '') : ''))
      .join('\n');
  }
  return content == null ? '' : String(content);
}

/** Lower-case, strip whitespace and markup so loosely processed texts can still be compared. */
export function looseNormalize(text: string): string {
  return text
    .replace(/<[^>]{0,200}>/g, '')
    .replace(/\{\{[^}]{0,200}\}\}/g, '')
    .replace(/[\s　]+/g, '')
    .toLowerCase();
}

/**
 * 搜索框用的比较：不分大小写和全角半角，忽略空格、分隔号。
 * 手机拼音键盘打英文字母时，字还没上屏，框里是「n'b't」「n b t」这样的，也要能搜到「NBT」。
 */
export function searchKey(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\s'‘’·・]+/g, '');
}

/** q 是搜索框里的字；texts 里有一个包含它就算搜到。q 是空的算全部搜到。 */
export function matchSearch(q: string, ...texts: (string | undefined)[]): boolean {
  const k = searchKey(q);
  return !k || texts.some((t) => !!t && searchKey(t).includes(k));
}

export function nonSpaceLength(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) > 32) n++;
  return n;
}

export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
