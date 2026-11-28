/**
 * 信息流 › 花费：这一轮的钱花在哪。
 *
 * 接口只给总数（发送多少、缓存多少、写了多少、思考多少、一共多少钱）。按来源（聊天记录、预设、世界书…）
 * 拆开要靠这一轮抓到的提示词；按钱拆开要靠模型的价格（OpenRouter 才查得到）。拆出来的钱都是估的，
 * 加起来等于接口给的总数；插件在后台的那几次是接口给的准数。
 */
import type { AttributedMessage, Category } from './attribute';
import type { ReplyUsage, SideUsage } from './usage';
import { readSide } from './usage';

/** 发送内容的来源，合成玩家认得的几类。 */
export type Part = 'chat' | 'preset' | 'character' | 'persona' | 'wi' | 'extension' | 'other';

export const PART_OF: Record<Category, Part> = {
  preset: 'preset', character: 'character', persona: 'persona',
  wi_global: 'wi', wi_character: 'wi', wi_chat: 'wi', wi_persona: 'wi', wi_other: 'wi',
  chat_user: 'chat', chat_char: 'chat', extension: 'extension', unknown: 'other',
};

export interface SentPart { part: Part; tokens: number; cached: number }

/**
 * 发送的内容按来源分。缓存是和上一轮一样的开头，所以按发送顺序从最前面开始算进缓存。
 * input / cached：接口给的准数（没有就用抓到的估计）；各来源按比例缩放，加起来等于 input。
 */
export function sentParts(messages: AttributedMessage[], input: number | null, cached: number | null): SentPart[] {
  const pieces: [Part, number][] = [];
  for (const m of messages) {
    const segs = m.segments.filter((s) => s.tokens > 0);
    if (segs.length) for (const s of segs) pieces.push([PART_OF[s.category], s.tokens]);
    else if (m.tokens > 0) pieces.push([PART_OF[m.category], m.tokens]);
  }
  const est = pieces.reduce((n, [, t]) => n + t, 0);
  const scale = input && est ? input / est : 1;
  let left = cached ?? 0;
  const acc = new Map<Part, SentPart>();
  for (const [part, t] of pieces) {
    const tokens = t * scale;
    const c = Math.min(left, tokens);
    left -= c;
    const a = acc.get(part) ?? { part, tokens: 0, cached: 0 };
    a.tokens += tokens;
    a.cached += c;
    acc.set(part, a);
  }
  const out = [...acc.values()].map((a) => ({ part: a.part, tokens: Math.round(a.tokens), cached: Math.round(a.cached) }));
  // 各项分别取整后加起来会差一两个：差的补到最大的那项上，表里的合计才和接口给的数一样
  if (out.length) {
    const big = out.reduce((a, b) => (b.tokens > a.tokens ? b : a));
    big.tokens += Math.round(est * scale) - out.reduce((n, p) => n + p.tokens, 0);
    big.cached += Math.round((cached ?? 0) - left) - out.reduce((n, p) => n + p.cached, 0);
  }
  return out;
}

/** 每个 token 多少美元。cacheRead：走缓存的价格（没有 = 和发送一样）。 */
export interface Price { prompt: number; completion: number; cacheRead: number | null }

export interface CostRow {
  kind: 'send' | 'think' | 'write' | 'plugin';
  /** send：来源；plugin：插件文件夹（'' = 认不出） */
  key: string;
  tokens: number;
  cached: number;
  /** null = 算不出（不知道价格） */
  money: number | null;
  /** 估的（按价格分摊）；插件那几行是接口给的准数 */
  estimated: boolean;
  plugin?: SideUsage;
}

/**
 * 这一轮的花费明细。sent：按来源分好的发送内容（没有抓到这一轮 = null，发送只算一行）。
 * 有价格时，回复本身的几行按价格分摊到接口给的总花费；没有价格时，这几行只有 tokens。
 */
export function costRows(u: ReplyUsage, sent: SentPart[] | null, price: Price | null): CostRow[] {
  const sendRows: CostRow[] = (sent ?? [{ part: 'other' as Part, tokens: u.input, cached: u.cached ?? 0 }])
    .filter((p) => p.tokens > 0)
    .map((p) => ({ kind: 'send', key: sent ? p.part : '', tokens: p.tokens, cached: p.cached, money: null, estimated: true }));
  const think = Math.max(0, u.reasoning ?? 0);
  const write = Math.max(0, u.output - think);
  const own: CostRow[] = [
    ...sendRows,
    ...(think ? [{ kind: 'think' as const, key: 'think', tokens: think, cached: 0, money: null, estimated: true }] : []),
    ...(write ? [{ kind: 'write' as const, key: 'write', tokens: write, cached: 0, money: null, estimated: true }] : []),
  ];
  if (price) {
    const raw = own.map((r) => (r.kind === 'send'
      ? (r.tokens - r.cached) * price.prompt + r.cached * (price.cacheRead ?? price.prompt)
      : r.tokens * price.completion));
    const sum = raw.reduce((a, b) => a + b, 0);
    const k = u.cost != null && sum > 0 ? u.cost / sum : 1;
    own.forEach((r, i) => { r.money = raw[i] * k; });
  }
  const plugins: CostRow[] = Object.entries(readSide(u.side)).map(([key, s]) => ({
    kind: 'plugin', key, tokens: s.input + s.output, cached: 0, money: s.cost, estimated: false, plugin: s,
  }));
  const rows = [...own, ...plugins];
  const byMoney = rows.some((r) => r.money != null);
  return rows.sort((a, b) => (byMoney ? (b.money ?? -1) - (a.money ?? -1) : b.tokens - a.tokens));
}

/**
 * 这一轮和上一轮从哪里开始不一样（缓存在哪断的）。按发送顺序逐条比，一样的整条算进「一样的开头」；
 * 第一条不一样的，按相同的前几个字估一部分。上一轮的内容全都原样在前面（只是后面多了新的）= 没断。
 */
export interface CacheBreak {
  /** 和上一轮一样的开头有多少 tokens */
  same: number;
  /** 从哪一段开始不一样；null = 没断 */
  at: { label: string; category: Category } | null;
}

export function cacheBreak(prev: AttributedMessage[], cur: AttributedMessage[]): CacheBreak {
  let same = 0;
  for (let i = 0; i < cur.length; i++) {
    const a = prev[i];
    const b = cur[i];
    if (!a) return { same, at: null };
    if (a.role === b.role && a.content === b.content) { same += b.tokens; continue; }
    let n = 0;
    const max = Math.min(a.content.length, b.content.length);
    while (n < max && a.content.charCodeAt(n) === b.content.charCodeAt(n)) n++;
    if (a.role !== b.role) n = 0;
    same += b.content.length ? Math.round((b.tokens * n) / b.content.length) : 0;
    const seg = b.segments.find((s) => s.end > n) ?? b.segments[b.segments.length - 1];
    return { same, at: { label: seg?.label ?? b.label, category: seg?.category ?? b.category } };
  }
  return { same, at: null };
}
