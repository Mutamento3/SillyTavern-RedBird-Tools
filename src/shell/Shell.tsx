/**
 * 三栏外壳：左栏（全局设定 + 聊天 / 角色列表）+ 中间顶部导航条。
 * 右栏第二阶段再做；现在「角色 / 世界书 / 工具箱」暂时放在导航条右侧。
 */
import { signal } from '@preact/signals';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { ctx, currentCharacter, saveSettings, settings } from '../st/st';
import { panelOpen } from '../ui/Panel';
import { DRAWERS, drawerButtonHandlers, openDrawer, openDrawers, type DrawerKey } from './drawers';
import {
  allTags,
  charsTick,
  createCharacter,
  createGroup,
  editCharacter,
  importCharacterFile,
  importCharacterUrl,
  isCurrent,
  listCharacters,
  openCharacter,
  sortCharacters,
  toggleFavorite,
  type CharItem,
  type CharSort,
} from './characters';
import {
  isCurrentChat,
  loadRecentChats,
  openRecentChat,
  prettyChatName,
  recentChats,
  recentLoading,
  shortTime,
  timeGroup,
  type RecentChat,
} from './recent';

export const shellOn = signal(false);
export const leftCollapsed = signal(false);
/** Bumped on chat changes so the nav bar re-reads character / chat name. */
export const chatTick = signal(0);

const COLLAPSE_KEY = 'rbt-shell-left-collapsed';
const GLOBAL_KEYS: DrawerKey[] = ['preset', 'api', 'persona', 'extensions', 'settings', 'backgrounds', 'formatting'];

function applyBodyClasses(): void {
  const b = document.body.classList;
  b.toggle('rbt-shell', shellOn.value);
  b.toggle('rbt-shell-lcollapsed', leftCollapsed.value);
  const c = ctx();
  const home = (c.characterId === undefined || c.characterId === null) && !c.groupId;
  b.toggle('rbt-home', home);
}

export function setShellEnabled(on: boolean): void {
  shellOn.value = on;
  settings().shellEnabled = on;
  saveSettings();
  applyBodyClasses();
}

function setCollapsed(v: boolean): void {
  leftCollapsed.value = v;
  try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  applyBodyClasses();
}

function trigger(selector: string): void {
  const $ = window.jQuery;
  if ($) $(selector).first().trigger('click');
  else document.querySelector<HTMLElement>(selector)?.click();
}

function inChat(): boolean {
  const c = ctx();
  return (c.characterId !== undefined && c.characterId !== null) || !!c.groupId;
}

function goHome(): void {
  if (inChat()) trigger('#option_close_chat');
}

function newChat(): void {
  // In a chat: a new save for the same character (ST asks to confirm). On the home page: pick a character.
  if (inChat()) trigger('#option_start_new_chat');
  else setView('chars');
}

// ---------------------------------------------------------------- left ---

function DrawerButton({ k, compact }: { k: DrawerKey; compact?: boolean }) {
  const d = DRAWERS.find((x) => x.key === k)!;
  const active = openDrawers.value.includes(k);
  return (
    <button type="button" class={`rbt-gbtn ${active ? 'active' : ''} ${compact ? 'compact' : ''}`} title={d.label} {...drawerButtonHandlers(k)}>
      <i class={`fa-solid ${d.icon} fa-fw`} />
      <span>{d.label}</span>
    </button>
  );
}

function RecentRow({ r }: { r: RecentChat }) {
  const current = isCurrentChat(r);
  return (
    <button type="button" class={`rbt-recent-row ${current ? 'current' : ''}`} onClick={() => { void openRecentChat(r); }} title={`${r.name} · ${r.chatId}`}>
      <img class="rbt-recent-avatar" src={r.thumb} alt="" loading="lazy" />
      <span class="rbt-recent-main">
        <span class="rbt-recent-line1">
          <span class="rbt-recent-name">{r.name}</span>
          <span class="rbt-recent-time">{shortTime(r.time)}</span>
        </span>
        <span class="rbt-recent-preview">{r.preview || prettyChatName(r.chatId, r.name)}</span>
      </span>
    </button>
  );
}

export type LeftView = 'chats' | 'chars';
export const leftView = signal<LeftView>('chats');
const VIEW_KEY = 'rbt-shell-left-view';
const SORT_KEY = 'rbt-shell-char-sort';

function setView(v: LeftView): void {
  leftView.value = v;
  try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
}

function ChatList({ q }: { q: string }) {
  void chatTick.value; // re-render current-chat highlight
  useEffect(() => { if (!recentChats.value.length) void loadRecentChats(); }, []);
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = recentChats.value.filter((r) => !query
      || r.name.toLowerCase().includes(query)
      || r.preview.toLowerCase().includes(query)
      || r.chatId.toLowerCase().includes(query));
    const out: { label: string; items: RecentChat[] }[] = [];
    for (const r of list) {
      const label = timeGroup(r);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  }, [recentChats.value, q]);
  return (
    <div class="rbt-recent">
      {groups.map((g) => (
        <section key={g.label} class="rbt-recent-group">
          <h4>{g.label}</h4>
          {g.items.map((r) => <RecentRow key={r.key} r={r} />)}
        </section>
      ))}
      {!groups.length && <div class="rbt-recent-empty">{recentLoading.value ? '读取中…' : q ? '没有匹配的聊天' : '还没有聊天'}</div>}
    </div>
  );
}

