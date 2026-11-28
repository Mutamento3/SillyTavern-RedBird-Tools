/**
 * 信息流「这一轮」：结论横幅、花费、上下文、用时（dev/信息流-用量和花费-方案.md，第二步）。
 * 每块一个名词标题、一个大数字、一行比较；只在不正常时写结论。
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { CATEGORY_META, type Category } from '../core/attribute';
import { cacheBreak, costRows, PART_OF, sentParts, type CacheBreak, type CostRow, type Part } from '../core/costSplit';
import { floorsText, unsentFloors } from '../core/budget';
import { fmtDuration, fmtMoney, readTiming, readUsage, sideCost, type ReplyUsage } from '../core/usage';
import type { Capture } from '../tools/flow/capture';
import { chatCost, openRouterBalance, pluginName, priceFor, usageTick } from '../tools/flow/usage';
import { ctx } from '../st/st';
import { openDrawer, openPresetField } from '../shell/drawers';
import { fmtTokens, NavRow } from './common';
import { USAGE_COPY as U } from './copy';
import { ContextChart, CostChart, TimeChart, useFloors } from './FlowChat';

// ------------------------------------------------------------- 公共 ---

const PART_NAME: Record<Part, string> = {
  chat: '聊天记录', preset: '预设', character: '角色卡', persona: '人设', wi: '世界书', extension: '插件注入', other: '其他',
};
const PART_COLOR: Record<Part, string> = {
  chat: CATEGORY_META.chat_char.color, preset: CATEGORY_META.preset.color, character: CATEGORY_META.character.color,
  persona: CATEGORY_META.persona.color, wi: CATEGORY_META.wi_character.color, extension: CATEGORY_META.extension.color,
  other: CATEGORY_META.unknown.color,
};
const C_THINK = 'color-mix(in srgb, var(--rbd-accent, #0a84ff) 55%, var(--t1))';
const C_WRITE = 'var(--rbd-accent, #0a84ff)';
const C_WAIT = 'color-mix(in srgb, var(--rbd-accent, #0a84ff) 25%, var(--t1))';
const C_INPUT = 'color-mix(in srgb, var(--t1) 60%, transparent)';

/** 上限条上面一行：左边是设置名和上限，右边是已用多少。 */
function BarCap({ left, right }: { left: string; right?: string }) {
  return <div class="rbt-bar-cap"><span>{left}</span>{right && <b>{right}</b>}</div>;
}

function Sec({ title, right, children }: { title: string; right?: preact.ComponentChildren; children: preact.ComponentChildren }) {
  return (
    <section class="rbt-sec">
      <div class="rbt-sec-h"><b>{title}</b>{right}</div>
      {children}
    </section>
  );
}

/** text：大字是一句话（比如「AI 可见第 31–212 楼」），字号小一档；label：大字上面一行，说这个数算的是什么 */
function Big({ value, unit, sub, text, label }: { value: string; unit?: string; sub?: string; text?: boolean; label?: string }) {
  return (
    <div class={`rbt-big ${text ? 'text' : ''}`}>
      {label && <small class="rbt-big-k">{label}</small>}
      <b>{value}{unit && <small>{unit}</small>}</b>
      {sub && <span>{sub}</span>}
    </div>
  );
}

/** 这一轮之前、同一个聊天里最近的一轮（比缓存用）。 */
export function previousCapture(list: Capture[], cap: Capture): Capture | null {
  const i = list.indexOf(cap);
  return list.slice(i + 1).find((c) => c.chatId === cap.chatId && c.genType !== 'preview' && c.genType !== 'quiet') ?? null;
}

/** 这段聊天里每条 AI 回复的平均花费和平均用时（用时记录不对的不算）。只在打开信息流时算一次。 */
function useChatAverages(): { cost: number | null; time: number | null } {
  const n = ctx().chat?.length ?? 0;
  void usageTick.value;
  return useMemo(() => {
    let cost = 0, costN = 0, time = 0, timeN = 0;
    for (const m of ctx().chat ?? []) {
      if (m.is_user || m.is_system) continue;
      const u = readUsage(m.extra);
      if (u?.cost != null) { cost += u.cost + (sideCost(u.side) ?? 0); costN++; }
      const t = readTiming(m, u?.output || Number(m.extra?.token_count) || null);
      if (t?.ok) { time += t.total; timeN++; }
    }
    return { cost: costN >= 3 ? cost / costN : null, time: timeN >= 3 ? time / timeN : null };
  }, [n, usageTick.value]);
}

const vsAvg = (v: number, avg: number | null, fmt: (x: number) => string, more: string, less: string, close: number): string | undefined => {
  if (avg == null) return undefined;
  const d = v - avg;
  if (Math.abs(d) < close) return '和平均差不多';
  return `${d > 0 ? more : less} ${fmt(Math.abs(d))}`;
};

/** 楼层：AI 看得到哪几楼、哪些放不下、哪些隐藏了。 */
function floorsOf(cap: Capture): { sent: number[]; unsent: { hidden: number[]; other: number[] } } {
  const sent = cap.result.messages.map((m) => m.chatIndex).filter((n): n is number => typeof n === 'number');
  const b = cap.budget;
  const unsent = b && !(cap.genType === 'quiet' && !sent.length) ? unsentFloors(sent, b.hidden, cap.targetFloor ?? b.chatLength) : { hidden: [], other: [] };
  return { sent, unsent };
}

