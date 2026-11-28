/**
 * 信息流「这一轮」：结论横幅、花费、上下文、用时（dev/信息流-用量和花费-方案.md，第二步）。
 * 每块一个名词标题、一个大数字、一行比较；只在不正常时写结论。
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { Category } from '../core/attribute';
import { cacheBreak, costRows, PART_OF, sentParts, type CacheBreak, type CostRow, type Part } from '../core/costSplit';
import { floorsText, unsentFloors } from '../core/budget';
import { fmtDuration, fmtMoney, readTiming, readUsage, sideCost, type ReplyUsage } from '../core/usage';
import type { Capture } from '../tools/flow/capture';
import { chatCost, openRouterBalance, pluginName, priceFor, usageTick } from '../tools/flow/usage';
import { ctx } from '../st/st';
import { openPresetField } from '../shell/drawers';
import { fmtTokens } from './common';
import { USAGE_COPY as U } from './copy';
import { ContextChart, CostChart, TimeChart, useFloors } from './FlowChat';
import { PART_COLOR, PART_NAME } from './FlowSent';
import type { SentView } from '../core/sentItems';

// ------------------------------------------------------------- 公共 ---

const C_THINK = 'color-mix(in srgb, var(--rbd-accent, #0a84ff) 55%, var(--t1))';
const C_WRITE = 'var(--rbd-accent, #0a84ff)';
const C_WAIT = 'color-mix(in srgb, var(--rbd-accent, #0a84ff) 25%, var(--t1))';
const C_INPUT = 'color-mix(in srgb, var(--t1) 60%, transparent)';

/** 上限条上面一行：左边是设置名和上限（后面可以跟「修改 ↗」），右边是已用多少。 */
function BarCap({ left, right }: { left: preact.ComponentChildren; right?: string }) {
  return <div class="rbt-bar-cap"><span>{left}</span>{right && <b>{right}</b>}</div>;
}

/**
 * 数值写实际单位（Token、秒、美元）还是占比。花费明细里每张卡片右上角都有这个切换，
 * 所有卡片共用一个（切了一个，别的跟着变），记住上次选的。
 */
