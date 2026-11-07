/**
 * 三栏外壳：左栏（全局设定 + 最近的聊天）+ 中间顶部导航条 + 右侧聊天工具箱。
 * 手机（≤ 1000px，body.rbt-compact）：同一套东西换个排法——左栏变成 ☰ 打开的抽屉，
 * 导航条只留 ☰、角色名（点了切换存档）、新聊天和聊天工具箱；状态栏不显示。
 */
import { signal } from '@preact/signals';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { ctx, currentCharacter, saveSettings, settings, confirmText } from '../st/st';
import { panelOpen } from '../ui/Panel';
import { openGlobal, sheetOpen, shellActive } from '../ui/views';
import { DRAWERS, drawerButtonHandlers, openDrawers, type DrawerKey } from './drawers';
import { ToolboxButton } from './EnvStatus';
import { StatusBar, worldStatus } from './StatusBar';
import { DropHint, ImportButton, installWindowDrop, windowDrag } from '../ui/pages/GlobalToolbox';
import { HomeGallery } from './Home';
import { charsTick, isCurrent as isCurrentChar, listCharacters, openCharacter, sortCharacters, type CharItem } from './characters';
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
/** 酒馆自带的全局入口，都写名字（教程里按名字找）。和工具箱自己的「全局工具箱」分开放。 */
const ST_KEYS: DrawerKey[] = ['preset', 'extensions', 'api', 'persona', 'settings', 'backgrounds', 'formatting'];

/** Whether the API is connected (ST's online_status). */
export const apiOnline = signal(true);
/** True on the home screen (no character or group open). */
export const homeActive = signal(false);
/** Phone / narrow window: the left column becomes a drawer opened from ☰. */
export const compact = signal(false);
export const navOpen = signal(false);
const COMPACT_MAX = 1000;
function readOnline(): void {
  const st = String(ctx().onlineStatus ?? '');
  apiOnline.value = !!st && st !== 'no_connection';
}

/** ST's temporary assistant chat has no character and fires no CHAT_CHANGED; we know it only because we opened it. */
let inTempChat = false;

function applyBodyClasses(): void {
  const b = document.body.classList;
  b.toggle('rbt-shell', shellOn.value);
  compact.value = (window.innerWidth || 1280) <= COMPACT_MAX;
  if (!compact.value) navOpen.value = false;
  b.toggle('rbt-compact', compact.value);
  b.toggle('rbt-nav-open', navOpen.value);
  b.toggle('rbt-shell-lcollapsed', leftCollapsed.value && !compact.value);
  const c = ctx();
  const home = (c.characterId === undefined || c.characterId === null) && !c.groupId && !inTempChat;
  b.toggle('rbt-home', home);
  homeActive.value = home;
  shellActive.value = shellOn.value;
}

export function setShellEnabled(on: boolean): void {
  shellOn.value = on;
  settings().shellEnabled = on;
  saveSettings();
  applyBodyClasses();
}