// ------------------------------------------------------------ 结论横幅 ---

/** 这一轮发了多少（按抓到的内容估）。 */
const estInput = (c: Capture): number => c.result.messages.reduce((n, m) => n + m.tokens, 0);
/** 一轮写完的时间：开始拼提示词的时间 + 等待、思考、写回复。 */
const endOf = (c: Capture): number | null => {
  const u = c.usage;
  return u?.wait != null ? c.time.getTime() + u.wait + (u.think ?? 0) + (u.write ?? 0) : null;
};
const firstFloor = (c: Capture): number | null => {
  const s = floorsOf(c).sent;
  return s.length ? Math.min(...s) : null;
};
/** 酒馆自己能打开「一样的开头便宜算」的情况：直连 Claude，或 OpenRouter 上的 Claude。反代、中转站要看它们自己支不支持。 */
const stCanCache = (model: string): boolean => {
  const src = ctx().chatCompletionSettings?.chat_completion_source;
  return src === 'claude' || (src === 'openrouter' && /claude/i.test(model));
};

/** 一条缓存提醒：标题的前半句（没有 = 只说钱 / 百分比）、多花了多少、可能的原因、可以怎么做。 */
interface CacheNote {
  lead: string | null;
  extra: number | null;
  reason: string;
  action: string;
  button?: [string, () => void];
  howTo?: string[];
}

/** 开头从哪一块开始和上一轮不同：用玩家认得的名字说出来。 */
function changedText(at: { label: string; category: Category }): { reason: string; action: string; button?: [string, () => void] } {
  const tail = '从它开始后面都没用上缓存。';
  const c = at.category;
  if (c.startsWith('wi_')) {
    return { reason: `世界书「${at.label.replace(/^世界书\s*·\s*/, '')}」本轮触发的条目和上一轮不同，${tail}`, action: '把这些条目的「位置」改成「按深度 @D」能省钱，但剧情可能会变。', button: ['打开世界书 ↗', () => openDrawer('worldinfo')] };
  }
  if (c === 'preset') return { reason: `预设条目「${at.label}」本轮的内容和上一轮不同，${tail}`, action: '把它拖到聊天记录后面能省钱。', button: ['打开预设 ↗', () => openDrawer('preset')] };
  if (c === 'character' || c === 'persona') return { reason: `${c === 'character' ? '角色卡' : '人设'}的内容本轮和上一轮不同，${tail}`, action: '可能是用了随机、时间这类宏。' };
  if (c === 'extension') return { reason: `插件「${at.label}」本轮插进来的内容和上一轮不同，${tail}`, action: '' };
  const floor = /^#(\d+)/.exec(at.label)?.[1];
  if (floor) return { reason: `第 ${floor} 楼和上一轮不同，可能是改过或删过，${tail}`, action: '' };
  return { reason: `「${at.label}」本轮和上一轮不同，${tail}`, action: '' };
}

/**
 * 结论横幅：只在不正常时出现，一次一条。缓存的几条不看模型名字、不猜玩家用的什么接口，只看实际发生了什么：
 * 和同一个模型的上一轮比（换了模型的那一轮不提醒，本来就不能沿用上一轮的缓存）。
 * 查得到价格写多花了多少钱，查不到写多少没用上缓存（接口给了发送和缓存就能算）。
 */
export interface BannerData { kind: string; title: string; body: string[]; button: [string, () => void] | null; howTo: string[] | null; cache: boolean }

/** 点了 ✕ 的提醒：记在这段聊天的存档里，这段聊天里不再提醒这一种。 */
const dismissTick = signal(0);
const dismissed = (): string[] => { void dismissTick.value; return (ctx().chatMetadata?.rbt_dismissed as string[] | undefined) ?? []; };
function dismiss(kind: string): void {
  const meta = ctx().chatMetadata;
  if (!meta) return;
  meta.rbt_dismissed = [...new Set([...dismissed(), kind])];
  ctx().saveMetadataDebounced?.();
  dismissTick.value++;
}

