/**
 * 全局 / 本卡专用（规则见 dev/角色档案重做-spec.md）。
 *
 * - 全局 = 酒馆现在的设置，不另外存。本卡专用存在 profiles[卡]，只存和全局不一样的项。
 * - 进卡换上本卡专用之前，把这些项原来是什么记进 settings().baseline；离卡时换回去（见 core/setup.ts leavePlan）。
 *   只记本卡专用的项。预设推荐的模型、关掉别的卡的书、正则归属这些规则改的，和以前一样改了就留着，不记、不换回。
 * - 角色档案里改的才算本卡专用（setCardItem）；酒馆面板里改的是全局，除非那一项已经是本卡专用。
 *
 * 项的键：preset（预设名）/ model / w:书名（开 / 关）/ r:正则 id（开 / 关）。
 * 美化（cardLook.ts 自己换、自己换回）和人设（酒馆自己的「连接到角色」）不走这里。
 */
import { ctx, currentCharacter, loaded, reloadChatSafe, runSlash, saveSettings, settings, slashQuote, type Any, type Baseline, type EnvProfile } from '../../st/st';
import { markDeleted } from '../../st/store';
import { leavePlan, migrateProfile, unnamedRegex } from '../../core/setup';
import { currentModel, sameModel, setModel, withoutModelGuard, type ModelChoice } from '../model';
import { archiveVersion, currentPresetName, presetApi, presetNames, switchPreset } from '../cards/cards';

const GLOBAL = 0; // ST regex SCRIPT_TYPES.GLOBAL

export function globalWorlds(): string[] {
  return [...(loaded.worldInfo?.selected_world_info ?? [])];
}
export function globalRegex(): Any[] {
  return loaded.regexEngine?.getScriptsByType?.(GLOBAL) ?? [];
}

// ------------------------------------------------------------- profile ---

/** 这张卡的本卡专用（读到旧格式就转成新格式并存回去）。 */
export function profileOf(avatar: string): EnvProfile | undefined {
  const s = settings();
  const p = s.profiles[avatar];
  if (!p) return undefined;
  // 酒馆的世界书 / 正则模块没读到时不转：转的时候要知道现在开着哪些，读不到会把旧清单转丢
  if (!loaded.worldInfo || !loaded.regexEngine) return p;
  const next = migrateProfile(p, { worldsOn: globalWorlds(), regex: globalRegex().map((r: Any) => ({ id: String(r.id), name: r.scriptName, on: !r.disabled })) });
  if (next !== p) { s.profiles[avatar] = { ...next, updatedAt: p.updatedAt ?? p.savedAt ?? new Date().toISOString() }; saveSettings(); }
  return s.profiles[avatar];
}

/** 所有卡的旧格式都转一遍（启动时调用；store 合并回来的旧格式，读的时候也会再转）。 */
export function migrateAll(): void {
  for (const avatar of Object.keys(settings().profiles)) profileOf(avatar);
  const s = settings() as unknown as Record<string, unknown>;
  // 两个开关去掉了：本卡专用的一定会换上
  if ('autoApplyEnv' in s || 'cardLook' in s) { delete s.autoApplyEnv; delete s.cardLook; saveSettings(); }
}

export function profileEmpty(p: EnvProfile): boolean {
  return !p.preset && !p.model && !p.theme && !Object.keys(p.worlds ?? {}).length && !Object.keys(p.regex ?? {}).length;
}

/** 这张卡哪些项是本卡专用（美化、人设除外）。 */
export function overriddenKeys(p: EnvProfile | undefined): string[] {
  if (!p) return [];
  return [
    ...(p.preset ? ['preset'] : []),
    ...(p.model ? ['model'] : []),
    ...Object.keys(p.worlds ?? {}).map((w) => `w:${w}`),
    ...Object.keys(p.regex ?? {}).map((id) => `r:${id}`),
  ];
}