export function setNavOpen(v: boolean): void {
  navOpen.value = v;
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

function inSavedChat(): boolean {
  const c = ctx();
  return (c.characterId !== undefined && c.characterId !== null) || !!c.groupId;
}

function inChat(): boolean {
  return inSavedChat() || inTempChat;
}

function goHome(): void {
  if (inChat()) trigger('#option_close_chat');
}

/** Only offered inside a chat: a new save for the current character / group (ST asks to confirm). */
function newChat(): void {
  if (inSavedChat()) trigger('#option_start_new_chat');
}

// ---------------------------------------------------------------- left ---

function DrawerButton({ k, compact, label, title, dot }: { k: DrawerKey; compact?: boolean; label?: string; title?: string; dot?: string }) {
  const d = DRAWERS.find((x) => x.key === k)!;
  const active = openDrawers.value.includes(k);
  return (
    <button type="button" class={`rbt-gbtn ${active ? 'active' : ''} ${compact ? 'compact' : ''}`} title={title ?? d.label} {...drawerButtonHandlers(k)}>
      <i class={`fa-solid ${d.icon} fa-fw`} />
      <span>{label ?? d.label}</span>
      {dot && <span class="rbt-dot" title={dot} />}
    </button>
  );
}

/** Left-column button for the toolbox's own 「全局」 overlay. */
function GlobalButton() {
  return (
    <button type="button" class={`rbt-gtool ${sheetOpen.value ? 'active' : ''}`} title="全局工具箱：预设、世界书、正则、插件和备份" onClick={() => openGlobal()}>
      <i class="fa-solid fa-globe fa-fw" />
      <span>全局工具箱</span>
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

// 左栏列表：最近聊过的聊天，或者最近导入的角色卡（刚导入、还没聊过的卡在「最近聊过」里看不到）
type LeftMode = 'chats' | 'added';
const LEFT_MODE_KEY = 'rbt-left-mode';
const leftMode = signal<LeftMode>((() => { try { return localStorage.getItem(LEFT_MODE_KEY) === 'added' ? 'added' : 'chats'; } catch { return 'chats'; } })());
function setLeftMode(m: LeftMode): void {
  leftMode.value = m;
  try { localStorage.setItem(LEFT_MODE_KEY, m); } catch { /* ignore */ }
}

function AddedRow({ it }: { it: CharItem }) {
  const current = isCurrentChar(it);
  return (
    <button type="button" class={`rbt-recent-row ${current ? 'current' : ''}`} onClick={() => { void openCharacter(it); }} title={it.name}>
      <img class="rbt-recent-avatar" src={it.thumb} alt="" loading="lazy" />
      <span class="rbt-recent-main">
        <span class="rbt-recent-line1">
          <span class="rbt-recent-name">{it.name}</span>
          <span class="rbt-recent-time">{shortTime(it.added)}</span>
        </span>
        <span class="rbt-recent-preview">{it.lastChat ? `上次聊过 ${shortTime(it.lastChat)}` : '还没聊过'}</span>
      </span>
    </button>
  );
}

/** Characters by when they were imported, newest first, grouped like the chat list. */
function AddedList({ q }: { q: string }) {
  void charsTick.value;
  void chatTick.value;
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const items = sortCharacters(listCharacters().filter((i) => i.kind === 'character'), 'added')
      .filter((i) => !query || i.name.toLowerCase().includes(query) || i.note.toLowerCase().includes(query));
    const out: { label: string; items: CharItem[] }[] = [];
    for (const it of items) {
      const label = it.added ? timeGroup({ time: it.added } as RecentChat) : '更早';
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(it);
      else out.push({ label, items: [it] });
    }
    return out;
  }, [q, charsTick.value, chatTick.value]);
  return (
    <div class="rbt-recent">
      {groups.map((g) => (
        <section key={g.label} class="rbt-recent-group">
          <h4>{g.label}导入</h4>
          {g.items.map((it) => <AddedRow key={it.key} it={it} />)}
        </section>
      ))}
      {!groups.length && <div class="rbt-recent-empty">{q ? '没有匹配的角色' : '还没有角色卡'}</div>}
    </div>
  );
}

/** 酒馆欢迎页上的东西（临时聊天、文档、版本号），首页中间换成了角色画廊，就挪到左栏底部。 */
function openTemporaryChat(): void {
  const click = () => {
    trigger('.openTemporaryChat');
    inTempChat = true;
    applyBodyClasses();
  };
  if (!inChat()) { click(); return; }
  goHome();
  let n = 0;
  const wait = () => {
    if (document.querySelector('.openTemporaryChat')) click();
    else if (n++ < 30) setTimeout(wait, 100);
  };
  setTimeout(wait, 100);
}

/** Leaving the shell is easy to click by accident, so confirm and say how to come back. */
async function leaveShell(): Promise<void> {
  const ok = await confirmText('切回原版界面？', '想回到现在的三栏界面时，在输入框里发送 /rbt shell，或者在「扩展 › RedBird 工具箱」里勾选「三栏界面」。');
  if (ok) setShellEnabled(false);
}

/** ST version for the left footer, read once from ST's own /version endpoint. */
const stVersion = signal('');
function loadVersion(): void {
  fetch('/version').then((r) => r.json()).then((v: { pkgVersion?: string }) => { if (v?.pkgVersion) stVersion.value = v.pkgVersion; }).catch(() => { /* ignore */ });
}

/** 手机上：当前这张卡的入口（电脑上它们在导航条里）。 */
function CurrentCharacter() {
  void chatTick.value;
  const c = ctx();
  const char = currentCharacter();
  const group = c.groupId ? c.groups?.find((g: { id: string }) => g.id === c.groupId) : null;
  if (!char && !group) return null;
  const name = char?.name ?? group?.name ?? '';
  return (
    <div class="rbt-left-current">
      <div class="rbt-left-title">{name}</div>
      <nav class="rbt-globals rbt-globals-current" aria-label="当前角色">
        {char && <DrawerButton k="characters" label="编辑卡片" title={`编辑「${name}」的角色卡`} />}
        <WorldButton grid />
        <button type="button" class="rbt-gbtn" title="切换 / 管理这个角色的存档" onClick={() => trigger('#option_select_chat')}>
          <i class="fa-solid fa-clock-rotate-left fa-fw" />
          <span>存档</span>
        </button>
      </nav>
    </div>
  );
}

function LeftColumn() {
  const [q, setQ] = useState('');
  const version = stVersion.value;
  const phone = compact.value;
  // 手机上：选了聊天、面板或工具箱之后，抽屉自己收起来（搜索框除外）
  const autoClose = (e: MouseEvent) => {
    if (!phone) return;
    const el = (e.target as HTMLElement).closest('button, a');
    if (!el || el.closest('.rbt-left-head, .rbt-segctl')) return;
    setTimeout(() => setNavOpen(false), 0);
  };

  return (
    <aside class="rbt-left" aria-label="RedBird 左栏" onClickCapture={autoClose}>
      <div class="rbt-left-head">
        <button type="button" class="rbt-brand" title="回到首页" onClick={() => { goHome(); if (phone) setNavOpen(false); }}>
          <span class="rbt-brand-mark">🐦</span>
          <span>首页</span>
        </button>
        {phone ? (
          <button type="button" class="rbt-icon-btn" title="关闭" aria-label="关闭" onClick={() => setNavOpen(false)}>
            <i class="fa-solid fa-xmark" />
          </button>
        ) : (
          <button type="button" class="rbt-icon-btn" title="收起左栏" onClick={() => setCollapsed(true)}>
            <i class="fa-solid fa-angles-left" />
          </button>
        )}
      </div>

      {phone && <CurrentCharacter />}

      <div class="rbt-gtool-row"><ImportButton big /><GlobalButton /></div>
      <nav class="rbt-globals" aria-label="酒馆设定">
        {ST_KEYS.map((k) => (
          <DrawerButton key={k} k={k} title={k === 'api' && !apiOnline.value ? 'API（没连上）' : undefined} dot={k === 'api' && !apiOnline.value ? '没连上 API' : undefined} />
        ))}
      </nav>

      <div class="rbt-left-actions">
        <div class="rbt-segctl" role="tablist" aria-label="左栏列表">
          <button type="button" role="tab" class={leftMode.value === 'chats' ? 'active' : ''} aria-selected={leftMode.value === 'chats'} onClick={() => setLeftMode('chats')}>最近聊过</button>
          <button type="button" role="tab" class={leftMode.value === 'added' ? 'active' : ''} aria-selected={leftMode.value === 'added'} onClick={() => setLeftMode('added')}>最近导入</button>
        </div>
        <label class="rbt-search">
          <i class="fa-solid fa-magnifying-glass" />
          <input type="search" placeholder={leftMode.value === 'chats' ? '搜索聊天' : '搜索角色'} value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>

      {leftMode.value === 'chats' ? <ChatList q={q} /> : <AddedList q={q} />}

      <div class="rbt-left-foot">
        <button type="button" class="rbt-foot-btn" title="和酒馆助手临时聊几句，不会保存" onClick={openTemporaryChat}>
          <i class="fa-solid fa-comment-dots fa-fw" /> 临时聊天
        </button>
        <div class="rbt-foot-links">
          <a href="https://docs.sillytavern.app/" target="_blank" rel="noopener"><i class="fa-solid fa-circle-question" /> 文档</a>
          <a href="https://github.com/SillyTavern/SillyTavern" target="_blank" rel="noopener"><i class="fa-brands fa-github" /> GitHub</a>
          <a href="https://discord.gg/sillytavern" target="_blank" rel="noopener"><i class="fa-brands fa-discord" /> Discord</a>
        </div>
        <div class="rbt-foot-row">
          <button type="button" class="rbt-foot-btn" title="关掉三栏界面，回到酒馆原来的界面" onClick={() => { void leaveShell(); }}>
            <i class="fa-solid fa-table-columns fa-fw" /> 原版界面
          </button>
          {version && <span class="rbt-foot-version">SillyTavern {version}</span>}
        </div>
      </div>
    </aside>
  );
}

// ----------------------------------------------------------------- nav ---

/** 「世界书（N）」: N = how many books are loaded in this chat (card, extra, chat, persona, global); a dot when another card's book is on globally. */
function WorldButton({ grid }: { grid?: boolean }) {
  const w = worldStatus();
  return <DrawerButton k="worldinfo" compact={!grid} label={`世界书（${w.count}）`} title={w.warn ? `${w.title}
${w.warn}` : w.title} dot={w.warn} />;
}

function NavBar() {
  void chatTick.value;
  void homeActive.value; // re-render when the temporary chat opens
  const c = ctx();
  const char = currentCharacter();
  const group = c.groupId ? c.groups?.find((g: { id: string }) => g.id === c.groupId) : null;
  const chatId = String(c.getCurrentChatId?.() ?? '');
  const home = !char && !group;
  const name = char?.name ?? group?.name ?? '';

  if (compact.value) {
    return (
      <header class="rbt-nav rbt-nav-phone">
        <button type="button" class="rbt-icon-btn rbt-nav-menu" title="菜单" aria-label="菜单" onClick={() => setNavOpen(true)}>
          <i class="fa-solid fa-bars" />
        </button>
        <div class="rbt-nav-title">
          {home ? (
            <span class="rbt-nav-name">{inTempChat ? '临时聊天' : '首页'}</span>
          ) : (
            <button type="button" class="rbt-nav-who" title="切换 / 管理存档" onClick={() => trigger('#option_select_chat')}>
              {char && <img class="rbt-nav-avatar" src={c.getThumbnailUrl('avatar', char.avatar)} alt="" />}
              <span class="rbt-nav-name">{name}</span>
              {chatId && <i class="fa-solid fa-chevron-down" />}
            </button>
          )}
        </div>
        <div class="rbt-nav-actions">
          {!home && (
            <button type="button" class="rbt-icon-btn" title={`给「${name}」开一个新存档`} aria-label="新聊天" onClick={newChat}>
              <i class="fa-solid fa-pen-to-square" />
            </button>
          )}
          {!home && <ToolboxButton />}
        </div>
      </header>
    );
  }

  return (
    <header class="rbt-nav">
      {leftCollapsed.value && (
        <button type="button" class="rbt-icon-btn" title="展开左栏" onClick={() => setCollapsed(false)}>
          <i class="fa-solid fa-angles-right" />
        </button>
      )}
      <div class="rbt-nav-title">
        {home ? (
          <span class="rbt-nav-name">{inTempChat ? '临时聊天' : '首页'}</span>
        ) : (
          <>
            {char && <img class="rbt-nav-avatar" src={c.getThumbnailUrl('avatar', char.avatar)} alt="" />}
            <span class="rbt-nav-name">{name}</span>
            <DrawerButton k="characters" compact label="编辑卡片" title={`编辑「${name}」的角色卡`} />
            {chatId && (
              <button type="button" class="rbt-nav-save" title="切换 / 管理这个角色的存档" onClick={() => trigger('#option_select_chat')}>
                {prettyChatName(chatId, name)} <i class="fa-solid fa-chevron-down" />
              </button>
            )}
            <button type="button" class="rbt-gbtn compact rbt-nav-new" title={`给「${name}」开一个新存档`} onClick={newChat}>
              <i class="fa-solid fa-plus fa-fw" />
              <span>新聊天</span>
            </button>
          </>
        )}
      </div>
      {!home && <StatusBar />}
      <div class="rbt-nav-actions">
        {!home && <ToolboxButton />}
      </div>
    </header>
  );
}

export function Shell() {
  const on = shellOn.value;
  useEffect(() => (on ? installWindowDrop() : undefined), [on]);
  if (!on) return null;
  const phone = compact.value;
  const drag = windowDrag.value;
  return (
    <>
      {drag !== null && <DropHint count={drag} full />}
      {phone && navOpen.value && <div class="rbt-left-scrim" onClick={() => setNavOpen(false)} />}
      {(phone || !leftCollapsed.value) && <LeftColumn />}
      <NavBar />
      {homeActive.value && shellActive.value && <HomeGallery />}
    </>
  );
}

export function initShellState(): void {
  shellOn.value = settings().shellEnabled;
  try {
    leftCollapsed.value = localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch { /* ignore */ }
  applyBodyClasses();
  window.addEventListener('resize', applyBodyClasses);
  // Enable layout transitions only after the first layout, so the page doesn't slide around on load.
  setTimeout(() => document.body.classList.add('rbt-shell-ready'), 800);
  const c = ctx();
  const bump = () => {
    inTempChat = false;
    chatTick.value++;
    applyBodyClasses();
    if (shellActive.value && document.body.classList.contains('rbt-home')) panelOpen.value = false;
  };
  for (const ev of [c.eventTypes.CHAT_CHANGED, c.eventTypes.CHARACTER_RENAMED, c.eventTypes.CHAT_RENAMED]) {
    if (ev) c.eventSource.on(ev, bump);
  }
  // 状态栏里的人设
  for (const ev of [c.eventTypes.PERSONA_CHANGED, c.eventTypes.PERSONA_UPDATED, c.eventTypes.PERSONA_RENAMED, c.eventTypes.PERSONA_DELETED, c.eventTypes.SETTINGS_UPDATED]) {
    if (ev) c.eventSource.on(ev, () => { chatTick.value++; });
  }
  readOnline();
  loadVersion();
  for (const ev of [c.eventTypes.ONLINE_STATUS_CHANGED, c.eventTypes.MAIN_API_CHANGED, c.eventTypes.CHATCOMPLETION_SOURCE_CHANGED, c.eventTypes.CONNECTION_PROFILE_LOADED]) {
    if (ev) c.eventSource.on(ev, () => setTimeout(readOnline, 0));
  }
}
