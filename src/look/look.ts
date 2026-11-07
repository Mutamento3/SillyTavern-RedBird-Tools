/**
 * RedBird 美化的开关和强调色（样式在 look.css）。
 * 开着时 <html> 上有 rbt-look 这个 class；强调色写在 <html> 的 --rbd-accent 上，
 * 工具箱、三栏界面和美化后的酒馆界面都用它。
 */
import { signal } from '@preact/signals';
import { ctx, saveSettings, settings, toast, confirmText, escHtml } from '../st/st';

export const ACCENTS: { id: string; label: string; color: string }[] = [
  { id: 'blue', label: '蓝', color: '#0a84ff' },
  { id: 'coral', label: '珊瑚', color: '#e2725b' },
  { id: 'pink', label: '粉', color: '#ff375f' },
  { id: 'purple', label: '紫', color: '#bf5af2' },
  { id: 'green', label: '绿', color: '#30d158' },
  { id: 'graphite', label: '石墨', color: '#8e8e93' },
];

/** 工具箱自带的三套美化。preview 只用来在「美化」标签里画小样。 */
export const LOOKS: { id: string; label: string; desc: string; preview: { canvas: string; panel: string; text: string; sub: string } }[] = [
  { id: 'dark', label: '深色', desc: '苹果风深色，晚上玩不刺眼', preview: { canvas: '#161618', panel: '#2a2a2e', text: '#ececf1', sub: '#8e8e93' } },
  { id: 'light', label: '浅色', desc: '米白书页，白天读长文舒服', preview: { canvas: '#faf9f6', panel: '#ffffff', text: '#1d1d1f', sub: '#8e8e93' } },
  { id: 'warm', label: '护眼', desc: '暖黄纸色，久看不累', preview: { canvas: '#f4ecd8', panel: '#faf4e4', text: '#3b2f22', sub: '#9a8a72' } },
];
export const lookId = signal('dark');

export const lookOn = signal(false);
/** Set while the toolbox itself switches ST's theme dropdown, so the watcher below ignores it. */
let switching = false;
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
  lookId.value = LOOKS.some((l) => l.id === s.lookId) ? s.lookId! : 'dark';
  const root = document.documentElement;
  root.classList.toggle('rbt-look', lookOn.value);
  for (const l of LOOKS) root.classList.toggle(`rbt-look-${l.id}`, lookOn.value && lookId.value === l.id && l.id !== 'dark');
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

const WARN = '这套美化是别人按酒馆原版界面做的。在三栏界面里，布局以工具箱为准，个别地方可能不协调。';

/** Before switching to a theme with its own CSS: say what to expect, with 「以后不再提醒」. */
async function warnThirdParty(name: string): Promise<boolean> {
  if (settings().themeWarnOff) return true;
  const t = stThemes.value.find((x) => x.name === name);
  if (t && !themeHasCss(t)) return true; // 只换颜色的主题不会和布局打架
  const c = ctx();
  if (!c.Popup || !c.POPUP_TYPE) return true;
  const popup = new c.Popup(`<h3>换成「${escHtml(name)}」？</h3><p>${WARN}</p><p>随时可以在「全局工具箱 › 美化」里换回工具箱自带的。</p>`, c.POPUP_TYPE.CONFIRM, '', {
    okButton: '换过去', cancelButton: '取消', customInputs: [{ id: 'rbt_theme_warn_off', label: '以后不再提醒' }],
  });
  const res = await popup.show();
  if (!res) return false;
  if (popup.inputResults?.get('rbt_theme_warn_off')) { settings().themeWarnOff = true; saveSettings(); }
  return true;
}

/** Switch ST's UI theme (美化) by name; two looks at once fight, so the toolbox's own goes off. */
export async function useStTheme(name: string): Promise<void> {
  const $ = window.jQuery;
  if (!$) return;
  if (!(await warnThirdParty(name))) return;
  switching = true;
  try { $('#themes').val(name).trigger('change'); } finally { switching = false; }
  if (lookOn.value) setLook(false);
  themeTick.value++;
}

/**
 * 旧美化「RedBird Dark」已经被这套美化取代。它的样式存在酒馆设置的自定义 CSS 里，
 * 开着的旧页面保存设置时会把它写回去，所以在页面自己这里清掉。自定义 CSS 里可能还有用户自己加的东西，
 * 所以清之前先把整段备份到 data/<用户>/user/files；备份失败就不动。
 */
export async function retireOldTheme(): Promise<void> {
  const pu = ctx().powerUserSettings;
  const css = String(pu?.custom_css ?? '');
  if (!css.includes('RedBird Dark')) return;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  const file = `rbt-custom-css-backup-${stamp}.css`;
  try {
    const up = await fetch('/api/files/upload', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ name: file, data: toBase64(css) }) });
    if (!up.ok) throw new Error(String(up.status));
  } catch (e) {
    console.warn('[RedBird] 旧美化的自定义 CSS 备份失败，先不清除', e);
    return;
  }
  const $ = window.jQuery;
  if ($ && $('#customCSS').length) $('#customCSS').val('').trigger('input');
  else pu.custom_css = '';
  if (pu.theme === 'RedBird Dark') {
    pu.theme = 'Dark V 1.0';
    if ($) { $('#themes').val('Dark V 1.0'); $('#themes option[value="RedBird Dark"]').remove(); }
  }
  ctx().saveSettingsDebounced();
  toast('info', `旧美化 RedBird Dark 已换成工具箱自带的美化。原来的自定义 CSS 备份在 data/你的用户名/user/files/${file}`, '美化', { timeOut: 10000 });
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

/** Turn the toolbox's own look on (optionally a given one of the three); if the ST theme in use carries its own CSS, switch to a plain one. */
export async function useBuiltInLook(id?: string): Promise<void> {
  if (id) settings().lookId = id;
  if (stThemeHasCss()) {
    if (!stThemes.value.length) await loadThemes();
    const plain = plainTheme();
    const $ = window.jQuery;
    if (plain && $) { switching = true; try { $('#themes').val(plain).trigger('change'); } finally { switching = false; } }
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
  const ok = await confirmText(`删除美化「${name}」？`, '会先把它备份到「data/你的用户名/user/files」里，想要回来可以从那里重新导入。');
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

/**
 * 在酒馆自己的「用户设置 › 界面主题」里换主题，也算「换成别人的美化」：自带美化的颜色优先级更高，
 * 不关掉的话换了也看不出来。所以自动关掉，并说一声怎么换回来。
 */
export function watchStThemeSwitch(): void {
  const $ = window.jQuery;
  if (!$) return;
  $(document).on('change', '#themes', () => {
    if (switching) return;
    themeTick.value++;
    if (!lookOn.value) return;
    setLook(false);
    const name = String($('#themes').val() ?? '');
    const extra = stThemeHasCss() && !settings().themeWarnOff ? `\n${WARN}` : '';
    toast('info', `已改用「${name}」，工具箱自带的美化先关掉了。想换回来：全局工具箱 › 美化。${extra}`, '美化', { timeOut: extra ? 9000 : 5000 });
  });
}
