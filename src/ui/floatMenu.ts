/**
 * 不在 Preact 里的地方（酒馆的存档列表、左栏一行行的聊天）用的「⋯」菜单。和 Menu 组件同一个样子：
 * 电脑上贴着按钮往下弹（fixed 定位，不会被滚动的列表裁掉）；手机上从底部弹出，顶上写是谁的菜单，最下面「取消」。
 * 点外面、按 Esc 关掉。
 */
import { isPhone } from './Menu';

export interface FloatMenuItem {
  label: string;
  icon: string;
  run: () => void | Promise<void>;
  danger?: boolean;
}

let closeOpen: (() => void) | null = null;

export function openFloatMenu(anchor: HTMLElement, title: string, items: FloatMenuItem[]): void {
  closeOpen?.();
  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', title);
  const list = document.createElement('div');
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    if (it.danger) b.className = 'danger';
    b.innerHTML = `<i class="fa-solid ${it.icon} fa-fw"></i> `;
    b.append(it.label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
      void it.run();
    });
    list.append(b);
  }
  let root: HTMLElement;
  if (isPhone()) {
    root = document.createElement('div');
    root.className = 'rbt-asheet-wrap rbt-float-asheet';
    menu.className = 'rbt-asheet';
    // 标题和选项是一张卡，中间不留空（和 Menu 组件一样）
    menu.setAttribute('data-lint-spacing', 'ok');
    const head = document.createElement('div');
    head.className = 'rbt-asheet-title';
    head.textContent = title;
    list.className = 'rbt-asheet-items';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'rbt-asheet-cancel';
    cancel.textContent = '取消';
    cancel.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    menu.append(head, list, cancel);
    root.append(menu);
    document.body.append(root);
  } else {
    root = menu;
    menu.className = 'rbt-float-menu';
    menu.append(list);
    document.body.append(menu);
    const r = anchor.getBoundingClientRect();
    const h = menu.offsetHeight;
    // 下面放不下就往上弹
    const top = r.bottom + 4 + h > window.innerHeight ? r.top - 4 - h : r.bottom + 4;
    menu.style.top = `${Math.round(Math.max(8, top))}px`;
    menu.style.left = `${Math.round(Math.min(window.innerWidth - menu.offsetWidth - 8, Math.max(8, r.right - menu.offsetWidth)))}px`;
  }
  const away = (e: Event) => { if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node)) close(); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
  function close(): void {
    root.remove();
    document.removeEventListener('pointerdown', away, true);
    document.removeEventListener('keydown', esc, true);
    if (closeOpen === close) closeOpen = null;
  }
  setTimeout(() => {
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', esc, true);
  }, 0);
  closeOpen = close;
}
