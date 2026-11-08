/**
 * 世界书条目（酒馆自己的世界书面板）的两处补充，只在三栏界面里起作用：
 *
 * 1. 摘要行：收起时，手机上只看「这是哪条、开没开、怎么触发」，下面一行灰字写关键词、位置、顺序
 *    （触发概率不是 100% 时也写上）。位置 / 顺序这些输入框展开后才出现。
 * 2. 「更多设置」：展开后先只放常用的（主要关键字、内容、位置、顺序、触发概率），
 *    其余设置（逻辑、过滤器、扫描深度、递归、分组、黏性冷却、角色绑定…）收进「更多设置」，
 *    点开后按酒馆原来的紧凑排法显示。
 *
 * 不搬动酒馆的任何元素，只加两个节点、给条目加一个 class，样式在 shell.css「世界书条目」。
 * 注意：酒馆只在条目展开时才生成编辑区（关键词输入框在里面），收起后还会把它拆掉，
 * 所以收起时的关键词从世界书数据里读。
 */
import { ctx } from '../st/st';

type Entries = Record<string, { key?: string[]; constant?: boolean }>;
const books = new Map<string, Entries>();
const loading = new Set<string>();

function bookName(): string {
  const sel = document.getElementById('world_editor_select') as HTMLSelectElement | null;
  return sel?.selectedOptions[0]?.textContent?.trim() ?? '';
}

async function loadBook(name: string): Promise<void> {
  if (!name || loading.has(name)) return;
  loading.add(name);
  try {
    const data = await ctx().loadWorldInfo?.(name);
    books.set(name, (data?.entries ?? {}) as Entries);
  } catch { /* 读不到就只显示位置和顺序 */ } finally {
    loading.delete(name);
  }
  refreshAll();
}

/** 主要关键字：展开时从输入框读（可能是文本框，也可能是多选标签），收起时从世界书数据读。 */
function keywords(entry: Element): string {
  const field = entry.querySelector('[name="key"]');
  if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) return field.value.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
  if (field instanceof HTMLSelectElement) return [...field.selectedOptions].map((o) => o.text.trim()).filter(Boolean).join(', ');
  const uid = entry.getAttribute('uid');
  const keys = uid !== null ? books.get(bookName())?.[uid]?.key : undefined;
  return (keys ?? []).map((k) => String(k).trim()).filter(Boolean).join(', ');
}

function summary(entry: Element): string {
  const parts: string[] = [];
  const state = entry.querySelector<HTMLSelectElement>('select[name="entryStateSelector"]');
  if (state?.value !== 'constant') parts.push(keywords(entry) || '没有关键词');
  const pos = entry.querySelector<HTMLSelectElement>('select[name="position"]');
  const posText = pos?.selectedOptions[0]?.textContent?.trim() ?? '';
  const depth = entry.querySelector<HTMLInputElement>('input[name="depth"]');
  if (posText) parts.push(depth && !depth.disabled && depth.value ? `${posText} · 深度 ${depth.value}` : posText);
  const order = entry.querySelector<HTMLInputElement>('input[name="order"]');
  if (order?.value) parts.push(`顺序 ${order.value}`);
  const prob = entry.querySelector<HTMLInputElement>('input[name="probability"]');
  if (prob?.value && prob.value !== '100') parts.push(`触发 ${prob.value}%`);
  return parts.join(' · ');
}

function refresh(entry: Element): void {
  const el = entry.querySelector<HTMLElement>('.rbt-wi-sum');
  if (!el) return;
  const s = summary(entry);
  if (el.textContent !== s) el.textContent = s;
}

function refreshAll(): void {
  for (const el of document.querySelectorAll('#world_popup_entries_list .world_entry')) refresh(el);
}

function enhance(entry: HTMLElement): void {
  // 摘要行：加在标题区里，一直都在（CSS 决定什么时候显示）
  const header = entry.querySelector<HTMLElement>(':scope > form > .inline-drawer > .inline-drawer-header');
  if (header && !header.querySelector(':scope > .rbt-wi-sum')) {
    const sum = document.createElement('div');
    sum.className = 'rbt-wi-sum';
    header.appendChild(sum);
    entry.addEventListener('input', () => refresh(entry));
    entry.addEventListener('change', () => refresh(entry));
  }
  refresh(entry);

  // 「更多设置」：编辑区每次展开都是新生成的，所以每次都要检查
  const edit = entry.querySelector<HTMLElement>('.world_entry_edit');
  if (edit && !edit.querySelector(':scope > .rbt-wi-more')) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'rbt-wi-more';
    const label = () => { more.innerHTML = entry.classList.contains('rbt-wi-adv') ? '<i class="fa-solid fa-chevron-up"></i> 收起更多设置' : '<i class="fa-solid fa-chevron-down"></i> 更多设置'; };
    label();
    more.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      entry.classList.toggle('rbt-wi-adv');
      label();
    });
    edit.appendChild(more);
  }
}

let pending = false;
function scan(): void {
  if (pending) return;
  pending = true;
  // 一次重画会触发很多条变动，合成一次处理
  requestAnimationFrame(() => {
    pending = false;
    if (!document.body.classList.contains('rbt-shell')) return;
    const name = bookName();
    if (name && !books.has(name)) void loadBook(name);
    for (const el of document.querySelectorAll<HTMLElement>('#world_popup_entries_list .world_entry')) enhance(el);
  });
}

let installed = false;

export function installWorldEntries(tries = 0): void {
  if (installed) return;
  const list = document.getElementById('world_popup_entries_list');
  // 世界书面板是酒馆按需生成的：还没有就过一会儿再看（最多等一分钟）
  if (!list) { if (tries < 30) setTimeout(() => installWorldEntries(tries + 1), 2000); return; }
  installed = true;
  // 翻页、排序、换一本书、展开收起时酒馆会重画条目
  new MutationObserver(() => scan()).observe(list, { childList: true, subtree: true });
  // 改了关键词以后，世界书数据要重新读（收起时的摘要用它）
  let t: ReturnType<typeof setTimeout> | undefined;
  list.addEventListener('change', () => { clearTimeout(t); t = setTimeout(() => { books.delete(bookName()); scan(); }, 1500); });
  scan();
}
