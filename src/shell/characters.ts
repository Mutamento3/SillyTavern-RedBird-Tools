/**
 * 三栏外壳：左栏「角色」列表的数据。全部读写酒馆自己的角色数据（置顶 = 酒馆的收藏，和标签一样与原版互通）。
 * 浏览/切换角色是"导航"，放在左栏；编辑角色是专注任务，用 overlay 打开酒馆原来的编辑页。
 */
import { signal } from '@preact/signals';
import { cleanPreview } from './recent';
import { charaFileName, ctx, escHtml, loaded, stModule, toast, type Any } from '../st/st';
import { openDrawer } from './drawers';
import { cardFacts, cardInfo, extStatus, installedExtensions, requiredExtensions, worldNames } from '../tools/cards/cards';
import { trash } from '../tools/trash';

export interface TagInfo {
  id: string;
  name: string;
  color?: string;
  /** 字的颜色（酒馆标签的第二个颜色） */
  color2?: string;
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
  /** 名字后面的小灰字：和酒馆角色列表一样，按酒馆设置显示版本号或作者名 */
  aux: string;
  /** 有别的卡和它同名时，大图里写的添加日期（「11/18 添加」，同一天添加的再加时间），好分清是哪一份；不同名是空的 */
  addedLabel: string;
  /** 聊天记录一共多大（酒馆「聊得最多」排序用的就是它） */
  chatSize: number;
  tags: TagInfo[];
  lastChat: number;
  added: number;
  /** 打开卡也补不上的问题（缺插件、世界书缺文件），见 listCharacters */
  problems: string[];
  hasLinks: boolean;
}

/** 「3 天前聊过」：首页列表和导入时选同名卡都用它。 */
export function lastChatText(t: number, now = Date.now()): string {
  if (!t) return '还没聊过';
  const day = 86400000;
  const start = new Date(now).setHours(0, 0, 0, 0);
  if (t >= start) return '今天聊过';
  if (t >= start - day) return '昨天聊过';
  const days = Math.floor((start - t) / day) + 1;
  if (days < 7) return `${days} 天前聊过`;
  const d = new Date(t);
  return d.getFullYear() === new Date(now).getFullYear() ? `${d.getMonth() + 1} 月 ${d.getDate()} 日聊过` : `${d.getFullYear()} 年 ${d.getMonth() + 1} 月聊过`;
}

export type CharSort = 'recent' | 'name' | 'added' | 'chats';

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
  return ids.map((id) => all.find((t) => t.id === id)).filter(Boolean).map((t) => ({ id: t.id, name: t.name, color: t.color || undefined, color2: t.color2 || undefined }));
}

export function listCharacters(): CharItem[] {
  const c = ctx();
  const installed = installedExtensions();
  const s = (c.extensionSettings?.redbird_tools ?? {}) as Any;
  const auxField = String(c.powerUserSettings?.aux_field || 'character_version');
  const chars: CharItem[] = (c.characters ?? []).map((ch: Any, i: number) => {
    const info = cardInfo(ch);
    // 只标打开卡也补不上的。打开卡时：卡里自带的世界书工具箱会自动导入，正则酒馆会问一次，脚本酒馆助手会问一次，
    // 这些都不算问题。世界书缺文件、卡里也没带一份（还没打开过的卡不知道带没带，先不标）才算
    const problems: string[] = [];
    if (info.world.state === 'missing' && cardFacts(ch) && info.world.embedded === null) problems.push('世界书缺文件');
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
      aux: String(ch.data?.[auxField] ?? ''),
      addedLabel: '',
      chatSize: Number(ch.chat_size) || 0,
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
    aux: '',
    addedLabel: '',
    chatSize: Number(g.chat_size) || 0,
    tags: tagsFor(g.id),
    lastChat: toTime(g.date_last_chat),
    added: toTime(g.date_added ?? g.create_date),
    problems: [],
    hasLinks: false,
  }));
  // 同名的卡写添加日期（和排序「最近添加」、左栏「11/12」同一种写法）。同名里有两张同一天添加的，就都加上时间
  const byName = new Map<string, CharItem[]>();
  for (const it of chars) byName.set(it.name, [...(byName.get(it.name) ?? []), it]);
  const thisYear = new Date().getFullYear();
  const day = (t: number) => { const d = new Date(t); return d.getFullYear() === thisYear ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
  const time = (t: number) => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
  for (const same of byName.values()) {
    if (same.length < 2) continue;
    const days = same.map((it) => day(it.added));
    const clash = new Set(days).size < days.length;
    same.forEach((it, i) => { if (it.added) it.addedLabel = `${days[i]}${clash ? ' ' + time(it.added) : ''} 添加`; });
  }
  return [...chars, ...groups];
}

