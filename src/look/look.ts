/**
 * RedBird 美化的开关和强调色（样式在 look.css）。
 * 开着时 <html> 上有 rbt-look 这个 class；强调色写在 <html> 的 --rbd-accent 上，
 * 工具箱、三栏界面和美化后的酒馆界面都用它。
 */
import { signal } from '@preact/signals';
import { ctx, saveSettings, settings, toast, confirmText, escHtml } from '../st/st';
import { LOOK_COPY, LOOK_NAME } from '../ui/copy';

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
/** 卡的美化盖在上面时，自带美化先让开（设置不变，离开那张卡就回来）。见 cardLook.ts */
export const lookSuspended = signal(false);
/** 现在页面上真的在用自带美化吗（开着、而且没被卡的美化暂时盖住） */
export function lookShown(): boolean {
  return lookOn.value && !lookSuspended.value;
}
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
  const shown = lookShown();
  root.classList.toggle('rbt-look', shown);
  for (const l of LOOKS) root.classList.toggle(`rbt-look-${l.id}`, shown && lookId.value === l.id && l.id !== 'dark');
  root.style.setProperty('--rbd-accent', accentColor());
  readWidth.value = s.readWidth ?? 'normal';
  root.classList.toggle('rbt-read-wide', readWidth.value === 'wide');
  root.classList.toggle('rbt-read-full', readWidth.value === 'full');
  solidSurface();
}

/** 正文宽度的三档。只给三档、不给滑块：随手拖到很宽或很窄都不好读。 */
export const READ_WIDTHS = [
  { id: 'normal', label: '适中（推荐）· 一行约 44 字' },
  { id: 'wide', label: '宽 · 一行约 60 字' },
  { id: 'full', label: '铺满' },
] as const;
export const readWidth = signal<'normal' | 'wide' | 'full'>('normal');

export function setReadWidth(id: 'normal' | 'wide' | 'full'): void {
  settings().readWidth = id;
  saveSettings();
  applyLook();
}

/** 酒馆「用户设置 › 聊天宽度」：屏幕宽度的百分之几（25–100）。别的美化在三栏界面里用它（见 shell.css「正文宽度」）。 */
export function stChatWidth(): number {
  return Number(ctx().powerUserSettings?.chat_width) || 50;
}

/** 改酒馆的聊天宽度：走酒馆自己的滑块，它会存设置、更新那边显示的数字。 */
export function setStChatWidth(v: number): void {
  window.jQuery?.('#chat_width_slider').val(v).trigger('input', { forced: true });
}

/** "rgb(1, 2, 3)" / "rgba(1, 2, 3, 0.5)" / "color(srgb …)" → [r, g, b, a] (0–255, a 0–1). */
export function rgba(css: string): [number, number, number, number] | null {
  // 主题里的颜色几乎都写成 rgb() / rgba() / #hex：直接读文字，不用往页面里放东西再量
  //（量一次浏览器就要把整页样式重算一遍，配上几百 KB 的美化 CSS，换卡时会明显卡一下）
  const m = css.trim().match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], a];
  }
  const h = css.trim().match(/^#([\da-f]{3,8})$/i)?.[1];
  if (h && (h.length === 3 || h.length === 6 || h.length === 8)) {
    const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16), f.length === 8 ? parseInt(f.slice(6, 8), 16) / 255 : 1];
  }
  // 不用 <i>：有的美化给所有 <i>（图标）强制上色（!important），量出来就成了图标的颜色。
  // 用一个没人会写样式的元素，颜色也写成行内 !important，美化的规则压不过它
  const probe = document.createElement('rbt-color-probe');
  probe.style.setProperty('color', css, 'important');
  if (!probe.style.color) return null;
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  const n = c.match(/[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) return null;
  // color(srgb r g b / a) 是 0–1 的小数
  const k = c.startsWith('color(') ? 255 : 1;
  return [n[0] * k, n[1] * k, n[2] * k, n[3] ?? 1];
}

/**
 * 别人的主题常把「模糊色调」设成半透明：酒馆原版在它后面加模糊，看起来是毛玻璃。
 * 三栏界面的左栏、顶栏、面板用这个颜色当底色，后面没有模糊，就成了透明的，字压在聊天上看不清。
 * 所以没开自带美化时，把它垫在一层实色上（浅色字垫黑、深色字垫白），颜色还是主题的，只是不透明。
 * 聊天区背后的背景图不受影响（那是 --rbd-canvas）。
 */
let lastSolid = '';
/** 主题的三个颜色：正文、模糊色调（左栏和面板）、聊天色调（顶栏）。 */
export interface SurfaceVars { body?: string; tint?: string; chat?: string }
/** 卡的美化盖着时，用它的颜色，不用酒馆全局主题的（见 cardLook.ts）。 */
let override: SurfaceVars | null = null;
/**
 * 读主题颜色：卡的美化盖着时直接用它的颜色（不问浏览器，换卡时不用按新 CSS 当场重算整页）；
 * 平时问浏览器算好的值——全局美化可能在自定义 CSS 里用 !important 改这几个颜色，只看行内样式会读错。
 */
