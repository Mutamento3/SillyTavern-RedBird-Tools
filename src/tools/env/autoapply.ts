/**
 * 换卡自动套用环境：换到一张卡时，把预设、全局世界书、全局正则切成这张卡该有的样子，
 * 插件（酒馆不能在运行中开关）则提示一键启用并刷新。每次自动切换都能撤销。
 *
 * 依据（按优先级）：
 * 1. 这张卡「记住的环境」（换卡体检 / 角色档案里的推荐预设）：有记的部分严格照着来；
 * 2. 没记的部分只做确定该做的事：
 *    - 别的卡绑定的世界书被开成了全局 → 关掉；
 *    - 在「正则归属」里标成属于别的卡 / 别的预设的全局正则 → 关掉，属于这张卡 / 当前预设的 → 打开。
 */
import { signal } from '@preact/signals';
import { charaFileName, ctx, loaded, runSlash, saveSettings, settings, slashQuote, toast, type Any } from '../../st/st';
import { cardInfo, currentPresetName, extStatus, importCardWorld, installedExtensions, presetApi, presetNames, requiredExtensions, switchPreset } from '../cards/cards';
import { refreshEnv } from './env';

const GLOBAL = 0; // ST regex SCRIPT_TYPES.GLOBAL

export interface PluginNeed { id: string; name: string; status: 'disabled' | 'missing' }

export interface ApplyPlan {
  avatar: string;
  cardName: string;
  preset?: string;
  worldsOn: string[];
  worldsOff: string[];
  regexOn: { id: string; name: string }[];
  regexOff: { id: string; name: string }[];
  plugins: PluginNeed[];
}

interface Snapshot {
  preset: string;
  globalWorlds: string[];
  regexDisabled: Record<string, boolean>;
}

export interface Applied {
  avatar: string;
  cardName: string;
  at: number;
  changes: string[];
  snapshot: Snapshot;
  undone?: boolean;
}

/** The last automatic switch (shown in the status panel with an undo button). */
export const lastApplied = signal<Applied | null>(null);

function globalWorlds(): string[] {
  return [...(loaded.worldInfo?.selected_world_info ?? [])];
}

function globalRegex(): Any[] {
  return loaded.regexEngine?.getScriptsByType?.(GLOBAL) ?? [];
}

/** Lorebooks bound to some other character (main or extra books). */
function booksOfOtherCards(avatar: string): Set<string> {
  const out = new Set<string>();
  for (const ch of ctx().characters ?? []) {
    if (ch.avatar === avatar) continue;
    const w = ch.data?.extensions?.world;
    if (w) out.add(w);
  }
  for (const e of loaded.worldInfo?.world_info?.charLore ?? []) {
    if (e.name === charaFileName(avatar)) continue;
    for (const b of e.extraBooks ?? []) out.add(b);
  }
  return out;
}

function ownBooks(char: Any): Set<string> {
  const out = new Set<string>();
  const w = char.data?.extensions?.world;
  if (w) out.add(w);
  const extra = loaded.worldInfo?.world_info?.charLore?.find((e: Any) => e.name === charaFileName(char.avatar))?.extraBooks ?? [];
  for (const b of extra) out.add(b);
  return out;
}

export function planFor(char: Any): ApplyPlan {
  const avatar: string = char.avatar;
  const s = settings();
  const profile = s.profiles[avatar];
  const owners = s.regexOwners ?? {};
  const api = presetApi();
  const cur = currentPresetName();

  const plan: ApplyPlan = { avatar, cardName: char.name, worldsOn: [], worldsOff: [], regexOn: [], regexOff: [], plugins: [] };

  // --- preset
  if (profile?.preset && profile.preset.api === api && profile.preset.name !== cur && presetNames().includes(profile.preset.name)) {
    plan.preset = profile.preset.name;
  }
  const targetPreset = plan.preset ?? cur;

  // --- global lorebooks
  const now = globalWorlds();
  const existing = new Set<string>(loaded.worldInfo?.world_names ?? []);
  if (profile?.globalWorlds) {
    plan.worldsOn = profile.globalWorlds.filter((w) => !now.includes(w) && existing.has(w));
    plan.worldsOff = now.filter((w) => !profile.globalWorlds!.includes(w));
  } else {
    const others = booksOfOtherCards(avatar);
    const mine = ownBooks(char);
    plan.worldsOff = now.filter((w) => others.has(w) && !mine.has(w));
  }

  // --- global regex
  for (const r of globalRegex()) {
    let want: boolean | undefined;
    if (profile?.globalRegexEnabled) want = profile.globalRegexEnabled.includes(r.scriptName);
    else {
      const o = owners[r.id];
      if (o?.kind === 'card') want = o.key === avatar;
      else if (o?.kind === 'preset') want = o.key === targetPreset;
    }
    if (want === undefined) continue;
    const on = !r.disabled;
    if (want && !on) plan.regexOn.push({ id: r.id, name: r.scriptName });
    if (!want && on) plan.regexOff.push({ id: r.id, name: r.scriptName });
  }

  // --- plugins (reported; enabling needs a page reload)
  const installed = installedExtensions();
  for (const r of requiredExtensions(cardInfo(char))) {
    const st = extStatus(r.req, installed);
    if (st.status === 'disabled' && st.match) plan.plugins.push({ id: st.match.id, name: st.match.name, status: 'disabled' });
    if (st.status === 'missing') plan.plugins.push({ id: '', name: r.req.name, status: 'missing' });
  }
  return plan;
}

