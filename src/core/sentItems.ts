/**
 * 「发给 AI 的内容」按发送顺序整理成一条条、一组组，并和上一轮比。
 *
 * - 条目（SentItem）：一个预设条目、一条世界书、一楼聊天、用户人设、一段插件插入……
 *   同一个来源在一条消息里被切成几段时合成一条。key 用来跨轮对比。
 * - 分组（SentGroup）：发送顺序里连在一起的同一类合成一组（「预设 · 24 条」「聊天记录 · 第 0–11 楼」），
 *   在「从这里起和上一轮不同」的位置断开，分隔线不会落在一组中间。
 * - Token：各条按比例换成 total（接口给的准数，没有就用估算），取整后再补差，加起来正好等于 total。
 *
 * 纯函数，方便测试。
 */
import type { AttributedMessage } from './attribute';
import { PART_OF, type Part } from './costSplit';

/** 世界书条目的补充信息（来自这一轮触发的条目）。 */
export interface WIInfo {
  key: string;
  book: string;
  constant: boolean;
  /** 插在哪，比如「角色定义前」「深度 4」 */
  place: string;
  matchedKeys: string[];
}

export type ItemStatus = 'same' | 'new' | 'changed';

export interface SentItem {
  key: string;
  part: Part;
  label: string;
  text: string;
  tokens: number;
  floor?: number;
  wi?: WIInfo;
  /** 和上一轮比；没有上一轮时都是 same */
  status: ItemStatus;
}

export interface SentGroup {
  part: Part;
  items: SentItem[];
  tokens: number;
}

export interface SentView {
  items: SentItem[];
  groups: SentGroup[];
  /** 从第几组起和上一轮不同（null：没有上一轮，或完全一样） */
  cutGroup: number | null;
  /** 和上一轮开头一样的部分（分隔线以上） */
  same: number;
  total: number;
  /** 比上一轮多（负数是少）；没有上一轮时为 null */
  delta: number | null;
}

export interface SentInput {
  messages: AttributedMessage[];
  wi: WIInfo[];
  /** 这一轮输入的总 Token（接口给的准数，没有就用估算） */
  total: number;
}

/** key 里「第几次出现」的分隔符：用名字里不会有的字符（名字里可能有 #） */
const SEQ = '';

function keyOf(part: Part, label: string, refKey: string | undefined, floor: number | undefined): string {
  if (part === 'chat') return `c:${floor ?? label}`;
  if (part === 'persona') return 'persona';
  return `${part}:${refKey ?? label}`;
}

