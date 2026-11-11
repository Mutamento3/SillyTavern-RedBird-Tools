/**
 * 全局工具箱的快速导入：拖进来或选几个文件，自动认出是预设、世界书、正则还是角色卡，
 * 交给酒馆自己的导入功能（和在酒馆面板里点「导入」完全一样，酒馆的提示和确认都照常出现）。
 * 插件用 Git 链接安装，走酒馆自己的安装流程（会先弹酒馆的第三方插件提醒）。
 */
import { loaded, toast } from '../st/st';
import { refreshEnv } from './env/env';
import type { GlobalTab } from '../ui/views';

import { detectJson, scriptWaitsForTheme, type ImportKind } from '../core/importKind';
import { cardFromPng, looksLikeCardBook, summarizeCard, worldEntryCount, worldEntryPrints, type CardSummary } from '../core/cardFile';
export type { ImportKind };

export const KIND_LABEL: Record<ImportKind, string> = {
  preset: '预设', world: '世界书', regex: '正则', character: '角色卡', theme: '美化', script: '酒馆助手脚本', unknown: '认不出的文件',
};

export const KIND_TAB: Partial<Record<ImportKind, GlobalTab>> = { preset: 'presets', world: 'worlds', regex: 'regex', theme: 'looks', script: 'scripts' };

/** What a file is, from its extension and (for JSON) its shape. */
export async function detectKind(file: File): Promise<ImportKind> {
  const name = file.name.toLowerCase();
  if (/\.(png|charx|byaf|ya?ml)$/.test(name)) return 'character';
  if (name.endsWith('.lorebook')) return 'world';
  if (!/\.(json|settings)$/.test(name)) return 'unknown';
  let j: unknown;
  try { j = JSON.parse(await file.text()); } catch { return 'unknown'; }
  return detectJson(j);
}

function feed(inputId: string, files: File[], event: 'change' | 'input'): boolean {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (!input) return false;
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  input.files = dt.files;
  input.dispatchEvent(new Event(event, { bubbles: true }));
  return true;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Install a plugin from its Git link through ST's own installer. */
export async function installPlugin(url: string): Promise<boolean> {
  const fn = loaded.extensions?.installExtension;
  if (!fn) { toast('error', '这个版本的酒馆不支持从这里安装插件，请在「扩展 › 安装扩展程序」里装。', '安装插件'); return false; }
  const ok = await fn(url.trim(), false);
  return ok !== false;
}

// ------------------------------------------------------ import dialog ---
// 导入前先问一遍：要不要设成现在在用的、有没有作者链接和备注。

export interface ImportItem {
  file: File;
  kind: ImportKind;
  /** What to call it: the card's name, the preset / worldbook name it will get, the theme's name. */
  title: string;
  /** After import: switch to this preset / turn this book on globally / open this card. */
  activate: boolean;
  author: string;
  linkLabel: string;
  url: string;
  notes: string;
  /** Character cards: what is inside (name, built-in book, regex). */
  card?: CardSummary;
  /** Worldbooks: how many entries. */
  entries?: number;
  /** Worldbooks: fingerprints of the entries (to tell the card's own book from an extra one). */
  prints?: string[];
  /** Left out unless the user ticks it back on (e.g. the JSON copy of a PNG card). */
  skip?: boolean;
  /** Why it was left out (when skipped), or a detail for binding it to the card. */
  note?: string;
  /** Left out because it repeats this (a file name or the card name). */
  dupOf?: string;
  /** 美化: its custom CSS. Script: all its code. Used to pair a script with the 美化 it was made for. */
  code?: string;
  /** Script: made for this 美化 in the same batch (it only works while that 美化 is on), so it is on by default. */
  forTheme?: string;
  /** Worldbook: bind to the card imported in the same batch. Preset: make it that card's recommended preset. Theme: that card's 美化. */
  toCard?: boolean;
}

export async function prepareImport(files: File[]): Promise<ImportItem[]> {
  const out: ImportItem[] = [];
  for (const file of files) {
    const it: ImportItem = { file, kind: await detectKind(file), title: baseName(file), activate: false, author: '', linkLabel: '', url: '', notes: '' };
    try {
      if (it.kind === 'character') {
        const data = /.png$/i.test(file.name) ? cardFromPng(new Uint8Array(await file.arrayBuffer())) : /.json$/i.test(file.name) ? JSON.parse(await file.text()) : null;
        it.card = summarizeCard(data) ?? undefined;
        if (it.card) it.title = it.card.name;
      }
      if (it.kind === 'world') { const j = JSON.parse(await file.text()); it.entries = worldEntryCount(j); it.prints = worldEntryPrints(j); }
      if (it.kind === 'theme') { const j = JSON.parse(await file.text()); it.title = String(j.name ?? it.title); it.code = String(j.custom_css ?? ''); }
      if (it.kind === 'script') {
        const j = JSON.parse(await file.text());
        const list = Array.isArray(j) ? j : [j];
        if (list.length === 1 && typeof list[0]?.name === 'string') it.title = list[0].name.trim() || it.title;
        const n = list.reduce((k: number, x: { scripts?: unknown[] }) => k + (Array.isArray(x?.scripts) ? x.scripts.length : 1), 0);
        if (n > 1) it.entries = n;
        const code = (x: { content?: unknown; scripts?: unknown[] }): string => [typeof x?.content === 'string' ? x.content : '', ...(Array.isArray(x?.scripts) ? x.scripts.map((y) => code(y as never)) : [])].join('\n');
        it.code = list.map(code).join('\n');
      }
      if (it.kind === 'regex') {
        const j = JSON.parse(await file.text());
        const list = Array.isArray(j) ? j : [j];
        if (list.length === 1 && list[0]?.scriptName) it.title = String(list[0].scriptName);
        else if (list.length > 1) it.entries = list.length;
      }
    } catch { /* unreadable: import as-is */ }
    out.push(it);
  }
  pairScripts(out);
  return relate(out);
}

/** 和美化一起来、只在那套美化下起作用的脚本：默认导入后就运行，不然美化只有一半。 */
function pairScripts(items: ImportItem[]): void {
  const themes = items.filter((i) => i.kind === 'theme' && i.code);
  for (const it of items) {
    if (it.kind !== 'script' || !it.code) continue;
    const t = themes.find((x) => scriptWaitsForTheme(it.code!, x.code!));
    if (t) { it.forTheme = t.title; it.activate = true; }
  }
}

/**
 * Files released together: a PNG and a JSON of the same card are one card (keep the PNG, it has
 * the avatar); a worldbook next to a single card is either the book the card already carries
 * (no need to import it) or one to bind to it; a preset next to it can become its recommended preset.
 */
export function relate(items: ImportItem[]): ImportItem[] {
  const byName = new Map<string, ImportItem[]>();
  for (const it of items) if (it.kind === 'character' && it.card) byName.set(it.card.name, [...(byName.get(it.card.name) ?? []), it]);
  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    const keep = group.find((g) => /.png$/i.test(g.file.name)) ?? group[0];
    for (const g of group) if (g !== keep) { g.skip = true; g.dupOf = keep.file.name; g.note = `和「${keep.file.name}」是同一张卡（${name}），只导入 PNG 就够了，它带头像。`; }
  }
  const cards = items.filter((i) => i.kind === 'character' && !i.skip);
  if (cards.length !== 1 || !cards[0].card) return items;
  const card = cards[0].card;
  for (const it of items) {
    if (it.kind === 'world') {
      if (looksLikeCardBook(card, baseName(it.file), it.entries ?? 0, it.prints)) {
        it.skip = true;
        it.dupOf = card.name;
        it.note = `就是「${card.name}」卡里自带的那本（卡里 ${card.bookEntries} 条，这个文件 ${it.entries ?? '?'} 条），导入这张卡时会自动一起导入。`;
      } else {
        it.toCard = true;
        it.note = card.bookEntries ? '卡里已经自带一本世界书，这本作为附加世界书绑上' : '';
      }
    }
    if (it.kind === 'preset') it.toCard = true;
    if (it.kind === 'theme') it.toCard = true;
  }
  return items;
}