function CharRow({ it }: { it: CharItem }) {
  const current = isCurrent(it);
  const sub = it.note || it.version;
  return (
    <div class={'rbt-char-row' + (current ? ' current' : '')}>
      <button type="button" class="rbt-char-open" onClick={() => { void openCharacter(it); }} title={it.name}>
        <img class="rbt-recent-avatar" src={it.thumb} alt="" loading="lazy" />
        <span class="rbt-recent-main">
          <span class="rbt-recent-name">{it.fav && <i class="fa-solid fa-star rbt-char-favmark" />}{it.name}</span>
          {sub && <span class="rbt-recent-preview">{sub}</span>}
          {it.tags.length > 0 && (
            <span class="rbt-char-tags">
              {it.tags.slice(0, 2).map((t) => <span key={t.id} class="rbt-char-tag">{t.name}</span>)}
              {it.tags.length > 2 && <span class="rbt-char-tag more">+{it.tags.length - 2}</span>}
            </span>
          )}
        </span>
      </button>
      <span class="rbt-char-actions">
        {it.kind === 'character' && (
          <button type="button" class={'rbt-row-act' + (it.fav ? ' on' : '')} title={it.fav ? '取消收藏' : '收藏'} onClick={() => { void toggleFavorite(it); }}>
            <i class={(it.fav ? 'fa-solid' : 'fa-regular') + ' fa-star'} />
          </button>
        )}
        <button type="button" class="rbt-row-act" title="编辑" onClick={() => { void editCharacter(it); }}>
          <i class="fa-solid fa-pen" />
        </button>
      </span>
    </div>
  );
}

function CharList({ q }: { q: string }) {
  void charsTick.value;
  void chatTick.value;
  const [filter, setFilter] = useState('all');
  const [sort, setSortState] = useState<CharSort>(() => {
    try { return (localStorage.getItem(SORT_KEY) as CharSort) || 'recent'; } catch { return 'recent'; }
  });
  const setSort = (v: CharSort) => { setSortState(v); try { localStorage.setItem(SORT_KEY, v); } catch { /* ignore */ } };
  const all = listCharacters();
  const tags = allTags(all);
  const query = q.trim().toLowerCase();
  const shown = sortCharacters(all.filter((it) => {
    if (filter === 'fav' && !it.fav) return false;
    if (filter === 'group' && it.kind !== 'group') return false;
    if (filter === 'char' && it.kind !== 'character') return false;
    if (filter.startsWith('tag:') && !it.tags.some((t) => t.id === filter.slice(4))) return false;
    if (query && !(it.name.toLowerCase().includes(query) || it.note.toLowerCase().includes(query) || it.tags.some((t) => t.name.toLowerCase().includes(query)))) return false;
    return true;
  }), sort);

  return (
    <>
      <div class="rbt-char-tools">
        <select class="rbt-mini-select" value={filter} title="筛选" onChange={(e) => setFilter((e.currentTarget as HTMLSelectElement).value)}>
          <option value="all">全部（{all.length}）</option>
          <option value="fav">★ 收藏（{all.filter((x) => x.fav).length}）</option>
          <option value="char">只看角色</option>
          {all.some((x) => x.kind === 'group') && <option value="group">只看群组</option>}
          {tags.length > 0 && <optgroup label="标签">{tags.map(({ tag, count }) => <option key={tag.id} value={'tag:' + tag.id}>{tag.name}（{count}）</option>)}</optgroup>}
        </select>
        <select class="rbt-mini-select" value={sort} title="排序" onChange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as CharSort)}>
          <option value="recent">最近聊过</option>
          <option value="name">名称</option>
          <option value="added">最近添加</option>
        </select>
      </div>
      <div class="rbt-char-lib">
        <button type="button" class="rbt-lib-btn" onClick={createCharacter} title="新建角色"><i class="fa-solid fa-user-plus" /> 新建</button>
        <button type="button" class="rbt-lib-btn" onClick={importCharacterFile} title="从文件导入角色卡"><i class="fa-solid fa-file-import" /> 导入</button>
        <button type="button" class="rbt-lib-btn icon" onClick={importCharacterUrl} title="从链接导入"><i class="fa-solid fa-link" /></button>
        <button type="button" class="rbt-lib-btn icon" onClick={createGroup} title="新建群组"><i class="fa-solid fa-users" /></button>
      </div>
      <div class="rbt-recent">
        {shown.map((it) => <CharRow key={it.key} it={it} />)}
        {!shown.length && <div class="rbt-recent-empty">{query || filter !== 'all' ? '没有匹配的角色' : '还没有角色'}</div>}
      </div>
    </>
  );
}

