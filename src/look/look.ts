/**
 * RedBird 美化的开关和强调色（样式在 look.css）。
 * 开着时 <html> 上有 rbt-look 这个 class；强调色写在 <html> 的 --rbd-accent 上，
 * 工具箱、三栏界面和美化后的酒馆界面都用它。
 */
import { signal } from '@preact/signals';
import { ctx, saveSettings, settings } from '../st/st';

export const ACCENTS: { id: string; label: string; color: string }[] = [
  { id: 'blue', label: '蓝', color: '#0a84ff' },
  { id: 'coral', label: '珊瑚', color: '#e2725b' },
  { id: 'pink', label: '粉', color: '#ff375f' },
  { id: 'purple', label: '紫', color: '#bf5af2' },
  { id: 'green', label: '绿', color: '#30d158' },
  { id: 'graphite', label: '石墨', color: '#8e8e93' },
];

export const lookOn = signal(false);
export const accentId = signal('blue');

export function accentColor(id = accentId.value): string {
  return (ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]).color;
}

export function applyLook(): void {
  const s = settings();
  lookOn.value = !!s.look;
  accentId.value = s.accent ?? 'blue';
  const root = document.documentElement;
  root.classList.toggle('rbt-look', lookOn.value);
  root.style.setProperty('--rbd-accent', accentColor());
}

export function setLook(on: boolean): void {
  settings().look = on;
  saveSettings();
  applyLook();
}

export function setAccent(id: string): void {
  settings().accent = id;
  saveSettings();
  applyLook();
}

/** Switch ST's UI theme (美化) by name; two looks at once fight, so the toolbox's own goes off. */
export async function useStTheme(name: string): Promise<void> {
  const $ = window.jQuery;
  if (!$) return;
  $('#themes').val(name).trigger('change');
  if (lookOn.value) setLook(false);
}

/**
 * 旧美化「RedBird Dark」已经被这套美化取代。它的样式存在酒馆设置的自定义 CSS 里，
 * 开着的旧页面保存设置时会把它写回去，所以在页面自己这里清掉（只清这一段，别人的美化不动）。
 */
export function retireOldTheme(): void {
  const pu = ctx().powerUserSettings;
  const css = String(pu?.custom_css ?? '');
  if (!css.includes('RedBird Dark')) return;
  const $ = window.jQuery;
  if ($ && $('#customCSS').length) $('#customCSS').val('').trigger('input');
  else pu.custom_css = '';
  if (pu.theme === 'RedBird Dark') {
    pu.theme = 'Dark V 1.0';
    if ($) { $('#themes').val('Dark V 1.0'); $('#themes option[value="RedBird Dark"]').remove(); }
  }
  ctx().saveSettingsDebounced();
  console.info('[RedBird] 旧美化 RedBird Dark 的自定义 CSS 已清除（备份在 data/<用户>/backups/redbird-old-theme）');
}

/** Whether the ST theme in use carries its own custom CSS (someone else's 美化). */
export function stThemeHasCss(): boolean {
  const css = String(ctx().powerUserSettings?.custom_css ?? '');
  return !!css.trim() && !css.includes('RedBird Dark');
}