export const showPct = signal((() => { try { return localStorage.getItem('rbt-unit-pct') === '1'; } catch { return false; } })());
export function UnitToggle() {
  const set = (v: boolean) => { showPct.value = v; try { localStorage.setItem('rbt-unit-pct', v ? '1' : '0'); } catch { /* 存不了就只管这一次 */ } };
  return (
    <span class="rbt-seg2 rbt-unit" role="tablist" aria-label="数值显示方式">
      <button type="button" role="tab" aria-selected={!showPct.value} class={!showPct.value ? 'on' : ''} onClick={() => set(false)}>数值</button>
      <button type="button" role="tab" aria-selected={showPct.value} class={showPct.value ? 'on' : ''} onClick={() => set(true)}>%</button>
    </span>
  );
}
/** 占比：「<1%」「16%」 */
export const pctText = (n: number, of: number): string => { const p = of > 0 ? (n / of) * 100 : 0; return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`; };
/** Token 数值，后面一个小 t */
const tok = (n: number) => <>{fmtInt(n)}<small>t</small></>;

/** 紧跟在设置名后面的「修改 ↗」：打开酒馆的预设面板，滚到这一项 */
function EditLink({ field }: { field: 'context' | 'reply' }) {
  return <button type="button" class="rbt-linkbtn rbt-edit" onClick={() => openPresetField(field)}>修改 ↗</button>;
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
export function Big({ value, unit, sub, text, label }: { value: string; unit?: string; sub?: preact.ComponentChildren; text?: boolean; label?: string }) {
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
/** 缓存提醒：标题写后果（多花多少 / 多少按全价），下面一句原因、一句下一步（DESIGN.md「数字和图表的页面」）。 */
interface CacheNote {
  extra: number | null;
  reason: string;
  action: string;
  /** 下一步是去「发给 AI 的内容」看从哪一条开始不一样 */
  openSent?: boolean;
  howTo?: string[];
}

/** 开头从哪一块开始和上一轮不同：用玩家认得的名字说出来。 */
/** 开头变了：哪一条和上一轮不同。具体在哪、改哪一条，去「发给 AI 的内容」看分隔线。 */
function changedText(at: { label: string; category: Category }): { reason: string; action: string } {
  const c = at.category;
  const floor = /^#(\d+)/.exec(at.label)?.[1];
  const what = c.startsWith('wi_') ? `世界书「${at.label.replace(/^.+? · /, '')}」`
    : c === 'preset' ? `预设条目「${at.label}」`
    : c === 'character' ? '角色卡' : c === 'persona' ? '用户人设'
    : c === 'extension' ? `插件「${at.label}」插入的内容`
    : floor ? `第 ${floor} 楼` : `「${at.label}」`;
  const action = c.startsWith('wi_') ? '把这条世界书的位置改成「按深度」可以减少全价部分，但剧情可能会变。'
    : c === 'preset' ? '把这个预设条目移到聊天记录后面可以减少全价部分。'
    : c === 'character' || c === 'persona' ? '可能用了随机、时间这类宏。'
    : floor ? '这一楼可能被修改或删除过。' : '';
  return { reason: `${what}与上一轮不同，之后的内容都按全价计费。`, action };
}

/**
 * 结论横幅：只在不正常时出现，一次一条。缓存的几条不看模型名字、不猜玩家用的什么接口，只看实际发生了什么：
 * 和同一个模型的上一轮比（换了模型的那一轮不提醒，本来就不能沿用上一轮的缓存）。
 * 查得到价格写多花了多少钱，查不到写多少没用上缓存（接口给了发送和缓存就能算）。
 */
export interface BannerData { kind: string; title: string; body: string[]; button: [string, () => void] | null; openSent: boolean; howTo: string[] | null; cache: boolean }

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
    title = '回复达到最大回复长度，可能不完整';
    body = [`最大回复长度为 ${fmtTokens(b.reply)} Token。调高后重新生成。`];
    button = ['打开预设 ↗', () => openPresetField('reply')];
  } else if (on('longchat') && sameModel && couldCache && missed && unsent.other.length && f0 != null && f1 != null && f0 > f1) {
    kind = 'longchat';
    note = {
      extra: full(Math.max(0, Math.min(p!.input, u!.input) - (u!.cached ?? 0))),
      reason: '聊天记录超过上下文长度，最早的楼层不再发送，开头随之改变。',
      action: '先总结并隐藏一批旧楼层，之后几轮可以恢复缓存。',
    };
  } else if (on('nocache') && sameModel && stable && u!.cached === 0 && p!.cached === 0 && (gap == null || gap <= 5 * 60_000)) {
    kind = 'nocache';
    // 开头一样、和上一轮挨得近，两轮都没用上缓存
    const st = stCanCache(u!.model);
    note = {
      extra: full(same),
      reason: '接口可能不支持缓存，或者没有打开缓存。',
      action: st ? '酒馆默认不为 Claude 打开缓存。' : '请在接口说明里查找「缓存」或「prompt caching」。',
      ...(st ? { howTo: ['打开酒馆文件夹里的 config.yaml。', '找到 claude 下面的 cachingAtDepth: -1，改成 cachingAtDepth: 0。', '保存，然后重启酒馆。'] } : {}),
    };
  } else if (on('gap') && sameModel && stable && couldCache && u!.cached === 0 && gap != null && gap > 5 * 60_000) {
    kind = 'gap';
    note = {
      extra: full(same),
      reason: `距离上一轮 ${Math.round(gap / 60_000)} 分钟。缓存通常只保留约 5 分钟。`,
      action: '5 分钟内发送下一轮，缓存会恢复。',
    };
  } else if (on('changed') && sameModel && missed && brk?.at && !stable) {
    kind = 'changed';
    note = { extra: couldCache ? full(Math.max(0, Math.min(p!.input, u!.input) - (u!.cached ?? 0))) : null, openSent: true, ...changedText(brk.at) };
  }

  if (note) {
    const pct = Math.round(((u!.input - (u!.cached ?? 0)) / u!.input) * 100);
    const money = note.extra != null && note.extra > 0.001 ? fmtMoney(note.extra) : null;
    // 标题写后果：查得到价格写多花多少，查不到写多少输入按全价；原因、下一步各一句
    title = money ? `本轮多花约 ${money}` : `约 ${pct}% 的输入按全价计费`;
    body = [money ? `约 ${pct}% 的输入按全价计费。` : '', note.reason, note.action].filter(Boolean);
  }
  return title ? { kind, title, body, button, openSent: !!note?.openSent, howTo: note?.howTo ?? null, cache: !!note } : null;
}

/** 结论横幅（内容由 bannerFor 算好）。「怎么打开」「缓存是什么？」都是点开才显示。 */
export function Banner({ data, onOpenSent }: { data: BannerData | null; onOpenSent: () => void }) {
  const [steps, setSteps] = useState(false);
  const [what, setWhat] = useState(false);
  if (!data) return null;
  const button: [string, () => void] | null = data.howTo ? ['查看打开方法', () => setSteps(!steps)]
    : data.openSent ? ['查看输入明细', onOpenSent] : data.button;
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

const CACHE_IS = '缓存：与上一轮开头相同的内容，多数接口按较低价格计费。';

// ---------------------------------------------------------------- 花费 ---

/** 插件那一行的灰字：插件后台调用、几次、用的模型。用时在「回复用时」里。每段整段换行，不从中间断开。 */
function pluginSub(r: CostRow): preact.ComponentChildren {
  const s = r.plugin!;
  const parts = ['插件后台调用', `${s.count} 次`, s.model ? `模型 ${s.model}` : ''].filter(Boolean);
  return parts.map((p, i) => <><span key={i} class="rbt-nb">{p}{i < parts.length - 1 ? ' ·' : ''}</span>{' '}</>);
}

const isOutput = (r: CostRow) => r.kind === 'think' || r.kind === 'write';
const isInput = (r: CostRow) => !isOutput(r) && r.kind !== 'plugin';
const sumTokens = (list: CostRow[]) => list.reduce((n, r) => n + r.tokens, 0);
/** 几行加起来的估算金额（按单价拆的，前面加「约」）；一行都没算出钱就空着。 */
const sumMoney = (list: CostRow[]) => (list.some((r) => r.money != null) ? `约 ${money(list.reduce((n, r) => n + (r.money ?? 0), 0))}` : '');
/** 第 i 个插件的颜色：灰色一个比一个浅，和「本轮」的主题色分开。 */

/** 花费卡片里的金额：比 fmtMoney 多一位（$1 以下三位），几项加起来能和总数对上。 */
const decOf = (x: number) => (x >= 1 ? 2 : x >= 0.01 ? 3 : 4);
const money = (x: number, d = decOf(x)) => `$${x.toFixed(d)}`;
/** 表里的 Token 写完整数字，输入 + 回复正好等于本轮。 */
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

  // 本轮的金额：接口返回的准数；接口没给时按单价估的（加「约」）；都没有就空着
  const replyMoney = u.cost != null ? money(u.cost) : sumMoney(replyRows) || '—';
  const inRows = rows.filter(isInput), outRows = rows.filter(isOutput);
  const inTokens = Math.round(sumTokens(inRows)), outTokens = Math.round(sumTokens(outRows));
  const replyTokens = inTokens + outTokens;
  const pluginRows = rows.filter((r) => r.kind === 'plugin');
  const allTokens = replyTokens + pluginRows.reduce((n, r) => n + Math.round(r.tokens), 0);
  // 总数的位数跟着最细的那一项，$0.034 + $0.069 写成 $0.103，不写 $0.10
  const totalDec = Math.max(...[total ?? 0, u.cost ?? 0, ...pluginRows.map((r) => r.money ?? 0)].filter((x) => x > 0).map(decOf), 2);
  const replyName = cap.targetFloor != null ? `本轮（第 ${cap.targetFloor} 楼）` : '本轮';
  // 占比：Token 一列占合计 Token 多少，花费一列占合计花费多少；算不出的花费照常写「—」
  const pct = showPct.value;
  const sumNum = (list: CostRow[]) => (list.some((r) => r.money != null) ? list.reduce((n, r) => n + (r.money ?? 0), 0) : null);
  const totalNum = total ?? sumNum(rows);
  const tk = (n: number) => (pct ? pctText(n, allTokens) : fmtInt(n));
  const mv = (x: number | null, text: string) => (pct && x != null && totalNum ? pctText(x, totalNum) : text);
  return (
    <>
      {total != null
        ? <Big value={money(total, totalDec)} sub={vsAvg(total, avg.cost, fmtMoney, '比平均贵', '比平均便宜', 0.005)} />
        : <Big label={`本轮 Token 总用量${plugins ? '（含插件后台调用）' : ''}`} value={fmtInt(tokens)} unit="Token" />}
      {!hasMoney && u.cost == null && <p class="rbt-sec-note">{U.noMoney}</p>}
      <div class={`rbt-ctable ${hasMoney ? '' : 'no-money'}`}>
        <div class="rbt-ctr th"><span>项目</span><span>Token</span>{hasMoney && <span>花费</span>}</div>
        {/* 本轮写接口返回的金额，下面是输入、回复的合计；各自的明细在下面「输入」「回复」两张卡片里 */}
        <div class="rbt-ctr">
          <span><span><b>{replyName}</b>{u.model && <small>模型 {u.model}</small>}</span></span>
          <span>{tk(replyTokens)}</span>
          {hasMoney && <span>{mv(u.cost ?? sumNum(replyRows), replyMoney)}</span>}
        </div>
        {inRows.length > 0 && (
          <div class="rbt-ctr sub">
            <span><span><b>输入</b><small>发给 AI 的内容</small></span></span>
            <span>{tk(inTokens)}</span>
            {hasMoney && <span>{mv(sumNum(inRows), sumMoney(inRows))}</span>}
          </div>
        )}
        {outRows.length > 0 && (
          <div class="rbt-ctr sub">
            <span><span><b>回复</b><small>AI 生成的思考和正文</small></span></span>
            <span>{tk(outTokens)}</span>
            {hasMoney && <span>{mv(sumNum(outRows), sumMoney(outRows))}</span>}
          </div>
        )}
        {pluginRows.map((r, i) => (
          <div key={`p${i}`} class="rbt-ctr">
            <span><span><b>{pluginName(r.key) || '未识别的插件'}</b><small>{pluginSub(r)}</small></span></span>
            <span>{tk(r.tokens)}</span>
            {hasMoney && <span>{mv(r.money, r.money == null ? '—' : money(r.money))}</span>}
          </div>
        ))}
        <div class="rbt-ctr sum"><span><b>合计</b></span><span>{tk(allTokens)}</span>{hasMoney && <span><b>{mv(total, total != null ? money(total, totalDec) : '—')}</b></span>}</div>
      </div>
      {estimated && price && (
        <details class="rbt-basis">
          <summary>按 OpenRouter 单价估算</summary>
          <p>{u.model}：输入 {perM(price.prompt)}{price.cacheRead != null ? `，缓存的输入 ${perM(price.cacheRead)}` : ''}，回复 {perM(price.completion)}。</p>
          <p>{u.cost != null ? `接口只返回总花费 ${fmtMoney(u.cost)}，输入、回复各项按单价拆分。` : '接口未返回花费，表中金额按单价计算。'}{plugins ? '插件后台调用的花费由接口返回。' : ''}</p>
        </details>
      )}
      {!price && u.cost != null && <p class="rbt-sec-note">查不到这个模型的单价，输入、回复的花费无法拆分。</p>}
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
  return has ? <Sec title="花费" right={cap.genType === 'preview' ? undefined : <UnitToggle />}><RoundCost cap={cap} /></Sec> : null;
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
            ? <div class="rbt-usage-row"><span>存档总 Token 用量<small>{U.chatTokensSub(cost.used)}</small></span><b>{fmtTokens(cost.tokens)} Token</b></div>
            : <p class="rbt-sec-note">这个存档还没有花费记录。</p>}
        {avgTime && <div class="rbt-usage-row"><span>平均回复用时<small>从发送消息到 AI 完成回复</small></span><b>{avgTime}</b></div>}
        {isOR && bal && (
          <div class="rbt-usage-row"><span>OpenRouter 账户余额<small>累计充值 {fmtMoney(bal.total)} · 已消费 {fmtMoney(bal.used)}</small></span><b>{fmtMoney(bal.remaining)}</b></div>
        )}
        {isOR && bal === null && <p class="rbt-sec-note">{U.balanceFail}</p>}
        {isOR && <button type="button" class="rbt-linkbtn rbt-usage-bill" onClick={() => window.open('https://openrouter.ai/activity', '_blank', 'noopener')}>{U.bill}</button>}
        {/* 去第二层的入口：和「查看输入明细」同一种整行按钮，不和上面的数据行长一样 */}
        {floors.length >= 2 && <button type="button" class="rbt-btn rbt-in-btn" onClick={onOpen}>按楼层查看详细统计 <i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>}
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

/**
 * 「输入明细」顶上：上下文长度条 → 一块浅色梯形把「本轮输入」那一小段放大 → 本轮输入的组成条（按发送顺序，相邻同一类合成一段）。
 * 图例都写占比：第一层写上下文那一组（占上下文长度多少）；第二层只写组成那一组（占本轮输入多少，每一条的 Token 在下面的「输入内容」里）。
 * bracket：组成条下面一道括号，从开头量到 tokens（已缓存 / 可走缓存的那一段）。
 * compose = false：只画上下文长度条（含最大回复长度）和它的图例（第一层「输入」卡片用）。
 * compose = true（第二层）：只讲本轮输入：上下文条只画本轮输入那一段，右上写「本轮输入 N%」，不写最大回复长度。
 */
export function ContextZoom({ cap, used, bracket, compose = true }: { cap: Capture; used: number; bracket?: { tokens: number; label: string } | null; compose?: boolean }) {
  const b = cap.budget;
  const limit = b?.context || 0;
  const reply = b?.reply || 0;
  const pct = showPct.value;
  const { sent, unsent } = floorsOf(cap);
  const sentFloors = [...new Set(sent)].sort((a, c) => a - c);
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
  for (const x of pieces) totals.set(x.part, (totals.get(x.part) ?? 0) + x.tokens);
  const legend = [...totals.keys()].sort((a, c) => (totals.get(c) ?? 0) - (totals.get(a) ?? 0));
  const share = (x: Part) => { const pc = used ? ((totals.get(x) ?? 0) / used) * 100 : 0; return pc > 0 && pc < 1 ? '<1%' : `${Math.round(pc)}%`; };
  const partName = (x: Part) => (x === 'chat' && sentFloors.length ? `聊天记录（${floorsText(sentFloors)}）` : PART_NAME[x]);
  const cpct = (n: number) => `${Math.max(0, Math.min(100, (n / (used || 1)) * 100))}%`;
  const br = bracket && bracket.tokens > 0 ? bracket : null;
  // 上下文长度条：接口算的 Token 和酒馆算的可能差一点，超过上限时按实际总数画，写「已满」。
  // 第二层只讲本轮输入：比例和「已满」都不算最大回复长度
  const taken = compose ? used : used + reply;
  const whole = Math.max(limit, taken);
  /** 占上下文长度的百分比（图例和第二层右上角） */
  // 分母都是上下文长度（两层一样）；超出时各项加起来会超过 100%
  const ofLimit = (n: number) => { const pc = (n / (limit || whole || 1)) * 100; return pc > 0 && pc < 1 ? '<1%' : `${Math.round(pc)}%`; };
  const p = (n: number) => Math.max(0, Math.min(100, (n / (whole || 1)) * 100));
  // 「已满」：有楼层没发出去，或者真的到了上限（不是快到了），和旁边的数对得上
  const full = unsent.other.length > 0 || taken >= limit;
  const free = Math.max(0, limit - used - reply);
  // 本轮输入太细时也画出至少 1%，虚线才有地方连
  const inPct = Math.max(1, p(used));
  return (
    <>
      {/* 第一层：占比写在图例里；第二层没有图例，右边写本轮输入占多少 */}
      {limit > 0 && <BarCap left={<>上下文长度 {fmtTokens(limit)} Token<EditLink field="context" /></>} right={full ? '已满' : compose ? `本轮输入 ${ofLimit(used)}` : undefined} />}
      {/* 三块叠在一起、中间不留缝：梯形的上边对齐「本轮输入」那一段，下边对齐整条组成条 */}
      <div class="rbt-zoom-stack">
      {limit > 0 && (
        <>
          <div class="rbt-tbar rbt-meter" role="img" aria-label={`上下文长度 ${limit} Token，本轮输入 ${used}，最大回复长度 ${reply}`}>
            <i style={{ width: `${inPct}%`, background: C_INPUT }} />
            {!compose && reply > 0 && <i class="reserve" style={{ width: `${p(reply)}%` }} />}
          </div>
          {compose && <div class="rbt-zoom" aria-hidden="true">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none">
              <polygon points={`0,0 ${inPct},0 100,24 0,24`} />
            </svg>
          </div>}
        </>
      )}
      {compose && <div class={`rbt-cbar ${br ? 'has-cache' : ''}`} role="img" aria-label={`本轮输入约 ${used} Token`}>
        {pieces.map((x, i) => <i key={i} style={{ width: cpct(x.tokens), background: PART_COLOR[x.part] }} />)}
        {br && <span class="rbt-bracket" style={{ width: cpct(Math.min(br.tokens, used)) }}><span>{br.label}<small>t</small></span></span>}
      </div>}
      </div>
      {/* 图例放在一起：先上下文（Token），再本轮输入的组成（占比） */}
      <div class="rbt-legend-block">
        {limit > 0 && !compose && (
          <div class="rbt-legend2">
            <span><i class="rbt-swatch" style={{ background: C_INPUT }} />本轮输入 <b>{pct ? ofLimit(used) : tok(used)}</b></span>
            {/* 最大回复长度：上下文里给 AI 回复预留的那一段（酒馆预设里的设置） */}
            {reply > 0 && <span><i class="rbt-swatch hatch" />最大回复长度 <b>{pct ? ofLimit(reply) : tok(reply)}</b><EditLink field="reply" /></span>}
            <span><i class="rbt-swatch free" />未使用 <b>{pct ? ofLimit(free) : tok(free)}</b></span>
          </div>
        )}
        {compose && <div class="rbt-legend2">
          {legend.map((x) => <span key={x}><i class="rbt-swatch" style={{ background: PART_COLOR[x] }} />{partName(x)} <b>{pct ? share(x) : tok(totals.get(x) ?? 0)}</b></span>)}
        </div>}
      </div>
    </>
  );
}

/** 总数右边的比较：比上一轮多 / 少多少（没有上一轮就不写） */
export function vsLast(delta: number | null): string {
  if (delta === null) return '';
  return delta > 0 ? `比上一轮多 ${fmtInt(delta)} Token` : delta < 0 ? `比上一轮少 ${fmtInt(-delta)} Token` : '与上一轮相同';
}

/** 「输入」卡片：总数和比较、出问题时的提醒（上下文已满、隐藏了楼层）；最下面一个按钮进第二层「输入明细」。 */
export function ContextSection({ cap, v, onOpenSent }: { cap: Capture; v: SentView; onOpenSent: () => void }) {
  const u = cap.usage;
  const b = cap.budget;
  const preview = cap.genType === 'preview';
  const exact = !!u?.input;
  const used = exact ? u!.input : cap.result.totalTokens;
  const { sent, unsent } = floorsOf(cap);
  const sentFloors = [...new Set(sent)].sort((a, c) => a - c);
  // 酒馆自带的「总结」「向量记忆」插进来的内容有固定标记，认得准；第三方插件靠名字猜不准，不算
  const memory = [...new Set(cap.result.messages.flatMap((m) => m.segments.map((s) => s.label)))]
    .map((l) => ({ '总结（Summarize）': '总结', '向量记忆': '向量记忆' } as Record<string, string>)[l]).find(Boolean);
  return (
    <Sec title="输入" right={<UnitToggle />}>
      <div class="rbt-in-top">
        <Big label={preview ? '预计本轮输入' : undefined} value={`${exact ? '' : '约 '}${fmtInt(used)}`} unit="Token" />
        {v.delta !== null && <span class="rbt-in-cmp">{vsLast(v.delta)}</span>}
      </div>
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
      {/* 第一层只画上下文长度条；放大和组成条在第二层「输入明细」 */}
      <ContextZoom cap={cap} used={used} compose={false} />
      <button type="button" class="rbt-btn rbt-in-btn" onClick={onOpenSent}>查看输入明细 <i class="fa-solid fa-chevron-right" aria-hidden="true" /></button>
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

// ---------------------------------------------------------------- 回复 ---

/** 用时不到 10 秒写一位小数（1.7 秒），不然 360 Token ÷ 2 秒 和速度对不上。 */
// 10 秒以内都留一位小数（「1.0 秒」），同一行里几个数写法一样
const sec = (ms: number) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)} 秒` : fmtDuration(ms));

