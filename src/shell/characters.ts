/**
 * 三栏外壳：左栏「角色」列表的数据。全部读写酒馆自己的角色数据（收藏、标签与原版互通）。
 * 浏览/切换角色是"导航"，放在左栏；编辑角色是专注任务，用 overlay 打开酒馆原来的编辑页。
 */
import { signal } from '@preact/signals';
import { cleanPreview } from './recent';
import { ctx, toast, type Any } from '../st/st';
import { openDrawer } from './drawers';
import { cardInfo, extStatus, installedExtensions, requiredExtensions } from '../tools/cards/cards';

export interface TagInfo {
  id: string;
  name: string;
  color?: string;
}

export interface CharItem {
  kind: 'character' | 'group';
  /** characters[] index, or group id */
  ref: string;
  key: string;
  name: string;
  thumb: string;
  fav: boolean;
  note: string;
  version: string;
  tags: TagInfo[];
  lastChat: number;
  added: number;
  /** Short labels of what is not in place (lorebook missing, regex not allowed…). */
  problems: string[];
  hasLinks: boolean;
}

export type CharSort = 'recent' | 'name' | 'added';

/** Bumped when favourites / the character list change, so the view re-reads. */
export const charsTick = signal(0);

function toTime(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = Date.parse(String(v ?? ''));
  return Number.isNaN(n) ? 0 : n;
}

function isFav(ch: Any): boolean {
  const v = ch?.fav ?? ch?.data?.extensions?.fav;
  return v === true || v === 'true';
}

function tagsFor(key: string): TagInfo[] {
  const c = ctx();
  const ids: string[] = c.tagMap?.[key] ?? [];
  const all: Any[] = c.tags ?? [];
  return ids.map((id) => all.find((t) => t.id === id)).filter(Boolean).map((t) => ({ id: t.id, name: t.name, color: t.color || undefined }));
}

export function listCharacters(): CharItem[] {
  const c = ctx();
  const installed = installedExtensions();
  const s = (c.extensionSettings?.redbird_tools ?? {}) as Any;
  const chars: CharItem[] = (c.characters ?? []).map((ch: Any, i: number) => {
    const info = cardInfo(ch);
    const problems: string[] = [];
    if (info.world.state === 'missing') problems.push('世界书缺文件');
    if (info.world.state === 'unbound') problems.push('世界书没导入');
    if (info.regex.total > 0 && !info.regex.allowed) problems.push('正则未允许运行');
    if (info.scripts.total > 0 && !info.scripts.enabled) problems.push('脚本未启用');
    if (requiredExtensions(info).some((e) => extStatus(e.req, installed).status !== 'enabled')) problems.push('缺插件');
    const notes = cleanPreview(ch.data?.creator_notes ?? ch.creatorcomment ?? '');
    return {
      kind: 'character' as const,
      ref: String(i),
      key: `c:${ch.avatar}`,
      name: String(ch.name ?? ''),
      thumb: c.getThumbnailUrl('avatar', ch.avatar),
      fav: isFav(ch),
      note: notes,
      version: String(ch.data?.character_version ?? ''),
      tags: tagsFor(ch.avatar),
      lastChat: toTime(ch.date_last_chat),
      added: toTime(ch.date_added ?? ch.create_date),
      problems,
      hasLinks: !!s.cards?.[ch.avatar]?.links?.length,
    };
  });
  const groups: CharItem[] = (c.groups ?? []).map((g: Any) => ({
    kind: 'group' as const,
    ref: String(g.id),
    key: `g:${g.id}`,
    name: String(g.name ?? ''),
    thumb: g.avatar_url || 'img/five.png',
    fav: g.fav === true || g.fav === 'true',
    note: `群组 · ${(g.members ?? []).length} 个角色`,
    version: '',
    tags: tagsFor(g.id),
    lastChat: toTime(g.date_last_chat),
    added: toTime(g.date_added ?? g.create_date),
    problems: [],
    hasLinks: false,
  }));
  return [...chars, ...groups];
}

export function sortCharacters(items: CharItem[], sort: CharSort): CharItem[] {
  const out = [...items];
  if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  else if (sort === 'added') out.sort((a, b) => b.added - a.added);
  else out.sort((a, b) => b.lastChat - a.lastChat);
  // Favourites always first, like ST's own list.
  return out.sort((a, b) => Number(b.fav) - Number(a.fav));
}

export function allTags(items: CharItem[]): { tag: TagInfo; count: number }[] {
  const m = new Map<string, { tag: TagInfo; count: number }>();
  for (const it of items) for (const t of it.tags) {
    const e = m.get(t.id) ?? { tag: t, count: 0 };
    e.count++;
    m.set(t.id, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.tag.name.localeCompare(b.tag.name));
}

export function isCurrent(it: CharItem): boolean {
  const c = ctx();
  if (it.kind === 'group') return c.groupId === it.ref;
  return !c.groupId && String(c.characterId) === it.ref;
}

export async function openCharacter(it: CharItem): Promise<void> {
  const c = ctx();
  try {
    if (it.kind === 'group') {
      const g = c.groups?.find((x: Any) => String(x.id) === it.ref);
      await c.openGroupChat(it.ref, g?.chat_id);
    } else if (String(c.characterId) !== it.ref || c.groupId) {
      await c.selectCharacterById(Number(it.ref));
    }
  } catch (e) {
    console.error('[RedBird] open character failed', e);
    toast('error', `打开失败：${String(e)}`);
  }
}

/** Edit = select it, then show ST's character editor as an overlay. */
export async function editCharacter(it: CharItem): Promise<void> {
  await openCharacter(it);
  openDrawer('characters');
}

export async function toggleFavorite(it: CharItem): Promise<void> {
  if (it.kind !== 'character') return;
  const c = ctx();
  const ch = c.characters?.[Number(it.ref)];
  if (!ch) return;
  const next = !isFav(ch);
  const res = await fetch('/api/characters/merge-attributes', {
    method: 'POST',
    headers: c.getRequestHeaders(),
    body: JSON.stringify({ avatar: ch.avatar, fav: next, data: { extensions: { fav: next } } }),
  });
  if (!res.ok) {
    toast('error', `收藏没保存上：${res.status}`);
    return;
  }
  ch.fav = next;
  ch.data ??= {};
  ch.data.extensions ??= {};
  ch.data.extensions.fav = next;
  charsTick.value++;
}

function clickSt(selector: string): void {
  const $ = window.jQuery;
  if ($) $(selector).first().trigger('click');
  else document.querySelector<HTMLElement>(selector)?.click();
}

/** Library actions reuse ST's own buttons in the character panel. */
export function createCharacter(): void {
  openDrawer('characters');
  setTimeout(() => clickSt('#rm_button_create'), 250);
}
export function importCharacterFile(): void {
  clickSt('#character_import_button');
}
export function importCharacterUrl(): void {
  clickSt('#external_import_button');
}
export function createGroup(): void {
  openDrawer('characters');
  setTimeout(() => clickSt('#rm_button_group_chats'), 250);
}

export function installCharactersWatch(): void {
  const c = ctx();
  const bump = () => { charsTick.value++; };
  for (const ev of [c.eventTypes.CHARACTER_PAGE_LOADED, c.eventTypes.CHARACTER_EDITED, c.eventTypes.CHARACTER_DELETED,
    c.eventTypes.CHARACTER_RENAMED, c.eventTypes.CHAT_CHANGED, c.eventTypes.GROUP_UPDATED, c.eventTypes.APP_READY]) {
    if (ev) c.eventSource.on(ev, bump);
  }
}
