/**
 * 手机上消息的排法（电脑上不动）：
 *
 * 1. 头像、名字、时间排成一行，放在正文上面：正文能用满整个宽度（同层 HTML 也是）。
 *    楼层、计时、token 数（酒馆放在头像下面）挪到名字下面，和时间一行。
 * 2. 最后一条消息：切换回复、编辑、⋯ 放在正文下面一行「‹ 2/5 › ✎ ⋯」，数字在两个箭头中间。
 * 3. 其他消息：只在右上角放一个「⋯」，编辑收进「⋯」里，不多占一行。
 * 4. 编辑中：酒馆那排图标（✓ 复制 💡 删除 ↑ ↓ ✕）看不出哪个是保存、哪个是取消。换成一条
 *    「取消 ……… ⋯ 保存」，贴在这条消息顶上（编辑长消息时往下滚也一直看得到）；其他几个收进「⋯」，带文字。
 *    按钮都是去点酒馆自己的那个，酒馆的逻辑不变。
 *
 * 只是在同一条消息里挪位置：酒馆找这些元素都是在这条消息里找（.find、.last_mes .swipe_right），
 * 点击是 document 上的委托事件，挪了照样能用。窗口变宽（不是手机布局）时原样放回去。
 */
import { signal } from '@preact/signals';
import { ctx, saveSettings, settings, toast } from '../st/st';
import { compact, shellOn } from './Shell';
import { openDrawer } from './drawers';
import { openFloatMenu, type FloatMenuItem } from '../ui/floatMenu';
import { lookOn, useBuiltInLook } from '../look/look';
import { LOOK_COPY } from '../ui/copy';
import { slow } from '../st/perf';

/** 设置里的「手机消息用工具箱排版」。关掉时手机消息按酒馆原样排（给按原版界面做的美化用）。 */
export const mesLayoutOn = signal(true);

export function setMesLayout(on: boolean): void {
  settings().phoneMesLayout = on;
  saveSettings();
  mesLayoutOn.value = on;
}

const ROW = 'rbt-mes-actions';

// ---------------------------------------------------- 头像放到名字那一行 ---

function avatarToHeader(mes: Element, on: boolean): void {
  const name = mes.querySelector(':scope > .mes_block > .ch_name');
  if (!name) return;
  const inHeader = name.querySelector(':scope > .mesAvatarWrapper');
  if (on && !inHeader) {
    const av = mes.querySelector(':scope > .mesAvatarWrapper');
    if (av) name.prepend(av);
  } else if (!on && inHeader) {
    // 原来的位置：在左箭头前面（左箭头不在了就在正文块前面）
    const block = mes.querySelector(':scope > .mes_block');
    mes.insertBefore(inHeader, mes.querySelector(':scope > .swipe_left') ?? block);
  }
}

// ------------------------------- 时间、楼层、计时、token：名字下面一行 ---

const META = 'rbt-mes-meta';
const STATS = ['.mesIDDisplay', '.mes_timer', '.tokenCounterDisplay'];

function metaLine(mes: Element, on: boolean): void {
  const line = mes.querySelector(':scope > .mes_block > .ch_name .alignItemsBaseline');
  if (!line) return;
  const meta = line.querySelector(`:scope > .${META}`);
  if (on && !meta) {
    const m = document.createElement('div');
    m.className = META;
    const ts = line.querySelector(':scope > .timestamp');
    if (ts) m.append(ts);
    for (const sel of STATS) {
      const el = mes.querySelector(`.mesAvatarWrapper > ${sel}`);
      if (el) m.append(el);
    }
    line.append(m);
  } else if (!on && meta) {
    const ts = meta.querySelector(':scope > .timestamp');
    if (ts) line.append(ts);
    const wrap = mes.querySelector('.mesAvatarWrapper');
    for (const sel of STATS) {
      const el = meta.querySelector(`:scope > ${sel}`);
      if (el && wrap) wrap.append(el);
    }
    meta.remove();
  }
}

// ---------------------------------------------- 最后一条：正文下面一行 ---

function lastRow(mes: Element, on: boolean): void {
  const block = mes.querySelector<HTMLElement>(':scope > .mes_block');
  if (!block) return;
  const row = block.querySelector(`:scope > .${ROW}`);
  if (on && !row) {
    const r = document.createElement('div');
    r.className = ROW;
    const swipes = document.createElement('div');
    swipes.className = 'rbt-mes-swipes';
    const left = mes.querySelector(':scope > .swipe_left');
    const right = mes.querySelector(':scope > .swipeRightBlock');
    if (left) swipes.append(left);
    if (right) swipes.append(right);
    r.append(swipes);
    const buttons = block.querySelector(':scope > .ch_name > .mes_buttons');
    if (buttons) r.append(buttons);
    block.append(r);
  } else if (!on && row) {
    const left = row.querySelector('.swipe_left');
    const right = row.querySelector('.swipeRightBlock');
    const buttons = row.querySelector('.mes_buttons');
    if (left) mes.insertBefore(left, block);
    if (right) block.after(right);
    const name = block.querySelector(':scope > .ch_name');
    if (buttons && name) name.insertBefore(buttons, name.querySelector(':scope > .mes_edit_buttons'));
    row.remove();
  }
}

