/**
 * 酒馆助手（JS-Slash-Runner）脚本：读、开关。
 *
 * 三组脚本：全局（所有聊天都跑）、预设带的、角色卡带的。每组有一个「允许运行」总开关，
 * 组里还可以有文件夹；一个脚本真正在跑 = 组允许 && 所在文件夹开着 && 它自己开着。
 *
 * 改法：
 * - 当前预设 / 当前卡 / 全局：用酒馆助手公开的 TavernHelper.updateScriptTreesWith 改脚本开关；
 *   组的总开关用它内部的 Pinia store（`<种类>_scripts`.enabled），改了马上生效，它自己会存。
 * - 别的预设：脚本开关直接写进那个预设文件（酒馆的 writePresetExtensionField），换到它时酒馆助手照常读；
 *   总开关是酒馆助手设置里的预设名单。
 * - 别的卡：只读（老卡的脚本可能是另一种存法，直接改容易写坏），总开关可以改（头像文件名名单）。
 */
import { signal } from '@preact/signals';
import { ctx, toast, type Any } from '../../st/st';

export type ThKind = 'global' | 'preset' | 'character';

export interface ThScript {
  type: 'script';
  id: string;
  name: string;
  enabled: boolean;
  info: string;
  /** 这个脚本在输入框上方放的按钮上的字 */
  buttons: string[];
  /** 脚本代码（用来猜有没有前端） */
  content: string;
}
export interface ThFolder {
  type: 'folder';
  id: string;
  name: string;
  enabled: boolean;
  scripts: ThScript[];
}
export type ThNode = ThScript | ThFolder;

/** 酒馆助手的脚本或开关变了就加一（界面跟着重画）。 */
export const thTick = signal(0);

function TH(): Any | null {
  return (window as unknown as { TavernHelper?: Any }).TavernHelper ?? null;
}

function pinia(): Any | null {
  try {
    return (document.getElementById('tavern_helper') as Any)?.__vue_app__?.config?.globalProperties?.$pinia ?? null;
  } catch {
    return null;
  }
}

function store(id: string): Any | null {
  return pinia()?._s?.get?.(id) ?? null;
}

/** 装了酒馆助手、并且能拿到它的脚本接口。 */
export function thInstalled(): boolean {
  return !!TH()?.getScriptTrees;
}

function toScript(s: Any): ThScript {
  return {
    type: 'script',
    id: String(s?.id ?? ''),
    name: String(s?.name ?? '（没有名字）'),
    enabled: !!s?.enabled,
    info: String(s?.info ?? ''),
    buttons: Array.isArray(s?.button?.buttons) && s?.button?.enabled !== false
      ? s.button.buttons.filter((b: Any) => b?.visible !== false && String(b?.name ?? '').trim()).map((b: Any) => String(b.name).trim())
      : [],
    content: typeof s?.content === 'string' ? s.content : '',
  };
}

/** 酒馆助手的脚本树 → 我们用的样子。老格式（键值对数组）读不懂就当没有。 */
export function parseTrees(raw: unknown): ThNode[] {
  if (!Array.isArray(raw)) return [];
  const out: ThNode[] = [];
  for (const n of raw) {
    if (!n || typeof n !== 'object' || Array.isArray(n)) continue;
    const t = n as Any;
    if (t.type === 'folder') {
      out.push({ type: 'folder', id: String(t.id ?? ''), name: String(t.name ?? '文件夹'), enabled: !!t.enabled, scripts: (Array.isArray(t.scripts) ? t.scripts : []).map(toScript) });
    } else out.push(toScript(t));
  }
  return out;
}

export function countScripts(nodes: ThNode[]): number {
  return nodes.reduce((n, x) => n + (x.type === 'folder' ? x.scripts.length : 1), 0);
}

/** 在跑的脚本数（组允许时）。 */
export function countRunning(nodes: ThNode[], allowed: boolean): number {
  if (!allowed) return 0;
  return nodes.reduce((n, x) => n + (x.type === 'folder' ? (x.enabled ? x.scripts.filter((s) => s.enabled).length : 0) : x.enabled ? 1 : 0), 0);
}

