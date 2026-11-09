/**
 * 换到一个带脚本的预设时说一声：很多人不知道预设也能带脚本，界面上多了东西不知道是谁放的。
 *
 * - 只在这个预设的脚本真的在运行（酒馆助手允许了、至少一个开着）时说；
 *   没允许的话酒馆助手自己会弹窗问，不重复。
 * - 换卡时自动换的预设：并进「已换成某卡的配置」那条提示里（autoapply 调 presetScriptLine），这里不再单独说。
 * - 同一个预设，打开酒馆后只说一次。
 */
import { ctx, toast } from '../../st/st';
import { applyingPreset } from '../env/autoapply';
import { openGlobal } from '../../ui/views';
import { countRunning, oaiPresets, presetGroup, thInstalled } from './th';

const told = new Set<string>();

/** 「预设带了 N 个脚本，正在运行」；没有在运行的就返回 null。说过一次后也返回 null。 */
export function presetScriptLine(name: string): string | null {
  if (!thInstalled() || told.has(name)) return null;
  const g = presetGroup(name);
  const n = countRunning(g.nodes, g.allowed);
  if (!n) return null;
  told.add(name);
  return `预设带了 ${n} 个脚本，正在运行`;
}

let installed = false;

export function installScriptNotice(): void {
  if (installed) return;
  installed = true;
  const c = ctx();
  const ev = c.eventTypes?.OAI_PRESET_CHANGED_AFTER;
  if (!ev) return;
  c.eventSource.on(ev, () => {
    if (applyingPreset.value) return; // 换卡时自动换的，那边一起说
    // 等酒馆助手读完新预设的脚本
    setTimeout(() => {
      let name = '';
      try { name = String(oaiPresets()?.getSelectedPresetName?.() ?? ''); } catch { /* ignore */ }
      if (!name) return;
      const line = presetScriptLine(name);
      if (line) toast('info', `预设「${name}」${line.replace(/^预设/, '')}。点这里查看或关掉。`, '脚本', { onclick: () => openGlobal('scripts'), timeOut: 8000 });
    }, 800);
  });
}
