/**
 * RedBird 美化的开关和强调色（样式在 look.css）。
 * 开着时 <html> 上有 rbt-look 这个 class；强调色写在 <html> 的 --rbd-accent 上，
 * 工具箱、三栏界面和美化后的酒馆界面都用它。
 */
import { signal } from '@preact/signals';
import { ctx, saveSettings, settings, toast } from '../st/st';

export const ACCENTS: { id: string; label: string; color: string }[] = [
  { id: 'blue', label: '蓝', color: '#0a84ff' },
  { id: 'coral', label: '珊瑚', color: '#e2725b' },
  { id: 'pink', label: '粉', color: '#ff375f' },
  { id: 'purple', label: '紫', color: '#bf5af2' },
  { id: 'green', label: '绿', color: '#30d158' },
  { id: 'graphite', label: '石墨', color: '#8e8e93' },
];

export const lookOn = signal(false);
/** Bumped when the ST theme in use changes, so views re-read it. */
export const themeTick = signal(0);
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
  themeTick.value++;
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

// ------------------------------------------------------- ST themes ---
// 酒馆的「界面主题」就是别人做的美化（颜色 + 可选的自定义 CSS）。全局工具箱 › 美化 用这些来列出、切换、删除。

export interface StTheme {
  name: string;
  custom_css?: string;
  main_text_color?: string;
  italics_text_color?: string;
  quote_text_color?: string;
  blur_tint_color?: string;
  chat_tint_color?: string;
  [k: string]: unknown;
}

export const stThemes = signal<StTheme[]>([]);
export const themesLoading = signal(false);

/** All theme files, read the same way ST reads them on start-up (no side effects). */
export async function loadThemes(): Promise<void> {
  themesLoading.value = true;
  try {
    const res = await fetch('/api/settings/get', { method: 'POST', headers: ctx().getRequestHeaders(), body: '{}' });
    const j = await res.json();
    const list: StTheme[] = Array.isArray(j?.themes) ? j.themes : [];
    stThemes.value = list.filter((t) => t && typeof t.name === 'string').sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  } catch {
    // Fall back to the names in ST's own dropdown.
    stThemes.value = [...document.querySelectorAll<HTMLOptionElement>('#themes option')].map((o) => ({ name: o.value }));
  } finally {
    themesLoading.value = false;
  }
}

export function currentStTheme(): string {
  void themeTick.value;
  return String(ctx().powerUserSettings?.theme ?? '');
}

export function themeHasCss(t: StTheme | undefined): boolean {
  return !!t?.custom_css?.trim();
}

/** A theme without custom CSS to sit under the toolbox's own look (so two looks don't fight). */
function plainTheme(): string | null {
  const list = stThemes.value;
  const cur = list.find((t) => t.name === currentStTheme());
  if (cur && !themeHasCss(cur)) return cur.name;
  return (list.find((t) => t.name === 'Dark V 1.0' && !themeHasCss(t)) ?? list.find((t) => !themeHasCss(t)))?.name ?? null;
}

/** Turn the toolbox's own look on; if the ST theme in use carries its own CSS, switch to a plain one. */
export async function useBuiltInLook(): Promise<void> {
  if (stThemeHasCss()) {
    if (!stThemes.value.length) await loadThemes();
    const plain = plainTheme();
    const $ = window.jQuery;
    if (plain && $) $('#themes').val(plain).trigger('change');
  }
  setLook(true);
  themeTick.value++;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Delete a theme file after saving a copy to data/<user>/user/files. Returns the backup file name. */
export async function deleteStTheme(name: string): Promise<string | null> {
  const t = stThemes.value.find((x) => x.name === name);
  if (!t || name === currentStTheme()) return null;
  const ok = await ctx().Popup?.show?.confirm?.(`删除美化「${name}」？`, '会先把它备份到「data/你的用户名/user/files」里，想要回来可以从那里重新导入。');
  if (!ok) return null;
  const ascii = name.normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  const file = `rbt-theme-backup-${stamp}${ascii ? `-${ascii}` : ''}.json`;
  const up = await fetch('/api/files/upload', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ name: file, data: toBase64(JSON.stringify(t, null, 2)) }) });
  if (!up.ok) { toast('error', `备份失败，没有删除：${up.status}`, '美化'); return null; }
  const res = await fetch('/api/themes/delete', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ name }) });
  if (!res.ok) { toast('error', `删除失败：${res.status}`, '美化'); return null; }
  document.querySelectorAll<HTMLOptionElement>('#themes option').forEach((o) => { if (o.value === name) o.remove(); });
  stThemes.value = stThemes.value.filter((x) => x.name !== name);
  toast('success', `已删除「${name}」，备份在 user/files/${file}`, '美化');
  return file;
}
