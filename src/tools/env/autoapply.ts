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
import { currentModel, modelLabel, modelsApply, sameModel, setModel, withoutModelGuard, type ModelChoice } from '../model';

const GLOBAL = 0; // ST regex SCRIPT_TYPES.GLOBAL

export interface PluginNeed { id: string; name: string; status: 'disabled' | 'missing' }

export interface ApplyPlan {
  avatar: string;
  cardName: string;
  preset?: string;
  /** Model to end up on (card's, else its preset's); checked again after the preset switch. */
  model?: ModelChoice;
  worldsOn: string[];
  worldsOff: string[];
  regexOn: { id: string; name: string }[];
  regexOff: { id: string; name: string }[];
  plugins: PluginNeed[];
}

interface Snapshot {
  preset: string;
  model: ModelChoice | null;
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

  // --- model: the card's own, else the one recommended for its preset
  const wantModel = profile?.model ?? s.presetInfo?.[targetPreset]?.model;
  if (wantModel && modelsApply()) plan.model = wantModel;

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
  return !!p.preset || (!!p.model && !sameModel(p.model, currentModel())) || p.worldsOn.length > 0 || p.worldsOff.length > 0 || p.regexOn.length > 0 || p.regexOff.length > 0;
}

async function setRegexStates(changes: Record<string, boolean>, { duringChatLoad = false } = {}): Promise<void> {
  const re = loaded.regexEngine;
  if (!re || !Object.keys(changes).length) return;
  const next = globalRegex().map((r: Any) => (r.id in changes ? { ...r, disabled: changes[r.id] } : r));
  await re.saveScriptsByType(next, GLOBAL);
  saveSettings();
  // Only display-only regex needs the messages re-rendered; the others act on new text / the prompt.
  const chatId = ctx().getCurrentChatId?.();
  if (!chatId || !next.some((r: Any) => r.id in changes && r.markdownOnly)) return;
  if (!duringChatLoad) { await ctx().reloadCurrentChat(); return; }
  // We're inside ST's CHAT_CHANGED: reloading now would load the chat again in the middle of its own
  // load (every CHAT_CHANGED / first-message listener would run twice). Reload once it has finished.
  setTimeout(() => { if (ctx().getCurrentChatId?.() === chatId) void ctx().reloadCurrentChat(); }, 1000);
}

async function setWorlds(on: string[], off: string[]): Promise<void> {
  for (const w of off) await runSlash(`/world state=off silent=true ${slashQuote(w)}`);
  for (const w of on) await runSlash(`/world state=on silent=true ${slashQuote(w)}`);
}

/**
 * 套用推荐配置。`deferModel` 时先把预设、世界书、正则换好就返回（换卡时酒馆在等这一步才显示聊天），
 * 模型放到后面再换：换模型要连 API、等模型列表，手机上要一两秒，而显示聊天用不到它。
 * 换完模型后调用 `onModel`，并把结果补进「撤销」记录。
 */
export async function applyPlan(plan: ApplyPlan, opts: { deferModel?: boolean; onModel?: (changes: string[]) => void } = {}): Promise<string[]> {
  const snapshot: Snapshot = {
    preset: currentPresetName(),
    model: currentModel(),
    globalWorlds: globalWorlds(),
    regexDisabled: Object.fromEntries(globalRegex().map((r: Any) => [r.id, !!r.disabled])),
  };
  const changes: string[] = [];
  if (plan.preset) {
    // 这张卡有推荐模型：预设带过来的模型马上会被换成推荐的，不用提示；没有的话，模型被预设换掉会单独提示（能换回去）
    const ok = plan.model ? await withoutModelGuard(() => switchPreset(plan.preset!)) : await switchPreset(plan.preset);
    if (ok) changes.push(`预设换成「${plan.preset}」`);
  }
  const doModel = async (): Promise<string[]> => {
    const m = plan.model;
    if (!m || sameModel(m, currentModel())) return [];
    return (await withoutModelGuard(() => setModel(m)))
      ? [`模型换成 ${modelLabel(m)}`]
      : [`没能换成推荐的模型 ${modelLabel(m)}（这个 API 可能还没填密钥）`];
  };
  if (!opts.deferModel) changes.push(...(await doModel()));
  if (plan.worldsOn.length || plan.worldsOff.length) {
    await setWorlds(plan.worldsOn, plan.worldsOff);
    for (const w of plan.worldsOff) changes.push(`关掉全局世界书「${w}」`);
    for (const w of plan.worldsOn) changes.push(`打开全局世界书「${w}」`);
  }
  const rx: Record<string, boolean> = {};
  for (const r of plan.regexOff) { rx[r.id] = true; changes.push(`关掉全局正则「${r.name}」`); }
  for (const r of plan.regexOn) { rx[r.id] = false; changes.push(`打开全局正则「${r.name}」`); }
  await setRegexStates(rx, { duringChatLoad: true });
  const record = () => { if (changes.length) lastApplied.value = { avatar: plan.avatar, cardName: plan.cardName, at: Date.now(), changes: [...changes], snapshot }; };
  record();
  refreshEnv();
  if (opts.deferModel) {
    // 不等它：让酒馆先把聊天显示出来
    void (async () => {
      let more: string[] = [];
      try { more = await doModel(); } catch (e) { console.error('[RedBird] model switch failed', e); }
      if (more.length) { changes.push(...more); record(); refreshEnv(); }
      opts.onModel?.(more);
    })();
  }
  return changes;
}

export async function undoLastApply(): Promise<void> {
  const a = lastApplied.value;
  if (!a || a.undone) return;
  const s = a.snapshot;
  await withoutModelGuard(async () => {
    if (s.preset && s.preset !== currentPresetName()) await switchPreset(s.preset);
    if (s.model && !sameModel(s.model, currentModel())) await setModel(s.model);
  });
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
    const tell = (changes: string[]) => {
      if (changes.length) toast('success', `已换成「${char.name}」的配置：${changes.join('；')}。点这里查看或撤销。`, '自动切换', { onclick: openStatus, timeOut: 9000 });
    };
    if (!planHasChanges(plan)) tell(imported);
    else {
      // 模型在聊天显示出来之后再换，两步都完成后一起提示（谁先完成都行）
      let first: string[] | null = null;
      let later: string[] | null = null;
      const both = () => { if (first && later) tell([...first, ...later]); };
      first = [...imported, ...(await applyPlan(plan, { deferModel: true, onModel: (more) => { later = more; both(); } }))];
      both();
    }
  }
  const disabled = plan.plugins.filter((p) => p.status === 'disabled');
  const missing = plan.plugins.filter((p) => p.status === 'missing');
  if (disabled.length || missing.length) {
    const parts = [
      disabled.length && `未启用：${disabled.map((p) => p.name).join('、')}`,
      missing.length && `未安装：${missing.map((p) => p.name).join('、')}`,
    ].filter(Boolean);
    toast('warning', `「${char.name}」需要的插件${parts.join('；')}。点这里处理。`, '自动切换', { onclick: openStatus, timeOut: 9000 });
  }
}