function writeProfile(avatar: string, cardName: string, edit: (p: EnvProfile) => void): void {
  const s = settings();
  const p: EnvProfile = { ...(profileOf(avatar) ?? { cardName }) };
  if (p.worlds) p.worlds = { ...p.worlds };
  if (p.regex) p.regex = { ...p.regex };
  edit(p);
  p.cardName = cardName;
  p.updatedAt = new Date().toISOString();
  if (p.worlds && !Object.keys(p.worlds).length) delete p.worlds;
  if (p.regex && !Object.keys(p.regex).length) delete p.regex;
  if (profileEmpty(p)) { delete s.profiles[avatar]; markDeleted('profiles', avatar); }
  else s.profiles[avatar] = p;
  saveSettings();
  archiveVersion.value++;
}

/** 把一项写进 / 移出这张卡的记录（value === undefined = 移出）。 */
function setProfileKey(p: EnvProfile, key: string, value: unknown): void {
  if (key === 'preset') { if (value === undefined) delete p.preset; else p.preset = { api: presetApi(), name: String(value) }; }
  else if (key === 'model') { if (value === undefined) delete p.model; else p.model = value as ModelChoice; }
  else if (key.startsWith('w:')) { const w = key.slice(2); p.worlds ??= {}; if (value === undefined) delete p.worlds[w]; else p.worlds[w] = !!value; }
  else if (key.startsWith('r:')) { const id = key.slice(2); p.regex ??= {}; if (value === undefined) delete p.regex[id]; else p.regex[id] = !!value; }
}

/** 本卡专用记录里这一项的值（预设返回名字）。 */
export function profileValue(p: EnvProfile, key: string): unknown {
  if (key === 'preset') return p.preset?.name;
  if (key === 'model') return p.model;
  if (key.startsWith('w:')) return p.worlds?.[key.slice(2)];
  if (key.startsWith('r:')) return p.regex?.[key.slice(2)];
  return undefined;
}

// ---------------------------------------------------------------- live ---

/** 现在酒馆里这一项是什么（正则不在了 = undefined）。 */
export function liveValue(key: string): unknown {
  if (key === 'preset') return currentPresetName();
  if (key === 'model') return currentModel();
  if (key.startsWith('w:')) return globalWorlds().includes(key.slice(2));
  if (key.startsWith('r:')) {
    const r = globalRegex().find((x: Any) => String(x.id) === key.slice(2));
    return r ? !r.disabled : undefined;
  }
  return undefined;
}

export function sameValue(key: string, a: unknown, b: unknown): boolean {
  return key === 'model' ? sameModel(a as ModelChoice | null, b as ModelChoice | null) : a === b;
}

/**
 * 把几项换成给的值。先换预设（换预设可能顺带换模型，所以模型在后面），世界书用 /world，正则一次存好。
 * 预设总是在 withoutModelGuard 里换：这是工具箱要换的，不弹「模型被预设换掉了」。
 * `inChatLoad`：在酒馆换聊天的过程中（CHAT_CHANGED 里）调用，只改显示的正则要等聊天载入完再重画。
 * `quiet`：玩家自己在角色档案里换的，换预设顺带换掉模型时不弹提示。没带模型、也不是玩家换的，照常让「模型被预设换掉了」的提示把模型换回来。
 * 返回换成功的项。
 */