const baseName = (f: File) => f.name.replace(/\.[^/.]+$/, '');

/** Wait until `get()` returns a list containing something not in `before` (or `fallback`). */
async function waitForNew(get: () => string[], before: Set<string>, fallback: string, ms = 8000): Promise<string | null> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const fresh = get().find((n) => !before.has(n));
    if (fresh) return fresh;
    await wait(300);
  }
  // Overwrote an existing one with the same name.
  return get().includes(fallback) ? fallback : null;
}

export interface ImportDone { item: ImportItem; name: string | null }

/**
 * Import with ST's own importers, then apply the extra choices. `hooks` keeps this module free of
 * UI / cards imports (they are passed in by the dialog).
 */
export async function runImport(items: ImportItem[], hooks: {
  presetNames: () => string[];
  worldNames: () => string[];
  characterAvatars: () => string[];
  switchPreset: (n: string) => Promise<unknown>;
  setWorldGlobal: (n: string) => Promise<void>;
  openCharacter: (avatar: string) => Promise<void>;
  saveSource: (kind: 'preset' | 'world' | 'theme', name: string, rec: { author: string; links: { label: string; url: string }[]; notes: string }) => void;
  saveCardRecord: (avatar: string, rec: { links: { label: string; url: string }[]; notes: string }) => void;
  /** `extra`: the card already carries a book, so add this one as an extra book. */
  bindWorld: (avatar: string, world: string, extra: boolean) => Promise<void>;
  setCardPreset: (avatar: string, preset: string) => void;
  /** 卡的美化：和这张卡聊天时整个界面换成它 */
  setCardTheme: (avatar: string, theme: string) => void;
  /**
   * 卡里自带世界书时，导入后马上把它导入并绑到卡上（设置里开着「自动导入卡里自带的世界书」时）。
   * 这样酒馆不会再弹英文的「要不要导入」，也不会接着自动打开世界书面板。
   */
  importCardWorld?: (avatar: string) => Promise<unknown>;
  normalizeUrl: (s: string) => string;
  /** Switch ST's UI theme to this one (and turn the toolbox's own look off). */
  useTheme: (name: string) => Promise<void>;
  /** 酒馆助手脚本：放进全局脚本。`run`：导入后马上运行。返回脚本名，没导进去返回 null。 */
  importScript: (data: unknown, run: boolean) => Promise<string | null>;
}): Promise<ImportDone[]> {
  const done: ImportDone[] = [];
  items = items.filter((i) => !i.skip);
  const toCardWorlds: string[] = [];
  let toCardPreset = '';
  let toCardTheme = '';
  const linksOf = (it: ImportItem) => { const u = hooks.normalizeUrl(it.url); return u ? [{ label: it.linkLabel.trim() || '链接', url: u }] : []; };
  const hasExtra = (it: ImportItem) => !!(it.author.trim() || linksOf(it).length || it.notes.trim());

  for (const it of items.filter((i) => i.kind === 'world')) {
    const before = new Set(hooks.worldNames());
    try { await loaded.worldInfo?.importWorldInfo?.(it.file); } catch (e) { toast('error', `导入世界书「${it.file.name}」失败：${(e as Error).message}`, '导入'); }
    const name = await waitForNew(hooks.worldNames, before, baseName(it.file), 3000);
    if (name && hasExtra(it)) hooks.saveSource('world', name, { author: it.author.trim(), links: linksOf(it), notes: it.notes.trim() });
    if (name && it.activate) await hooks.setWorldGlobal(name);
    if (name && it.toCard) toCardWorlds.push(name);
    done.push({ item: it, name });
  }
  for (const it of items.filter((i) => i.kind === 'preset')) {
    const before = new Set(hooks.presetNames());
    if (!feed('openai_preset_import_file', [it.file], 'input')) { toast('error', '找不到酒馆的预设导入入口（需要 Chat Completion 模式）。', '导入'); break; }
    const name = await waitForNew(hooks.presetNames, before, baseName(it.file));
    if (name && hasExtra(it)) hooks.saveSource('preset', name, { author: it.author.trim(), links: linksOf(it), notes: it.notes.trim() });
    if (name && it.activate) await hooks.switchPreset(name);
    if (name && it.toCard) toCardPreset = name;
    done.push({ item: it, name });
  }
  for (const it of items.filter((i) => i.kind === 'theme')) {
    let name = '';
    try { name = String(JSON.parse(await it.file.text()).name ?? ''); } catch { /* unreadable */ }
    const has = () => !!name && [...document.querySelectorAll<HTMLOptionElement>('#themes option')].some((o) => o.value === name);
    if (has()) { toast('warning', `已经有叫「${name}」的美化了，酒馆不会覆盖。要更新的话，先在「用户设置 › 界面主题」里删掉旧的。`, '导入'); done.push({ item: it, name: null }); continue; }
    if (!feed('ui_preset_import_file', [it.file], 'change')) { toast('error', '找不到酒馆的美化导入入口。', '导入'); break; }
    const t0 = Date.now();
    while (!has() && Date.now() - t0 < 15000) await wait(300);
    if (has() && hasExtra(it)) hooks.saveSource('theme', name, { author: it.author.trim(), links: linksOf(it), notes: it.notes.trim() });
    if (has() && it.activate) await hooks.useTheme(name);
    if (has() && it.toCard) toCardTheme = name;
    done.push({ item: it, name: has() ? name : null });
  }
  for (const it of items.filter((i) => i.kind === 'script')) {
    let name: string | null = null;
    try { name = await hooks.importScript(JSON.parse(await it.file.text()), it.activate); } catch (e) { toast('error', `导入脚本「${it.file.name}」失败：${(e as Error).message}`, '导入'); }
    done.push({ item: it, name });
  }
  const rx = items.filter((i) => i.kind === 'regex');
  if (rx.length) { feed('import_regex_file', rx.map((i) => i.file), 'change'); for (const it of rx) done.push({ item: it, name: baseName(it.file) }); }
  // Character cards one at a time, so each new card can be matched to its file.
  let lastCard: string | null = null;
  for (const it of items.filter((i) => i.kind === 'character')) {
    const before = new Set(hooks.characterAvatars());
    feed('character_import_file', [it.file], 'change');
    const avatar = await waitForNew(hooks.characterAvatars, before, '', 15000);
    if (avatar && (linksOf(it).length || it.notes.trim())) hooks.saveCardRecord(avatar, { links: linksOf(it), notes: it.notes.trim() });
    if (avatar && it.activate) lastCard = avatar;
    // 一起发布的世界书 / 预设：绑到这张卡上
    if (avatar) {
      if (it.card?.bookEntries && hooks.importCardWorld) await hooks.importCardWorld(avatar);
      for (const w of toCardWorlds) await hooks.bindWorld(avatar, w, !!it.card?.bookEntries);
      if (toCardPreset) hooks.setCardPreset(avatar, toCardPreset);
      if (toCardTheme) hooks.setCardTheme(avatar, toCardTheme);
    }
    done.push({ item: it, name: avatar });
  }
  if (lastCard) await hooks.openCharacter(lastCard);
  setTimeout(() => refreshEnv(), 1500);
  return done;
}
