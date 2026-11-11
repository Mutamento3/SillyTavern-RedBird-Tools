/**
 * 卡的美化（试用）：给一张卡记一套酒馆主题（美化）。和这张卡聊天时，整个界面换成那套美化；
 * 回首页、换到没记美化的卡，就换回全局美化（全局工具箱 › 美化里选的那套）。
 *
 * 不去改酒馆的主题设置：换了再换回来，会把你平时调过、但没存进主题文件的颜色和选项弄丢。
 * 所以是「盖一层」：
 * - 把那套美化的颜色写成 :root 上的变量、自定义 CSS 原样放进一个 <style>；
 * - 你平时美化的自定义 CSS（酒馆的 #custom-style）先停用；红鸟适配美化先让开（lookSuspended）；
 * - 离开这张卡就把这一层拿掉，什么都不用恢复。
 * 字号、聊天宽度、头像形状、计时这些阅读习惯不跟着换，一直是你自己的。
 */
import { effect, signal } from '@preact/signals';
import { ctx, currentCharacter, saveSettings, settings, toast } from '../st/st';
import { openDrawers } from '../shell/drawers';
import { archiveVersion, setCardTheme } from '../tools/cards/cards';
import { applyLook, loadThemes, lookSuspended, refreshSurface, stThemes, type StTheme } from './look';

/** 换卡、改绑定、改开关时加一，重新套一次。 */
export const cardLookTick = signal(0);
/** 现在盖在上面的美化名（没有就是 null）。 */
export const appliedCardTheme = signal<string | null>(null);

type Store = { cardLook?: boolean; /** 试用版先存在这里，现在挪进 profiles[卡].theme */ cardThemes?: Record<string, string> };
const store = (): Store => settings() as unknown as Store;

export function cardLookEnabled(): boolean {
  return store().cardLook !== false;
}

export function setCardLookEnabled(on: boolean): void {
  store().cardLook = on;
  saveSettings();
  cardLookTick.value++;
}

/** 这张卡记的美化（存在卡的配套里，和推荐预设放在一起）。 */
export function cardThemeOf(avatar: string): string | undefined {
  return settings().profiles[avatar]?.theme;
}

/** 试用版存在 cardThemes 里的，挪进 profiles。 */
function migrate(): void {
  const old = store().cardThemes;
  if (!old) return;
  for (const [avatar, theme] of Object.entries(old)) {
    if (!theme || cardThemeOf(avatar)) continue;
    const ch = (ctx().characters ?? []).find((c: { avatar: string }) => c.avatar === avatar);
    setCardTheme(avatar, String(ch?.name ?? avatar), theme);
  }
  delete store().cardThemes;
  saveSettings();
}

const STYLE_ID = 'rbt-card-look';

/** 主题里的颜色 → 酒馆用的变量。和酒馆 applyThemeColor 写的是同一批。 */
const COLOR_VARS: [keyof StTheme | string, string][] = [
  ['main_text_color', '--SmartThemeBodyColor'],
  ['italics_text_color', '--SmartThemeEmColor'],
  ['underline_text_color', '--SmartThemeUnderlineColor'],
  ['quote_text_color', '--SmartThemeQuoteColor'],
  ['blur_tint_color', '--SmartThemeBlurTintColor'],
  ['chat_tint_color', '--SmartThemeChatTintColor'],
  ['user_mes_blur_tint_color', '--SmartThemeUserMesBlurTintColor'],
  ['bot_mes_blur_tint_color', '--SmartThemeBotMesBlurTintColor'],
  ['shadow_color', '--SmartThemeShadowColor'],
  ['border_color', '--SmartThemeBorderColor'],
];