function LeftColumn() {
  const [q, setQ] = useState('');
  const view = leftView.value;

  return (
    <aside class="rbt-left" aria-label="RedBird 左栏">
      <div class="rbt-left-head">
        <button type="button" class="rbt-brand" title="回到首页" onClick={goHome}>
          <span class="rbt-brand-mark">🐦</span>
          <span>首页</span>
        </button>
        <button type="button" class="rbt-icon-btn" title="收起左栏" onClick={() => setCollapsed(true)}>
          <i class="fa-solid fa-angles-left" />
        </button>
      </div>

      <nav class="rbt-globals" aria-label="全局设定">
        {GLOBAL_KEYS.map((k) => <DrawerButton key={k} k={k} />)}
      </nav>

      <div class="rbt-left-actions">
        <button type="button" class="rbt-newchat-main" onClick={newChat} title={inChat() ? '给当前角色开一个新存档' : '选一个角色开始聊天'}>
          <i class="fa-solid fa-plus" /> 新聊天
        </button>
        <div class="rbt-seg" role="tablist">
          <button type="button" role="tab" class={view === 'chats' ? 'active' : ''} onClick={() => setView('chats')}>聊天</button>
          <button type="button" role="tab" class={view === 'chars' ? 'active' : ''} onClick={() => setView('chars')}>角色</button>
        </div>
        <label class="rbt-search">
          <i class="fa-solid fa-magnifying-glass" />
          <input type="search" placeholder={view === 'chats' ? '搜索聊天' : '搜索角色、备注、标签'} value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>

      {view === 'chats' ? <ChatList q={q} /> : <CharList q={q} />}

      <div class="rbt-left-foot">
        <button type="button" class="rbt-foot-btn" title="关掉三栏外壳，回到酒馆原来的界面" onClick={() => setShellEnabled(false)}>
          <i class="fa-solid fa-table-columns" /> 原版界面
        </button>
      </div>
    </aside>
  );
}

// ----------------------------------------------------------------- nav ---

function NavBar() {
  void chatTick.value;
  const c = ctx();
  const char = currentCharacter();
  const group = c.groupId ? c.groups?.find((g: { id: string }) => g.id === c.groupId) : null;
  const chatId = String(c.getCurrentChatId?.() ?? '');
  const home = !char && !group;
  const name = char?.name ?? group?.name ?? '';

  return (
    <header class="rbt-nav">
      {leftCollapsed.value && (
        <button type="button" class="rbt-icon-btn" title="展开左栏" onClick={() => setCollapsed(false)}>
          <i class="fa-solid fa-angles-right" />
        </button>
      )}
      <div class="rbt-nav-title">
        {home ? (
          <span class="rbt-nav-name">首页</span>
        ) : (
          <>
            {char && <img class="rbt-nav-avatar" src={c.getThumbnailUrl('avatar', char.avatar)} alt="" />}
            <span class="rbt-nav-name">{name}</span>
            {chatId && (
              <button type="button" class="rbt-nav-save" title="切换 / 管理这个角色的存档" onClick={() => trigger('#option_select_chat')}>
                {prettyChatName(chatId, name)} <i class="fa-solid fa-chevron-down" />
              </button>
            )}
          </>
        )}
      </div>
      <div class="rbt-nav-actions">
        {!home && <DrawerButton k="characters" compact />}
        {!home && <DrawerButton k="worldinfo" compact />}
        <button
          type="button"
          class={`rbt-gbtn compact ${panelOpen.value ? 'active' : ''}`}
          title="RedBird 工具箱"
          onClick={() => { panelOpen.value = !panelOpen.value; }}
        >
          <i class="fa-solid fa-feather-pointed fa-fw" />
          <span>工具箱</span>
        </button>
      </div>
    </header>
  );
}

export function Shell() {
  if (!shellOn.value) return null;
  return (
    <>
      {!leftCollapsed.value && <LeftColumn />}
      <NavBar />
    </>
  );
}

export function initShellState(): void {
  shellOn.value = settings().shellEnabled;
  try {
    leftCollapsed.value = localStorage.getItem(COLLAPSE_KEY) === '1';
    leftView.value = localStorage.getItem(VIEW_KEY) === 'chars' ? 'chars' : 'chats';
  } catch { /* ignore */ }
  applyBodyClasses();
  // Enable layout transitions only after the first layout, so the page doesn't slide around on load.
  setTimeout(() => document.body.classList.add('rbt-shell-ready'), 800);
  const c = ctx();
  const bump = () => { chatTick.value++; applyBodyClasses(); };
  for (const ev of [c.eventTypes.CHAT_CHANGED, c.eventTypes.CHARACTER_RENAMED, c.eventTypes.CHAT_RENAMED]) {
    if (ev) c.eventSource.on(ev, bump);
  }
}