/** 本轮这条回复的用时三段（取整后补差，三段加起来正好是合计）。没量到用时返回 null。 */
function timingOf(u: ReplyUsage): { wait: number; think: number; write: number; total: number } | null {
  if (u.wait == null) return null;
  const r100 = (ms: number) => Math.round(ms / 100) * 100;
  // 合计按原始数取整（和「平均回复用时」一样）；三段各自取整后差的那一点补到最长的一段上
  const parts = [r100(u.wait ?? 0), r100(u.think ?? 0), r100(u.write ?? 0)];
  const total = r100((u.wait ?? 0) + (u.think ?? 0) + (u.write ?? 0));
  parts[parts.indexOf(Math.max(...parts))] += total - parts[0] - parts[1] - parts[2];
  return { wait: parts[0], think: parts[1], write: parts[2], total };
}

/** 「回复」：AI 写了多少 Token，占最大回复长度多少，思考和正文各多少。预览还没写，不显示。 */
export function OutputSection({ cap }: { cap: Capture }) {
  const u: ReplyUsage | undefined = cap.usage;
  if (cap.genType === 'preview') return null;
  const head = (body: preact.ComponentChildren) => <Sec title="回复" right={<UnitToggle />}>{body}</Sec>;
  if (!u || (!u.output && u.wait == null)) return head(<p class="rbt-sec-note">写完后显示。</p>);
  const out = u.output ?? 0;
  const thinkTokens = u.reasoning ?? 0;
  const text = Math.max(0, out - thinkTokens);
  const limit = cap.budget?.reply || 0;
  // 条：按最大回复长度画，看得出写满了多少
  const pct = (n: number) => `${Math.min(100, (n / (limit || out || 1)) * 100)}%`;
  // 图例：数值是 Token；占比是占最大回复长度多少（没有这个设置时占这一轮回复多少）
  const val = (n: number) => (showPct.value ? pctText(n, limit || out) : tok(n));
  return head(
    <>
      <Big value={fmtInt(out)} unit="Token" sub={limit > 0 ? <>最大回复长度 {fmtInt(limit)} Token 的{usedPct(out, limit).startsWith('不到') ? '' : ' '}{usedPct(out, limit)}<EditLink field="reply" /></> : undefined} />
      {out > 0 && (
        <div class="rbt-tbar rbt-meter">
          {thinkTokens > 0 && <i style={{ width: pct(thinkTokens), background: C_THINK }} />}
          <i style={{ width: pct(text), background: C_WRITE }} />
        </div>
      )}
      <div class="rbt-legend2">
        {thinkTokens > 0 && <span><i class="rbt-swatch" style={{ background: C_THINK }} />思考 <b>{val(thinkTokens)}</b></span>}
        <span><i class="rbt-swatch" style={{ background: C_WRITE }} />正文回复 <b>{val(text)}</b></span>
        {limit > out && <span><i class="rbt-swatch free" />未使用 <b>{val(limit - out)}</b></span>}
      </div>
    </>,
  );
}