function enabledLists(): { global: boolean; presets: string[]; characters: string[] } {
  const e = store('global_settings')?.settings?.script?.enabled;
  const fromSettings = ctx().extensionSettings?.tavern_helper?.script?.enabled;
  const src = e ?? fromSettings ?? {};
  return { global: src.global !== false, presets: [...(src.presets ?? [])].map(String), characters: [...(src.characters ?? [])].map(String) };
}

// ------------------------------------------------------- 现在的三组 ---

export interface ThGroup {
  kind: ThKind;
  /** 预设名 / 卡的头像文件名（全局为空） */
  key: string;
  /** 给人看的名字：预设名 / 卡名 */
  label: string;
  allowed: boolean;
  nodes: ThNode[];
  /** 能不能在这里开关单个脚本（别的卡不行） */
  editable: boolean;
}

/** 酒馆助手的预设脚本只认「对话补全」（OpenAI 那一类）的预设，不管现在用的是哪种 API。 */
export function oaiPresets(): Any | null {
  try { return ctx().getPresetManager?.('openai') ?? null; } catch { return null; }
}

function currentPreset(): string {
  try { return String(oaiPresets()?.getSelectedPresetName?.() ?? ''); } catch { return ''; }
}

function currentChar(): Any | null {
  const c = ctx();
  if (c.groupId) return null;
  const id = c.characterId;
  return id === undefined || id === null || id === '' ? null : c.characters?.[Number(id)] ?? null;
}

/** 全局、当前预设、当前卡这三组（没有脚本的组也返回，界面决定显不显示）。 */
export function currentGroups(): ThGroup[] {
  void thTick.value;
  const th = TH();
  if (!th) return [];
  const lists = enabledLists();
  const read = (kind: ThKind) => { try { return parseTrees(th.getScriptTrees({ type: kind })); } catch { return []; } };
  const out: ThGroup[] = [{ kind: 'global', key: '', label: '全局', allowed: store('global_scripts')?.enabled ?? lists.global, nodes: read('global'), editable: true }];
  const preset = currentPreset();
  if (preset) out.push({ kind: 'preset', key: preset, label: preset, allowed: store('preset_scripts')?.enabled ?? lists.presets.includes(preset), nodes: read('preset'), editable: true });
  const ch = currentChar();
  if (ch) out.push({ kind: 'character', key: String(ch.avatar), label: String(ch.name ?? ''), allowed: store('character_scripts')?.enabled ?? lists.characters.includes(String(ch.avatar)), nodes: read('character'), editable: true });
  return out;
}

// ------------------------------------------------------ 某个预设 / 某张卡 ---

/** 某个预设带的脚本（是当前预设时读酒馆助手里的最新状态）。 */
export function presetGroup(name: string): ThGroup {
  void thTick.value;
  if (name === currentPreset()) {
    const g = currentGroups().find((x) => x.kind === 'preset');
    if (g) return g;
  }
  let raw: unknown = [];
  try { raw = oaiPresets()?.readPresetExtensionField?.({ name, path: 'tavern_helper.scripts' }) ?? []; } catch { /* ignore */ }
  return { kind: 'preset', key: name, label: name, allowed: enabledLists().presets.includes(name), nodes: parseTrees(raw), editable: true };
}

/** 卡里存的脚本树。酒馆助手有时把 tavern_helper 存成 [键, 值] 数组，也认。 */
function cardScriptsRaw(ch: Any): unknown {
  const ext = ch?.data?.extensions ?? {};
  let th = ext.tavern_helper;
  if (Array.isArray(th)) { try { th = Object.fromEntries(th); } catch { th = null; } }
  return th?.scripts ?? ext.TavernHelper_scripts ?? [];
}

