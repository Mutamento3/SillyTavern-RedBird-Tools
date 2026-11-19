/**
 * 换卡体检：list everything that is active right now, grouped by scope (global / preset /
 * character / chat), flag things that leak across cards, and remember a per-card environment.
 */
import { signal } from '@preact/signals';
import {
  ctx,
  currentCharacter,
  loaded,
  reloadChatSafe,
  runSlash,
  saveSettings,
  settings,
  slashQuote,
  thCharacterScriptsEnabled,
  toast,
  type Any,
} from '../../st/st';
import { currentBookScopes } from '../flow/capture';

export type Scope = 'global' | 'preset' | 'character' | 'chat' | 'persona';

export interface EnvItem {
  id: string;
  scope: Scope;
  kind: 'worldbook' | 'regex' | 'script' | 'extension' | 'preset';
  name: string;
  detail?: string;
  enabled: boolean;
  /** Leaks into every card → worth a look when switching cards. */
  leaks: boolean;
  /** Tagged (in 全局 → 全局正则) as belonging to another card / preset, but still on. */
  misplaced?: string;
  toggle?: (on: boolean) => Promise<void>;
  children?: string[];
  /** Individually switchable children (e.g. each regex script of a preset). */
  subItems?: EnvSubItem[];
}

export interface EnvSubItem {
  id: string;
  name: string;
  detail?: string;
  enabled: boolean;
  toggle: (on: boolean) => Promise<void>;
}

// ------------------------------------------------------- regex toggles ---

/** ST regex SCRIPT_TYPES. */
const RX = { GLOBAL: 0, SCOPED: 1, PRESET: 2 } as const;
type RxType = (typeof RX)[keyof typeof RX];

/**
 * 全局正则在「记住的配套」里用的名字。记住、比对、换卡、恢复都用它，不然没名字的正则
 * 记住时是「(未命名正则)」、比对时是空串，永远对不上。
 */
export function regexKey(r: Any): string {
  return r.scriptName || '(未命名正则)';
}

function regexEffectLabel(r: Any): string {
  return [r.markdownOnly ? '只改显示' : '', r.promptOnly ? '只改发给 AI 的' : ''].filter(Boolean).join('、') || '改消息原文';
}

/**
 * Enable/disable one regex script. Writes through ST's regex engine directly (instead of
 * /regex-toggle) so that switching a single preset/card script does not also silently
 * "allow" the whole preset/card, and duplicate names across scopes are handled by id.
 */
async function setRegexEnabled(type: RxType, id: string, on: boolean): Promise<void> {
  const re = loaded.regexEngine;
  if (!re) throw new Error('regex engine not loaded');
  const list: Any[] = re.getScriptsByType(type) ?? [];
  if (!list.some((s) => s.id === id)) {
    toast('error', '没找到这条正则，可能已经被改名或删除。');
    return;
  }
  const next = list.map((s) => (s.id === id ? { ...s, disabled: !on } : s));
  await re.saveScriptsByType(next, type);
  saveSettings();
  // Re-render messages so display-only regex changes show up immediately.
  await reloadChatSafe();
}

async function setRegexGroupAllowed(type: RxType, on: boolean): Promise<void> {
  const re = loaded.regexEngine;
  if (!re) return;
  if (type === RX.PRESET) {
    const api = re.getCurrentPresetAPI();
    const name = re.getCurrentPresetName();
    if (on) re.allowPresetScripts(api, name); else re.disallowPresetScripts(api, name);
  } else if (type === RX.SCOPED) {
    const char = currentCharacter();
    if (on) re.allowScopedScripts(char); else re.disallowScopedScripts(char);
  }
  saveSettings();
  await reloadChatSafe();
}

function regexSubItems(type: RxType, scripts: Any[]): EnvSubItem[] {
  return scripts.map((r, i) => ({
    id: String(r.id ?? i),
    name: r.scriptName || '(未命名正则)',
    detail: regexEffectLabel(r),
    enabled: !r.disabled,
    toggle: (on: boolean) => setRegexEnabled(type, r.id, on),
  }));
}

export interface EnvReport {
  cardName: string;
  avatar: string;
  presetApi: string;
  presetName: string;
  items: EnvItem[];
}

export const envReport = signal<EnvReport | null>(null);

