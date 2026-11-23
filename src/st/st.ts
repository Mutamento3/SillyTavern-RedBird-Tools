/**
 * Thin bridge to SillyTavern. Everything that touches ST internals lives here so
 * the rest of the code can stay testable and survive ST updates more easily.
 *
 * Two access paths:
 * - `SillyTavern.getContext()`: the stable public API.
 * - Dynamic imports of ST's own modules (/scripts/*.js). The browser module cache
 *   gives us the same live module instances ST uses (e.g. promptManager, selected_world_info).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { SIDE_EFFECT_MACRO } from '../core/macros';
import type { CardRecord, ModelChoice, RegexOwner, SourceRecord } from '../core/cards';

export type Any = any;

declare global {
  interface Window {
    SillyTavern?: { getContext: () => Any };
    toastr?: Any;
    jQuery?: Any;
  }
}

export function ctx(): Any {
  const st = window.SillyTavern;
  if (!st) throw new Error('SillyTavern context not available');
  return st.getContext();
}

const moduleCache = new Map<string, Promise<Any>>();

/** Import one of ST's modules by its public URL, e.g. '/scripts/openai.js'. Returns null if it fails. */
export async function stModule(url: string): Promise<Any | null> {
  if (!moduleCache.has(url)) {
    moduleCache.set(url, import(/* @vite-ignore */ url).catch((e) => {
      console.warn('[RedBird] failed to import', url, e);
      return null;
    }));
  }
  return moduleCache.get(url)!;
}

/**
 * 打开群聊（`chatId`：这个群的哪段聊天，不给就是它上次那段）。
 * 酒馆的 openGroupChat 只在已经选中这个群时换聊天，不会选中群，所以先用 openGroupById 选中群。
 */
export async function openGroup(groupId: string, chatId?: string): Promise<void> {
  if (!canSwitchChat()) return;
  const c = ctx();
  if (String(c.groupId ?? '') !== groupId) {
    const gc = await stModule('/scripts/group-chats.js');
    if (typeof gc?.openGroupById !== 'function') throw new Error('没找到酒馆打开群聊的功能');
    await gc.openGroupById(groupId);
  }
  // 酒馆没换过去（正在存档等）：不能接着换聊天，不然会把这个群的聊天开到别处
  if (String(ctx().groupId ?? '') !== groupId) return;
  const g = ctx().groups?.find((x: Any) => String(x.id) === groupId);
  if (chatId && g && g.chat_id !== chatId) await ctx().openGroupChat(groupId, chatId);
}

export const ST_MODULES = {
  openai: '/scripts/openai.js',
  worldInfo: '/scripts/world-info.js',
  extensions: '/scripts/extensions.js',
  regexEngine: '/scripts/extensions/regex/engine.js',
  powerUser: '/scripts/power-user.js',
  personas: '/scripts/personas.js',
} as const;

/** Preload modules once so later synchronous reads have them. */
export const loaded: { openai?: Any; worldInfo?: Any; extensions?: Any; regexEngine?: Any; personas?: Any } = {};

export async function preloadModules(): Promise<void> {
  const [openai, worldInfo, extensions, regexEngine, personas] = await Promise.all([
    stModule(ST_MODULES.openai),
    stModule(ST_MODULES.worldInfo),
    stModule(ST_MODULES.extensions),
    stModule(ST_MODULES.regexEngine),
    stModule(ST_MODULES.personas),
  ]);
  Object.assign(loaded, { openai, worldInfo, extensions, regexEngine, personas });
}

export function currentCharacter(): Any | null {
  const c = ctx();
  if (c.groupId) return null;
  const id = c.characterId;
  if (id === undefined || id === null || id === '') return null;
  return c.characters?.[Number(id)] ?? null;
}

/** ST uses the avatar file name without extension as a key for per-character lore (charLore). */
export function charaFileName(avatar: string | undefined): string {
  return (avatar ?? '').replace(/\.[^/.]+$/, '');
}