export async function applyLive(changes: Record<string, unknown>, { inChatLoad = false, quiet = false } = {}): Promise<string[]> {
  const done: string[] = [];
  const preset = changes.preset as string | undefined;
  const model = changes.model as ModelChoice | null | undefined;
  if (preset && preset !== currentPresetName() && presetNames().includes(preset)) {
    const ok = model || quiet ? await withoutModelGuard(() => switchPreset(preset)) : await switchPreset(preset);
    if (ok) done.push('preset');
  }
  if (model && !sameModel(model, currentModel())) {
    if (await withoutModelGuard(() => setModel(model))) done.push('model');
  }
  for (const [key, v] of Object.entries(changes)) {
    if (!key.startsWith('w:') || liveValue(key) === !!v) continue;
    await runSlash(`/world state=${v ? 'on' : 'off'} silent=true ${slashQuote(key.slice(2))}`);
    if (liveValue(key) === !!v) done.push(key);
  }
  const rx = Object.entries(changes).filter(([k, v]) => k.startsWith('r:') && liveValue(k) !== undefined && liveValue(k) !== !!v);
  if (rx.length) {
    const want = new Map(rx.map(([k, v]) => [k.slice(2), !v]));
    const re = loaded.regexEngine;
    const next = globalRegex().map((r: Any) => (want.has(String(r.id)) ? { ...r, disabled: want.get(String(r.id)) } : r));
    await re?.saveScriptsByType(next, GLOBAL);
    saveSettings();
    done.push(...rx.map(([k]) => k));
    // 只改显示的正则要重画消息才看得到。酒馆正在换聊天时不能马上重画（各个监听者会跑两遍），等它载完
    const chatId = ctx().getCurrentChatId?.();
    if (chatId && next.some((r: Any) => want.has(String(r.id)) && r.markdownOnly)) {
      if (!inChatLoad) await reloadChatSafe();
      else setTimeout(() => { if (ctx().getCurrentChatId?.() === chatId) void reloadChatSafe(); }, 1000);
    }
  }
  return done;
}

// ------------------------------------------------------------ baseline ---

function baseline(): Baseline | undefined {
  return settings().baseline;
}

/**
 * 进卡（或在角色档案里改）时：这几项原来是什么（before）记下来。同一张卡已经记过的项，原值不变。
 * after 先记成要换成的值，换完再用 settleBaseline 改成实际换成的。
 */
export function recordBaseline(avatar: string, targets: Record<string, unknown>): void {
  const s = settings();
  if (!Object.keys(targets).length) return;
  if (!s.baseline || s.baseline.avatar !== avatar) s.baseline = { avatar, items: {} };
  for (const [key, after] of Object.entries(targets)) {
    const old = s.baseline.items[key];
    s.baseline.items[key] = { before: old ? old.before : liveValue(key), after };
  }
  saveSettings();
}

/** 换完以后：没换成的项，after 改成现在实际的值（不然离卡时会把全局的值当成玩家改的，存进这张卡）。 */
export function settleBaseline(avatar: string, keys: string[], done: string[]): void {
  const b = baseline();
  if (!b || b.avatar !== avatar) return;
  for (const k of keys) if (!done.includes(k) && b.items[k]) b.items[k].after = liveValue(k);
  saveSettings();
}

/**
 * 离开记了原值的那张卡（换卡、回首页、进群聊）：本卡专用的项在别处改过的，记进那张卡；
 * 还是进卡时换上的，换回原来的。`noSave`：重新打开页面时停在首页，不知道离开前改过什么，只换回、不记。
 */
export async function leaveCard({ noSave = false, inChatLoad = false } = {}): Promise<void> {
  const b = baseline();
  if (!b) return;
  const p = profileOf(b.avatar);
  const live: Record<string, unknown> = {};
  for (const key of Object.keys(b.items)) { const v = liveValue(key); if (v !== undefined) live[key] = v; }
  const keys = new Set(overriddenKeys(p));
  // 换了 API：现在的预设是另一种 API 的，不能记成这张卡的
  if (p?.preset && p.preset.api !== presetApi()) keys.delete('preset');
  const { restore, save } = leavePlan(b.items, live, noSave ? new Set() : keys, sameValue);
  if (Object.keys(save).length && p) writeProfile(b.avatar, p.cardName, (q) => { for (const [k, v] of Object.entries(save)) setProfileKey(q, k, v); });
  delete settings().baseline;
  saveSettings();
  await applyLive(restore, { inChatLoad });
}

// ------------------------------------------------- 角色档案里改的 ---

const isCurrent = (avatar: string) => String(currentCharacter()?.avatar ?? '') === avatar;

/**
 * 在角色档案里改一项：value 是要用的值 → 存成本卡专用；null → 回到全局。
 * 正在聊的卡马上换；别的卡只改记录，下次进卡生效。
 * 选预设时，模型跟着换成这张卡的、或者这个预设推荐的（和进卡时一样）。
 */
