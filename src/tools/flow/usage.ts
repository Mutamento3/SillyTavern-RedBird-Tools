/**
 * 信息流 › 用量：记下每条回复的用量和用时，生成时显示小红鸟和计时，写完在聊天里显示一行。
 *
 * 只是给人看的，不能拖慢酒馆：
 * - 用量从接口回复的副本里读（res.clone），不改请求和回复；只解析带 "usage" 的那几行。
 * - 写进消息是在 MESSAGE_RECEIVED 里（酒馆等它跑完才存档），所以不用为它多存一次聊天。
 * - 收到每一段字时只比一下长度；页面每秒改一次字，只在生成时。小红鸟不动，只有那一行字上扫一道光（CSS）。
 */
import { signal } from '@preact/signals';
import { floorStats, fmtDuration, fmtMoney, parseUsage, phaseOf, readSide, readTiming, readUsage, sideCost, splitClock, usageFrom, type FloorStat, type GenClock, type ReplyUsage } from '../../core/usage';
import { cacheBreak, type Price } from '../../core/costSplit';
import { captures, flowFocus, mainPromptAt } from './capture';
import { openView } from '../../ui/views';
import { fmtTokens } from '../../ui/common';
import { USAGE_COPY as T } from '../../ui/copy';
import { ctx, loaded, saveSettings, settings, type Any } from '../../st/st';
import { slow } from '../../st/perf';

const GEN_URL = /\/api\/(backends\/chat-completions\/generate|plugins\/reply-keeper\/(generate|replay))/;
const SEEN_KEY = 'rbt_usage_seen';
/** 收到新内容后多久没动静算「卡住」 */
const STALL_MS = 20_000;

/** 设置一改，信息流里的开关跟着重画 */
export const usageTick = signal(0);

// ---------------------------------------------------------------- 设置 ---

export const timerOn = (): boolean => !!ctx().powerUserSettings?.timer_enabled;
export const tokensOn = (): boolean => !!ctx().powerUserSettings?.message_token_count_enabled;
export const costOn = (): boolean => settings().showCost !== false;

/** 「用时」「tokens」就是酒馆自己的两个设置：去点酒馆的勾，让它自己改、自己存。 */
function setStCheckbox(id: string, v: boolean): void {
  const el = window.jQuery?.(`#${id}`);
  if (!el?.length) return;
  el.prop('checked', v).trigger('input');
}
// 点了酒馆的勾，下面 installUsage 里的 input 监听会重画
export function setTimerOn(v: boolean): void { setStCheckbox('messageTimerEnabled', v); }
export function setTokensOn(v: boolean): void { setStCheckbox('messageTokensEnabled', v); }
export function setCostOn(v: boolean): void { settings().showCost = v; saveSettings(); renderAll(); usageTick.value++; }
export const birdOn = (): boolean => settings().showBird !== false;
export function setBirdOn(v: boolean): void { settings().showBird = v; saveSettings(); paintRow(); usageTick.value++; }

// ------------------------------------------------------------ 正在生成 ---

interface Gen {
  clock: GenClock;
  /** 这一轮的正文请求已经认领了（后面的请求算插件在后台发的） */
  claimed: boolean;
  usage: Promise<ReplyUsage | null> | null;
  textLen: number;
  thinkLen: number;
  endAt: number | null;
  type: string;
  /** 开始时聊天有几楼：这之后出现的 AI 楼才是这一轮写的 */
  startLen: number;
  /** 玩家点了停止 */
  stopped: boolean;
  /** 发送那部分约多少钱（第一次估价时算；undefined = 还没算，null = 算不了） */
  send: number | null | undefined;
  /** 每个字大约几个 token */
  ratio: number;
  /** 上一条回复用的模型（不是 OpenRouter 时拿它查单价） */
  model: string;
  /** 结束后过了一会儿还没收到这一楼（出错了，或者别的插件让酒馆等很久）：小红鸟那一行不再等它 */
  expired: boolean;
}
let cur: Gen | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;

const seen = new Set<string>(loadSeen());
function loadSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
}
function remember(id: string): void {
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-400))); } catch { /* 无痕模式等 */ }
}

function lastAi(): number {
  const chat: Any[] = ctx().chat ?? [];
  for (let i = chat.length - 1; i >= 0; i--) if (!chat[i].is_user && !chat[i].is_system) return i;
  return -1;
}