export function thScripts(node: Any, out: { name: string; enabled: boolean }[] = []): { name: string; enabled: boolean }[] {
  if (!node) return out;
  // Card extensions store tavern_helper as [[key, value], ...] pairs.
  if (Array.isArray(node) && node.every((x) => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string')) {
    return thScripts(Object.fromEntries(node), out);
  }
  if (Array.isArray(node)) {
    for (const x of node) thScripts(x, out);
    return out;
  }
  if (typeof node !== 'object') return out;
  const v = node.value && typeof node.value === 'object' ? node.value : node;
  if (typeof v.content === 'string' && (typeof v.name === 'string' || node.type === 'script')) {
    out.push({ name: v.name || '(未命名脚本)', enabled: v.enabled !== false });
    return out;
  }
  for (const key of ['scripts', 'value', 'children', 'items']) if (key in v) thScripts(v[key], out);
  return out;
}

function presetInfo(): { api: string; name: string; regex: Any[]; th: Any } {
  const re = loaded.regexEngine;
  let api = '';
  let name = '';
  let regex: Any[] = [];
  let th: Any = null;
  try {
    api = re?.getCurrentPresetAPI?.() ?? ctx().mainApi ?? '';
    name = re?.getCurrentPresetName?.() ?? ctx().getPresetManager()?.getSelectedPresetName?.() ?? '';
    const pm = ctx().getPresetManager();
    regex = pm?.readPresetExtensionField?.({ path: 'regex_scripts' }) ?? [];
    th = pm?.readPresetExtensionField?.({ path: 'tavern_helper' }) ?? null;
  } catch { /* ignore */ }
  return { api, name, regex: Array.isArray(regex) ? regex : [], th };
}

function enabledThirdPartyExtensions(): string[] {
  const names: string[] = loaded.extensions?.extensionNames ?? [];
  const disabled: string[] = ctx().extensionSettings?.disabledExtensions ?? [];
  return names.filter((n) => n.startsWith('third-party/') && !disabled.includes(n)).map((n) => n.replace('third-party/', ''));
}

export function buildEnvReport(): EnvReport {
  const c = ctx();
  const es = c.extensionSettings ?? {};
  const char = currentCharacter();
  const avatar: string = char?.avatar ?? '';
  const scopes = currentBookScopes();
  const items: EnvItem[] = [];
  const preset = presetInfo();
  const owners = settings().regexOwners;

  // --- global lorebooks
  for (const name of scopes.global) {
    items.push({
      id: `wb:g:${name}`, scope: 'global', kind: 'worldbook', name, enabled: true,
      leaks: !scopes.character.has(name) && !scopes.chat.has(name),
      detail: scopes.character.has(name) ? '也绑在当前卡上' : '对所有卡生效',
      toggle: async (on) => runSlash(`/world state=${on ? 'on' : 'off'} silent=true ${slashQuote(name)}`),
    });
  }
  // --- global regex
  for (const r of (es.regex ?? []) as Any[]) {
    const owner = owners[r.id];
    const ownerText = owner ? `属于${owner.kind === 'extension' ? '插件' : owner.kind === 'card' ? '角色卡' : '预设'}「${owner.label}」` : '';
    const elsewhere = owner && ((owner.kind === 'card' && owner.key !== avatar) || (owner.kind === 'preset' && owner.key !== preset.name));
    items.push({
      id: `rx:g:${r.id ?? r.scriptName}`, scope: 'global', kind: 'regex', name: regexKey(r),
      enabled: !r.disabled, leaks: !r.disabled,
      misplaced: elsewhere && !r.disabled ? ownerText : undefined,
      detail: [regexEffectLabel(r), ownerText].filter(Boolean).join(' · '),
      toggle: (on) => setRegexEnabled(RX.GLOBAL, r.id, on),
    });
  }
  // --- Tavern Helper global scripts
  const thSettings = es.tavern_helper?.script;
  const thGlobal = thScripts(thSettings?.scripts);
  if (thGlobal.length) {
    const on = thSettings?.enabled?.global !== false;
    items.push({
      id: 'th:g', scope: 'global', kind: 'script', name: `酒馆助手全局脚本 ${thGlobal.length} 个`, enabled: on,
      leaks: on && thGlobal.some((s) => s.enabled), children: thGlobal.map((s) => `${s.enabled ? '●' : '○'} ${s.name}`),
    });
  }
  // --- extensions
  const exts = enabledThirdPartyExtensions();
  if (exts.length) {
    items.push({
      id: 'ext', scope: 'global', kind: 'extension', name: `已启用的插件 ${exts.length} 个`, enabled: true, leaks: false,
      detail: '对所有卡生效', children: exts,
    });
  }

  // --- preset
  if (preset.name) {
    items.push({ id: 'preset', scope: 'preset', kind: 'preset', name: preset.name, enabled: true, leaks: false, detail: `API：${preset.api}` });
  }
  if (preset.regex.length) {
    const allowed = (es.preset_allowed_regex?.[preset.api] ?? []).includes(preset.name);
    const active = preset.regex.filter((r: Any) => !r.disabled);
    items.push({
      id: 'rx:p', scope: 'preset', kind: 'regex', name: `预设里的正则 ${preset.regex.length} 条，开着 ${active.length} 条`,
      enabled: allowed, leaks: allowed && active.length > 0,
      detail: allowed ? '用这个预设时对所有卡生效。右边的开关决定是否允许运行' : '未允许运行，打开右边的开关才会生效',
      toggle: (on) => setRegexGroupAllowed(RX.PRESET, on),
      subItems: regexSubItems(RX.PRESET, preset.regex),
    });
  }
  const thPreset = thScripts(preset.th);
  if (thPreset.length) {
    const on = (thSettings?.enabled?.presets ?? []).includes(preset.name);
    items.push({
      id: 'th:p', scope: 'preset', kind: 'script', name: `预设里的酒馆助手脚本 ${thPreset.length} 个`, enabled: on,
      leaks: on, detail: on ? '用这个预设时对所有卡生效' : '未启用',
      children: thPreset.map((s) => `${s.enabled ? '●' : '○'} ${s.name}`),
    });
  }

  // --- character
  if (char) {
    for (const name of scopes.character) {
      items.push({ id: `wb:c:${name}`, scope: 'character', kind: 'worldbook', name, enabled: true, leaks: false, detail: name === char.data?.extensions?.world ? '主世界书' : '附加世界书' });
    }
    const cardRegex: Any[] = char.data?.extensions?.regex_scripts ?? [];
    if (cardRegex.length) {
      const allowed = (es.character_allowed_regex ?? []).includes(avatar);
      const activeCard = cardRegex.filter((r: Any) => !r.disabled).length;
      items.push({
        id: 'rx:c', scope: 'character', kind: 'regex', name: `卡里的正则 ${cardRegex.length} 条，开着 ${activeCard} 条`, enabled: allowed, leaks: false,
        detail: allowed ? '右边的开关决定是否允许运行' : '未允许运行，卡里的正则不会生效',
        toggle: (on) => setRegexGroupAllowed(RX.SCOPED, on),
        subItems: regexSubItems(RX.SCOPED, cardRegex),
      });
    }
    const thChar = thScripts(char.data?.extensions?.tavern_helper ?? char.data?.extensions?.TavernHelper_scripts);
    if (thChar.length) {
      const on = thCharacterScriptsEnabled(es, char);
      items.push({
        id: 'th:c', scope: 'character', kind: 'script', name: `角色脚本（酒馆助手）${thChar.length} 个`, enabled: on, leaks: false,
        detail: on ? '已启用' : '未启用，卡里的脚本不会运行', children: thChar.map((s) => `${s.enabled ? '●' : '○'} ${s.name}`),
      });
    }
  }
  for (const name of scopes.chat) items.push({ id: `wb:chat:${name}`, scope: 'chat', kind: 'worldbook', name, enabled: true, leaks: false, detail: '绑在当前聊天上' });
  for (const name of scopes.persona) items.push({ id: `wb:p:${name}`, scope: 'persona', kind: 'worldbook', name, enabled: true, leaks: true, detail: '绑在 user 人设上，换卡后仍然生效' });

  return { cardName: char?.name ?? '', avatar, presetApi: preset.api, presetName: preset.name, items };
}

/** 酒馆里还有这本世界书吗（列表还没读到时当作有，免得误判）。 */
export function worldExists(name: string): boolean {
  const names: string[] | undefined = loaded.worldInfo?.world_names;
  return !names?.length || names.includes(name);
}

export function refreshEnv(): EnvReport {
  const r = buildEnvReport();
  envReport.value = r;
  return r;
}

export function installEnvWatch(): void {
  const c = ctx();
  const es = c.eventSource;
  const et = c.eventTypes;
  // Give other extensions (and ST's own WI selection) a moment to settle.
  es.on(et.CHAT_CHANGED, () => { setTimeout(refreshEnv, 600); });
  for (const ev of [et.WORLDINFO_SETTINGS_UPDATED, et.OAI_PRESET_CHANGED_AFTER, et.PRESET_CHANGED, et.SETTINGS_UPDATED]) {
    if (ev) es.on(ev, () => { if (envReport.value) refreshEnv(); });
  }
}