export function sortCharacters(items: CharItem[], sort: CharSort): CharItem[] {
  const out = [...items];
  if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  else if (sort === 'added') out.sort((a, b) => b.added - a.added);
  else if (sort === 'chats') out.sort((a, b) => b.chatSize - a.chatSize);
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

/** 这张卡的所有存档：先打开这张卡，再打开存档页（和顶栏「存档」是同一个页面）。 */
export async function openSaves(it: CharItem): Promise<void> {
  await openCharacter(it);
  // 换卡时会关掉开着的面板，等它关完再打开存档页
  await new Promise((r) => setTimeout(r, 400));
  const $ = window.jQuery;
  if ($) $('#option_select_chat').first().trigger('click');
  else document.getElementById('option_select_chat')?.click();
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
    toast('error', `置顶没保存上：${res.status}`);
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
export function importCharacterUrl(): void {
  clickSt('#external_import_button');
}
export function createGroup(): void {
  openDrawer('characters');
  setTimeout(() => clickSt('#rm_button_group_chats'), 250);
}

// ------------------------------------------------------------ manage ---
// 删除、导出、复制都用酒馆自己的接口 / 函数，和在角色面板里做的一样。

function charOf(it: CharItem): Any | null {
  return it.kind === 'character' ? ctx().characters?.[Number(it.ref)] ?? null : null;
}

/** Download a character as PNG (card with picture) or JSON. */
export async function exportCharacter(it: CharItem, format: 'png' | 'json' = 'png'): Promise<void> {
  const ch = charOf(it);
  if (!ch) return;
  const res = await fetch('/api/characters/export', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ format, avatar_url: ch.avatar }) });
  if (!res.ok) { toast('error', `导出「${ch.name}」失败：${res.status}`); return; }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = String(ch.avatar).replace(/\.png$/i, `.${format}`);
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

/** Make a copy of a character (ST names the copy itself). */
export async function duplicateCharacter(it: CharItem): Promise<void> {
  const c = ctx();
  const ch = charOf(it);
  if (!ch) return;
  const res = await fetch('/api/characters/duplicate', { method: 'POST', headers: c.getRequestHeaders(), body: JSON.stringify({ avatar_url: ch.avatar }) });
  if (!res.ok) { toast('error', `复制「${ch.name}」失败：${res.status}`); return; }
  const data = await res.json();
  await c.eventSource.emit(c.eventTypes.CHARACTER_DUPLICATED, { oldAvatar: ch.avatar, newAvatar: data.path });
  await c.getCharacters();
  charsTick.value++;
  toast('success', `已复制一份「${ch.name}」`);
}

// ------------------------------------------------------------- 批量标签 ---
// 用酒馆自己的标签数据（tags / tag_map），和原版角色列表里的标签互通。

/** 一个标签在选中的这些卡上：全都有 / 有的有 / 都没有。 */
export function tagState(items: CharItem[], tagId: string): 'all' | 'some' | 'none' {
  const map = (ctx().tagMap ?? {}) as Record<string, string[]>;
  const has = items.filter((it) => (map[charOf(it)?.avatar ?? ''] ?? []).includes(tagId)).length;
  return has === 0 ? 'none' : has === items.length ? 'all' : 'some';
}

/** 给这些卡都加上（或都去掉）一个标签。 */
export async function setTagOn(items: CharItem[], tagId: string, add: boolean): Promise<void> {
  const m = await stModule('/scripts/tags.js');
  const tag = (ctx().tags ?? []).find((t: Any) => t.id === tagId);
  const keys = items.map((it) => charOf(it)?.avatar).filter(Boolean) as string[];
  if (!m || !tag || !keys.length) return;
  if (add) m.addTagsToEntity?.(tag, keys);
  else m.removeTagFromEntity?.(tag, keys);
  charsTick.value++;
}

/** 新建一个标签（同名的已经有了就用现有的），返回它的 id。 */
export async function createTag(name: string): Promise<string | null> {
  const n = name.trim();
  if (!n) return null;
  const m = await stModule('/scripts/tags.js');
  const list: Any[] = m?.tags ?? ctx().tags;
  if (!list) return null;
  const same = list.find((t) => String(t.name).toLowerCase() === n.toLowerCase());
  if (same) return same.id;
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  list.push({
    id, name: n, folder_type: m?.TAG_FOLDER_DEFAULT_TYPE ?? 'NONE', filter_state: 'UNDEFINED',
    sort_order: Math.max(0, ...list.map((t) => Number(t.sort_order) || 0)) + 1,
    is_hidden_on_character_card: false, color: '', color2: '', create_date: Date.now(),
  });
  ctx().saveSettingsDebounced?.();
  return id;
}

