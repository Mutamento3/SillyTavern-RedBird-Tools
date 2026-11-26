/**
 * 信息流 › 用量：每条回复发了多少、缓存多少、写了多少、花了多少钱、用了多久。
 *
 * 用量来自接口回复里的 usage（OpenRouter 等会带；很多反代、公益站不带）。用时是我们自己量的
 * （酒馆的计时只在收到一段字时才更新，见 dev 方案）；没有我们的记录时，从酒馆存的几项算。
 */

/** 每条回复的用量。存在 message.extra.rbt_usage，也写进这个回复版本的 swipe_info[i].extra。 */
export interface ReplyUsage {
  model: string;
  /** 发送：usage.prompt_tokens */
  input: number;
  /** 缓存：usage.prompt_tokens_details.cached_tokens。null = 接口回复里没有这一项 */
  cached: number | null;
  /** 回复写了多少：usage.completion_tokens */
  output: number;
  /** 其中思考：usage.completion_tokens_details.reasoning_tokens */
  reasoning: number | null;
  /** 接口算的实际花费（美元）。OpenRouter 才有 */
  cost: number | null;
  /** 我们量的用时（毫秒）：等第一个字 / 思考 / 写回复。没量到（比如旧记录）= 没有这三项 */
  wait?: number;
  think?: number;
  write?: number;
  /** 玩家点了停止，没写完 */
  stopped?: boolean;
  /** 插件在后台发的请求（总结、配图标签…），算在最近一条回复上。按插件分开记，键是插件文件夹（认不出 = ''） */
  side?: Record<string, SideUsage>;
}

/** 一个插件在后台为这条回复发的请求（几次加起来）。 */
export interface SideUsage {
  count: number;
  cost: number | null;
  input: number;
  output: number;
  /** 这几次请求一共等了多久（毫秒） */
  ms: number;
  model: string;
}

/** 以前只记了插件的总数（{ count, cost }），读的时候当作认不出是哪个插件的那一项。 */
export function readSide(side: unknown): Record<string, SideUsage> {
  if (!side || typeof side !== 'object') return {};
  const o = side as Record<string, unknown>;
  if (typeof o.count === 'number') return { '': { count: o.count, cost: num(o.cost), input: 0, output: 0, ms: 0, model: '' } };
  return o as Record<string, SideUsage>;
}

/** 插件在后台一共花了多少（没有花费记录 = null）。 */
export function sideCost(side: unknown): number | null {
  let total: number | null = null;
  for (const s of Object.values(readSide(side))) if (s.cost != null) total = (total ?? 0) + s.cost;
  return total;
}

export interface FoundUsage {
  id: string | null;
  model: string;
  usage: Record<string, unknown>;
}

/**
 * 从接口回复（流式的 data: 行，或一整段 JSON）里找出最后一个带 usage 的块。
 * 直连 Claude 时酒馆原样转发 Anthropic 的流：用量在 message_start（发送、缓存）和 message_delta（写了多少）里，
 * 换成和 OpenAI 一样的字段（发送 = 没缓存的 + 读缓存的 + 写进缓存的）。
 */
