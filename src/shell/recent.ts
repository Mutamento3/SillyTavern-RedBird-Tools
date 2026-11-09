/**
 * 三栏外壳：左栏的「最近聊天」。数据来自酒馆首页用的同一个接口 /api/chats/recent，
 * 置顶状态读酒馆首页的 pinnedChats（只读，置顶仍在酒馆首页操作，避免两边缓存打架）。
 */
import { signal } from '@preact/signals';
import { ctx, currentCharacter, toast, type Any } from '../st/st';

export interface RecentChat {
  key: string;
  avatar: string;
  group: string;
  fileName: string;
  /** chat id = file name without .jsonl */
  chatId: string;
  name: string;
  thumb: string;
  preview: string;
  time: number;
  pinned: boolean;
  messages: number;
}

export const recentChats = signal<RecentChat[]>([]);
export const recentLoading = signal(false);

function pinnedState(): Record<string, Any> {
  try {
    const raw = ctx().accountStorage?.getItem('pinnedChats');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function pinKey(c: { group?: string; avatar?: string; file_name: string }): string {
  return `${c.group ? `group_${c.group}` : ''}${c.avatar ? `char_${c.avatar}` : ''}_${c.file_name}`;
}

/** Strip markup so the preview is the actual last line of story text. */
export function cleanPreview(text: string): string {
  const t = String(text ?? '')
    .replace(/<(thinking|think|reasoning|status_[a-z_]*|UpdateVariable|StatusPlaceHolderImpl)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]{1,200}>/g, ' ')
    .replace(/^:::.*$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#>`~|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

function parseTime(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '');
  const n = Date.parse(s);
  if (!Number.isNaN(n)) return n;
  // ST's humanized format: "2025-12-8 @23h 24m 28s 574ms"
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s*@\s*(\d{1,2})h\s*(\d{1,2})m(?:\s*(\d{1,2})s)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)).getTime();
  return 0;
}

export async function loadRecentChats(): Promise<void> {
  const c = ctx();
  recentLoading.value = true;
  try {
    const pins = pinnedState();
    const res = await fetch('/api/chats/recent', {
      method: 'POST',
      headers: c.getRequestHeaders(),
      body: JSON.stringify({ max: 200, pinned: Object.values(pins) }),
      cache: 'no-cache',
    });
    if (!res.ok) throw new Error(String(res.status));
    const data: Any[] = await res.json();
    const out: RecentChat[] = [];
    const byAvatar = new Map<string, Any>((c.characters ?? []).map((x: Any) => [x.avatar, x]));
    for (const r of Array.isArray(data) ? data : []) {
      const character = r.avatar ? byAvatar.get(r.avatar) : null;
      const group = r.group ? c.groups?.find((x: Any) => x.id === r.group) : null;
      if (!character && !group) continue;
      const fileName = String(r.file_name ?? '');
      out.push({
        key: pinKey(r),
        avatar: r.avatar ?? '',
        group: r.group ?? '',
        fileName,
        chatId: fileName.replace(/\.jsonl$/, ''),
        name: character?.name ?? group?.name ?? '',
        thumb: character ? c.getThumbnailUrl('avatar', character.avatar) : 'img/five.png',
        preview: cleanPreview(r.mes ?? ''),
        time: parseTime(r.last_mes),
        pinned: pinKey(r) in pins,
        messages: Number(r.chat_items ?? 0),
      });
    }
    out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.time - a.time);
    recentChats.value = out;
  } catch (e) {
    console.warn('[RedBird] loading recent chats failed', e);
  } finally {
    recentLoading.value = false;
  }
}

/** Which chat is open: chat id + whose it is. Read once per list render. */
export function currentChatKey(): { id: string; group: string; avatar: string } {
  const c = ctx();
  return { id: String(c.getCurrentChatId?.() ?? ''), group: String(c.groupId ?? ''), avatar: String(currentCharacter()?.avatar ?? '') };
}

export function isCurrentChat(r: RecentChat, cur = currentChatKey()): boolean {
  if (!cur.id || cur.id !== r.chatId) return false;
  if (r.group) return cur.group === r.group;
  return cur.avatar === r.avatar;
}

/**
 * 发消息 / 收到回复 / 删消息后，只改当前聊天这一行（预览、时间、条数），挪到最上面；
 * 不再每条消息都把整个列表从服务器拉一遍。列表里没有这个聊天（刚建的）才重新拉。
 */