/** Set favourite on several characters at once. */
export async function setFavorite(items: CharItem[], fav: boolean): Promise<void> {
  for (const it of items) {
    const ch = charOf(it);
    if (ch && isFav(ch) !== fav) await toggleFavorite(it);
  }
}

/**
 * 删卡时可以一起删的世界书：这些卡绑的世界书里，没全局开着、别的卡和 user 人设也没在用的（别的卡绑的、附加的都算）。
 * 单独绑在某段聊天上的查不到，删了也能从通知里撤销。
 */
function ownWorlds(chars: Any[]): string[] {
  const gone = new Set(chars.map((x) => charaFileName(x.avatar)));
  const used = new Set<string>(loaded.worldInfo?.selected_world_info ?? []);
  for (const ch of ctx().characters ?? []) if (!gone.has(charaFileName(ch.avatar)) && ch.data?.extensions?.world) used.add(ch.data.extensions.world);
  for (const e of loaded.worldInfo?.world_info?.charLore ?? []) if (!gone.has(e.name)) for (const b of e.extraBooks ?? []) used.add(b);
  // user 人设上绑的世界书
  const pu = ctx().powerUserSettings ?? {};
  for (const d of [pu, ...Object.values(pu.persona_descriptions ?? {})] as Any[]) if (d?.persona_description_lorebook || d?.lorebook) used.add(d.persona_description_lorebook || d.lorebook);
  const have = new Set(worldNames());
  return [...new Set(chars.map((x) => String(x.data?.extensions?.world ?? '')))].filter((w) => w && have.has(w) && !used.has(w));
}

/**
 * Delete characters after one confirm. Uses ST's own deleteCharacter (it also cleans up ST's
 * per-character settings); chats are kept unless the box is ticked.
 */
export async function deleteCharacters(items: CharItem[]): Promise<boolean> {
  const c = ctx();
  const chars = items.map(charOf).filter(Boolean) as Any[];
  if (!chars.length || !c.Popup || !c.POPUP_TYPE) return false;
  // 同名的卡（比如复制出来的）后面带上文件名，免得删错
  const all: Any[] = c.characters ?? [];
  const label = (x: Any) => (all.filter((y) => y.name === x.name).length > 1 ? `「${x.name}」(${x.avatar})` : `「${x.name}」`);
  const names = chars.slice(0, 5).map(label).join('、') + (chars.length > 5 ? ` 等 ${chars.length} 张` : '');
  const them = chars.length > 1 ? '它们' : '它';
  const worlds = ownWorlds(chars);
  const worldLabel = `同时删除${them}的世界书${worlds.slice(0, 3).map((w) => `「${w}」`).join('')}${worlds.length > 3 ? ` 等 ${worlds.length} 本` : ''}`;
  const popup = new c.Popup(
    `<h3>删除 ${escHtml(names)}？</h3><p>角色卡文件会被删掉，不能撤销。想留一份的话，先「导出」。</p>`,
    c.POPUP_TYPE.CONFIRM, '',
    { okButton: '删除', cancelButton: '取消', customInputs: [
      { id: 'rbt_del_chats', label: `同时删除${them}的聊天记录`, defaultState: false },
      ...(worlds.length ? [{ id: 'rbt_del_worlds', label: worldLabel, defaultState: false }] : []),
    ] },
  );
  // 两个勾选项左边对齐（酒馆默认每行各自居中，长短不一时勾选框对不齐）
  popup.dlg?.classList.add('rbt-del-popup');
  if (!(await popup.show())) return false;
  const deleteChats = !!popup.inputResults?.get('rbt_del_chats');
  const deleteWorlds = !!popup.inputResults?.get('rbt_del_worlds');
  const script = await stModule('/script.js');
  if (typeof script?.deleteCharacter !== 'function') { toast('error', '没找到酒馆的删除功能，没有删除'); return false; }
  // 酒馆自己会提示「角色已删除」，这里不再重复
  const ok = await script.deleteCharacter(chars.map((x) => x.avatar), { deleteChats });
  // 世界书先备份再删，删完的通知里可以撤销
  if (ok && deleteWorlds) await trash('world', worlds);
  charsTick.value++;
  return !!ok;
}

export function installCharactersWatch(): void {
  const c = ctx();
  const bump = () => { charsTick.value++; };
  for (const ev of [c.eventTypes.CHARACTER_PAGE_LOADED, c.eventTypes.CHARACTER_EDITED, c.eventTypes.CHARACTER_DELETED,
    c.eventTypes.CHARACTER_RENAMED, c.eventTypes.CHAT_CHANGED, c.eventTypes.GROUP_UPDATED, c.eventTypes.APP_READY]) {
    if (ev) c.eventSource.on(ev, bump);
  }
}