export function parseUsage(text: string): FoundUsage | null {
  let found: FoundUsage | null = null;
  const take = (j: unknown): void => {
    const o = j as { id?: unknown; model?: unknown; type?: unknown; usage?: Record<string, unknown>; message?: { id?: unknown; model?: unknown; usage?: Record<string, unknown> } } | null;
    const a = o?.type === 'message_start' ? o.message?.usage : null;
    if (a && typeof a === 'object') {
      const n = (k: string) => num(a[k]) ?? 0;
      found = {
        id: typeof o!.message!.id === 'string' ? o!.message!.id : null,
        model: typeof o!.message!.model === 'string' ? o!.message!.model : '',
        usage: { prompt_tokens: n('input_tokens') + n('cache_read_input_tokens') + n('cache_creation_input_tokens'), completion_tokens: n('output_tokens'), prompt_tokens_details: { cached_tokens: n('cache_read_input_tokens') } },
      };
      return;
    }
    if (o?.type === 'message_delta') {
      const out = num(o.usage?.output_tokens);
      if (found && out != null) (found as FoundUsage).usage.completion_tokens = out;
      return;
    }
    const u = o?.usage;
    if (u && typeof u === 'object' && (u.prompt_tokens != null || u.cost != null)) {
      found = { id: typeof o!.id === 'string' ? o!.id : null, model: typeof o!.model === 'string' ? o!.model : '', usage: u };
    }
  };
  const t = text.trim();
  if (t.startsWith('{')) {
    try { take(JSON.parse(t)); } catch { /* 不是一整段 JSON */ }
    if (found) return found;
  }
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]' || !data.includes('"usage"')) continue;
    try { take(JSON.parse(data)); } catch { /* 半行 */ }
  }
  return found;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function usageFrom(found: FoundUsage): ReplyUsage {
  const u = found.usage as Record<string, Record<string, unknown> | unknown>;
  const pd = (u.prompt_tokens_details ?? null) as Record<string, unknown> | null;
  const cd = (u.completion_tokens_details ?? null) as Record<string, unknown> | null;
  return {
    model: found.model,
    input: num(u.prompt_tokens) ?? 0,
    cached: pd ? num(pd.cached_tokens) : null,
    output: num(u.completion_tokens) ?? 0,
    reasoning: cd ? num(cd.reasoning_tokens) : null,
    cost: num(u.cost),
  };
}

/**
 * 读一条回复（或一个回复版本）的用量。「红鸟 · 花费」插件以前记的 cost_meter / cost_meter_side 也认：
 * 它把缺的缓存记成 0，所以旧记录的缓存当作有。
 */
export function readUsage(extra: Record<string, unknown> | undefined | null): ReplyUsage | null {
  if (!extra) return null;
  const own = extra.rbt_usage as ReplyUsage | undefined;
  if (own && typeof own === 'object') return own;
  const old = extra.cost_meter as Record<string, unknown> | undefined;
  const oldSide = extra.cost_meter_side as Record<string, unknown> | undefined;
  if (!old && !oldSide) return null;
  return {
    model: String(old?.model ?? ''),
    input: num(old?.input) ?? 0,
    cached: old ? num(old.cached) ?? 0 : null,
    output: num(old?.output) ?? 0,
    reasoning: old ? num(old.reasoning) : null,
    cost: old ? num(old.cost) : null,
    ...(oldSide ? { side: readSide({ count: num(oldSide.count) ?? 0, cost: num(oldSide.cost) }) } : {}),
  };
}

/** 一条回复的用时（毫秒）。ok = false：记录明显不对（0 或负数，或者每秒写了 500 多 tokens），不算进平均。 */
export interface Timing { total: number; wait: number; think: number; write: number; ok: boolean }

/** tokens：回复写了多少（有就传，用来判断记录对不对）。 */
export function readTiming(message: { gen_started?: unknown; gen_finished?: unknown; extra?: Record<string, unknown> }, tokens?: number | null): Timing | null {
  const u = readUsage(message.extra);
  const start = Date.parse(String(message.gen_started ?? ''));
  const end = Date.parse(String(message.gen_finished ?? ''));
  let t: Omit<Timing, 'ok'>;
  if (u && u.wait != null) {
    t = { wait: u.wait, think: u.think ?? 0, write: u.write ?? 0, total: u.wait + (u.think ?? 0) + (u.write ?? 0) };
  } else {
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    const total = end - start;
    const first = num(message.extra?.time_to_first_token);
    const thinkEnd = num(message.extra?.reasoning_duration);
    const wait = Math.min(total, Math.max(0, first ?? total));
    const think = thinkEnd != null ? Math.max(0, Math.min(total, thinkEnd) - wait) : 0;
    t = { total, wait, think, write: Math.max(0, total - Math.max(wait, thinkEnd ?? 0)) };
  }
  const n = tokens ?? null;
  const ok = t.total > 0 && !(n != null && n > 0 && n / (t.total / 1000) > 500);
  return { ...t, ok };
}

