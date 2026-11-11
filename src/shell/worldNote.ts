/**
 * 世界书面板：酒馆的「已启用的世界书」只列全局世界书，编辑器也不会自动打开这张卡的书，
 * 看起来就像"没加载"。这里做两件事：
 * 1. 标题栏写清楚现在实际加载了哪些书（按 这张卡 / 聊天 / 用户设定 / 全局 分组），书名可以点，点了就在编辑器里打开；
 * 2. 换卡或开新聊天后第一次打开面板时，如果编辑器是空的、或者还停在一本这次没加载的书上，就自动打开这张卡的书。
 *    同一个聊天里，你自己选了别的书就不再动它。
 */
import { ctx } from '../st/st';
import { currentBookScopes } from '../tools/flow/capture';
import { openDrawers, sheetNoteElement } from './drawers';

function editorSelect(): HTMLSelectElement | null {
  return document.getElementById('world_editor_select') as HTMLSelectElement | null;
}

function selectedBook(): string {
  const sel = editorSelect();
  return sel && sel.value !== '' ? (sel.selectedOptions[0]?.textContent ?? '') : '';
}

export function openBookInEditor(name: string): void {
  const sel = editorSelect();
  if (!sel) return;
  const opt = [...sel.options].find((o) => o.value !== '' && o.textContent === name);
  if (!opt || sel.value === opt.value) return;
  sel.value = opt.value;
  const $ = window.jQuery;
  if ($) $(sel).trigger('change');
  else sel.dispatchEvent(new Event('change', { bubbles: true }));
}

function loadedGroups(): { label: string; books: string[] }[] {
  const s = currentBookScopes();
  return [
    { label: '这张卡', books: [...s.character] },
    { label: '这个聊天', books: [...s.chat] },
    { label: 'user 人设', books: [...s.persona] },
    { label: '全局', books: [...s.global] },
  ].filter((g) => g.books.length);
}

function render(): void {
  const note = sheetNoteElement('worldinfo');
  if (!note) return;
  note.textContent = '';
  const groups = loadedGroups();
  if (!groups.length) {
    note.textContent = '现在没有加载任何世界书';
    return;
  }
  const current = selectedBook();
  note.append('已加载 — ');
  groups.forEach((g, gi) => {
    if (gi) note.append('；');
    note.append(`${g.label}：`);
    g.books.forEach((b, bi) => {
      if (bi) note.append('、');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `rbt-note-book${b === current ? ' active' : ''}`;
      btn.textContent = b;
      btn.title = b === current ? '编辑器里正在显示这本' : '在编辑器里打开这本';
      btn.addEventListener('click', () => { openBookInEditor(b); render(); });
      note.append(btn);
    });
  });
  note.title = groups.map((g) => `${g.label}：${g.books.join('、')}`).join('；');
}

let autoDoneFor = '';

function autoSelect(): void {
  const chatId = String(ctx().getCurrentChatId?.() ?? '');
  if (!chatId || autoDoneFor === chatId) return;
  autoDoneFor = chatId;
  const groups = loadedGroups();
  const loaded = groups.flatMap((g) => g.books);
  const preferred = groups.find((g) => g.label === '这张卡')?.books[0] ?? groups.find((g) => g.label === '这个聊天')?.books[0];
  if (!preferred) return;
  const current = selectedBook();
  if (!current || !loaded.includes(current)) openBookInEditor(preferred);
}

export function installWorldNote(): void {
  openDrawers.subscribe((open) => {
    if (!open.includes('worldinfo')) return;
    autoSelect();
    render();
  });
  // Keep the highlighted name in sync when the user picks a book in ST's own dropdown.
  document.addEventListener('change', (e) => {
    if ((e.target as HTMLElement)?.id === 'world_editor_select') render();
  });
}