export function planHasChanges(p: ApplyPlan): boolean {
  return !!p.preset || p.worldsOn.length > 0 || p.worldsOff.length > 0 || p.regexOn.length > 0 || p.regexOff.length > 0;
}

async function setRegexStates(changes: Record<string, boolean>): Promise<void> {
  const re = loaded.regexEngine;
  if (!re || !Object.keys(changes).length) return;
  const next = globalRegex().map((r: Any) => (r.id in changes ? { ...r, disabled: changes[r.id] } : r));
  await re.saveScriptsByType(next, GLOBAL);
  saveSettings();
  if (ctx().getCurrentChatId?.()) await ctx().reloadCurrentChat();
}

async function setWorlds(on: string[], off: string[]): Promise<void> {
  for (const w of off) await runSlash(`/world state=off silent=true ${slashQuote(w)}`);
  for (const w of on) await runSlash(`/world state=on silent=true ${slashQuote(w)}`);
}

export async function applyPlan(plan: ApplyPlan): Promise<string[]> {
  const snapshot: Snapshot = {
    preset: currentPresetName(),
    globalWorlds: globalWorlds(),
    regexDisabled: Object.fromEntries(globalRegex().map((r: Any) => [r.id, !!r.disabled])),
  };
  const changes: string[] = [];
  if (plan.preset) {
    await switchPreset(plan.preset);
    changes.push(`预设 → ${plan.preset}`);
  }
  if (plan.worldsOn.length || plan.worldsOff.length) {
    await setWorlds(plan.worldsOn, plan.worldsOff);
    for (const w of plan.worldsOff) changes.push(`关掉全局世界书「${w}」`);
    for (const w of plan.worldsOn) changes.push(`打开全局世界书「${w}」`);
  }
  const rx: Record<string, boolean> = {};
  for (const r of plan.regexOff) { rx[r.id] = true; changes.push(`关掉全局正则「${r.name}」`); }
  for (const r of plan.regexOn) { rx[r.id] = false; changes.push(`打开全局正则「${r.name}」`); }
  await setRegexStates(rx);
  if (changes.length) lastApplied.value = { avatar: plan.avatar, cardName: plan.cardName, at: Date.now(), changes, snapshot };
  refreshEnv();
  return changes;
}

export async function undoLastApply(): Promise<void> {
  const a = lastApplied.value;
  if (!a || a.undone) return;
  const s = a.snapshot;
  if (s.preset && s.preset !== currentPresetName()) await switchPreset(s.preset);
  const now = globalWorlds();
  await setWorlds(s.globalWorlds.filter((w) => !now.includes(w)), now.filter((w) => !s.globalWorlds.includes(w)));
  const rx: Record<string, boolean> = {};
  for (const r of globalRegex()) {
    if (r.id in s.regexDisabled && s.regexDisabled[r.id] !== !!r.disabled) rx[r.id] = s.regexDisabled[r.id];
  }
  await setRegexStates(rx);
  lastApplied.value = { ...a, undone: true };
  refreshEnv();
  toast('success', '已撤销刚才的自动切换');
}

/** Enable extensions (ST needs a reload for them to load). */
export async function enablePluginsAndReload(ids: string[]): Promise<void> {
  const ext = loaded.extensions;
  if (!ext?.enableExtension || !ids.length) return;
  // ST names extensions "third-party/<folder>"; ids here are folder names.
  for (const id of ids) await ext.enableExtension(id.startsWith("third-party/") ? id : `third-party/${id}`, false);
  location.reload();
}

let lastAvatar: string | null = null;

/** Called on chat change; applies the card's environment once per card switch. */
export async function autoApplyOnSwitch(openStatus: () => void): Promise<void> {
  const c = ctx();
  if (c.groupId) return;
  const char = c.characters?.[Number(c.characterId)];
  if (!char?.avatar || char.avatar === lastAvatar) return;
  lastAvatar = char.avatar;
  if (!settings().autoApplyEnv) return;
  // The card's own lorebook first (same rule as 角色档案: only creates, never overwrites).
  const imported: string[] = [];
  const w = cardInfo(char).world;
  if (settings().autoImportWorld && w.embedded && (w.state === 'missing' || w.state === 'unbound')) {
    if ((await importCardWorld(char.avatar, { quiet: true })) === 'imported') imported.push(`从卡里导入并绑定了世界书「${w.importName}」`);
  }
  const plan = planFor(char);
  if (planHasChanges(plan) || imported.length) {
    const changes = [...imported, ...(planHasChanges(plan) ? await applyPlan(plan) : [])];
    if (changes.length) {
      toast('success', `已按「${char.name}」的配套环境切换：${changes.join('；')}。点这里查看或撤销。`, '换卡自动套用', { onclick: openStatus, timeOut: 9000 });
    }
  }
  const disabled = plan.plugins.filter((p) => p.status === 'disabled');
  const missing = plan.plugins.filter((p) => p.status === 'missing');
  if (disabled.length || missing.length) {
    const parts = [
      disabled.length && `没启用：${disabled.map((p) => p.name).join('、')}`,
      missing.length && `没安装：${missing.map((p) => p.name).join('、')}`,
    ].filter(Boolean);
    toast('warning', `「${char.name}」需要的插件${parts.join('；')}。点这里处理。`, '换卡自动套用', { onclick: openStatus, timeOut: 9000 });
  }
}