export function bannerFor(cap: Capture, brk: CacheBreak | null, prev: Capture | null): BannerData | null {
  const u = cap.usage;
  const p = prev?.usage;
  const b = cap.budget;
  const { unsent } = floorsOf(cap);
  const sameModel = !!u && !!p && !!u.model && u.model === p.model;
  const price = u ? priceFor(u.model) : null;
  // 接口给的 tokens 和抓到的估计不一样：按比例换算成接口的数
  const scale = u && estInput(cap) ? u.input / estInput(cap) : 1;
  const same = brk ? brk.same * scale : 0;
  // 开头一样：和上一轮一样的部分占一半以上。排在聊天记录后面的预设条目每轮都会被新消息往后推，所以末尾总会对不上，不算变了
  const stable = !!u && !!brk && same >= u.input * 0.5;
  const gap = prev && endOf(prev) != null ? cap.time.getTime() - endOf(prev)! : null;
  const f0 = firstFloor(cap), f1 = prev ? firstFloor(prev) : null;
  const full = (n: number) => (price && price.cacheRead != null ? n * (price.prompt - price.cacheRead) : null);
  // 上一轮用上过缓存，才说明这个接口能用；这时才说得上「本来能省」
  const couldCache = (p?.cached ?? 0) > 0;
  const missed = !!u && u.cached != null && u.input > 0 && u.cached < u.input * 0.5;

  let title = '', body: string[] = [], button: [string, () => void] | null = null;
  let note: CacheNote | null = null;
  let kind = '';
  const off = dismissed();
  const on = (k: string) => !off.includes(k);
  if (on('cut') && u && b?.reply && u.output >= b.reply * 0.98) {
    kind = 'cut';
    title = '回复写到上限，可能被截断了';
    body = [`最大回复长度是 ${fmtTokens(b.reply)} Token。在预设里调高「最大回复长度」，再重新生成。`];
    button = ['打开预设 ↗', () => openPresetField('reply')];
  } else if (on('longchat') && sameModel && couldCache && missed && unsent.other.length && f0 != null && f1 != null && f0 > f1) {
    kind = 'longchat';
    note = {
      lead: '最早的楼被挤掉',
      extra: full(Math.max(0, Math.min(p!.input, u!.input) - (u!.cached ?? 0))),
      reason: '聊天超过了上下文长度，每发一条，最早的一楼就发不进去了，发给 AI 的开头跟着变。',
      action: '先总结一批旧楼，再一起隐藏，后面几轮就能用上缓存。',
    };
  } else if (on('nocache') && sameModel && stable && u!.cached === 0 && p!.cached === 0 && (gap == null || gap <= 5 * 60_000)) {
    kind = 'nocache';
    // 开头一样、和上一轮挨得近，两轮都没用上缓存
    const st = stCanCache(u!.model);
    note = {
      lead: null,
      extra: full(same),
      reason: '可能是你用的接口不支持缓存，或者没打开。',
      action: st ? '酒馆默认没打开 Claude 的缓存，可以照下面打开。' : '可以在接口的说明里找找「缓存」或「prompt caching」。',
      ...(st ? { howTo: ['打开酒馆文件夹里的 config.yaml。', '找到 claude 下面的 cachingAtDepth: -1，改成 cachingAtDepth: 0。', '保存，然后重启酒馆。'] } : {}),
    };
  } else if (on('gap') && sameModel && stable && couldCache && u!.cached === 0 && gap != null && gap > 5 * 60_000) {
    kind = 'gap';
    note = {
      lead: `离上一轮 ${Math.round(gap / 60_000)} 分钟`,
      extra: full(same),
      reason: '缓存通常只保留几分钟，隔久了要按全价重新算。',
      action: '下一轮发得快一点就会恢复。',
    };
  } else if (on('changed') && sameModel && missed && brk?.at && !stable) {
    kind = 'changed';
    note = { lead: '开头变了', extra: couldCache ? full(Math.max(0, Math.min(p!.input, u!.input) - (u!.cached ?? 0))) : null, ...changedText(brk.at) };
  }

  if (note) {
    const pct = Math.round(((u!.input - (u!.cached ?? 0)) / u!.input) * 100);
    const money = note.extra != null && note.extra > 0.001 ? fmtMoney(note.extra) : null;
    title = money
      ? (note.lead ? `${note.lead}，本轮多花约 ${money}` : `本轮多花了约 ${money}`)
      : (note.lead ? `${note.lead}，约 ${pct}% 没用上缓存` : `本轮约 ${pct}% 没用上缓存`);
    body = [money ? `约 ${pct}% 的发送内容没用上缓存。` : '没用上缓存的部分按全价算，用上的话便宜很多。', note.reason, note.action].filter(Boolean);
    button = note.button ?? null;
  }
  return title ? { kind, title, body, button, howTo: note?.howTo ?? null, cache: !!note } : null;
}

/** 结论横幅（内容由 bannerFor 算好）。「怎么打开」「缓存是什么？」都是点开才显示。 */
export function Banner({ data }: { data: BannerData | null }) {
  const [steps, setSteps] = useState(false);
  const [what, setWhat] = useState(false);
  if (!data) return null;
  const button: [string, () => void] | null = data.howTo ? ['怎么打开', () => setSteps(!steps)] : data.button;
  return (
    <div class="rbt-banner" role="status">
      <i class="fa-solid fa-circle-exclamation" />
      <div>
        <p>{data.title}</p>
        <button type="button" class="rbt-banner-x" aria-label="这段聊天里不再提醒这一种" title="这段聊天里不再提醒这一种" onClick={() => dismiss(data.kind)}><i class="fa-solid fa-xmark" aria-hidden="true" /></button>
        {data.body.map((t) => <small key={t}>{t}</small>)}
        {button && <button type="button" class="rbt-linkbtn" onClick={button[1]}>{button[0]}</button>}
        {data.howTo && steps && <ol class="rbt-banner-steps">{data.howTo.map((t) => <li key={t}>{t}</li>)}</ol>}
        {data.cache && (
          <div class="rbt-banner-help">
            <button type="button" class="rbt-linkbtn" aria-expanded={what} onClick={() => setWhat(!what)}>缓存是什么？</button>
            {what && <small>{CACHE_IS}</small>}
          </div>
        )}
      </div>
    </div>
  );
}

const CACHE_IS = '每轮发给 AI 的内容，开头大部分和上一轮一样。很多接口会记住这段开头，下一轮再发时只收一小部分钱。这就叫缓存。';

// ---------------------------------------------------------------- 花费 ---

/** 插件那一行的灰字：插件后台调用、调用几次、用时、模型。每段整段换行，不从中间断开。 */
function pluginSub(r: CostRow): preact.ComponentChildren {
  const s = r.plugin!;
  const parts = ['插件后台调用', r.key ? '' : '认不出是哪个插件', `${s.count} 次`, s.ms ? `用时 ${sec(s.ms)}` : '', s.model].filter(Boolean);
  return parts.map((p, i) => <><span key={i} class="rbt-nb">{p}{i < parts.length - 1 ? ' ·' : ''}</span>{' '}</>);
}