function cssFor(t: StTheme): string {
  const decl: string[] = [];
  for (const [k, v] of COLOR_VARS) {
    const val = t[k as string];
    if (typeof val === 'string' && val.trim()) decl.push(`${v}: ${val.trim()} !important;`);
  }
  const main = typeof t.main_text_color === 'string' ? t.main_text_color.match(/[\d.]+/g) : null;
  if (main && main.length >= 3) {
    decl.push(`--SmartThemeCheckboxBgColorR: ${main[0]} !important;`, `--SmartThemeCheckboxBgColorG: ${main[1]} !important;`, `--SmartThemeCheckboxBgColorB: ${main[2]} !important;`, `--SmartThemeCheckboxBgColorA: ${main[3] ?? 1} !important;`);
  }
  if (typeof t.blur_strength === 'number') decl.push(`--SmartThemeBlurStrength: ${t.blur_strength}px !important;`);
  if (typeof t.shadow_width === 'number') decl.push(`--shadowWidth: ${t.shadow_width} !important;`);
  const custom = typeof t.custom_css === 'string' ? t.custom_css : '';
  // @import 必须放在最前面。网址里常有分号（Google 字体的 wght@400;600），不能只找到第一个分号就停
  const IMPORT = /@import\s+(?:url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)|"[^"]*"|'[^']*')[^;]*;/g;
  const imports = (custom.match(IMPORT) ?? []).join('\n');
  const rest = custom.replace(IMPORT, '');
  return `${imports}\n:root {\n  ${decl.join('\n  ')}\n}\n${rest}`;
}

/** 平时美化的自定义 CSS：卡的美化盖上时停用，拿掉时恢复。 */
function ownCss(on: boolean): void {
  const el = document.getElementById('custom-style') as HTMLStyleElement | null;
  if (!el) return;
  // 只在真的要变时才动：改 <style> 的属性会让浏览器重新收集一遍样式表
  if (on) { if (el.hasAttribute('media')) el.removeAttribute('media'); }
  else if (el.getAttribute('media') !== 'not all') el.setAttribute('media', 'not all');
}

function clear(): void {
  if (!appliedCardTheme.value && !document.getElementById(STYLE_ID)) return;
  document.getElementById(STYLE_ID)?.remove();
  ownCss(true);
  appliedCardTheme.value = null;
  lastTheme = null;
  lookSuspended.value = false;
  applyLook();
  refreshSurface();
}

let seq = 0;
let loadedOnce = false;
/** 上次套上的美化对象：没变就什么都不做（酒馆每次保存设置都会触发这里，美化的 CSS 可能有几百 KB） */
let lastTheme: StTheme | null = null;
async function apply(): Promise<void> {
  const my = ++seq;
  const ch = currentCharacter();
  const name = ch && cardLookEnabled() ? cardThemeOf(String(ch.avatar)) : undefined;
  if (!name) { clear(); return; }
  // 只读一次：读完会改 stThemes，又会触发这里（主题列表是空的时候会一直读下去）
  if (!stThemes.value.length && !loadedOnce) { loadedOnce = true; await loadThemes(); }
  if (my !== seq) return;
  const t = stThemes.value.find((x) => x.name === name);
  if (!t) { clear(); return; }
  if (t === lastTheme && appliedCardTheme.value === name && document.getElementById(STYLE_ID)) { ownCss(false); return; }
  const css = cssFor(t);
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
  ownCss(false);
  appliedCardTheme.value = name;
  lastTheme = t;
  if (!lookSuspended.value) { lookSuspended.value = true; applyLook(); }
  refreshSurface();
}

export function installCardLook(): void {
  migrate();
  effect(() => {
    void cardLookTick.value;
    // 在角色档案、配套总表里改了、解绑了、撤销了
    void archiveVersion.value;
    void stThemes.value;
    void apply().catch((e) => console.warn('[RedBird] 卡的美化没套上', e));
  });
  const c = ctx();
  c.eventSource?.on(c.eventTypes.CHAT_CHANGED, () => { cardLookTick.value++; });
  // 卡的美化盖着时，酒馆「用户设置」里换主题、改自定义 CSS 都看不到效果：打开那里时说一声（每套只说一次）
  const told = new Set<string>();
  effect(() => {
    const name = appliedCardTheme.value;
    if (!name || !openDrawers.value.includes('settings') || told.has(name)) return;
    told.add(name);
    toast('info', `现在用着这张卡的美化「${name}」，在这里改的全局美化暂时看不到。回首页就能看到。`, '美化');
  });
  // 在酒馆里保存了美化：重新读一遍，卡的美化用的也是新的
  window.jQuery?.(document).on('click', '#ui-preset-save-button, #ui-preset-update-button', () => { setTimeout(() => { void loadThemes(); }, 1500); });
}