/** 正在生成回复，或有消息正在编辑（编辑框还没保存）。 */
/**
 * 正在生成回复时，酒馆不让换卡、换群（什么也不做，也不提示）。工具箱换聊天前先问一句，没法换就告诉玩家。
 */
export function canSwitchChat(): boolean {
  const stop = document.getElementById('mes_stop');
  if (!stop || getComputedStyle(stop).display === 'none') return true;
  toast('info', '回复还在生成，写完才能换聊天。想马上换，先点停止。');
  return false;
}

export function chatBusy(): boolean {
  if (document.querySelector('#chat .edit_textarea')) return true;
  const stop = document.getElementById('mes_stop');
  return !!stop && getComputedStyle(stop).display !== 'none';
}

let reloadWaiting = false;

/**
 * 用内存里的聊天把消息重画一遍（让正则的显示效果马上生效）。不从磁盘重新读：
 * 酒馆重新读聊天时如果网络断一下，会把存档覆盖成只剩开场白（见 chatGuard.ts），也会取消还没到点的自动保存。
 */
async function redrawChat(): Promise<void> {
  const c = ctx();
  if (typeof c.printMessages === 'function') {
    // 先把现在的消息和「显示更多消息」都拿掉再画：点过「显示更多」时，前面多出来的消息不会被重画，按钮还会跑到中间
    document.querySelectorAll('#chat > .mes, #show_more_messages').forEach((el) => el.remove());
    await c.printMessages();
    // 告诉插件消息重新画过了：酒馆助手收到这个会把前端（状态栏、小手机这类）重新画出来。
    // 用的是酒馆点「显示更多消息」时发的事件；不发「这条消息画好了」，免得自动朗读这类插件当成新消息
    if (c.eventTypes?.MORE_MESSAGES_LOADED) await c.eventSource?.emit(c.eventTypes.MORE_MESSAGES_LOADED);
  }
  else await c.reloadCurrentChat();
}

/**
 * 重画当前聊天的消息。正在生成或编辑时先不画：重画会把还没存下的回复、没保存的编辑冲掉。
 * 等结束后再画，并告诉玩家一声。
 */
export async function reloadChatSafe(): Promise<void> {
  const c = ctx();
  const id = c.getCurrentChatId?.();
  if (!id) return;
  if (!chatBusy()) { await redrawChat(); return; }
  if (reloadWaiting) return;
  reloadWaiting = true;
  toast('info', '刚才的改动要刷新聊天才能看到。等这条回复生成完或编辑保存后，会自动刷新。');
  try {
    while (chatBusy()) await new Promise((r) => setTimeout(r, 1000));
    if (ctx().getCurrentChatId?.() === id) await redrawChat();
  } finally {
    reloadWaiting = false;
  }
}

/** 带 {{setvar}}、{{random}} 这类宏的文字不替换（见 core/macros.ts）。 */
export function substitute(text: string): string {
  if (SIDE_EFFECT_MACRO.test(text)) return text;
  try {
    return ctx().substituteParams(text);
  } catch {
    return text;
  }
}

export async function runSlash(command: string): Promise<void> {
  const c = ctx();
  if (typeof c.executeSlashCommandsWithOptions === 'function') {
    await c.executeSlashCommandsWithOptions(command, { handleParserErrors: true, handleExecutionErrors: true });
  } else {
    await c.executeSlashCommands(command);
  }
}