const isOutput = (r: CostRow) => r.kind === 'think' || r.kind === 'write';
const isInput = (r: CostRow) => !isOutput(r) && r.kind !== 'plugin';
const sumTokens = (list: CostRow[]) => list.reduce((n, r) => n + r.tokens, 0);
/** 几行加起来的估算金额（按单价拆的，前面加「约」）；一行都没算出钱就空着。 */
const sumMoney = (list: CostRow[]) => (list.some((r) => r.money != null) ? `约 ${money(list.reduce((n, r) => n + (r.money ?? 0), 0))}` : '');
/** 第 i 个插件的颜色：灰色一个比一个浅，和「本条回复」的主题色分开。 */
const pluginColor = (i: number) => `color-mix(in srgb, var(--t1) ${Math.max(15, 45 - i * 12)}%, transparent)`;

/** 花费卡片里的金额：比 fmtMoney 多一位（$1 以下三位），几项加起来能和总数对上。 */
const decOf = (x: number) => (x >= 1 ? 2 : x >= 0.01 ? 3 : 4);
const money = (x: number, d = decOf(x)) => `$${x.toFixed(d)}`;
/** 表里的 Token 写完整数字，输入 + 输出正好等于本条回复。 */
const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

/** 已用上限的多少：「不到 1%」「21%」。 */
const usedPct = (n: number, limit: number) => (n / limit < 0.01 ? '不到 1%' : `${Math.round((n / limit) * 100)}%`);

const perM = (x: number) => `$${+(x * 1e6).toPrecision(3)} / 百万 Token`;

function RoundCost({ cap }: { cap: Capture }) {
  void usageTick.value;
  const avg = useChatAverages();
  const u = cap.usage;
  if (cap.genType === 'preview') return <p class="rbt-sec-note">预览不花钱，也不计时。</p>;
  if (!u || (!u.input && !Object.keys(u.side ?? {}).length)) return <p class="rbt-sec-note">{u ? '接口未返回用量，本轮看不到花费和 Token。' : '写完后显示。'}</p>;
  const price = priceFor(u.model);
  const rows = costRows(u, sentParts(cap.result.messages, u.input, u.cached), price);
  const total = u.cost != null ? u.cost + (sideCost(u.side) ?? 0) : null;
  const hasMoney = rows.some((r) => r.money != null);
  const tokens = rows.reduce((n, r) => n + r.tokens, 0);
  const estimated = rows.some((r) => r.estimated && r.money != null);
  const plugins = rows.some((r) => r.kind === 'plugin');
  const replyRows = rows.filter((r) => r.kind !== 'plugin');

  // 本条回复的金额：接口返回的准数；接口没给时按单价估的（加「约」）；都没有就空着
  const replyMoney = u.cost != null ? money(u.cost) : sumMoney(replyRows) || '—';
  const inRows = rows.filter(isInput), outRows = rows.filter(isOutput);
  const inTokens = Math.round(sumTokens(inRows)), outTokens = Math.round(sumTokens(outRows));
  const replyTokens = inTokens + outTokens;
  const pluginRows = rows.filter((r) => r.kind === 'plugin');
  const allTokens = replyTokens + pluginRows.reduce((n, r) => n + Math.round(r.tokens), 0);
  // 总数的位数跟着最细的那一项，$0.034 + $0.069 写成 $0.103，不写 $0.10
  const totalDec = Math.max(...[total ?? 0, u.cost ?? 0, ...pluginRows.map((r) => r.money ?? 0)].filter((x) => x > 0).map(decOf), 2);
  // 钱花在哪：比例条画本条回复和每个插件（都是接口返回的准数），下面一行图例写占比和金额。
  // 只有本条回复时是一整条，不画
  const split = plugins && u.cost != null && total ? [
    { name: '本条回复', money: u.cost, color: C_WRITE },
    ...pluginRows.map((r, i) => ({ name: pluginName(r.key) || '后台请求', money: r.money ?? 0, color: pluginColor(i) })),
  ] : null;
  const pctOf = (m: number | null | undefined): string => (total && m != null ? `${Math.round((m / total) * 100)}%` : '');
  const replyName = cap.targetFloor != null ? `本条回复（第 ${cap.targetFloor} 楼）` : '本条回复';
  return (
    <>
      {total != null
        ? <Big value={money(total, totalDec)} sub={vsAvg(total, avg.cost, fmtMoney, '比平均贵', '比平均便宜', 0.005)} />
        : <Big label={`本轮 Token 总用量${plugins ? '（含插件后台调用）' : ''}`} value={fmtInt(tokens)} unit="Token" />}
      {!hasMoney && u.cost == null && <p class="rbt-sec-note">{U.noMoney}</p>}
      {split && (
        <>
          <div class="rbt-tbar" role="img" aria-label={split.map((p) => `${p.name} ${pctOf(p.money)}`).join('，')}>
            {split.map((p, i) => <i key={i} style={{ width: pctOf(p.money), background: p.color }} />)}
          </div>
          <div class="rbt-legend2">
            {split.map((p, i) => <span key={i}><i class="rbt-swatch" style={{ background: p.color }} />{p.name} <b>{pctOf(p.money)}（{money(p.money)}）</b></span>)}
          </div>
        </>
      )}
      <div class={`rbt-ctable ${hasMoney ? '' : 'no-money'}`}>
        <div class="rbt-ctr th"><span>项目</span><span>Token</span>{hasMoney && <span>花费</span>}</div>
        {/* 本条回复写接口返回的金额，下面是输入、输出的合计；各自的明细在下面「输入」「输出」两张卡片里 */}
        <div class="rbt-ctr">
          <span><b>{replyName}</b></span>
          <span>{fmtInt(replyTokens)}</span>
          {hasMoney && <span>{replyMoney}</span>}
        </div>
        {inRows.length > 0 && (
          <div class="rbt-ctr sub">
            <span><span><b>输入</b><small>发给 AI 的内容</small></span></span>
            <span>{fmtInt(inTokens)}</span>
            {hasMoney && <span>{sumMoney(inRows)}</span>}
          </div>
        )}
        {outRows.length > 0 && (
          <div class="rbt-ctr sub">
            <span><span><b>输出</b><small>AI 生成的思考和正文</small></span></span>
            <span>{fmtInt(outTokens)}</span>
            {hasMoney && <span>{sumMoney(outRows)}</span>}
          </div>
        )}
        {pluginRows.map((r, i) => (
          <div key={`p${i}`} class="rbt-ctr">
            <span><span><b>{pluginName(r.key) || '后台请求'}</b><small>{pluginSub(r)}</small></span></span>
            <span>{fmtInt(r.tokens)}</span>
            {hasMoney && <span>{r.money == null ? '—' : money(r.money)}</span>}
          </div>
        ))}
        <div class="rbt-ctr sum"><span><b>合计</b></span><span>{fmtInt(allTokens)}</span>{hasMoney && <span><b>{total != null ? money(total, totalDec) : '—'}</b></span>}</div>
      </div>
      {estimated && price && (
        <div class="rbt-basis">
          <b>输入、输出花费估算</b>
          <p>本条回复用的是 {u.model}，按它在 OpenRouter 的价格：</p>
          <p>输入 {perM(price.prompt)}{price.cacheRead != null ? `，已缓存的输入 ${perM(price.cacheRead)}` : ''}；输出 {perM(price.completion)}。</p>
          <p>{u.cost != null ? `表里每一项的钱是估算的：接口只给了总数 ${fmtMoney(u.cost)}，这里按上面的单价拆成了几项。` : '表里的钱是估算的：接口没给本条回复花了多少钱，这里按上面的单价算了一下。'}{plugins ? '插件那几行是接口返回的准数。' : ''}</p>
        </div>
      )}
      {!price && u.cost != null && (
        <p class="rbt-sec-note">接口返回了本条回复的总花费。查不到这个模型的单价，无法算出输入、输出各花了多少。</p>
      )}
    </>
  );
}