/** 把 values 按比例换成非负整数，加起来正好等于 target（最大余数法：先向下取整，差的按小数部分从大到小各补 1）。 */
export function fitRound(values: number[], target: number): number[] {
  const sum = values.reduce((n, v) => n + v, 0);
  if (!values.length) return [];
  const want = Math.max(0, Math.round(target));
  const exact = values.map((v) => (sum > 0 ? (v / sum) * want : 0));
  const out = exact.map(Math.floor);
  let left = want - out.reduce((n, v) => n + v, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (let j = 0; left > 0 && sum > 0; j = (j + 1) % order.length, left--) out[order[j][1]]++;
  return out;
}

/** 按发送顺序列出每一条（还没有和上一轮比，Token 也还是估算的）。 */
function rawItems(messages: AttributedMessage[], wi: WIInfo[]): (Omit<SentItem, 'status'> & { raw: number })[] {
  const wiByKey = new Map(wi.map((w) => [w.key, w]));
  const out: (Omit<SentItem, 'status'> & { raw: number })[] = [];
  const seen = new Map<string, number>();
  for (const m of messages) {
    const segs = m.segments.filter((s) => s.tokens > 0);
    const pieces = segs.length ? segs : m.tokens > 0 ? [{ start: 0, end: m.content.length, category: m.category, label: m.label, refKey: undefined, tokens: m.tokens }] : [];
    for (const s of pieces) {
      const part = PART_OF[s.category];
      const floor = part === 'chat' ? m.chatIndex : undefined;
      const base = keyOf(part, s.label, s.refKey, floor);
      const text = m.content.slice(s.start, s.end);
      const last = out[out.length - 1];
      // 同一个来源被切成相邻的几段：合成一条
      if (last && last.key.split(SEQ)[0] === base && last.part === part) {
        last.text += text;
        last.raw += s.tokens;
        continue;
      }
      // 同一个来源在别处又出现一次：key 加个序号，免得和上一轮对错
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const w = part === 'wi' && s.refKey ? wiByKey.get(s.refKey) : undefined;
      // 世界书的段名是「书名 · 条目名」：书名放到第三层写，这里只留条目名
      const label = part === 'chat' && floor !== undefined ? `第 ${floor} 楼` : w && s.label.startsWith(`${w.book} · `) ? s.label.slice(w.book.length + 3) : s.label;
      out.push({ key: n ? `${base}${SEQ}${n}` : base, part, label, text, raw: s.tokens, floor, tokens: 0, wi: w });
    }
  }
  return out;
}

function groupItems(items: SentItem[], cut: number | null): SentGroup[] {
  const groups: SentGroup[] = [];
  items.forEach((it, i) => {
    const last = groups[groups.length - 1];
    if (last && last.part === it.part && i !== cut) { last.items.push(it); last.tokens += it.tokens; }
    else groups.push({ part: it.part, items: [it], tokens: it.tokens });
  });
  return groups;
}

export function buildSent(cur: SentInput, prev: SentInput | null): SentView {
  const raw = rawItems(cur.messages, cur.wi);
  const tokens = fitRound(raw.map((r) => r.raw), cur.total);
  const before = prev ? rawItems(prev.messages, prev.wi) : null;
  const prevText = new Map(before?.map((r) => [r.key, r.text]) ?? []);
  const items: SentItem[] = raw.map(({ raw: _r, ...r }, i) => ({
    ...r,
    tokens: tokens[i],
    status: !before ? 'same' : !prevText.has(r.key) ? 'new' : prevText.get(r.key) !== r.text ? 'changed' : 'same',
  }));

  // 第一处和上一轮不一样的地方：按顺序逐条比（缓存只认从开头起一模一样的部分）
  let cut: number | null = null;
  if (before) {
    const i = items.findIndex((it, j) => before[j]?.key !== it.key || before[j]?.text !== it.text);
    cut = i < 0 ? (before.length > items.length ? items.length : null) : i;
    if (cut === items.length) cut = null;
  }
  const groups = groupItems(items, cut);
  let cutGroup: number | null = null;
  if (cut !== null) {
    let n = 0;
    cutGroup = groups.findIndex((g) => { const at = n; n += g.items.length; return at === cut; });
  }
  const same = cut === null ? (before ? cur.total : 0) : items.slice(0, cut).reduce((n, it) => n + it.tokens, 0);

  // 比上一轮多多少：逐条比，内容没变的算 0；新增算这一轮的，移除算上一轮的，修改算两轮之差。
  // 不直接拿两轮的总数相减：每一轮的估算各自缩放过（酒馆分词器、接口总数），没变的预设也会差几个
  let delta: number | null = null;
  if (before) {
    const rawSum = raw.reduce((n, r) => n + r.raw, 0);
    const k = rawSum > 0 ? cur.total / rawSum : 1;
    // 上一轮的条目按这一轮的比例换算，新增那条算进去的正好是它在列表里显示的数
    const prevTok = new Map(before.map((r) => [r.key, Math.round(r.raw * k)]));
    const curKeys = new Set(items.map((it) => it.key));
    delta = items.reduce((n, it) => n + (it.status === 'same' ? 0 : it.tokens - (it.status === 'changed' ? prevTok.get(it.key) ?? 0 : 0)), 0)
      - before.filter((r) => !curKeys.has(r.key)).reduce((n, r) => n + (prevTok.get(r.key) ?? 0), 0);
  }
  return { items, groups, cutGroup, same, total: cur.total, delta };
}