/** 「回复用时」：从发送消息到 AI 完成回复，分等待、思考、正文三段，和平均比。没量到用时不显示。 */
export function TimeSection({ cap }: { cap: Capture }) {
  const avg = useChatAverages();
  const u: ReplyUsage | undefined = cap.usage;
  if (cap.genType === 'preview' || !u) return null;
  const t = timingOf(u);
  if (!t) return null;
  const text = Math.max(0, (u.output ?? 0) - (u.reasoning ?? 0));
  const speed = text && t.write > 1000 ? `正文回复速度：${Math.round(text / (t.write / 1000))} Token/秒` : '';
  const tpct = (n: number) => `${t.total ? (n / t.total) * 100 : 0}%`;
  const side = Object.entries(u.side ?? {}).filter(([, x]) => x.ms);
  const tv = (ms: number) => (showPct.value ? pctText(ms, t.total) : sec(ms));
  return (
    <Sec title="回复用时" right={<UnitToggle />}>
      <Big value={sec(t.total)} sub={vsAvg(t.total, avg.time, sec, '比平均慢', '比平均快', 1000)} />
      <div class="rbt-tbar">
        <i style={{ width: tpct(t.wait), background: C_WAIT }} />
        {t.think > 0 && <i style={{ width: tpct(t.think), background: C_THINK }} />}
        <i style={{ width: tpct(t.write), background: C_WRITE }} />
      </div>
      <div class="rbt-legend2">
        <span><i class="rbt-swatch" style={{ background: C_WAIT }} />等待 <b>{tv(t.wait)}</b></span>
        {t.think > 0 && <span><i class="rbt-swatch" style={{ background: C_THINK }} />思考 <b>{tv(t.think)}</b></span>}
        <span><i class="rbt-swatch" style={{ background: C_WRITE }} />正文回复 <b>{tv(t.write)}</b></span>
      </div>
      {speed && <p class="rbt-sec-note">{speed}</p>}
      {/* 插件在后台另外找 AI 的请求：可能和回复同时跑，也可能写完才开始，所以单独列，不算进上面的回复用时 */}
      {/* 一道分隔线和上面的回复用时分开；表头、行和「花费」那张表同一个样子。插件用时不算进回复用时，所以一直写秒 */}
      {side.length > 0 && (
        <div class="rbt-ctable no-money rbt-subtable">
          <div class="rbt-ctr th"><span>插件后台调用（不计入回复用时）</span><span>用时</span></div>
          {side.map(([key, x]) => (
            <div key={key} class="rbt-ctr"><span><span><b>{pluginName(key) || '未识别的插件'}</b><small>{x.count} 次</small></span></span><span>{sec(x.ms ?? 0)}</span></div>
          ))}
        </div>
      )}
    </Sec>
  );
}

/** 下拉里每一轮的名字：「第 212 楼回复 · 14:50」「第 212 楼回复 · 重新生成 · 14:50」「预览 · 14:50」「插件后台调用 · 14:50」。 */
export function roundTitle(c: Capture): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  // 不是今天的（刷新后从浏览器里读回来的旧轮次）前面加日期，免得当成今天的
  const today = new Date().toDateString() === c.time.toDateString();
  const t = `${today ? '' : `${p2(c.time.getMonth() + 1)}-${p2(c.time.getDate())} `}${p2(c.time.getHours())}:${p2(c.time.getMinutes())}`;
  if (c.genType === 'preview') return `预览 · ${t}`;
  if (c.targetFloor === null) return `${c.genTypeLabel} · ${t}`;
  const kind = ['swipe', 'regenerate'].includes(c.genType) ? '重新生成' : c.genType === 'continue' ? '继续' : '';
  return [`第 ${c.targetFloor} 楼回复`, kind, t].filter(Boolean).join(' · ');
}

export { cacheBreak };