/** OpenRouter 余额（主接口是 OpenRouter 时才查，打开时查一次）。 */
function useBalance(): { isOR: boolean; bal: Awaited<ReturnType<typeof openRouterBalance>> | undefined } {
  const isOR = ctx().chatCompletionSettings?.chat_completion_source === 'openrouter';
  const [bal, setBal] = useState<Awaited<ReturnType<typeof openRouterBalance>> | undefined>(undefined);
  useEffect(() => {
    if (!isOR) return;
    let alive = true;
    void openRouterBalance().then((b) => { if (alive) setBal(b); });
    return () => { alive = false; };
  }, [isOR]);
  return { isOR, bal };
}

/** 这一轮的花费（「这一轮」那一组里）。这一轮没有用量记录就不显示。 */
export function RoundCostSection({ cap }: { cap: Capture }) {
  void usageTick.value;
  const has = cap.genType === 'preview' || !!cap.usage?.input || !!Object.keys(cap.usage?.side ?? {}).length;
  return has ? <Sec title="花费"><RoundCost cap={cap} /></Sec> : null;
}

/**
 * 「存档总览」：一张小卡片，偶尔看一眼（一共花了多少、平均多久、账户余额）。图表点进第二层看。
 * 这段聊天没有任何记录、也不是 OpenRouter 就不显示。
 */
export function WholeChatGroup({ onOpen }: { onOpen: () => void }) {
  void usageTick.value;
  const floors = useFloors();
  const { isOR, bal } = useBalance();
  if (!floors.length && !isOR) return null;
  const cost = chatCost();
  const times = floors.filter((f) => f.timing?.ok).map((f) => f.timing!.total);
  const avgTime = times.length ? sec(times.reduce((a, b) => a + b, 0) / times.length) : '';
  return (
    <div class="rbt-flow-g">
      <div class="rbt-flow-group">存档总览</div>
      <section class="rbt-sec">
        {cost.replies > 0
          ? <div class="rbt-usage-row"><span>存档总花费<small>共 {cost.replies} 次回复（含重新生成），平均 {fmtMoney(cost.total / cost.replies)} / 次</small></span><b>{fmtMoney(cost.total)}</b></div>
          : cost.used
            ? <div class="rbt-usage-row"><span>存档总 Token 用量<small>{U.chatTokensSub(cost.used)}</small></span><b>{fmtTokens(cost.tokens)} tokens</b></div>
            : <p class="rbt-sec-note">这个存档还没有花费记录。</p>}
        {avgTime && <div class="rbt-usage-row"><span>平均回复用时<small>从发送消息到 AI 完成回复</small></span><b>{avgTime}</b></div>}
        {isOR && bal && (
          <div class="rbt-usage-row"><span>OpenRouter 账户余额<small>累计充值 {fmtMoney(bal.total)} · 已消费 {fmtMoney(bal.used)}</small></span><b>{fmtMoney(bal.remaining)}</b></div>
        )}
        {isOR && bal === null && <p class="rbt-sec-note">{U.balanceFail}</p>}
        {isOR && <button type="button" class="rbt-linkbtn rbt-usage-bill" onClick={() => window.open('https://openrouter.ai/activity', '_blank', 'noopener')}>{U.bill}</button>}
        {floors.length >= 2 && <NavRow title="查看详细统计" sub="按楼层查看花费、上下文用量及回复用时" onClick={onOpen} />}
      </section>
    </div>
  );
}

