/**
 * 换卡时换上这张卡的本卡专用（规则见 dev/角色档案重做-spec.md 和 setup.ts）。
 *
 * 要换的（按优先级）：
 * 1. 这张卡的本卡专用：预设、模型、全局世界书 / 全局正则在这张卡停用或启用（只给这张卡用的书是附加世界书，酒馆自己加载）；
 * 2. 没设专用的项只做确定该做的事：
 *    - 预设推荐的模型（本预设专用）；
 *    - 别的卡绑定的世界书被开成了全局 → 关掉；
 *    - 在「正则归属」里标成属于别的卡 / 别的预设的全局正则 → 关掉，属于这张卡 / 当前预设的 → 打开。
 * 换之前记下原值（baseline），离卡时换回去。插件（酒馆不能在运行中开关）提示一键启用并刷新。
 */
import { signal } from '@preact/signals';
import { presetScriptLine } from '../scripts/notice';
import { ctx, currentCharacter, loaded, settings, toast, type Any } from '../../st/st';
import { cardInfo, currentPresetName, extStatus, importCardWorld, installedExtensions, presetApi, presetNames, requiredExtensions } from '../cards/cards';
import { refreshEnv } from './env';
import { currentModel, modelLabel, modelsApply, sameModel, type ModelChoice } from '../model';
import { applyLive, bookOwners, globalRegex, globalWorlds, leaveCard, ownBooks, liveValue, overriddenKeys, profileOf, recordBaseline, settleBaseline } from './setup';
import { unnamedRegex } from '../../core/setup';

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

/**
 * 换卡时正在换成的预设名（换完是 null）。酒馆要等这一步做完才显示聊天，手机上要一秒多，
 * 导航条下沿显示一条进度条，让人知道没卡住。
 */
export const applyingPreset = signal<string | null>(null);
/**
 * 换卡时正在给哪张卡换配置（导入世界书、换预设 / 世界书 / 正则），换完是 null。
 * 导航条下沿的进度条看这个：超过 4 秒酒馆先显示聊天（见 index.tsx），这时进度条还在，说明后台还在换。
 */
export const applyingCard = signal<string | null>(null);