export async function setCardItem(avatar: string, cardName: string, key: string, value: unknown): Promise<void> {
  if (value === null) {
    writeProfile(avatar, cardName, (p) => setProfileKey(p, key, undefined));
    const b = baseline();
    if (isCurrent(avatar) && b?.avatar === avatar && key in b.items) {
      const before = b.items[key].before;
      delete b.items[key];
      saveSettings();
      // 预设回到全局时，这张卡专用的模型还是它（换预设可能把模型带走）
      const m = key === 'preset' ? profileOf(avatar)?.model : undefined;
      await applyLive(m ? { [key]: before, model: m } : { [key]: before }, { quiet: true });
    }
    return;
  }
  writeProfile(avatar, cardName, (p) => setProfileKey(p, key, value));
  if (!isCurrent(avatar)) return;
  recordBaseline(avatar, { [key]: value });
  const changes: Record<string, unknown> = { [key]: value };
  if (key === 'preset') {
    const m = profileOf(avatar)?.model ?? settings().presetInfo?.[String(value)]?.model;
    if (m) changes.model = m;
  }
  settleBaseline(avatar, [key], await applyLive(changes, { quiet: true }));
}

/**
 * 「让所有卡都用「X」」：现在的值变成全局，这张卡不再单独记这一项。只在正在聊、而且现在用的就是 X 时能用。
 * 返回撤销。
 */
export function makeGlobal(avatar: string, cardName: string, key: string): () => Promise<void> {
  const prev = profileOf(avatar);
  const prevValue = prev ? profileValue(prev, key) : undefined;
  const b = baseline();
  const prevItem = b?.avatar === avatar ? b.items[key] : undefined;
  writeProfile(avatar, cardName, (p) => setProfileKey(p, key, undefined));
  if (prevItem) { delete b!.items[key]; saveSettings(); }
  return async () => {
    writeProfile(avatar, cardName, (p) => setProfileKey(p, key, prevValue));
    if (prevItem && isCurrent(avatar)) {
      const st = settings();
      if (!st.baseline || st.baseline.avatar !== avatar) st.baseline = { avatar, items: {} };
      st.baseline.items[key] = prevItem;
      saveSettings();
    }
  };
}

/** 全局现在是什么：记了原值的用原值（那是进卡前的全局），没记的就是酒馆现在的。 */
export function globalValue(key: string): unknown {
  const b = baseline();
  if (b && key in b.items) return b.items[key].before;
  return liveValue(key);
}

/** 「改回全局」：这张卡的本卡专用全部去掉（美化、人设由调用方一起处理）。返回撤销。 */
export async function revertCard(avatar: string): Promise<() => Promise<void>> {
  const s = settings();
  const prev = s.profiles[avatar] ? structuredClone(s.profiles[avatar]) : undefined;
  const b = baseline();
  const prevBase = b?.avatar === avatar ? structuredClone(b) : undefined;
  delete s.profiles[avatar];
  markDeleted('profiles', avatar);
  if (prevBase && isCurrent(avatar)) {
    delete s.baseline;
    saveSettings();
    await applyLive(Object.fromEntries(Object.entries(prevBase.items).map(([k, v]) => [k, v.before])));
  } else saveSettings();
  archiveVersion.value++;
  return async () => {
    if (prev) { s.profiles[avatar] = { ...prev, updatedAt: new Date().toISOString() }; saveSettings(); archiveVersion.value++; }
    if (prevBase && isCurrent(avatar)) {
      s.baseline = prevBase;
      saveSettings();
      await applyLive(Object.fromEntries(Object.entries(prevBase.items).map(([k, v]) => [k, v.after])));
    }
  };
}

/** 显示名：正则 id → 名字。 */
export function regexName(id: string): string {
  const r = globalRegex().find((x: Any) => String(x.id) === id);
  return unnamedRegex(r?.scriptName);
}