/** 第二层：详细统计，按楼层画花费、上下文、用时（从「存档总览」那张卡片的「查看详细统计」进来）。 */
export function WholeChatPage() {
  void usageTick.value;
  const floors = useFloors();
  const cost = chatCost();
  const since = cost.since && Number.isFinite(Date.parse(cost.since)) ? new Date(Date.parse(cost.since)) : null;
  return (
    <>
      <div class="rbt-flow-group">存档总览</div>
      {cost.replies > 0 && (
        <Sec title="花费">
          <Big value={fmtMoney(cost.total)} sub={U.chatTotalSub(cost.replies)} />
          <CostChart />
          {since && <p class="rbt-sec-note">{U.since(`${since.getMonth() + 1} 月 ${since.getDate()} 日`)}</p>}
        </Sec>
      )}
      {floors.some((f) => f.input > 0) && <Sec title="上下文"><ContextChart /></Sec>}
      {floors.some((f) => f.timing) && <Sec title="用时"><TimeChart /></Sec>}
    </>
  );
}

// -------------------------------------------------------------- 上下文 ---

/** onOpenSent：点「发给 AI 的全部内容」，进第二层看每一条 */
export function ContextSection({ cap, brk, onOpenSent }: { cap: Capture; brk: CacheBreak | null; onOpenSent: () => void }) {
  const u = cap.usage;
  const b = cap.budget;
  const preview = cap.genType === 'preview';
  const exact = !!u?.input;
  const used = exact ? u!.input : cap.result.totalTokens;
  const limit = b?.context || 0;
  const reply = b?.reply || 0;
  const { sent, unsent } = floorsOf(cap);
  // 两条：上面一条按上下文长度画（看用了多少、还剩多少）；下面一条只画本轮输入（看由什么组成）。
  // 只用了 1% 时，上面那条几乎是空的，下面那条照样看得清组成
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / (used || 1)) * 100))}%`;
  // 接口算的 Token 和酒馆算的可能差一点，超过上限时按实际总数画，写「已满」
  const lpct = (n: number) => `${Math.max(0, Math.min(100, (n / (Math.max(limit, used + reply) || 1)) * 100))}%`;
  const full = unsent.other.length > 0 || used + reply >= limit * 0.98;
  const free = Math.max(0, limit - used - reply);
  // 条：按发送顺序，相邻同一类的合成一段
  const pieces = useMemo(() => {
    const out: { part: Part; tokens: number }[] = [];
    const k = cap.result.totalTokens ? used / cap.result.totalTokens : 1;
    for (const m of cap.result.messages) {
      const segs = m.segments.filter((s) => s.tokens > 0);
      for (const s of segs.length ? segs : [{ category: m.category, tokens: m.tokens }]) {
        const part = PART_OF[s.category];
        const last = out[out.length - 1];
        if (last?.part === part) last.tokens += s.tokens * k;
        else out.push({ part, tokens: s.tokens * k });
      }
    }
    return out;
  }, [cap, used]);
  const totals = new Map<Part, number>();
  for (const p of pieces) totals.set(p.part, (totals.get(p.part) ?? 0) + p.tokens);
  // 图例和条用同一套颜色：每一类都列出来（最多七类）
  const legend = [...totals.entries()].sort((a, c) => c[1] - a[1]);
  // 缓存：接口给了这一项才画（预览时用和上一轮比出来的，写「预计」）
  const cached = u?.cached != null ? u.cached : preview && brk ? brk.same : null;
  const sentFloors = [...new Set(sent)].sort((a, c) => a - c);
  // 酒馆自带的「总结」「向量记忆」插进来的内容有固定标记，认得准；第三方插件靠名字猜不准，不算
  const memory = [...new Set(cap.result.messages.flatMap((m) => m.segments.map((s) => s.label)))]
    .map((l) => ({ '总结（Summarize）': '总结', '向量记忆': '向量记忆' } as Record<string, string>)[l]).find(Boolean);
  // 表按发送顺序列（和色带一样从左到右），每类一行；聊天记录写上发了哪几楼
  const order = [...new Set(pieces.map((p) => p.part))];
  const shown = new Map(order.map((p) => [p, Math.round(totals.get(p) ?? 0)]));
  if (order.length) {
    const big = order.reduce((a, c) => ((shown.get(c) ?? 0) > (shown.get(a) ?? 0) ? c : a));
    shown.set(big, (shown.get(big) ?? 0) + Math.round(used) - [...shown.values()].reduce((n, t) => n + t, 0));
  }
  const partName = (p: Part) => (p === 'chat' && sentFloors.length ? `聊天记录（${floorsText(sentFloors)}）` : PART_NAME[p]);
  return (
    <Sec title="输入" right={<button type="button" class="rbt-linkbtn" onClick={() => openPresetField('context')}>改上下文长度 ↗</button>}>
      <Big label={preview ? '预计本轮输入' : '本轮输入'} value={`${exact ? '' : '约 '}${fmtInt(used)}`} unit="Token" />
      {limit > 0 && (
        <>
          <BarCap left={`上下文长度 ${fmtTokens(limit)} Token`} right={full ? '已满' : `已用 ${usedPct(used + reply, limit)}`} />
          <div class="rbt-tbar rbt-meter" role="img" aria-label={`上下文长度 ${limit} Token，本轮输入 ${used}，留给回复 ${reply}`}>
            <i style={{ width: lpct(used), background: C_INPUT }} />
            {reply > 0 && <i class="reserve" style={{ width: lpct(reply) }} />}
          </div>
          <div class="rbt-legend2">
            <span><i class="rbt-swatch" style={{ background: C_INPUT }} />本轮输入 <b>{fmtInt(used)}</b></span>
            {reply > 0 && <span><i class="rbt-swatch hatch" />留给回复 <b>{fmtInt(reply)}</b></span>}
            <span><i class="rbt-swatch free" />剩余可用 <b>{free > 0 ? `约 ${fmtTokens(free)}` : '0'}</b></span>
          </div>
        </>
      )}
      {/* 上下文满了：最早的楼不再发送。写清楚是哪几楼、以后会怎样，再画一条楼层条 */}
      {unsent.other.length > 0 && (
        <>
          <p class="rbt-warn-line"><b>上下文已满</b>：{floorsText(unsent.other)}没有发送。每发一条新消息，最早的一楼也不再发送。</p>
          <FloorStrip total={cap.targetFloor ?? b?.chatLength ?? 0} sent={sentFloors} hidden={unsent.hidden} />
          <p class="rbt-sec-note">{memory
            ? `本轮还发了「${memory}」插进来的内容。`
            : '想让 AI 记得前面的剧情，可以用总结或记忆插件，或者把上下文长度调大（每一轮会更贵）。'}</p>
        </>
      )}
      {unsent.hidden.length > 0 && <p class="rbt-sec-note">{floorsText(unsent.hidden)}已用 /hide 隐藏，本轮未发送。</p>}
      <BarCap left="本轮输入的组成" right={`${fmtInt(used)} Token`} />
      <div class={`rbt-cbar ${cached ? 'has-cache' : ''}`} role="img" aria-label={`本轮输入约 ${used} Token`}>
        {pieces.map((p, i) => <i key={i} style={{ width: pct(p.tokens), background: PART_COLOR[p.part] }} />)}
        {cached != null && cached > 0 && (
          <span class="rbt-bracket" style={{ width: pct(Math.min(cached, used)) }}><span>{preview ? `预计可缓存约 ${fmtInt(cached)}` : `已缓存 ${fmtInt(cached)}`}</span></span>
        )}
      </div>
      <div class="rbt-legend2">
        {order.map((p) => <span key={p}><i class="rbt-swatch" style={{ background: PART_COLOR[p] }} />{partName(p)} <b>{fmtInt(shown.get(p) ?? 0)}</b></span>)}
      </div>
      {cached != null && cached > 0 && <p class="rbt-sec-note">{preview ? '如果这部分输入命中缓存，通常按较低单价计费。' : '命中缓存的输入通常按较低单价计费。'}</p>}
      <NavRow title="发给 AI 的全部内容" sub={`${cap.result.messages.length} 条消息${cap.wi.length ? ` · 触发了 ${cap.wi.length} 个世界书条目` : ''}`} onClick={onOpenSent} />
    </Sec>
  );
}

/** 楼层条：第 0 楼到最新一楼，哪些发送了、哪些超出上下文长度没发、哪些隐藏了。只在有楼没发送时画。 */
function FloorStrip({ total, sent, hidden }: { total: number; sent: number[]; hidden: number[] }) {
  if (total <= 0) return null;
  const s = new Set(sent), h = new Set(hidden);
  const kind = (i: number) => (s.has(i) ? 'sent' : h.has(i) ? 'hidden' : 'cut');
  // 第 0 楼是开场白，有的预设本来就不发：没隐藏也没发时不画（和「没有发送」那句一致）
  const start = !s.has(0) && !h.has(0) ? 1 : 0;
  const runs: { kind: string; from: number; to: number }[] = [];
  for (let i = start; i < total; i++) {
    const k = kind(i), last = runs[runs.length - 1];
    if (last?.kind === k) last.to = i; else runs.push({ kind: k, from: i, to: i });
  }
  const NAME: Record<string, string> = { cut: '超出上下文长度，未发送', hidden: '已隐藏', sent: '已发送' };
  return (
    <>
      <div class="rbt-fstrip" role="img" aria-label={runs.map((r) => `第 ${r.from}–${r.to} 楼${NAME[r.kind]}`).join('，')}>
        {runs.map((r, i) => <i key={i} class={r.kind} style={{ flexGrow: r.to - r.from + 1, background: r.kind === 'sent' ? PART_COLOR.chat : undefined }} />)}
      </div>
      <div class="rbt-fstrip-k"><span>第 {start} 楼</span><span>第 {total - 1} 楼</span></div>
      <div class="rbt-legend2">
        {(['cut', 'hidden', 'sent'] as const).filter((k) => runs.some((r) => r.kind === k)).map((k) => (
          <span key={k}><i class={`rbt-swatch fs-${k}`} style={k === 'sent' ? { background: PART_COLOR.chat } : undefined} />{NAME[k]}</span>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- 输出 ---

/** 用时不到 10 秒写一位小数（1.7 秒），不然 360 Token ÷ 2 秒 和速度对不上。 */
// 10 秒以内都留一位小数（「1.0 秒」），同一行里几个数写法一样
const sec = (ms: number) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)} 秒` : fmtDuration(ms));