function patchCurrentRow(): void {
  const cur = currentChatKey();
  const list = recentChats.value;
  const i = list.findIndex((r) => isCurrentChat(r, cur));
  if (i < 0) { refreshRecentSoon(1500); return; }
  const chat: Any[] = ctx().chat ?? [];
  const last = [...chat].reverse().find((m) => !m?.is_system);
  const row: RecentChat = { ...list[i], preview: cleanPreview(last?.mes ?? ''), time: Date.now(), messages: chat.length };
  const rest = list.filter((_, j) => j !== i);
  const out = [row, ...rest];
  out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.time - a.time);
  recentChats.value = out;
}

export async function openRecentChat(r: RecentChat): Promise<void> {
  const c = ctx();
  try {
    if (r.group) {
      await c.openGroupChat(r.group, r.chatId);
      return;
    }
    const idx = c.characters.findIndex((x: Any) => x.avatar === r.avatar);
    if (idx < 0) throw new Error('角色不存在');
    if (String(c.characterId) !== String(idx)) await c.selectCharacterById(idx);
    if (String(ctx().getCurrentChatId?.() ?? '') !== r.chatId) await ctx().openCharacterChat(r.chatId);
  } catch (e) {
    console.error('[RedBird] open chat failed', e);
    toast('error', `打开聊天失败：${String(e)}`);
  }
}

/** Group label for the list: 置顶 / 今天 / 昨天 / 7 天内 / 30 天内 / 更早 */
export function timeGroup(r: RecentChat, now = Date.now()): string {
  if (r.pinned) return '置顶';
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  if (r.time >= t0) return '今天';
  if (r.time >= t0 - 86400000) return '昨天';
  if (r.time >= t0 - 6 * 86400000) return '7 天内';
  if (r.time >= t0 - 29 * 86400000) return '30 天内';
  return '更早';
}

export function shortTime(t: number, now = Date.now()): string {
  if (!t) return '';
  const d = new Date(t);
  const today = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  if (d.toDateString() === today.toDateString()) return `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (d.getFullYear() === today.getFullYear()) return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** Human-friendly save name: drop a leading "角色名 - " and tidy ST's timestamp format. */
export function prettyChatName(chatId: string, charName?: string): string {
  let s = chatId;
  if (charName && s.startsWith(`${charName} - `)) s = s.slice(charName.length + 3);
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s*@\s*(\d{1,2})h\s*(\d{1,2})m/);
  if (m) {
    const p = (n: string) => n.padStart(2, '0');
    return `${m[1]}-${p(m[2])}-${p(m[3])} ${p(m[4])}:${p(m[5])}`;
  }
  return s;
}

/** 顶栏里用的短名字：今年的存档不写年份（「11-06 02:45」），改过名的照原样。 */
export function shortSaveName(chatId: string, charName?: string): string {
  const s = prettyChatName(chatId, charName);
  const y = `${new Date().getFullYear()}-`;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s) && s.startsWith(y) ? s.slice(y.length) : s;
}

let timer: ReturnType<typeof setTimeout> | undefined;
export function refreshRecentSoon(delay = 1200): void {
  clearTimeout(timer);
  timer = setTimeout(() => { void loadRecentChats(); }, delay);
}

export function installRecentWatch(): void {
  const c = ctx();
  const es = c.eventSource;
  const et = c.eventTypes;
  // The character list loads after extensions; chats of unknown characters are dropped, so load again then.
  // (Both events and the list's first mount go through the same debounce: one request at startup.)
  // 启动时两个事件常常隔着一两秒先后到：角色数没变、刚拉过的就不再拉
  let lastStartup = { at: 0, chars: -1 };
  const startupLoad = () => {
    const chars = ctx().characters?.length ?? 0;
    if (Date.now() - lastStartup.at < 5000 && chars === lastStartup.chars) return;
    lastStartup = { at: Date.now(), chars };
    refreshRecentSoon(400);
  };
  for (const ev of [et.APP_READY, et.CHARACTER_PAGE_LOADED]) {
    if (ev) es.on(ev, startupLoad);
  }
  // 打开一个聊天不会改变列表内容（当前高亮由界面自己算），所以换聊天不再重新下载；新建、删除、改名才拉
  for (const ev of [et.CHAT_CREATED, et.CHAT_RENAMED, et.CHAT_DELETED, et.GROUP_CHAT_DELETED, et.CHARACTER_RENAMED, et.CHARACTER_DELETED]) {
    if (ev) es.on(ev, () => refreshRecentSoon(300));
  }
  let patchTimer: ReturnType<typeof setTimeout> | undefined;
  for (const ev of [et.MESSAGE_RECEIVED, et.MESSAGE_SENT, et.MESSAGE_DELETED, et.MESSAGE_SWIPED, et.MESSAGE_EDITED]) {
    if (ev) es.on(ev, () => { clearTimeout(patchTimer); patchTimer = setTimeout(patchCurrentRow, 300); });
  }
}
