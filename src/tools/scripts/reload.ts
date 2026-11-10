/**
 * 换了带脚本的预设后，提醒刷新页面再发消息。
 *
 * 玩家反馈：在工具箱里换了预设、不刷新就空发（直接点发送让 AI 接着写），会卡住；刷新后正常。
 * 酒馆助手在运行中换预设脚本，有的脚本卸载 / 重新加载不干净。只在换之前或换之后的预设有脚本在运行时提醒，
 * 没脚本的预设不提醒。不管从哪里换的（工具箱、酒馆的预设面板、换卡时自动换）都算。
 *
 * 提醒放在「正在用」的那个预设旁边：聊天工具箱的预设一节、角色档案的推荐预设、全局工具箱的预设详情。刷新后自然消失。
 */
import { signal } from '@preact/signals';
import { ctx, stModule } from '../../st/st';
import { countRunning, oaiPresets, presetGroup, thInstalled } from './th';

/** 换过去以后建议刷新的预设名；没有就是 null。 */
export const reloadAdvised = signal<string | null>(null);

export const RELOAD_COPY = {
  title: '刷新页面后再发消息',
  detail: '换了带脚本的预设，不刷新的话，发消息可能会卡住。',
  button: '刷新页面',
} as const;

function selectedPreset(): string {
  try { return String(oaiPresets()?.getSelectedPresetName?.() ?? ''); } catch { return ''; }
}

function hasRunningScripts(name: string): boolean {
  try {
    const g = presetGroup(name);
    return countRunning(g.nodes, g.allowed) > 0;
  } catch {
    return false;
  }
}

let installed = false;

export function installReloadAdvice(): void {
  if (installed) return;
  installed = true;
  const c = ctx();
  const et = c.eventTypes;
  if (!et?.OAI_PRESET_CHANGED_AFTER) return;
  // 换之前是哪个预设：OAI_PRESET_CHANGED_BEFORE 触发时下拉框已经是新的了，读不到旧的，所以自己记着
  let last = selectedPreset();
  c.eventSource.on(et.OAI_PRESET_CHANGED_AFTER, () => {
    // 等酒馆助手读完新预设的脚本
    setTimeout(() => {
      const now = selectedPreset();
      const prev = last;
      last = now;
      if (!prev || !now || prev === now || !thInstalled()) return;
      if (hasRunningScripts(prev) || hasRunningScripts(now)) reloadAdvised.value = now;
    }, 800);
  });
}

/** 先把酒馆的设置存好（换预设后酒馆要等一会儿才存），再刷新。 */
export async function reloadPage(): Promise<void> {
  try {
    const m = await stModule('/script.js');
    await m?.saveSettings?.();
  } catch { /* 存不上也照样刷新：酒馆打开时会读上次存好的 */ }
  location.reload();
}