/** Quote a value for STscript unnamed/named arguments. */
export function slashQuote(v: string): string {
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function toast(kind: 'info' | 'success' | 'warning' | 'error', msg: string, title = 'RedBird 工具箱', opts: Any = {}): void {
  window.toastr?.[kind]?.(msg, title, { closeButton: true, ...opts });
}

/** Escape text for HTML. ST's Popup renders its content as HTML, and names come from imported files. */
export function escHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

/** ST's confirm popup with plain-text title and body (escaped). Resolves to whether the user confirmed. */
/** 确认框：标题、一句说明、一行灰色小字；按钮是酒馆自己的「取消」（跟着酒馆的语言）和 ok（比如「确认更新」），确认在右边。 */
export async function confirmBox(title: string, text: string, note: string, ok: string): Promise<boolean> {
  const html = `<div class="rbt-confirm"><p>${escHtml(text)}</p><small>${escHtml(note)}</small></div>`;
  return !!(await ctx().Popup?.show?.confirm?.(escHtml(title), html, { okButton: ok, cancelButton: true, leftAlign: true }));
}

/** 按钮写会发生什么（「删除」「更新」），不用酒馆默认的「是 / 否」。 */
export async function confirmText(title: string, text: string, ok: string, cancel = '取消'): Promise<boolean> {
  return !!(await ctx().Popup?.show?.confirm?.(escHtml(title), escHtml(text), { okButton: ok, cancelButton: cancel }));
}

/**
 * Whether Tavern Helper (酒馆助手) runs this character's own scripts. TH ≤4.3 keyed the list by
 * character name; TH 4.12 keys it by avatar file name (e.g. "回响之城.png"). Accept both.
 */
export function thCharacterScriptsEnabled(es: Any, char: Any): boolean {
  const list: unknown[] = es?.tavern_helper?.script?.enabled?.characters ?? [];
  return !!char && (list.includes(char.avatar) || list.includes(char.name));
}

const SETTINGS_KEY = 'redbird_tools';

export interface RbtSettings {
  toastOnCardSwitch: boolean;
  /** 三栏外壳（左栏 + 导航条）是否开启。只在宽于 1000px 的屏幕上生效。 */
  shellEnabled: boolean;
  /** 手机上重排消息（头像到名字旁边、按钮到正文下面）。没设过 = 开。 */
  phoneMesLayout?: boolean;
  /** 已经提醒过「这个美化改了消息排版」的主题名（每个主题只提醒一次） */
  mesLayoutTipThemes?: string[];
  /** 电脑上已经提醒过「推荐用红鸟适配美化」的主题名 */
  lookTipThemes?: string[];
  profiles: Record<string, EnvProfile>;
  /** 进卡前的原值（见 Baseline）。 */
  baseline?: Baseline;
  /** 角色档案: hand-filled info per card avatar. */
  cards: Record<string, CardRecord>;
  /** 角色档案: which extension / card / preset a global regex script belongs to, by script id. */
  regexOwners: Record<string, RegexOwner>;
  /** Import a card's embedded lorebook automatically when its bound world file is missing. */
  autoImportWorld: boolean;
  /** Author + links per preset name. */
  presetInfo: Record<string, SourceRecord>;
  /** Author + links per plugin folder name (on top of what its manifest says). */
  pluginInfo: Record<string, SourceRecord>;
  /** Author + links + series per worldbook name. */
  worldSources: Record<string, SourceRecord>;
  /** Author + links + series per ST UI theme (美化) name. */
  themeInfo: Record<string, SourceRecord>;
  /** When records were deleted, so a merge with an older copy does not bring them back (see core/store). */
  deleted: Partial<Record<string, Record<string, string>>>;
  /** RedBird 美化 (look.css) on/off, and its accent colour id. */
  look: boolean;
  accent?: string;
  /** Which built-in look: dark / light / warm. */
  lookId?: string;
  /** 红鸟自带美化里对白（引号里的话）的颜色 id（core/quote.ts）。没有 = 不上色。 */
  quoteColor?: string;
  /** 电脑上正文多宽（红鸟适配美化）：适中（默认，一行约 44 字）/ 宽（约 60 字）/ 铺满 */
  readWidth?: 'normal' | 'wide' | 'full';
  /** Don't warn again before switching to someone else's look. */
  themeWarnOff?: boolean;
  /** 「可能是同一系列」的提示里点了「不是」的：按种类（preset / world / theme）记下那个词，以后不再提。 */
  seriesNoSuggest?: Record<string, string[]>;
  /** 收起回复开头的思考过程：只改显示和发给 AI 的那份，消息原文和酒馆设置都不动（见 tools/thinkFold.ts）。 */
  thinkFold: boolean;
  /** 当作思考的标签名；没有就用默认名单（core/think.ts）。 */
  thinkTags?: string[];
  /** Lorebook backups written to data/<user>/user/files before overwriting. */
  worldBackups: { file: string; world: string; at: string }[];
  /** 每张卡里自带的几样东西，看到完整的卡时记下（见 cards.ts cardFacts）。不进 redbird-tools.json：丢了下次打开卡再记。 */
  cardFacts?: Record<string, CardFacts>;
}

/**
 * 酒馆开了「懒加载角色」（config.yaml 的 lazyLoadCharacters）时，没打开过的卡只有名字等几项，
 * 读不到卡里的正则、脚本和世界书。key = 酒馆算的卡数据大小（data_size，不含正则、脚本、世界书）+ 卡的版本号，
 * 对不上 = 卡换过了。
 */
export interface CardFacts {
  key: string;
  regex: number;
  regexOn: number;
  scripts: number;
  /** 卡里世界书的条目数；卡里没有世界书 = null */
  book: number | null;
  bookName: string;
}

/**
 * 一张卡的「本卡专用」：只存和全局不一样的那几项，没有这一项 = 用全局（酒馆当前的设置）。
 * 在角色档案里改了就存进来（见 tools/env/setup.ts）。
 */
export interface EnvProfile {
  cardName: string;
  updatedAt?: string;
  preset?: { api: string; name: string };
  model?: ModelChoice;
  /** 卡的美化：和这张卡聊天时整个界面换成这套酒馆主题（见 look/cardLook.ts）。 */
  theme?: string;
  /** 全局世界书在这张卡和默认不一样时：停用（false）/ 启用（true），按书名。只给这张卡用的书挂成附加世界书，不记在这里。 */
  worlds?: Record<string, boolean>;
  /** 全局正则在这张卡和默认不一样时：停用 / 启用（按正则 id）。 */
  regex?: Record<string, boolean>;
  /** 格式版本：2 = 0.6.19 起（worlds 只记和默认不一样的）。没有 = 更早的，读到时迁移。 */
  v?: number;
  /** 旧版「记住的配套」（整份清单），读到就转成上面两项（见 setup.ts migrate）。 */
  globalWorlds?: string[];
  globalRegexEnabled?: string[];
  savedAt?: string;
}

/**
 * 进卡前被换掉的那几项原来是什么（before）、换成了什么（after）。离卡时：还是 after 的换回 before；
 * 玩家在别处改过的：本卡专用的项记进这张卡，其他的当全局，不动。存在设置里，刷新页面后还在。
 * 键：preset / model / w:书名 / r:正则 id。
 */
export interface Baseline {
  avatar: string;
  items: Record<string, { before: unknown; after: unknown }>;
}

export function settings(): RbtSettings {
  const es = ctx().extensionSettings;
  if (!es[SETTINGS_KEY]) es[SETTINGS_KEY] = {};
  const s = es[SETTINGS_KEY];
  s.toastOnCardSwitch ??= true;
  // 新装的人先用酒馆原来的界面 + 工具箱；三栏界面在设置里或 /rbt shell 打开
  s.shellEnabled ??= false;
  s.profiles ??= {};
  s.cards ??= {};
  s.regexOwners ??= {};
  s.autoImportWorld ??= true;
  s.thinkFold ??= true;
  s.worldBackups ??= [];
  s.presetInfo ??= {};
  s.pluginInfo ??= {};
  s.worldSources ??= {};
  s.themeInfo ??= {};
  s.deleted ??= {};
  // 美化默认开着；已经在用别人的美化（酒馆主题带自定义 CSS）的，默认不开，免得两套打架
  if (s.look === undefined) {
    const css = String(ctx().powerUserSettings?.custom_css ?? '');
    s.look = !css.trim() || css.includes('RedBird Dark');
  }
  return s as RbtSettings;
}

let afterSave: (() => void) | null = null;
/** store.ts hooks in here to mirror the toolbox data into its own file. */
export function onSaveSettings(fn: () => void): void {
  afterSave = fn;
}

export function saveSettings(): void {
  ctx().saveSettingsDebounced();
  afterSave?.();
}