function surfaceVars(): Required<SurfaceVars> {
  const root = document.documentElement;
  let cs: CSSStyleDeclaration | null = null;
  const read = (k: string, o?: string) => o?.trim() || (cs ??= getComputedStyle(root)).getPropertyValue(k).trim();
  return {
    body: read('--SmartThemeBodyColor', override?.body),
    tint: read('--SmartThemeBlurTintColor', override?.tint),
    chat: read('--SmartThemeChatTintColor', override?.chat),
  };
}
function solidSurface(): void {
  const root = document.documentElement;
  const set = (bg1: string, nav: string) => {
    const key = `${bg1}|${nav}`;
    if (key === lastSolid) return;
    lastSolid = key;
    for (const [k, v] of [['--rbd-bg1', bg1], ['--rbd-canvas-solid', nav]]) {
      if (v) root.style.setProperty(k, v);
      else root.style.removeProperty(k);
    }
  };
  // 开着自带美化时，底色是自带美化的实色（写在 CSS 里；行内样式会压过它，所以要拿掉）
  if (lookShown() || !document.body) { set('', ''); ink('', ''); return; }
  const v = surfaceVars();
  const text = rgba(v.body);
  const lightText = !text || (0.299 * text[0] + 0.587 * text[1] + 0.114 * text[2]) > 128;
  const base = lightText ? 0 : 255;
  const solid = (css: string): string => {
    const c = rgba(css);
    if (!c || c[3] >= 0.95) return '';
    const mix = (x: number) => Math.round(x * c[3] + base * (1 - c[3]));
    return `rgb(${mix(c[0])}, ${mix(c[1])}, ${mix(c[2])})`;
  };
  // 左栏、面板用「模糊色调」；顶栏用「聊天色调」（和聊天区同色），都垫成实色。聊天区本身不动，背景图照样看得见
  const panel = solid(v.tint);
  const nav = solid(v.chat);
  set(panel, nav);
  // 保底：有的美化只给酒馆自己的面板改了字色（比如全局白字、面板白底，再点名酒馆面板改成深色字）。
  // 工具箱的面板不在它的名单里，就成了白字白底。字和底色对比太低时，面板里的字换成黑或白；看得清的美化不动
  const fix = (bgCss: string): '' | 'dark' | 'light' => {
    const bg = rgba(bgCss);
    if (!bg || !text || bg[3] < 0.95) return '';
    if (contrast(text, bg) >= 3) return '';
    return luminance(bg) > 0.4 ? 'dark' : 'light';
  };
  ink(fix(panel || v.tint), fix(nav || v.chat));
}

/** 相对亮度（WCAG）。 */
function luminance(c: number[]): number {
  const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

/** 对比度（WCAG，1–21）。 */
function contrast(a: number[], b: number[]): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** 面板 / 顶栏的字要不要换成深色或浅色（CSS 见 look.css 的 rbt-ink-*）。 */
function ink(panel: '' | 'dark' | 'light', nav: '' | 'dark' | 'light'): void {
  const b = document.body;
  if (!b) return;
  b.classList.toggle('rbt-ink-dark', panel === 'dark');
  b.classList.toggle('rbt-ink-light', panel === 'light');
  b.classList.toggle('rbt-nav-ink-dark', nav === 'dark');
  b.classList.toggle('rbt-nav-ink-light', nav === 'light');
}

/** 卡的美化换上 / 拿掉以后重新算一次底色。`vars`：卡的美化的颜色（拿掉时传 null，回到酒馆全局主题的）。 */
export function refreshSurface(vars?: SurfaceVars | null): void {
  if (vars !== undefined) override = vars;
  lastSolid = '';
  solidSurface();
}

/** 酒馆换主题、改颜色时把颜色写在 <html style> 上：跟着重新算。 */
export function watchSurface(): void {
  let t = 0;
  new MutationObserver(() => { clearTimeout(t); t = window.setTimeout(solidSurface, 100); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  solidSurface();
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

const WARN = LOOK_COPY.othersRisk;

/** Before switching to a theme with its own CSS: say what to expect, with 「以后不再提醒」. */
async function warnThirdParty(name: string): Promise<boolean> {
  if (settings().themeWarnOff) return true;
  const t = stThemes.value.find((x) => x.name === name);
  if (t && !themeHasCss(t)) return true; // 只换颜色的主题不会和布局打架
  const c = ctx();
  if (!c.Popup || !c.POPUP_TYPE) return true;
  const popup = new c.Popup(`<h3>换成「${escHtml(name)}」？</h3><p>${WARN}</p><p>${LOOK_COPY.recommend}随时可以在「全局工具箱 › 美化」里换回来。</p>`, c.POPUP_TYPE.CONFIRM, '', {
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
  toast('info', `旧美化 RedBird Dark 已换成${LOOK_NAME}。原来的自定义 CSS 备份在 data/你的用户名/user/files/${file}`, '美化', { timeOut: 10000 });
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
    const css = stThemeHasCss();
    // 这条已经说了可能错位、也能点了换回来，手机上那条「美化改了消息排版」的提醒就不再为这个主题弹
    for (const key of ['mesLayoutTipThemes', 'lookTipThemes'] as const) {
      const seen = settings()[key] ?? [];
      if (!seen.includes(name)) settings()[key] = [...seen, name];
    }
    saveSettings();
    toast('info', LOOK_COPY.switched(name, css && !settings().themeWarnOff), '美化', { onclick: () => { void useBuiltInLook(); }, timeOut: 10000 });
  });
}