export function planFor(char: Any): ApplyPlan {
  const avatar: string = char.avatar;
  const s = settings();
  const profile = profileOf(avatar);
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

  // --- global lorebooks: 本卡专用的照它；其余只关掉别的卡的书
  const now = globalWorlds();
  const existing = new Set<string>(loaded.worldInfo?.world_names ?? []);
  const set = profile?.worlds ?? {};
  for (const [w, on] of Object.entries(set)) {
    if (on && !now.includes(w) && existing.has(w)) plan.worldsOn.push(w);
    if (!on && now.includes(w)) plan.worldsOff.push(w);
  }
  const others = bookOwners(avatar);
  const mine = ownBooks(avatar);
  for (const w of now) if (!(w in set) && others.has(w) && !mine.has(w)) plan.worldsOff.push(w);

  // --- global regex: 本卡专用的照它；其余按归属
  for (const r of globalRegex()) {
    const id = String(r.id);
    let want: boolean | undefined = profile?.regex?.[id];
    if (want === undefined) {
      const o = owners[r.id];
      if (o?.kind === 'card') want = o.key === avatar;
      else if (o?.kind === 'preset') want = o.key === targetPreset;
    }
    if (want === undefined) continue;
    const on = !r.disabled;
    if (want && !on) plan.regexOn.push({ id, name: unnamedRegex(r.scriptName) });
    if (!want && on) plan.regexOff.push({ id, name: unnamedRegex(r.scriptName) });
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

/** 计划里要换的项（setup.ts 的键）。 */
function targetsOf(plan: ApplyPlan, withModel: boolean): Record<string, unknown> {
  const t: Record<string, unknown> = {};
  if (plan.preset) t.preset = plan.preset;
  if (withModel && plan.model && !sameModel(plan.model, currentModel())) t.model = plan.model;
  for (const w of plan.worldsOn) t[`w:${w}`] = true;
  for (const w of plan.worldsOff) t[`w:${w}`] = false;
  for (const r of plan.regexOn) t[`r:${r.id}`] = true;
  for (const r of plan.regexOff) t[`r:${r.id}`] = false;
  return t;
}

/** 换卡时还在后台换的模型：离卡前要等它换完，不然离卡换回的值会被它盖掉。 */
let modelJob: Promise<void> = Promise.resolve();

/**
 * 换上这张卡的设置。`deferModel` 时先把预设、世界书、正则换好就返回（换卡时酒馆在等这一步才显示聊天），
 * 模型放到后面再换：换模型要连 API、等模型列表，手机上要一两秒，而显示聊天用不到它。
 * 只给本卡专用的项记原值（离卡换回）；预设推荐的模型、别的卡的书、正则归属这些规则改的不记，改了就留着（和以前一样）。
 */
export async function applyPlan(plan: ApplyPlan, opts: { deferModel?: boolean; onModel?: (changes: string[]) => void } = {}): Promise<string[]> {
  const changes: string[] = [];
  // 换卡要好几秒：中途玩家又点了别的卡，剩下的步骤就不做了，免得这张卡的预设、世界书落到那张卡上
  const moved = () => String(currentCharacter()?.avatar ?? '') !== plan.avatar;
  const profile = profileOf(plan.avatar);
  const own = overriddenKeys(profile).filter((k) => !(k === 'preset' && profile?.preset?.api !== presetApi()));
  const first = targetsOf(plan, !opts.deferModel);
  // 本卡专用的项都记原值，包括进卡时本来就一样的（之后在酒馆里改它，离卡时才知道要记进这张卡）
  const mine = own;
  recordBaseline(plan.avatar, Object.fromEntries(mine.map((k) => [k, k in first ? first[k] : liveValue(k)])));
  // 这张卡要换模型（本卡专用或预设推荐的，模型可能稍后才换）：换预设顺带换掉模型是预料之中，不弹「模型变了」
  const doneList = await applyLive(first, { inChatLoad: true, quiet: !!plan.model });
  settleBaseline(plan.avatar, mine, doneList);
  const done = new Set(doneList);
  if (done.has('preset')) {
    changes.push(`预设换成「${plan.preset}」`);
    const sl = presetScriptLine(plan.preset!);
    if (sl) changes.push(sl);
  }
  if (done.has('model')) changes.push(`模型换成 ${modelLabel(plan.model!)}`);
  for (const w of plan.worldsOff) if (done.has(`w:${w}`)) changes.push(`关掉全局世界书「${w}」`);
  for (const w of plan.worldsOn) if (done.has(`w:${w}`)) changes.push(`打开全局世界书「${w}」`);
  for (const r of plan.regexOff) if (done.has(`r:${r.id}`)) changes.push(`关掉全局正则「${r.name}」`);
  for (const r of plan.regexOn) if (done.has(`r:${r.id}`)) changes.push(`打开全局正则「${r.name}」`);
  refreshEnv();
  if (opts.deferModel) {
    // 不等它：让酒馆先把聊天显示出来
    modelJob = (async () => {
      let more: string[] = [];
      try {
        const m = plan.model;
        if (m && !moved() && !sameModel(m, currentModel())) {
          const isOwn = own.includes('model');
          if (isOwn) recordBaseline(plan.avatar, { model: m });
          const ok = (await applyLive({ model: m })).length > 0;
          if (isOwn) settleBaseline(plan.avatar, ['model'], ok ? ['model'] : []);
          more = ok ? [`模型换成 ${modelLabel(m)}`] : [`没能换成模型 ${modelLabel(m)}（这个 API 可能还没填密钥）`];
        } else if (own.includes('model')) recordBaseline(plan.avatar, { model: currentModel() });
      } catch (e) { console.error('[RedBird] model switch failed', e); }
      if (more.length && !moved()) refreshEnv();
      opts.onModel?.(more);
    })();
  }
  return changes;
}

/** Enable extensions (ST needs a reload for them to load). */
export async function enablePluginsAndReload(ids: string[]): Promise<void> {
  const ext = loaded.extensions;
  if (!ext?.enableExtension || !ids.length) return;
  // ST names extensions "third-party/<folder>"; ids here are folder names.
  for (const id of ids) await ext.enableExtension(id.startsWith('third-party/') ? id : `third-party/${id}`, false);
  location.reload();
}

let lastAvatar: string | null = null;
/** 刷新页面后还没换过聊天 */
let sinceLoad = true;
let switchSeq = 0;
/** 一次只换一张：后来的那次等前面的（离卡、进卡、后台换模型）都做完再开始。 */
let queue: Promise<void> = Promise.resolve();

/** Called on chat change: leave the previous card (put back what we changed), then switch to this one. */
export function autoApplyOnSwitch(openStatus: () => void): Promise<void> {
  const c = ctx();
  const char = c.groupId ? null : c.characters?.[Number(c.characterId)];
  const avatar: string | null = char?.avatar ?? null;
  if (avatar && avatar === lastAvatar) return Promise.resolve();
  lastAvatar = avatar;
  const fresh = sinceLoad;
  sinceLoad = false;
  const my = ++switchSeq;
  const job = queue.then(async () => {
    await modelJob;
    // 刷新页面后回到同一张卡：原值还记着，不用换回去。刷新后第一次去别处：只换回、不往卡里记
    const b = settings().baseline;
    if (b && b.avatar !== avatar) await leaveCard({ inChatLoad: true, noSave: fresh });
    if (!char || my !== switchSeq) return;
    applyingCard.value = char.name;
    // 先结束的那次不能把后来那张卡的进度条清掉
    try { await applyForCard(char, openStatus); } finally { if (my === switchSeq) applyingCard.value = null; }
  });
  queue = job.catch(() => {});
  return job;
}

async function applyForCard(char: Any, openStatus: () => void): Promise<void> {
  // The card's own lorebook first (same rule as 角色档案: only creates, never overwrites).
  const imported: string[] = [];
  const w = cardInfo(char).world;
  if (settings().autoImportWorld && w.embedded && (w.state === 'missing' || w.state === 'unbound')) {
    if ((await importCardWorld(char.avatar, { quiet: true })) === 'imported') imported.push(`从卡里导入并绑定了世界书「${w.importName}」`);
  }
  if (String(currentCharacter()?.avatar ?? '') !== char.avatar) return;
  const plan = planFor(char);
  // 没什么要换的：本卡专用的项也要记下原值（之后在酒馆里改了它，离卡时才知道要记进这张卡）
  if (!planHasChanges(plan)) {
    const p = profileOf(char.avatar);
    recordBaseline(char.avatar, Object.fromEntries(overriddenKeys(p).filter((k) => !(k === 'preset' && p?.preset?.api !== presetApi())).map((k) => [k, liveValue(k)])));
  }
  if (planHasChanges(plan) || imported.length) {
    const tell = (changes: string[]) => {
      if (String(currentCharacter()?.avatar ?? '') !== char.avatar) return;
      if (changes.length) toast('success', `进「${char.name}」时换了：${changes.join('；')}。点这里查看。`, '换卡', { onclick: openStatus, timeOut: 9000 });
    };
    if (!planHasChanges(plan)) tell(imported);
    else {
      // 模型在聊天显示出来之后再换，两步都完成后一起提示（谁先完成都行）
      let first: string[] | null = null;
      let later: string[] | null = null;
      const both = () => { if (first && later) tell([...first, ...later]); };
      applyingPreset.value = plan.preset ?? null;
      try {
        first = [...imported, ...(await applyPlan(plan, { deferModel: true, onModel: (more) => { later = more; both(); } }))];
      } finally {
        applyingPreset.value = null;
      }
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
    toast('warning', `「${char.name}」需要的插件${parts.join('；')}。点这里处理。`, '换卡', { onclick: openStatus, timeOut: 9000 });
  }
}
