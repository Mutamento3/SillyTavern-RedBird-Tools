/**
 * 手机上消息的排法（电脑上不动）：
 *
 * 1. 头像、名字、时间排成一行，放在正文上面：正文能用满整个宽度（同层 HTML 也是）。
 * 2. 最后一条消息：切换回复、编辑、⋯ 放在正文下面一行「‹ 2/5 › ✎ ⋯」，数字在两个箭头中间。
 * 3. 其他消息：只在右上角放一个「⋯」，编辑收进「⋯」里，不多占一行。
 *
 * 只是在同一条消息里挪位置：酒馆找这些元素都是在这条消息里找（.find、.last_mes .swipe_right），
 * 点击是 document 上的委托事件，挪了照样能用。窗口变宽（不是手机布局）时原样放回去。
 */
import { compact, shellOn } from './Shell';

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

// ------------------------------------------------------------- 应用 ---

function layout(mes: Element): void {
  const phone = shellOn.value && compact.value;
  const last = mes.classList.contains('last_mes');
  // 关的时候先放回按钮，再放回头像（头像原来在左箭头前面）
  editInMenu(mes, phone && !last);
  lastRow(mes, phone && last);
  avatarToHeader(mes, phone);
}

function layoutAll(): void {
  for (const mes of document.querySelectorAll('#chat > .mes')) layout(mes);
}

let queued = false;
function layoutSoon(): void {
  if (queued) return;
  queued = true;
  // 等酒馆把「最后一条」的标记挪好再排
  setTimeout(() => { queued = false; layoutAll(); }, 0);
}

let installed = false;

export function installMesActions(): void {
  if (installed) return;
  const chat = document.getElementById('chat');
  if (!chat) { setTimeout(installMesActions, 1000); return; }
  installed = true;
  layoutAll();
  // 新消息、删消息、换聊天：酒馆会往 #chat 里加、删消息，「最后一条」也跟着变
  new MutationObserver(layoutSoon).observe(chat, { childList: true });
  // 手机布局 ⇄ 电脑布局、三栏界面开关
  compact.subscribe(layoutAll);
  shellOn.subscribe(layoutAll);
}