// ------------------------------------------ 其他消息：编辑收进「⋯」 ---

function editInMenu(mes: Element, on: boolean): void {
  const buttons = mes.querySelector('.mes_buttons');
  const extra = buttons?.querySelector(':scope > .extraMesButtons');
  if (!buttons || !extra) return;
  const edit = mes.querySelector('.mes_edit');
  if (!edit) return;
  const inMenu = edit.parentElement === extra;
  if (on && !inMenu) extra.prepend(edit);
  else if (!on && inMenu) buttons.append(edit);
  // 从「⋯」里点了编辑：把展开的按钮收起来（酒馆只在点到菜单外面时才收）
  if (!(edit as HTMLElement).dataset.rbtCollapse) {
    (edit as HTMLElement).dataset.rbtCollapse = '1';
    edit.addEventListener('click', () => {
      if (edit.parentElement?.classList.contains('extraMesButtons')) setTimeout(() => window.jQuery?.(document).trigger('click'), 0);
    });
  }
}

// ---------------------------------------------------- 编辑中：一条操作栏 ---

const BAR = 'rbt-edit-bar';

/** 「⋯」里的几项：酒馆按钮的类名 → 文字和图标。点不了的（第一条不能上移等）不列出来。 */
const EDIT_MORE: [string, string, string, boolean?][] = [
  ['mes_edit_copy', '复制成一条新消息', 'fa-copy'],
  ['mes_edit_add_reasoning', '添加思考过程', 'fa-lightbulb'],
  ['mes_edit_up', '往上移一条', 'fa-arrow-up'],
  ['mes_edit_down', '往下移一条', 'fa-arrow-down'],
  ['mes_edit_delete', '删除这条消息', 'fa-trash-can', true],
];

function stButton(mes: Element, cls: string): HTMLElement | null {
  return mes.querySelector<HTMLElement>(`.mes_edit_buttons .${cls}`);
}

function makeBar(mes: Element): HTMLElement {
  const bar = document.createElement('div');
  bar.className = BAR;
  const btn = (cls: string, html: string, label: string, go: (b: HTMLButtonElement) => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.innerHTML = html;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', (e) => { e.stopPropagation(); go(b); });
    return b;
  };
  const cancel = btn('rbt-btn rbt-edit-cancel', '取消', '取消编辑，不保存', () => { stButton(mes, 'mes_edit_cancel')?.click(); syncSoon(); });
  const more = btn('rbt-edit-more', '<i class="fa-solid fa-ellipsis"></i>', '更多', (b) => {
    const items: FloatMenuItem[] = [];
    for (const [cls, label, icon, danger] of EDIT_MORE) {
      const st = stButton(mes, cls);
      if (!st || st.classList.contains('disabled') || st.style.display === 'none') continue;
      items.push({ label, icon, danger, run: () => { st.click(); syncSoon(); } });
    }
    openFloatMenu(b, '这条消息', items);
  });
  const save = btn('rbt-btn rbt-btn-primary rbt-edit-save', '保存', '保存修改', () => { stButton(mes, 'mes_edit_done')?.click(); syncSoon(); });
  const spacer = document.createElement('span');
  spacer.className = 'rbt-edit-spacer';
  bar.append(cancel, spacer, more, save);
  return bar;
}

/** 正在编辑的消息加上操作栏，编辑完的拿掉。 */
function syncEditBars(): void {
  const on = shellOn.value && compact.value && mesLayoutOn.value;
  for (const mes of document.querySelectorAll('#chat > .mes')) {
    const block = mes.querySelector(':scope > .mes_block');
    const bar = block?.querySelector(`:scope > .${BAR}`);
    const editing = on && !!mes.querySelector('.edit_textarea');
    if (editing && !bar && block) block.querySelector(':scope > .ch_name')?.after(makeBar(mes));
    else if (!editing && bar) bar.remove();
  }
}

let syncQueued = false;
function syncSoon(): void {
  if (syncQueued) return;
  syncQueued = true;
  setTimeout(() => { syncQueued = false; syncEditBars(); }, 50);
}

// ------------------------------------------------------------- 应用 ---

function layout(mes: Element): void {
  const phone = shellOn.value && compact.value && mesLayoutOn.value;
  const last = mes.classList.contains('last_mes');
  // 关的时候先放回按钮，再放回头像（头像原来在左箭头前面）
  editInMenu(mes, phone && !last);
  lastRow(mes, phone && last);
  metaLine(mes, phone);
  avatarToHeader(mes, phone);
}

