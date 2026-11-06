/**
 * 三栏外壳：酒馆原有的 9 个顶栏面板（drawer）的统一管理。
 *
 * 外壳不重做这些面板，只决定它们怎么出现：全部是居中的大 overlay + 压暗背景。
 * 原则：每个时刻用户只关注一件事。打开面板就是要专心调它，所以给足空间，不和聊天挤在一起。
 * 开关一律通过点击酒馆自己的 .drawer-toggle 完成，所以酒馆的逻辑（互斥、钉住、动画）都保留。
 */
import { signal } from '@preact/signals';

export type DrawerKey =
  | 'preset' | 'api' | 'persona' | 'extensions' | 'settings' | 'backgrounds' | 'formatting'
  | 'characters' | 'worldinfo';

/** wide = 大 overlay；form = 单栏表单（API），窄一些。 */
export type DrawerSize = 'wide' | 'form';

export interface DrawerDef {
  key: DrawerKey;
  /** id of the .drawer-content element */
  id: string;
  /** id of the .drawer wrapper that holds the .drawer-toggle */
  holder: string;
  label: string;
  icon: string;
  size: DrawerSize;
}

export const DRAWERS: DrawerDef[] = [
  { key: 'preset', id: 'left-nav-panel', holder: 'ai-config-button', label: '预设', icon: 'fa-sliders', size: 'wide' },
  { key: 'api', id: 'rm_api_block', holder: 'sys-settings-button', label: 'API', icon: 'fa-plug', size: 'form' },
  { key: 'persona', id: 'PersonaManagement', holder: 'persona-management-button', label: '人设', icon: 'fa-face-smile', size: 'wide' },
  { key: 'extensions', id: 'rm_extensions_block', holder: 'extensions-settings-button', label: '扩展·正则', icon: 'fa-cubes', size: 'wide' },
  { key: 'settings', id: 'user-settings-block', holder: 'user-settings-button', label: '设置', icon: 'fa-user-cog', size: 'wide' },
  { key: 'backgrounds', id: 'Backgrounds', holder: 'backgrounds-button', label: '背景', icon: 'fa-panorama', size: 'wide' },
  { key: 'formatting', id: 'AdvancedFormatting', holder: 'advanced-formatting-button', label: '格式化', icon: 'fa-font', size: 'wide' },
  { key: 'characters', id: 'right-nav-panel', holder: 'rightNavHolder', label: '角色', icon: 'fa-address-card', size: 'wide' },
  { key: 'worldinfo', id: 'WorldInfo', holder: 'WI-SP-button', label: '世界书', icon: 'fa-book-atlas', size: 'wide' },
];

export const drawerByKey = Object.fromEntries(DRAWERS.map((d) => [d.key, d])) as Record<DrawerKey, DrawerDef>;

/** Keys of drawers that are open right now (kept in sync by a MutationObserver). */
export const openDrawers = signal<DrawerKey[]>([]);

function el(d: DrawerDef): HTMLElement | null {
  return document.getElementById(d.id);
}

export function isOpen(key: DrawerKey): boolean {
  return !!el(drawerByKey[key])?.classList.contains('openDrawer');
}

function clickToggle(d: DrawerDef): void {
  const toggle = document.querySelector<HTMLElement>(`#${d.holder} > .drawer-toggle`);
  if (!toggle) return;
  // ST binds doNavbarIconClick with jQuery; a jQuery trigger runs it with the right `this`.
  const $ = window.jQuery;
  if ($) $(toggle).trigger('click');
  else toggle.click();
}

export function openDrawer(key: DrawerKey): void {
  if (!isOpen(key)) clickToggle(drawerByKey[key]);
}

export function closeDrawer(key: DrawerKey): void {
  if (isOpen(key)) clickToggle(drawerByKey[key]);
}

/**
 * ST closes every non-pinned drawer on any mousedown outside it — including on our own buttons.
 * So a button must remember on pointerdown whether its drawer was open, and on click only open it
 * if it was closed (otherwise ST's mousedown handler already closed it, which is the toggle we want).
 */
const wasOpen = new Map<DrawerKey, boolean>();

export function drawerButtonHandlers(key: DrawerKey): { onPointerDown: () => void; onClick: () => void } {
  return {
    onPointerDown: () => { wasOpen.set(key, isOpen(key)); },
    onClick: () => {
      const was = wasOpen.get(key) ?? isOpen(key);
      wasOpen.delete(key);
      if (was) closeDrawer(key);
      else openDrawer(key);
    },
  };
}

// ------------------------------------------------ title bar + close ---

/** Give every managed drawer a sticky title bar with a × (hidden by CSS when the shell is off). */
function injectHeaders(): void {
  for (const d of DRAWERS) {
    const node = el(d);
    if (!node || node.querySelector(':scope > .rbt-sheet-head')) continue;
    const head = document.createElement('div');
    head.className = 'rbt-sheet-head';
    head.innerHTML = `<span class="rbt-sheet-title"><i class="fa-solid ${d.icon} fa-fw"></i>${d.label}</span>`
      + '<button type="button" class="rbt-sheet-close" title="关闭（Esc）" aria-label="关闭">✕</button>';
    head.querySelector('button')!.addEventListener('click', () => closeDrawer(d.key));
    node.prepend(head);
  }
}

function syncOpenState(): void {
  const open = DRAWERS.filter((d) => el(d)?.classList.contains('openDrawer')).map((d) => d.key);
  const prev = openDrawers.value;
  if (open.length !== prev.length || open.some((k, i) => k !== prev[i])) openDrawers.value = open;
  document.body.classList.toggle('rbt-open-modal', open.length > 0);
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || !document.body.classList.contains('rbt-shell')) return;
  // Leave Esc to ST's own popups (confirm dialogs, character editor…) when one is open.
  if (document.querySelector('dialog[open], .popup.open, #shadow_popup[style*="block"]')) return;
  const open = openDrawers.value;
  if (!open.length) return;
  closeDrawer(open[open.length - 1]);
  e.preventDefault();
}

/**
 * A press on the dimmed backdrop (it is body::after, so the target is <body>) closes the overlay.
 * ST already closes non-pinned drawers on that press; pinned ones (user pinned them in the original
 * UI) ignore it, so close whatever is still open on the next tick. The pin setting itself is untouched.
 */
function onBackdropDown(e: MouseEvent): void {
  if (!document.body.classList.contains('rbt-shell') || !document.body.classList.contains('rbt-open-modal')) return;
  if (e.target !== document.body && e.target !== document.documentElement) return;
  setTimeout(() => {
    for (const k of openDrawers.value) closeDrawer(k);
  }, 0);
}

let installed = false;

export function installDrawers(): void {
  if (installed) return;
  installed = true;
  injectHeaders();
  syncOpenState();
  const mo = new MutationObserver(syncOpenState);
  for (const d of DRAWERS) {
    const node = el(d);
    if (node) mo.observe(node, { attributes: true, attributeFilter: ['class'] });
  }
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('mousedown', onBackdropDown);
}
