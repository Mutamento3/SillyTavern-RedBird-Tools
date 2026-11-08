/**
 * 这张卡配套环境的"需要注意"检查：世界书 / 预设 / 正则 / 脚本 / 插件里哪些没到位，以及一键修复。
 * 导航条上的「环境」按钮显示问题数；完整内容在「这张卡」页面里。
 */
import { computed, signal } from '@preact/signals';
import { ctx, currentCharacter, loaded, saveSettings, settings, type Any } from '../st/st';
import { cardInfo, currentPresetName, importCardWorld, presetApi, setRecommendedPreset, switchPreset } from '../tools/cards/cards';
import { enablePluginsAndReload, planFor } from '../tools/env/autoapply';
import { currentBookScopes } from '../tools/flow/capture';
import { buildEnvReport } from '../tools/env/env';
import { currentModel, modelLabel, modelsApply, sameModel, setModel } from '../tools/model';
import { panelOpen } from '../ui/Panel';
import { chatTick } from './Shell';
import { openDrawers } from './drawers';
import { sourcesTick } from '../tools/sources';

/** Bumped after actions so the panel re-reads ST state. */
export const statusTick = signal(0);

export type Level = 'ok' | 'warn' | 'info';
export interface Line { level: Level; text: string; detail?: string; action?: { label: string; run: () => void | Promise<void> } }
interface Section { title: string; lines: Line[] }

function hasMvu(char: Any): boolean {
  const ext = char.data?.extensions ?? {};
  try {
    return /MagVarUpdate/i.test(JSON.stringify(ext.tavern_helper ?? ext.TavernHelper_scripts ?? ''));
  } catch {
    return false;
  }
}

/**
 * 状态变了就加一（换聊天、刷新状态、改了来源信息、酒馆面板开关）。工具箱按钮、状态栏、世界书按钮、
 * 角色档案都要用「这张卡的检查结果」，同一次变化里只算一遍，按这个数和卡来缓存。
 */
let genN = 0;
const envGen = computed(() => { void chatTick.value; void statusTick.value; void sourcesTick.value; void openDrawers.value; return ++genN; });

function cached<T>(fn: (char: Any) => T): (char: Any) => T {
  let last: { gen: number; avatar: string; val: T } | null = null;
  return (char: Any) => {
    const gen = envGen.value;
    const avatar = String(char?.avatar ?? '');
    if (last && last.gen === gen && last.avatar === avatar) return last.val;
    const val = fn(char);
    last = { gen, avatar, val };
    return val;
  };
}

/** planFor for display (status bar, world button); the real switch still calls planFor fresh. */
export const planForView = cached((char: Any) => planFor(char));

const buildSections = cached(buildSectionsNow);