/** AI 写了什么：写了多少 Token、占最大回复长度多少，思考、正文各写多少、各用多久。预览还没写，不显示。 */
export function TimeSection({ cap }: { cap: Capture }) {
  const avg = useChatAverages();
  const u: ReplyUsage | undefined = cap.usage;
  if (cap.genType === 'preview') return null;
  const head = (body: preact.ComponentChildren) => (
    <Sec title="输出" right={<button type="button" class="rbt-linkbtn" onClick={() => openPresetField('reply')}>改最大回复长度 ↗</button>}>{body}</Sec>
  );
  if (!u || (!u.output && u.wait == null)) return head(<p class="rbt-sec-note">写完后显示。</p>);
  const out = u.output ?? 0;
  const thinkTokens = u.reasoning ?? 0;
  const text = Math.max(0, out - thinkTokens);
  const limit = cap.budget?.reply || 0;
  const timed = u.wait != null;
  const r100 = (ms: number) => Math.round(ms / 100) * 100;
  // 合计按原始数取整（和「平均回复用时」一样）；三段各自取整后差的那一点补到最长的一段上，加起来正好是合计
  const parts = [r100(u.wait ?? 0), r100(u.think ?? 0), r100(u.write ?? 0)];
  const total = r100((u.wait ?? 0) + (u.think ?? 0) + (u.write ?? 0));
  parts[parts.indexOf(Math.max(...parts))] += total - parts[0] - parts[1] - parts[2];
  const [wait, think, write] = parts;
  // 条：按最大回复长度画，看得出写满了多少
  const pct = (n: number) => `${Math.min(100, (n / (limit || out || 1)) * 100)}%`;
  const speed = text && write > 1000 ? `正文回复速度：${Math.round(text / (write / 1000))} Token/秒` : '';
  const tpct = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  const slower = timed ? vsAvg(total, avg.time, sec, '比平均慢', '比平均快', 1000) : undefined;
  return head(
    <>
      <Big label="本轮输出" value={fmtInt(out)} unit="Token" />
      {limit > 0 && <BarCap left={`最大回复长度 ${fmtInt(limit)} Token`} right={`已用 ${usedPct(out, limit)}`} />}
      {out > 0 && (
        <div class="rbt-tbar rbt-meter">
          {thinkTokens > 0 && <i style={{ width: pct(thinkTokens), background: C_THINK }} />}
          <i style={{ width: pct(text), background: C_WRITE }} />
        </div>
      )}
      <div class="rbt-legend2">
        {thinkTokens > 0 && <span><i class="rbt-swatch" style={{ background: C_THINK }} />思考 <b>{fmtInt(thinkTokens)}</b></span>}
        <span><i class="rbt-swatch" style={{ background: C_WRITE }} />正文回复 <b>{fmtInt(text)}</b></span>
        {limit > 0 && <span><i class="rbt-swatch free" />剩余可用 <b>{fmtInt(Math.max(0, limit - out))}</b></span>}
      </div>
      {/* 用时：第二个大字 + 时间条 + 图例（从发送消息到 AI 写完） */}
      {timed && (
        <>
          <Big label="回复用时" value={sec(total)} sub={slower} />
          <div class="rbt-tbar">
            <i style={{ width: tpct(wait), background: C_WAIT }} />
            {think > 0 && <i style={{ width: tpct(think), background: C_THINK }} />}
            <i style={{ width: tpct(write), background: C_WRITE }} />
          </div>
          <div class="rbt-legend2">
            <span><i class="rbt-swatch" style={{ background: C_WAIT }} />等待 <b>{sec(wait)}</b></span>
            {think > 0 && <span><i class="rbt-swatch" style={{ background: C_THINK }} />思考 <b>{sec(think)}</b></span>}
            <span><i class="rbt-swatch" style={{ background: C_WRITE }} />正文回复 <b>{sec(write)}</b></span>
          </div>
        </>
      )}
      {speed && <p class="rbt-sec-note">{speed}</p>}
    </>,
  );
}

/** 下拉里每一轮的名字：「第 212 楼回复 · 14:50」「第 212 楼回复 · 重新生成 · 14:50」「预览 · 14:50」「插件后台调用 · 14:50」。 */
export function roundTitle(c: Capture): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  const t = `${p2(c.time.getHours())}:${p2(c.time.getMinutes())}`;
  if (c.genType === 'preview') return `预览 · ${t}`;
  if (c.targetFloor === null) return `${c.genTypeLabel} · ${t}`;
  const kind = ['swipe', 'regenerate'].includes(c.genType) ? '重新生成' : c.genType === 'continue' ? '继续' : '';
  return [`第 ${c.targetFloor} 楼回复`, kind, t].filter(Boolean).join(' · ');
}

export { cacheBreak };