/** 写进消息，也写进现在这个回复版本（换版本时跟着走）。 */
function setExtra(message: Any, key: string, value: unknown): void {
  message.extra ??= {};
  const sw = message.swipe_info?.[message.swipe_id ?? 0];
  if (sw) sw.extra ??= {};
  for (const target of [message.extra, sw?.extra]) {
    if (!target) continue;
    if (value === undefined) delete target[key];
    else target[key] = value;
  }
}

let saveQueued: ReturnType<typeof setTimeout> | null = null;
function saveSoon(): void {
  if (saveQueued) return;
  saveQueued = setTimeout(() => { saveQueued = null; void ctx().saveChat?.(); }, 2000);
}

const blankUsage = (): ReplyUsage => ({ model: '', input: 0, cached: null, output: 0, reasoning: null, cost: null });

/**
 * 插件在后台发的请求：按插件记，算在最近一条回复上。改在原来那份记录上（信息流里「这一轮」拿的是同一份）。
 * plugin：插件文件夹（'' = 认不出）；ms：这次请求等了多久。
 */
function addSide(u: ReplyUsage, plugin: string, ms: number): void {
  const i = lastAi();
  if (i < 0) return;
  const m = ctx().chat[i];
  let own = m.extra?.rbt_usage as ReplyUsage | undefined;
  if (!own) { own = readUsage(m.extra) ?? blankUsage(); setExtra(m, 'rbt_usage', own); }
  const side = readSide(own.side);
  const s = side[plugin] ?? { count: 0, cost: null, input: 0, output: 0, ms: 0, model: '' };
  side[plugin] = {
    count: s.count + 1,
    cost: u.cost != null ? (s.cost ?? 0) + u.cost : s.cost,
    input: s.input + u.input,
    output: s.output + u.output,
    ms: s.ms + ms,
    model: u.model || s.model,
  };
  own.side = side;
  // 刷新后 extra 和这个回复版本里是两份：两份都换成这一份
  setExtra(m, 'rbt_usage', own);
  renderOne(i);
  usageTick.value++;
  saveSoon();
}