/** 某张卡带的脚本。不是正在聊的卡时只读。 */
export function cardGroup(avatar: string): ThGroup | null {
  void thTick.value;
  const ch = (ctx().characters ?? []).find((x: Any) => x.avatar === avatar);
  if (!ch) return null;
  if (currentChar()?.avatar === avatar) {
    const g = currentGroups().find((x) => x.kind === 'character');
    if (g) return g;
  }
  const raw = cardScriptsRaw(ch);
  return { kind: 'character', key: avatar, label: String(ch.name ?? ''), allowed: enabledLists().characters.includes(avatar), nodes: parseTrees(raw), editable: false };
}

/** 所有带脚本的预设（名字、脚本数、允不允许运行）。 */
export function presetsWithScripts(): { name: string; count: number; allowed: boolean }[] {
  void thTick.value;
  const pm = oaiPresets();
  if (!pm) return [];
  let names: string[] = [];
  try { names = Object.keys(pm.getPresetList?.()?.preset_names ?? {}); } catch { /* ignore */ }
  const allowed = enabledLists().presets;
  const out: { name: string; count: number; allowed: boolean }[] = [];
  for (const name of names) {
    let raw: unknown = [];
    try { raw = pm.readPresetExtensionField?.({ name, path: 'tavern_helper.scripts' }) ?? []; } catch { /* ignore */ }
    const count = countScripts(parseTrees(raw));
    if (count) out.push({ name, count, allowed: allowed.includes(name) });
  }
  return out;
}

/** 所有带脚本的卡。 */
export function cardsWithScripts(): { avatar: string; name: string; count: number; allowed: boolean }[] {
  void thTick.value;
  const allowed = enabledLists().characters;
  const out: { avatar: string; name: string; count: number; allowed: boolean }[] = [];
  for (const ch of ctx().characters ?? []) {
    // 「懒加载角色」打开着时，没打开过的卡读不到脚本，不会列在这里
    const count = countScripts(parseTrees(cardScriptsRaw(ch)));
    if (count) out.push({ avatar: String(ch.avatar), name: String(ch.name ?? ''), count, allowed: allowed.includes(String(ch.avatar)) });
  }
  return out;
}

// ------------------------------------------------------------- 开关 ---

function bump(): void {
  thTick.value++;
}

function toggleIn(trees: Any[], id: string, on: boolean): Any[] {
  return trees.map((t) => {
    if (t?.id === id) return { ...t, enabled: on };
    if (t?.type === 'folder') return { ...t, scripts: (t.scripts ?? []).map((s: Any) => (s?.id === id ? { ...s, enabled: on } : s)) };
    return t;
  });
}

/** 一整组「允许运行」。 */
export function setGroupAllowed(g: ThGroup, on: boolean): void {
  const isCurrent = g.kind === 'global' || (g.kind === 'preset' && g.key === currentPreset()) || (g.kind === 'character' && g.key === String(currentChar()?.avatar ?? ''));
  const s = store(`${g.kind}_scripts`);
  if (isCurrent && s) {
    s.enabled = on;
  } else {
    const gs = store('global_settings')?.settings?.script?.enabled;
    const list: string[] | undefined = g.kind === 'preset' ? gs?.presets : g.kind === 'character' ? gs?.characters : undefined;
    if (!list) { toast('warning', '酒馆助手还没加载好，请过一会儿再试。'); bump(); return; }
    const i = list.indexOf(g.key);
    if (on && i < 0) list.push(g.key);
    if (!on && i >= 0) list.splice(i, 1);
  }
  bump();
}

