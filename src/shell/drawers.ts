/**
 * 三栏外壳：酒馆原有的 9 个顶栏面板（drawer）的统一管理。
 *
 * 外壳不重做这些面板，只决定它们怎么出现：全部是居中的大 overlay + 压暗背景。
 * 原则：每个时刻用户只关注一件事。打开面板就是要专心调它，所以给足空间，不和聊天挤在一起。
 * 开关一律通过点击酒馆自己的 .drawer-toggle 完成，所以酒馆的逻辑（互斥、钉住、动画）都保留。
 */
import { signal } from '@preact/signals';
import { titleBarElement } from '../ui/TitleBar';

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
    const { bar: head } = titleBarElement(d.icon, d.label, () => closeDrawer(d.key), 'rbt-sheet-head');
    // 标题栏里的一句说明（比如这张卡已经加载了哪些世界书），在标题和 ✕ 之间
    const note = document.createElement('span');
    note.className = 'rbt-sheet-note';
    head.insertBefore(note, head.querySelector('.rbt-titlebar-x'));
    node.prepend(head);
  }
}

/**
 * 角色面板的标题跟着打开它的按钮走：有角色在聊时是「编辑角色 · 名字」，否则是「角色」。
 * （面板是酒馆的 right-nav-panel，两种情况共用一个。）
 */
function syncCharacterTitle(): void {
  const node = el(drawerByKey.characters);
  const span = node?.querySelector<HTMLElement>(':scope > .rbt-sheet-head .rbt-titlebar-text');
  if (!span) return;
  const st = (window as unknown as { SillyTavern?: { getContext?: () => { characterId?: string | number; characters?: { name?: string }[]; groupId?: string | null } } }).SillyTavern?.getContext?.();
  const id = st?.characterId;
  const name = !st?.groupId && id !== undefined && id !== null && String(id) !== '' ? st?.characters?.[Number(id)]?.name : undefined;
  const text = name ? `编辑角色 · ${name}` : drawerByKey.characters.label;
  if (span.textContent !== text) span.textContent = text;
}

/**
 * 有些编辑层是酒馆单独盖在面板上面的，不在面板里面：预设的单条提示词编辑器、角色的「高级定义」。
 * 面板关掉（点 ✕、回首页、换到聊天…）时它们不会跟着关，会留在屏幕上像卡住一样。
 * 所以面板一关，就用酒馆自己的关闭按钮把它们也关掉（和用户自己点「取消」一样，不保存）。
 */
const NESTED_OF: Partial<Record<DrawerKey, { layer: string; close: string }[]>> = {
  preset: [{ layer: '#completion_prompt_manager_popup', close: '#completion_prompt_manager_popup_entry_form_close' }],
  characters: [{ layer: '#character_popup', close: '#character_cross' }],
};
function closeNestedOf(key: DrawerKey): void {
  const layers = NESTED_OF[key];
  if (!layers) return;
  // 下一帧再看：在面板正在关的这一刻读样式会逼浏览器马上重新计算整页样式（手机上 60 多毫秒）
  requestAnimationFrame(() => {
    for (const { layer, close } of layers) {
      const el = document.querySelector<HTMLElement>(layer);
      if (!el || getComputedStyle(el).display === 'none') continue;
      // 用原生 click：酒馆用 addEventListener 绑的，jQuery 的 trigger 触发不到
      document.querySelector<HTMLElement>(close)?.click();
    }
  });
}

function syncOpenState(): void {
  const open = DRAWERS.filter((d) => el(d)?.classList.contains('openDrawer')).map((d) => d.key);
  for (const k of openDrawers.value) if (!open.includes(k)) closeNestedOf(k);
  if (open.includes('characters')) syncCharacterTitle();
  const prev = openDrawers.value;
  if (open.length !== prev.length || open.some((k, i) => k !== prev[i])) openDrawers.value = open;
  document.body.classList.toggle('rbt-open-modal', open.length > 0);
}