function buildSectionsNow(char: Any): { sections: Section[]; issues: number } {
  const info = cardInfo(char);
  const scopes = currentBookScopes();
  const report = buildEnvReport();
  const plan = planForView(char);
  const sections: Section[] = [];
  const bump = () => { statusTick.value++; };

  // ---- 世界书
  const wb: Line[] = [];
  const w = info.world;
  if (w.state === 'ok') wb.push({ level: 'ok', text: `「${w.name}」已加载`, detail: '绑在角色卡上，这张卡的所有存档都会自动用它' });
  else if (w.state === 'missing') {
    wb.push({ level: 'warn', text: `找不到世界书「${w.name}」`, detail: '卡绑定了它，但它已经不在了',
      action: info.world.embedded ? { label: '从卡里导入', run: async () => { await importCardWorld(info.avatar); bump(); } } : undefined });
  } else if (w.state === 'unbound') {
    wb.push({ level: 'warn', text: `卡里自带的世界书还没导入`, detail: `${w.embedded} 条`, action: { label: '导入并绑定', run: async () => { await importCardWorld(info.avatar); bump(); } } });
  } else wb.push({ level: 'info', text: '这张卡没有绑定世界书' });
  for (const b of w.extra) wb.push({ level: 'ok', text: `「${b}」已加载`, detail: '附加世界书，也绑在这张卡上' });
  for (const b of scopes.chat) wb.push({ level: 'ok', text: `「${b}」已加载`, detail: '绑在当前这个聊天上' });
  for (const b of scopes.persona) wb.push({ level: 'info', text: `「${b}」`, detail: '绑在你的用户设定上，所有卡都会用' });
  for (const b of scopes.global) {
    const off = plan.worldsOff.includes(b);
    wb.push({ level: off ? 'warn' : 'info', text: `全局世界书「${b}」开着`, detail: off ? '它属于别的卡，或不在这张卡记住的配置里' : '对所有卡生效' });
  }
  sections.push({ title: '世界书', lines: wb });

  // ---- 预设
  const pr: Line[] = [];
  const cur = currentPresetName();
  const rec = info.preset;
  if (rec && rec.api === presetApi()) {
    if (rec.name === cur) pr.push({ level: 'ok', text: `「${cur}」`, detail: '就是这张卡的推荐预设' });
    else pr.push({ level: 'warn', text: `现在用的是「${cur}」`, detail: `这张卡推荐「${rec.name}」`, action: { label: '换成推荐的', run: async () => { await switchPreset(rec.name); bump(); } } });
  } else {
    pr.push({ level: 'info', text: `「${cur}」`, detail: '这张卡还没设推荐预设',
      action: { label: '设为推荐', run: () => { setRecommendedPreset(info.avatar, info.name, cur); bump(); } } });
  }
  const presetRx = report.items.find((i) => i.id === 'rx:p');
  if (presetRx) pr.push({ level: 'info', text: presetRx.name, detail: '预设自带的正则，跟着预设走' });
  // 推荐模型：这张卡的，否则它推荐的预设的
  const wantModel = settings().profiles[info.avatar]?.model ?? (rec ? settings().presetInfo[rec.name]?.model : undefined);
  const nowModel = currentModel();
  if (wantModel && modelsApply() && !sameModel(wantModel, nowModel)) {
    pr.push({ level: 'warn', text: `现在的模型是 ${nowModel ? modelLabel(nowModel) : '（没选）'}`, detail: `这张卡推荐 ${modelLabel(wantModel)}`, action: { label: '换成推荐的', run: async () => { await setModel(wantModel); bump(); } } });
  }
  sections.push({ title: '预设', lines: pr });

  // ---- 正则
  const rx: Line[] = [];
  if (info.regex.total) {
    rx.push(info.regex.allowed
      ? { level: 'ok', text: `卡里的 ${info.regex.total} 条正则已允许运行` }
      : { level: 'warn', text: `卡里的 ${info.regex.total} 条正则未允许运行`, detail: '状态栏、界面美化这类效果不会出现',
        action: { label: '允许运行', run: async () => {
          loaded.regexEngine?.allowScopedScripts?.(char);
          saveSettings();
          if (ctx().getCurrentChatId?.()) await ctx().reloadCurrentChat();
        } } });
  } else rx.push({ level: 'info', text: '这张卡没有自带正则' });
  const globalOn = report.items.filter((i) => i.scope === 'global' && i.kind === 'regex' && i.enabled);
  for (const g of globalOn) {
    const bad = plan.regexOff.some((r) => r.name === g.name);
    rx.push({ level: bad ? 'warn' : 'info', text: `全局正则「${g.name}」开着`, detail: bad ? '它被标为属于别的卡或预设' : (g.detail ?? '对所有卡生效') });
  }
  sections.push({ title: '正则', lines: rx });

  // ---- 脚本
  const sc: Line[] = [];
  if (info.scripts.total) {
    sc.push(info.scripts.enabled
      ? { level: 'ok', text: `酒馆助手角色脚本 ${info.scripts.total} 个已启用`, detail: info.scripts.names.slice(0, 4).join('、') }
      : { level: 'warn', text: `酒馆助手角色脚本未启用（${info.scripts.total} 个）`, detail: '在「扩展·正则 › 酒馆助手 › 脚本库」里打开' });
    if (hasMvu(char)) sc.push({ level: info.scripts.enabled ? 'ok' : 'warn', text: info.scripts.enabled ? 'MVU 变量正常更新' : 'MVU 变量不会更新', detail: info.scripts.enabled ? '随角色脚本一起运行' : '因为角色脚本未启用' });
  } else sc.push({ level: 'info', text: '这张卡没有酒馆助手脚本' });
  sections.push({ title: '脚本', lines: sc });

  // ---- 插件
  const pl: Line[] = [];
  const disabled = plan.plugins.filter((p) => p.status === 'disabled');
  for (const p of plan.plugins) {
    pl.push({ level: 'warn', text: `插件「${p.name}」${p.status === 'missing' ? '未安装' : '未启用'}` });
  }
  if (disabled.length) {
    pl.push({ level: 'info', text: `启用 ${disabled.length} 个插件后要刷新页面`, action: { label: '启用并刷新', run: () => enablePluginsAndReload(disabled.map((p) => p.id)) } });
  }
  if (!plan.plugins.length) pl.push({ level: 'ok', text: '需要的插件都已启用' });
  sections.push({ title: '插件', lines: pl });

  const issues = sections.reduce((n, s) => n + s.lines.filter((l) => l.level === 'warn').length, 0);
  return { sections, issues };
}

export const LEVEL_ICON: Record<Level, string> = { ok: 'fa-circle-check', warn: 'fa-circle-exclamation', info: 'fa-circle-info' };

/** Only the lines that need attention, each with its fix when there is one. */
export function cardIssues(char: Any): { section: string; line: Line }[] {
  return buildSections(char).sections.flatMap((s) => s.lines.filter((l) => l.level === 'warn').map((line) => ({ section: s.title, line })));
}

/** The nav-bar chip; only for single characters (not groups / home). */
/** The nav-bar 工具箱 button; a dot tells when the current card's 角色档案 has something to look at. */
export function ToolboxButton() {
  void statusTick.value;
  void chatTick.value;
  const char = currentCharacter();
  const issues = char ? buildSections(char).issues : 0;
  return (
    <button
      type="button"
      class={`rbt-gbtn compact rbt-toolbox-btn ${panelOpen.value ? 'active' : ''}`}
      title={issues ? `聊天工具箱：角色档案里有 ${issues} 项需要注意` : '聊天工具箱：角色档案、信息流、变量'}
      onClick={() => { panelOpen.value = !panelOpen.value; }}
    >
      <i class="fa-solid fa-toolbox fa-fw" />
      <span class="rbt-tb-long">聊天工具箱</span>
      <span class="rbt-tb-short">工具箱</span>
      {issues > 0 && <span class="rbt-dot" />}
    </button>
  );
}

export function refreshStatus(): void {
  statusTick.value++;
}