/** 一楼 AI 回复的统计（整段聊天的图用）。 */
export interface FloorStat {
  floor: number;
  /** 这一楼所有回复版本 + 插件在后台花的。没有金额记录 = null */
  cost: number | null;
  /** 其中插件在后台花的 */
  side: number;
  /** 有金额记录的回复版本数 */
  priced: number;
  /** 有用量记录的回复版本数 */
  used: number;
  /** 所有回复版本 + 插件一共用的 tokens */
  tokens: number;
  /** 下面几项是现在显示的这一版 */
  model: string;
  input: number;
  cached: number | null;
  timing: Timing | null;
  sendDate: string;
}

type ChatMessage = { is_user?: boolean; is_system?: boolean; mes?: unknown; send_date?: unknown; gen_started?: unknown; gen_finished?: unknown; extra?: Record<string, unknown>; swipe_info?: { extra?: Record<string, unknown> }[] };

/** 整段聊天每一楼 AI 回复的统计。只列有记录的楼（装工具箱以前的楼、接口没给用量的楼没有）。 */
export function floorStats(chat: ChatMessage[]): FloorStat[] {
  const out: FloorStat[] = [];
  chat.forEach((m, floor) => {
    if (m.is_user || m.is_system) return;
    const versions = m.swipe_info?.length ? m.swipe_info.map((s) => s?.extra) : [m.extra];
    let cost: number | null = null, side = 0, priced = 0, used = 0, tokens = 0;
    for (const e of versions) {
      const u = readUsage(e);
      if (!u) continue;
      if (u.input || u.output) used++;
      if (u.cost != null) { cost = (cost ?? 0) + u.cost; priced++; }
      const sc = sideCost(u.side);
      if (sc) { cost = (cost ?? 0) + sc; side += sc; }
      tokens += u.input + u.output + Object.values(readSide(u.side)).reduce((n, s) => n + s.input + s.output, 0);
    }
    const shown = readUsage(m.extra);
    if (!used && cost == null && !shown) return;
    out.push({
      floor, cost, side, priced, used, tokens,
      model: shown?.model ?? '', input: shown?.input ?? 0, cached: shown?.cached ?? null,
      timing: readTiming(m, shown?.output || null),
      sendDate: String(m.send_date ?? ''),
    });
  });
  return out;
}

/** 「54 秒」「2 分 7 秒」 */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} 秒` : `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
}

/** $0.1 以上两位小数，$0.01 以上三位，更小四位。 */
export function fmtMoney(x: number): string {
  if (x >= 0.1) return `$${x.toFixed(2)}`;
  if (x >= 0.01) return `$${x.toFixed(3)}`;
  return `$${x.toFixed(4)}`;
}

/** 生成过程中的三段，由收到的字决定。 */
export type GenPhase = 'wait' | 'think' | 'write';

export interface GenClock {
  start: number;
  /** 第一次收到思考内容 / 正文的时间 */
  thinkAt: number | null;
  writeAt: number | null;
  /** 最近一次收到新内容的时间（用来看是不是卡住了） */
  lastAt: number;
}

export function phaseOf(c: GenClock): GenPhase {
  return c.writeAt != null ? 'write' : c.thinkAt != null ? 'think' : 'wait';
}

/** 写完时三段各多久。 */
export function splitClock(c: GenClock, end: number): { wait: number; think: number; write: number } {
  const firstAt = c.thinkAt ?? c.writeAt ?? end;
  return {
    wait: Math.max(0, firstAt - c.start),
    think: c.thinkAt != null ? Math.max(0, (c.writeAt ?? end) - c.thinkAt) : 0,
    write: c.writeAt != null ? Math.max(0, end - c.writeAt) : 0,
  };
}