function layoutAll(): void {
  const t0 = performance.now();
  for (const mes of document.querySelectorAll('#chat > .mes')) layout(mes);
  syncEditBars();
  slow('排消息', t0);
}

let queued = false;
function layoutSoon(): void {
  if (queued) return;
  queued = true;
  // 等酒馆把「最后一条」的标记挪好再排
  setTimeout(() => { queued = false; layoutAll(); }, 0);
}

let installed = false;

/**
 * 防呆：手机上用的别人的美化也改了消息排版（头像、名字那几块），两套排版叠在一起容易错位。
 * 每个美化提醒一次；点提示就换成工具箱自带的美化。打开酒馆时、换美化时各看一次。
 */
const MES_CSS = /\.(mes|mesAvatarWrapper|mes_block|ch_name|name_text|avatar|mes_text)\b/;
function themeTip(): void {
  // 已经在用红鸟适配美化（比如刚点了这条提示换过去）就不用提醒
  if (!shellOn.value || lookOn.value) return;
  const pu = ctx().powerUserSettings ?? {};
  const css = String(pu.custom_css ?? '');
  const theme = String(pu.theme ?? '');
  if (!theme || !css.trim()) return;
  // 手机：只在美化也改了消息排版、并开着沉浸阅读时说；电脑：带自定义样式就说一次。两边各记各的
  const phone = compact.value;
  if (phone && !(mesLayoutOn.value && MES_CSS.test(css))) return;
  const key = phone ? 'mesLayoutTipThemes' : 'lookTipThemes';
  const seen = settings()[key] ?? [];
  if (seen.includes(theme)) return;
  settings()[key] = [...seen, theme];
  saveSettings();
  // 先说红鸟适配美化的好处，再说现在的美化可能错位；点了换过去（不是关掉排版）
  toast('info', phone ? LOOK_COPY.phoneTip : LOOK_COPY.deskTip, '美化', {
    onclick: () => { void useBuiltInLook(); }, timeOut: 12000,
  });
}

export function installMesActions(): void {
  if (installed) return;
  const chat = document.getElementById('chat');
  if (!chat) { setTimeout(installMesActions, 1000); return; }
  installed = true;
  mesLayoutOn.value = settings().phoneMesLayout !== false;
  setTimeout(themeTip, 3000);
  window.jQuery?.(document).on('change', '#themes', () => setTimeout(themeTip, 800));
  // CSS 只在打开时生效（body.rbt-mes-layout）
  mesLayoutOn.subscribe((v) => { document.body.classList.toggle('rbt-mes-layout', v); layoutAll(); });
  // 新消息、删消息、换聊天：酒馆会往 #chat 里加、删消息，「最后一条」也跟着变
  new MutationObserver(layoutSoon).observe(chat, { childList: true });
  // 编辑框出现或消失时加 / 拿掉操作栏。酒馆有时要先存完上一条才打开下一条，也有快捷键和别的插件会开关编辑，
  // 所以看编辑框本身，不看点击。只看消息正文（.mes_text）下面直接的增删，聊天输出时的大量变化很快就跳过。
  const isEditBox = (n: Node) => n.nodeType === 1 && (n as Element).classList.contains('edit_textarea');
  new MutationObserver((list) => {
    for (const m of list) {
      if (!(m.target as Element).classList?.contains('mes_text')) continue;
      if ([...m.addedNodes].some(isEditBox) || [...m.removedNodes].some(isEditBox)) { syncSoon(); return; }
    }
  }).observe(chat, { childList: true, subtree: true });
  // 点自己消息的头像：打开人设面板改人设（酒馆原本是放大头像）
  document.addEventListener('click', (e) => {
    if (!shellOn.value) return;
    const av = (e.target as Element | null)?.closest?.('#chat .mes[is_user="true"] .avatar');
    if (!av) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openDrawer('persona');
  }, true);
    // 只看点在聊天里的（编辑、保存、取消都在消息上）；点别处不用每次都把所有消息检查一遍
  document.addEventListener('click', (e) => { if ((e.target as Element | null)?.closest?.('#chat')) syncSoon(); }, true);
  // 编辑框跟着内容长高（不支持 field-sizing 的浏览器，比如旧的 iOS Safari；酒馆只在打开时量一次）
  if (!CSS.supports('field-sizing', 'content')) {
    document.addEventListener('input', (e) => {
      const t = e.target as HTMLTextAreaElement;
      if (!document.body.classList.contains('rbt-mes-layout') || !t?.classList?.contains('edit_textarea')) return;
      if (t.scrollHeight > t.clientHeight) t.style.height = `${t.scrollHeight}px`;
    });
  }
  // 手机布局 ⇄ 电脑布局、三栏界面开关
  compact.subscribe(layoutAll);
  shellOn.subscribe(layoutAll);
}
