/**
 * 存档页（酒馆的聊天记录列表）每一条的排法，只在三栏界面里：
 *
 *   存档名 ……………………………… ⋯      （⋯ 里是 改名 / 导出 JSONL / 导出 TXT / 删除…）
 *   最后一条消息，最多两行
 *   11/7 15:37 · 3.6 KB · 7 条消息
 *
 * 酒馆原来那排小图标（铅笔、导出、骷髅）藏起来，菜单里的每一项就是去点酒馆自己的那个按钮，
 * 改名、导出、删除都还是酒馆来做（删除照样先问）。每条只加一个「⋯」和一行灰字，不挪酒馆的东西。
 */
import { openFloatMenu } from '../ui/floatMenu';

const DONE = 'rbt-chat-enhanced';

function p2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 「Nov 7, 2026 3:37 PM」→「11/7 15:37」（不是今年的写年份）。读不懂就照原样。 */
function shortDate(text: string): string {
  // 酒馆按界面语言写日期：英文「Nov 7, 2026 3:37 PM」或中文「2026年11月7日 15:37」
  const zh = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
  const t = zh ? new Date(+zh[1], +zh[2] - 1, +zh[3], +zh[4], +zh[5]).getTime() : Date.parse(text);
  if (Number.isNaN(t)) return text;
  const d = new Date(t);
  const md = `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}/${md}`;
}

function metaText(block: Element): string {
  const date = block.querySelector('.chat_messages_date')?.textContent?.trim() ?? '';
  const size = (block.querySelector('.chat_file_size')?.textContent ?? '').replace(/[(),\s]/g, '').replace(/([\d.]+)\s*([KMG]?B)/i, '$1 $2');
  const num = (block.querySelector('.chat_messages_num')?.textContent ?? '').replace(/[^\d]/g, '');
  return [date && shortDate(date), size, num && `${num} 条消息`].filter(Boolean).join(' · ');
}

function press(el: Element | null): void {
  if (!el) return;
  const $ = window.jQuery;
  if ($) $(el).trigger('click');
  else (el as HTMLElement).click();
}

// ---------------------------------------------------------------- 菜单 ---

function openMenu(block: Element, anchor: HTMLElement): void {
  const name = block.querySelector('.select_chat_block_filename')?.textContent?.trim() ?? '存档';
  openFloatMenu(anchor, name, [
    { label: '改名', icon: 'fa-pen', run: () => press(block.querySelector('.renameChatButton')) },
    { label: '导出 JSONL', icon: 'fa-file-export', run: () => press(block.querySelector('.exportRawChatButton')) },
    { label: '导出 TXT', icon: 'fa-file-lines', run: () => press(block.querySelector('.exportChatButton')) },
    { label: '删除…', icon: 'fa-trash-can', danger: true, run: () => press(block.querySelector('.PastChat_cross')) },
  ]);
}

// ------------------------------------------------------------- 每一条 ---

function enhance(block: Element): void {
  if (block.classList.contains(DONE)) return;
  block.classList.add(DONE);
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'rbt-chat-more';
  more.title = '改名、导出、删除';
  more.setAttribute('aria-label', '更多');
  more.setAttribute('aria-haspopup', 'menu');
  more.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
  // 点「⋯」不要顺带打开这个存档（整条点一下是打开）
  more.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openMenu(block, more); });
  const meta = document.createElement('div');
  meta.className = 'rbt-chat-meta';
  meta.textContent = metaText(block);
  block.append(more, meta);
}

let installed = false;

export function installChatSaves(): void {
  if (installed) return;
  const list = document.getElementById('select_chat_div');
  if (!list) { setTimeout(installChatSaves, 1000); return; }
  installed = true;
  const scan = () => { for (const b of list.querySelectorAll('.select_chat_block')) enhance(b); };
  scan();
  // 每次打开存档页，酒馆都会重新生成这些条目
  // 只看直接加进来的条目（我们自己往条目里加东西不会再触发）
  new MutationObserver(scan).observe(list, { childList: true });
}