/**
 * 面板里还开着酒馆自己的一层（提示词编辑器、高级定义、存档、消息编辑…）时，Esc 交给酒馆，
 * 只关那一层，不要把整个面板关掉。这些元素不是 <dialog>，要看它们实际有没有显示。
 */
const NESTED = ['#completion_prompt_manager_popup', '#character_popup', '#select_chat_popup', '#dialogue_popup', '#curEditTextarea'];
function nestedOpen(): boolean {
  if (document.querySelector('dialog[open], .popup.open, #shadow_popup[style*="block"]')) return true;
  return NESTED.some((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    return !!el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
  });
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || !document.body.classList.contains('rbt-shell')) return;
  // Leave Esc to ST's own popups / nested editors when one is open.
  if (nestedOpen()) return;
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

/** The note slot in a drawer's title bar (for richer content than plain text). */
export function sheetNoteElement(key: DrawerKey): HTMLElement | null {
  return el(drawerByKey[key])?.querySelector<HTMLElement>(':scope > .rbt-sheet-head .rbt-sheet-note') ?? null;
}

/** A short line in a drawer's title bar, e.g. which lorebooks this card already loads. */
export function setSheetNote(key: DrawerKey, text: string): void {
  const note = el(drawerByKey[key])?.querySelector<HTMLElement>(':scope > .rbt-sheet-head .rbt-sheet-note');
  if (note) {
    note.textContent = text;
    note.title = text;
  }
}

// --------------------------------------------- 存档（酒馆的聊天记录弹窗） ---
// 酒馆的标题是「名字 聊天记录 ?」，关闭按钮是搜索框右边一个半透明的 ⊗，容易被当成「清空搜索」。
// 三栏界面里换成和面板一样的标题栏：「存档 · 名字」+ ✕；手机上整页显示（见 shell.css）。

function chatsTitle(): string {
  const st = (window as unknown as { SillyTavern?: { getContext?: () => { characterId?: string | number; characters?: { name?: string }[]; groupId?: string | null; groups?: { id: string; name?: string }[] } } }).SillyTavern?.getContext?.();
  const group = st?.groupId ? st.groups?.find((g) => g.id === st.groupId) : undefined;
  const id = st?.characterId;
  const name = group?.name ?? (id !== undefined && id !== null && String(id) !== '' ? st?.characters?.[Number(id)]?.name : undefined);
  return name ? `存档 · ${name}` : '存档';
}

function syncChatsHead(): void {
  const pop = document.getElementById('select_chat_popup');
  if (!pop) return;
  let head = pop.querySelector<HTMLElement>(':scope > .rbt-sheet-head');
  if (!head) {
    head = titleBarElement('fa-clock-rotate-left', '存档', () => document.getElementById('select_chat_cross')?.click(), 'rbt-sheet-head rbt-chats-head').bar;
    pop.prepend(head);
  }
  const text = chatsTitle();
  const span = head.querySelector<HTMLElement>('.rbt-titlebar-text')!;
  if (span.textContent !== text) span.textContent = text;
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
  // capture：在酒馆自己的 Esc 处理（会先关掉嵌套的那一层）之前判断，免得关完那一层又把面板也关了
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousedown', onBackdropDown);
  // 换到别的聊天、回首页时，关掉还开着的面板（手机上面板是整页的，不关就一直盖在新页面上）
  const c = (window as unknown as { SillyTavern?: { getContext?: () => { eventSource?: { on: (e: string, f: () => void) => void }; eventTypes?: Record<string, string> } } }).SillyTavern?.getContext?.();
  if (c?.eventSource && c.eventTypes?.CHAT_CHANGED) {
    c.eventSource.on(c.eventTypes.CHAT_CHANGED, () => {
      if (!document.body.classList.contains('rbt-shell')) return;
      for (const k of openDrawers.value) closeDrawer(k);
    });
  }
  // 存档弹窗：每次打开时更新标题里的名字
  const shadow = document.getElementById('shadow_select_chat_popup');
  if (shadow) {
    syncChatsHead();
    new MutationObserver(syncChatsHead).observe(shadow, { attributes: true, attributeFilter: ['style', 'class'] });
  }
}