/** 一个脚本或一个文件夹。 */
export async function setNodeEnabled(g: ThGroup, id: string, on: boolean): Promise<void> {
  const th = TH();
  const isCurrent = g.kind === 'global' || (g.kind === 'preset' && g.key === currentPreset()) || (g.kind === 'character' && g.key === String(currentChar()?.avatar ?? ''));
  if (isCurrent && th) {
    th.updateScriptTreesWith((trees: Any[]) => toggleIn(trees, id, on), { type: g.kind });
  } else if (g.kind === 'preset') {
    const pm = oaiPresets();
    const raw = pm?.readPresetExtensionField?.({ name: g.key, path: 'tavern_helper.scripts' });
    if (Array.isArray(raw)) {
      try {
        await pm.writePresetExtensionField({ name: g.key, path: 'tavern_helper.scripts', value: toggleIn(raw, id, on) });
      } catch (e) {
        // 酒馆先改了内存再存文件；没存上就把内存改回去，免得看着改了、刷新又变回来
        console.error('[RedBird] saving preset scripts failed', e);
        try { pm.writePresetExtensionField({ name: g.key, path: 'tavern_helper.scripts', value: raw }).catch(() => {}); } catch { /* ignore */ }
        toast('error', `没能保存到预设「${g.key}」，请再试一次。`);
      }
    }
  }
  bump();
}

function newId(): string {
  try { return crypto.randomUUID(); } catch { /* 不是 https 时没有 */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
}

/** 文件里的一个脚本 → 酒馆助手的脚本（旧格式 name + content + buttons 也认）。 */
function fileScript(x: Any, run: boolean): Any {
  if (x?.type === 'script') return { ...x, id: newId(), enabled: run };
  return {
    type: 'script', id: newId(), enabled: run, name: String(x?.name ?? '脚本'), content: String(x?.content ?? ''), info: String(x?.info ?? ''),
    button: { enabled: true, buttons: Array.isArray(x?.buttons) ? x.buttons : [] }, data: x?.data ?? {}, export_with: { data: true, button: true },
  };
}

/**
 * 「导入文件」里的酒馆助手脚本：放进全局脚本，和酒馆助手自己导入一样换新的 id。
 * `run` 为 false 时先关着（酒馆助手自己导入也是先关着）。返回脚本名，没导进去返回 null。
 */
export async function importThScripts(raw: unknown, run: boolean): Promise<string | null> {
  const th = TH();
  if (!th?.updateScriptTreesWith) {
    toast('error', '要先装上酒馆助手，才能导入它的脚本。', '导入');
    return null;
  }
  const list: Any[] = Array.isArray(raw) ? raw : [raw];
  const nodes = list.map((x) => (x?.type === 'folder'
    ? { ...x, id: newId(), enabled: run, scripts: (Array.isArray(x.scripts) ? x.scripts : []).map((y: Any) => fileScript(y, run)) }
    : fileScript(x, run)));
  if (!nodes.length) return null;
  await th.updateScriptTreesWith((trees: Any[]) => [...trees, ...nodes], { type: 'global' });
  if (run && store('global_scripts')?.enabled === false) toast('warning', '脚本已导入，但酒馆助手的全局脚本没有允许运行，所以还不会运行。到「全局工具箱 › 脚本」里打开。', '导入', { timeOut: 10000 });
  bump();
  return nodes.map((n) => n.name).join('、');
}

let watching = false;

/** 跟着酒馆助手自己的改动（在它的面板里拨开关、换预设、换卡）刷新。 */
export function installThWatch(tries = 0): void {
  if (watching) return;
  const ids = ['global_settings', 'preset_settings', 'character_setttings', 'character_settings', 'global_scripts', 'preset_scripts', 'character_scripts'];
  const stores = ids.map(store).filter(Boolean);
  if (!stores.length) {
    if (tries < 30) setTimeout(() => installThWatch(tries + 1), 2000);
    return;
  }
  watching = true;
  let queued = false;
  const later = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; bump(); }, 200); };
  for (const s of stores) { try { s.$subscribe?.(later, { detached: true }); } catch { /* ignore */ } }
  const c = ctx();
  for (const ev of [c.eventTypes?.CHAT_CHANGED, c.eventTypes?.OAI_PRESET_CHANGED_AFTER, c.eventTypes?.SETTINGS_UPDATED]) if (ev) c.eventSource.on(ev, later);
}