/** 这次请求是哪个插件发的：看调用栈里的插件文件夹（/scripts/extensions/third-party/xxx/ 或酒馆自带的 /scripts/extensions/xxx/）。 */
function callerPlugin(): string {
  const stack = new Error().stack ?? '';
  for (const m of stack.matchAll(/\/scripts\/extensions\/(third-party\/[^/]+|[^/]+)\//g)) {
    // 跳过工具箱自己（包 fetch 的就是它）
    if (!/redbird/i.test(m[1])) return decodeURIComponent(m[1]);
  }
  return '';
}

/** 插件在界面上的名字（插件 manifest 的 display_name）。 */
export function pluginName(key: string): string {
  if (!key) return '';
  const short = key.replace('third-party/', '');
  try { return loaded.extensions?.getExtensionManifest?.(key)?.display_name || short; } catch { return short; }
}

/** 模型在 OpenRouter 的价格（每个 token 多少美元）。只有主接口是 OpenRouter、酒馆读过模型列表时才有。 */
export function priceFor(model: string): Price | null {
  if (!model) return null;
  const list: Any[] = loaded.openai?.model_list ?? [];
  const p = list.find((x) => x?.id === model)?.pricing;
  const n = (v: unknown) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const prompt = n(p?.prompt), completion = n(p?.completion);
  if (prompt == null || completion == null) return null;
  return { prompt, completion, cacheRead: n(p?.input_cache_read) };
}

function readFrom(res: Response): Promise<ReplyUsage | null> {
  if (!res.ok || !res.body) return Promise.resolve(null);
  return res.clone().text().then((text) => {
    const found = parseUsage(text);
    if (!found) return null;
    if (found.id) {
      if (seen.has(found.id)) return null;
      remember(found.id);
    }
    return usageFrom(found);
  }).catch(() => null);
}

function wrapFetch(): void {
  const native = window.fetch;
  window.fetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    const p = native.call(this, input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url ?? '';
    if (!GEN_URL.test(url)) return p;
    // 这一轮的提示词拼好后的第一个请求算正文；之前和之后的（总结、配图标签、回复建议…）算插件在后台发的
    const main = cur && !cur.claimed && mainPromptAt >= cur.clock.start ? cur : null;
    if (main) main.claimed = true;
    const plugin = main ? '' : callerPlugin();
    const t0 = Date.now();
    const usage = p.then(readFrom, () => null);
    if (main) main.usage = usage;
    else void usage.then((u) => { if (u) addSide(u, plugin, Date.now() - t0); });
    return p;
  } as typeof fetch;
}

function onStart(type: string, params: Any, dryRun: boolean): void {
  if (dryRun || params?.quiet_prompt || type === 'quiet' || type === 'impersonate') return;
  const now = Date.now();
  cur = { clock: { start: now, thinkAt: null, writeAt: null, lastAt: now }, claimed: false, usage: null, textLen: 0, thinkLen: 0, endAt: null, type, startLen: ctx().chat?.length ?? 0, stopped: false, expired: false, send: undefined, ...lastReply() };
  if (ticker) clearInterval(ticker);
  ticker = setInterval(paintRow, 1000);
  paintRow();
  // 重新生成 / 继续：这一楼下面还挂着上一版的数字，先藏起来（renderOne 认得正在写的楼）
  const i = genIndex(cur);
  if (i >= 0) renderOne(i);
}

/** 这一轮正在写的那一楼。还没出现（酒馆还没加上）= -1，不能把上一楼当成它。 */
function genIndex(g: Gen): number {
  const chat: Any[] = ctx().chat ?? [];
  const i = chat.length - 1;
  const m = chat[i];
  if (!m || m.is_user || m.is_system) return -1;
  return i >= g.startLen || ['swipe', 'regenerate', 'continue'].includes(g.type) ? i : -1;
}

/** 开头的 <think>…</think> 是思考，不算正文（酒馆会把它挪进思考块） */
const THINK_HEAD = /^\s*<(think|thinking|reasoning)>[\s\S]*?(<\/\1>|$)/i;

function onToken(text: unknown): void {
  const g = cur;
  if (!g || g.endAt) return;
  const now = Date.now();
  const raw = typeof text === 'string' ? text : '';
  const body = raw.replace(THINK_HEAD, '').trim();
  const len = body.length;
  const i = genIndex(g);
  const m = i >= 0 ? ctx().chat[i] : null;
  const reasoning = typeof m?.extra?.reasoning === 'string' ? m.extra.reasoning.length : 0;
  const think = Math.max(reasoning, raw.trim().length - len);
  const before = phaseOf(g.clock);
  if (len > g.textLen) { g.textLen = len; g.clock.lastAt = now; if (g.clock.writeAt == null) g.clock.writeAt = now; }
  if (think > g.thinkLen) { g.thinkLen = think; g.clock.lastAt = now; if (g.clock.thinkAt == null && g.clock.writeAt == null) g.clock.thinkAt = now; }
  if (phaseOf(g.clock) !== before) paintRow();
}

function stopTicker(): void {
  if (ticker) { clearInterval(ticker); ticker = null; }
}

/** 酒馆点停止时先发「生成结束」再发「停止」：所以这里不看是不是已经结束了 */
function onStop(): void {
  if (cur) cur.stopped = true;
  onEnd();
}

function onEnd(): void {
  if (!cur || cur.endAt) return;
  const g = cur;
  g.endAt = Date.now();
  stopTicker();
  const i = genIndex(g);
  if (i >= 0) renderOne(i);
  paintRow();
  // 过一会儿还没收到这一楼（出错了，或者别的插件让酒馆等很久）：小红鸟那一行不再等它。
  // 这一轮不丢：晚到的 MESSAGE_RECEIVED 照样记，下一轮开始时才换掉
  setTimeout(() => { if (cur === g && !g.expired) { g.expired = true; paintRow(); } }, 5000);
}

async function onReceived(id: unknown, type: unknown): Promise<void> {
  const g = cur;
  if (!g || type === 'first_message' || type === 'impersonate') return;
  const i = Number(id);
  const m = ctx().chat?.[i];
  // 只认这一轮写的那一楼（新加的，或者重新生成 / 继续的那一楼）
  if (!m || m.is_user || !(i >= g.startLen || ['swipe', 'regenerate', 'continue'].includes(g.type))) return;
  cur = null;
  stopTicker();
  const end = g.endAt ?? Date.now();
  // 用量通常已经读好了；最多等 1 秒，别让酒馆存档等太久。没等到的稍后补上再存
  const timeout = new Promise<'late'>((r) => setTimeout(() => r('late'), 1000));
  const got = g.usage ? await Promise.race([g.usage, timeout]) : null;
  const split = splitClock(g.clock, end);
  // 这一轮抓到的提示词（信息流「这一轮」）：用量也挂到它上面，花费明细要用
  const cap = captures.value.find((c) => c.targetFloor === i && c.genType !== 'preview' && c.time.getTime() >= g.clock.start - 2000);
  const write = (u: ReplyUsage | null, side?: ReplyUsage['side']) => {
    // 重新生成时酒馆会把上一版的附加信息带过来：插件在后台花的从零记（用量晚到时留着这期间记下的）
    const rec: ReplyUsage = { ...(u ?? blankUsage()), ...split, ...(g.stopped ? { stopped: true } : {}), ...(side ? { side } : {}) };
    setExtra(m, 'rbt_usage', rec);
    if (cap) { cap.usage = rec; captures.value = [...captures.value]; }
  };
  if (got === 'late') {
    write(null);
    void g.usage!.then((u) => { if (u) { write(u, (m.extra?.rbt_usage as ReplyUsage | undefined)?.side); renderOne(i); saveSoon(); } });
  } else write(got);
  renderOne(i);
}

// ------------------------------------------------------------ 边写边估价 ---

/** 上一条有记录的回复：用的哪个模型，每个字大约几个 token（估写出来的那部分用，没有就按 1）。 */
function lastReply(): { model: string; ratio: number } {
  const chat: Any[] = ctx().chat ?? [];
  for (let i = chat.length - 1; i >= 0; i--) {
    const m = chat[i];
    const u = m.is_user ? null : readUsage(m.extra);
    const chars = String(m.mes ?? '').length + String(m.extra?.reasoning ?? '').length;
    if (u?.output && chars) return { model: u.model, ratio: Math.min(3, Math.max(0.2, u.output / chars)) };
  }
  return { model: '', ratio: 1 };
}

/**
 * 正在生成的这一轮大约花了多少钱（查得到单价时）。
 * 发送的部分按抓到的提示词算；上一条回复用上了缓存，就把和上一轮一样的开头按缓存价算。写出来的按字数估。
 */
function liveCost(g: Gen): number | null {
  if (!costOn()) return null;
  // 单价：主接口是 OpenRouter 就看现在选的模型，不是就看上一条回复实际用的模型（OpenRouter 兼容的中转也查得到）
  const s = ctx().chatCompletionSettings;
  const price = priceFor(s?.chat_completion_source === 'openrouter' ? String(s.openrouter_model ?? '') : g.model);
  if (!price) return null;
  if (g.send === undefined) {
    const list = captures.value;
    const cap = list.find((c) => c.genType !== 'quiet' && c.genType !== 'preview' && c.time.getTime() >= g.clock.start - 2000);
    if (!cap) return null;
    const input = cap.result.messages.reduce((n, m) => n + m.tokens, 0);
    const prev = list.slice(list.indexOf(cap) + 1).find((c) => c.chatId === cap.chatId && c.genType !== 'quiet' && c.genType !== 'preview');
    const usedCache = (prev?.usage?.cached ?? 0) > 0;
    const cached = usedCache && prev && price.cacheRead != null ? Math.min(input, cacheBreak(prev.result.messages, cap.result.messages).same) : 0;
    g.send = (input - cached) * price.prompt + cached * (price.cacheRead ?? price.prompt);
  }
  return (g.send ?? 0) + (g.thinkLen + g.textLen) * g.ratio * price.completion;
}

// --------------------------------------------------------- 小红鸟那一行 ---

const LIVE = 'rbt-gen';

function liveTarget(g: Gen): Element | null {
  const i = genIndex(g);
  return i < 0 ? null : document.querySelector(`#chat > .mes[mesid="${i}"]`);
}

/** 酒馆的停止按钮还在 = 还在生成。 */
function generating(): boolean {
  const stop = document.getElementById('mes_stop');
  return !!stop && getComputedStyle(stop).display !== 'none';
}

/** 一条回复的花费：总数，有插件就在括号里写插件那部分。没有金额 = ''。 */
function moneyOf(u: ReplyUsage): { full: string; short: string } | null {
  const sc = sideCost(u.side);
  if (u.cost == null && !sc) return null;
  const total = fmtMoney((u.cost ?? 0) + (sc ?? 0));
  return { full: sc ? `${total}${T.sideCost(fmtMoney(sc))}` : total, short: total };
}

/** 写完以后，最新一楼底下那一行：写完了 / 已停止 · 用时 · tokens（或字数）· 花费。没有记录 = ''。 */
function doneText(m: Any): string {
  const u = readUsage(m.extra);
  if (!u) return '';
  const t = readTiming(m, u.output || null);
  if (u.stopped) {
    const chars = String(m.mes ?? '').length;
    return [T.liveStopped, t?.ok ? fmtDuration(t.total) : '', chars ? T.liveChars(chars) : ''].filter(Boolean).join(' · ');
  }
  const money = costOn() ? moneyOf(u)?.full ?? '' : '';
  return [T.liveDone, t?.ok ? fmtDuration(t.total) : '', u.output ? T.liveTokens(u.output) : '', money].filter(Boolean).join(' · ');
}

/**
 * 小红鸟那一行，只有一行，跟着最新一楼：
 * - 生成时：正在干什么 · 过了多久 · 写了多少字 · 约花了多少（每秒更新）
 * - 写完后：留在最新一楼的正文下面，写这一楼的结果；插件后来花的钱也会加上
 */
function paintRow(): void {
  const t0 = performance.now();
  const g = cur;
  const now = Date.now();
  let mes: Element | null;
  let text: string;
  let state: string;
  let writing: boolean;
  if (g && !g.endAt) {
    // 有的失败（比如没连上接口）不发「生成结束」：停止按钮不在了就当结束了
    if (now - g.clock.start > 1500 && !generating()) { onEnd(); return; }
  }
  // 关掉了：什么都不显示，酒馆自己的「…」也照常显示
  if (!birdOn()) {
    document.querySelectorAll(`#chat .${LIVE}`).forEach((x) => x.remove());
    document.querySelectorAll('#chat .rbt-gen-waiting').forEach((x) => x.classList.remove('rbt-gen-waiting'));
    return;
  }
  if (g && !g.endAt) {
    const phase = phaseOf(g.clock);
    const stalled = phase !== 'wait' && now - g.clock.lastAt >= STALL_MS;
    const label = phase === 'wait' ? T.liveWait : phase === 'think' ? T.liveThink : T.liveWrite;
    const chars = phase === 'think' ? g.thinkLen : phase === 'write' ? g.textLen : 0;
    const cost = stalled ? null : liveCost(g);
    text = [label, fmtDuration(now - g.clock.start), stalled ? T.liveStalled(fmtDuration(now - g.clock.lastAt)) : chars ? T.liveChars(chars) : '', cost != null ? T.liveAbout(fmtMoney(cost)) : ''].filter(Boolean).join(' · ');
    state = stalled ? 'stall' : phase;
    mes = liveTarget(g);
    // 「继续」时这一楼已经有字了：一直放在正文下面，不藏正文
    writing = phase === 'write' || g.type === 'continue';
  } else {
    // 刚写完，等酒馆把这一楼存好（MESSAGE_RECEIVED，一般一秒内）：先不动
    if (g && !g.expired) return;
    const chat: Any[] = ctx().chat ?? [];
    const i = chat.length - 1;
    const m = chat[i];
    text = m && !m.is_user && !m.is_system ? doneText(m) : '';
    mes = text ? document.querySelector(`#chat > .mes[mesid="${i}"]`) : null;
    if (!mes) text = '';
    state = readUsage(m?.extra)?.stopped ? 'stopped' : 'done';
    writing = true;
  }
  document.querySelectorAll('#chat .rbt-gen-waiting').forEach((x) => { if (x !== mes || writing) x.classList.remove('rbt-gen-waiting'); });
  let row = document.querySelector<HTMLElement>(`#chat .${LIVE}`);
  if (!text) { row?.remove(); slow('小红鸟那一行', t0); return; }
  if (!row) {
    row = document.createElement('div');
    row.className = LIVE;
    row.setAttribute('role', 'status');
    row.innerHTML = '<i class="rbt-gen-bird fa-solid fa-crow" aria-hidden="true"></i><span></span>';
  }
  // 放哪：流式输出时酒馆一开始就加好了这条消息（正文是「…」）。还没出字时小鸟替掉「…」，出字后挪到正文下面。
  // 不流式时消息要写完才出现，先放在聊天最下面。
  const textEl = mes?.querySelector(':scope > .mes_block > .mes_text');
  if (mes && textEl) {
    if (!writing) mes.classList.add('rbt-gen-waiting');
    const anchor = writing ? textEl.nextElementSibling : textEl;
    if (row.nextElementSibling !== anchor || row.parentElement !== textEl.parentElement) textEl.parentElement!.insertBefore(row, anchor);
    if (row.style.paddingLeft) row.style.paddingLeft = '';
  } else {
    // 还没有这一轮的消息：放在聊天最下面。酒馆随后才把玩家刚发的消息加进来，所以每次都确认小鸟还在最后
    const chat = document.getElementById('chat');
    if (chat && chat.lastElementChild !== row) {
      // 本来就看着最底下的话，挪完也滚到底，不然它在输入框下面看不到
      const atBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 160;
      chat.append(row);
      if (atBottom) chat.scrollTop = chat.scrollHeight;
    }
    // 和上一条消息的正文左边对齐（电脑上正文在头像右边，手机上在最左边）。
    // 每次都量：刚加进来的消息要等工具箱排完版（手机上头像挪到名字旁边），正文才到最终的位置
    const msgs = chat?.querySelectorAll(':scope > .mes');
    const last = msgs?.[msgs.length - 1]?.querySelector(':scope > .mes_block > .mes_text');
    if (last) {
      const pad = `${Math.max(0, Math.round(last.getBoundingClientRect().left - row.getBoundingClientRect().left))}px`;
      if (row.style.paddingLeft !== pad) row.style.paddingLeft = pad;
    }
  }
  if (row.dataset.s !== state) row.dataset.s = state;
  const span = row.lastElementChild!;
  if (span.textContent !== text) span.textContent = text;
  slow('小红鸟那一行', t0);
}

// ------------------------------------------------------- 聊天里的一行 ---

const LINE = 'rbt-mes-usage';

/**
 * 一条消息名字下面（手机）或头像下面（电脑）那一行：用时 · tokens · 花费。
 * short 是电脑上头像下面那一窄栏用的短写法（和酒馆原来的「42t」一样短）。
 */
export function lineParts(m: Any): { full: string; short: string }[] {
  const u = readUsage(m.extra);
  const parts: { full: string; short: string }[] = [];
  const tokens = u?.output || Number(m.extra?.token_count) || null;
  if (timerOn() && !m.is_user) {
    const t = readTiming(m, tokens);
    if (t?.ok) { const d = fmtDuration(t.total); parts.push({ full: d, short: d.replace(/ /g, '') }); }
  }
  if (tokensOn() && tokens) parts.push({ full: `${fmtTokens(tokens)} tokens`, short: `${fmtTokens(tokens)}t` });
  // 写一个总数（这条回复 + 插件在后台为它花的），括号里说清插件那部分
  const money = costOn() && u ? moneyOf(u) : null;
  if (money) parts.push(money);
  return parts;
}

const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function renderOne(id: number): void {
  // 最新一楼变了（写完、插件又花了钱、换了版本）：小红鸟那一行也跟着改
  if (id === (ctx().chat?.length ?? 0) - 1) paintRow();
  const el = document.querySelector(`#chat > .mes[mesid="${id}"]`);
  const m = ctx().chat?.[id];
  if (!el || !m) return;
  const timer = el.querySelector('.mes_timer');
  if (!timer) return;
  let line = el.querySelector<HTMLElement>(`.${LINE}`);
  // 正在写这一楼：数字还是上一版的，等写完再显示（进度看小红鸟那一行）
  const busy = !!cur && !cur.endAt && genIndex(cur) === id;
  const parts = busy ? [] : lineParts(m);
  if (!parts.length) { line?.remove(); return; }
  if (!line) {
    line = document.createElement('div');
    line.className = LINE;
  }
  if (line.previousElementSibling !== timer) timer.after(line);
  const html = parts.map((p) => `<span data-short="${esc(p.short)}">${esc(p.full)}</span>`).join('');
  if (line.innerHTML !== html) line.innerHTML = html;
}

export function renderAll(): void {
  const t0 = performance.now();
  for (const el of document.querySelectorAll('#chat > .mes[mesid]')) renderOne(Number(el.getAttribute('mesid')));
  paintRow();
  slow('聊天里的用量', t0);
}

// ---------------------------------------------------------- 整段聊天 ---

/**
 * 这段聊天记到的花费：所有回复版本和插件在后台花的都算上（一楼一根柱子加起来就是这个总数）。
 * replies：有金额的回复版本数；used：有用量的回复版本数；tokens：这些回复加插件一共用的（接口没给金额时只能看这个）。
 */
export function chatCost(): { total: number; replies: number; tokens: number; used: number; since: string | null } {
  const floors = floorStats(ctx().chat ?? []);
  const sum = (f: (s: FloorStat) => number) => floors.reduce((n, s) => n + f(s), 0);
  return {
    total: sum((s) => s.cost ?? 0), replies: sum((s) => s.priced), tokens: sum((s) => s.tokens), used: sum((s) => s.used),
    since: floors.find((s) => s.cost != null || s.used)?.sendDate || null,
  };
}

/** OpenRouter 余额（主接口是 OpenRouter 时才查）。 */
export async function openRouterBalance(): Promise<{ remaining: number; total: number; used: number } | null> {
  if (ctx().chatCompletionSettings?.chat_completion_source !== 'openrouter') return null;
  try {
    const res = await fetch('/api/openrouter/credits', { method: 'POST', headers: ctx().getRequestHeaders(), body: '{}' });
    if (!res.ok) return null;
    const d = await res.json();
    const n = (v: unknown) => (typeof v === 'number' ? v : Number(v));
    if (!Number.isFinite(n(d.remaining))) return null;
    return { remaining: n(d.remaining), total: n(d.total_credits), used: n(d.total_usage) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- 装上 ---

export function installUsage(): void {
  wrapFetch();
  const c = ctx();
  const es = c.eventSource;
  const et = c.eventTypes;
  document.body.classList.add('rbt-usage');
  es.on(et.GENERATION_STARTED, onStart);
  es.on(et.STREAM_TOKEN_RECEIVED, onToken);
  es.on(et.GENERATION_ENDED, onEnd);
  es.on(et.GENERATION_STOPPED, onStop);
  es.on(et.MESSAGE_RECEIVED, onReceived);
  // 玩家的消息在生成开始后才加进聊天：马上把小鸟挪回最下面
  for (const ev of [et.USER_MESSAGE_RENDERED, et.MESSAGE_SENT]) if (ev) es.on(ev, () => setTimeout(paintRow, 0));
  for (const ev of [et.CHARACTER_MESSAGE_RENDERED, et.USER_MESSAGE_RENDERED, et.MESSAGE_SWIPED, et.MESSAGE_UPDATED, et.MESSAGE_EDITED]) {
    if (ev) es.on(ev, (id: unknown) => setTimeout(() => renderOne(Number(id)), 0));
  }
  for (const ev of [et.CHAT_CHANGED, et.MORE_MESSAGES_LOADED, et.MESSAGE_DELETED]) {
    if (ev) es.on(ev, () => setTimeout(renderAll, 50));
  }
  // 在酒馆「用户设置」里改了这两个勾，这边也跟着重画
  window.jQuery?.(document).on('input', '#messageTimerEnabled, #messageTokensEnabled', () => setTimeout(() => { renderAll(); usageTick.value++; }, 0));
  setTimeout(renderAll, 500);
  // 点每一楼的用量那一行、或者小红鸟那一行：打开聊天工具箱的「花费明细」，看这一楼那一轮
  document.getElementById('chat')?.addEventListener('click', (e) => {
    const hit = (e.target as Element | null)?.closest?.(`.${LINE}, .${LIVE}`);
    if (!hit) return;
    const mes = hit.closest('.mes[mesid]');
    flowFocus.value = mes ? Number(mes.getAttribute('mesid')) : null;
    openView('flow');
  });
}
