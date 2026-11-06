/**
 * 角色档案：everything that belongs to one card — what the card itself carries (lorebook, scoped
 * regex, Tavern Helper scripts, author fields) plus what the user fills in by hand (source links,
 * author notes, required extensions, recommended preset).
 *
 * Hand-filled data lives in extension_settings.redbird_tools (cards / regexOwners); the recommended
 * preset is the `preset` of the 换卡体检 profile, so switching cards can restore it.
 */
import { signal } from '@preact/signals';
import {
  autoSourceUrl,
  backupFileName,
  cardBookEntries,
  detectContacts,
  diffBooks,
  emptyRecord,
  findOrphans,
  guessRegexExtension,
  isRecordEmpty,
  mergeRecords,
  parseArchive,
  ARCHIVE_FORMAT,
  worldBookEntries,
  type ArchiveFile,
  type BookDiff,
  type CardRecord,
  type Contact,
  type OrphanRecord,
  type RegexOwner,
  type RequiredExt,
} from '../../core/cards';
import { charaFileName, ctx, currentCharacter, loaded, runSlash, saveSettings, settings, slashQuote, thCharacterScriptsEnabled, toast, type Any, type EnvProfile } from '../../st/st';
import { refreshEnv, thScripts } from '../env/env';

/** Avatar of the card shown in 档案; null = follow the current card. */
export const archiveTarget = signal<string | null>(null);
/** Bumped after every change so views re-read settings. */
export const archiveVersion = signal(0);
const bump = () => { archiveVersion.value++; };

// ---------------------------------------------------------- characters ---

export function allCharacters(): Any[] {
  return ((ctx().characters ?? []) as Any[]).filter((c) => c?.avatar);
}

export function findChar(avatar: string): { char: Any; chid: number } | null {
  const list: Any[] = ctx().characters ?? [];
  const chid = list.findIndex((c) => c?.avatar === avatar);
  return chid >= 0 ? { char: list[chid], chid } : null;
}

export async function ensureFullCharacter(avatar: string): Promise<void> {
  const f = findChar(avatar);
  if (f?.char?.shallow && typeof ctx().unshallowCharacter === 'function') {
    await ctx().unshallowCharacter(f.chid);
    bump();
  }
}

export function thumbnailUrl(avatar: string): string {
  return `/thumbnail?type=avatar&file=${encodeURIComponent(avatar)}`;
}

// ---------------------------------------------------------- extensions ---

export interface ExtInfo { id: string; name: string; enabled: boolean }

export function installedExtensions(): ExtInfo[] {
  const names: string[] = loaded.extensions?.extensionNames ?? [];
  const disabled: string[] = ctx().extensionSettings?.disabledExtensions ?? [];
  return names.filter((n) => n.startsWith('third-party/')).map((n) => {
    const id = n.replace('third-party/', '');
    let name = id;
    try { name = loaded.extensions?.getExtensionManifest?.(n)?.display_name || id; } catch { /* ignore */ }
    return { id, name, enabled: !disabled.includes(n) };
  });
}

const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '');

/**
 * ST loads one copy per folder name (the per-user copy wins over a global one with the same name),
 * so matching by folder name is enough to know whether the extension that actually runs is on.
 */
export function matchExtension(req: RequiredExt, installed: ExtInfo[]): ExtInfo | undefined {
  const k = loose(req.name);
  if (!k) return undefined;
  return installed.find((e) => loose(e.id) === k || loose(e.name) === k)
    ?? installed.find((e) => loose(e.id).includes(k) || loose(e.name).includes(k) || (loose(e.id).length >= 4 && k.includes(loose(e.id))));
}

export type ExtStatus = 'enabled' | 'disabled' | 'missing';
export function extStatus(req: RequiredExt, installed = installedExtensions()): { status: ExtStatus; match?: ExtInfo } {
  const match = matchExtension(req, installed);
  return { status: !match ? 'missing' : match.enabled ? 'enabled' : 'disabled', match };
}

const TAVERN_HELPER: RequiredExt = { name: 'JS-Slash-Runner', url: 'https://github.com/N0VI028/JS-Slash-Runner' };

// ---------------------------------------------------------- card info ---

export type WorldState = 'ok' | 'missing' | 'unbound' | 'none';

export interface CardInfo {
  avatar: string;
  name: string;
  isCurrent: boolean;
  shallow: boolean;
  creator: string;
  version: string;
  creatorNotes: string;
  tags: string[];
  contacts: Contact[];
  autoSource: string;
  world: { name: string; state: WorldState; embedded: number | null; extra: string[]; importName: string };
  regex: { total: number; enabled: number; allowed: boolean };
  scripts: { total: number; enabled: boolean; names: string[] };
  /** Requirements derived from the card itself (e.g. Tavern Helper scripts → 酒馆助手). */
  autoExts: { req: RequiredExt; reason: string }[];
  record?: CardRecord;
  preset?: { api: string; name: string };
}

export function worldNames(): string[] {
  return loaded.worldInfo?.world_names ?? [];
}

export function cardInfo(char: Any): CardInfo {
  const d = char.data ?? {};
  const ext = d.extensions ?? {};
  const es = ctx().extensionSettings ?? {};
  const names = worldNames();
  const bound: string = ext.world ?? '';
  const book = d.character_book;
  const state: WorldState = bound ? (names.includes(bound) ? 'ok' : 'missing') : book?.entries?.length ? 'unbound' : 'none';
  const extra: string[] = loaded.worldInfo?.world_info?.charLore?.find((e: Any) => e.name === charaFileName(char.avatar))?.extraBooks ?? [];
  const cardRegex: Any[] = ext.regex_scripts ?? [];
  const th = thScripts(ext.tavern_helper ?? ext.TavernHelper_scripts);
  const autoExts: CardInfo['autoExts'] = [];
  if (th.length) autoExts.push({ req: TAVERN_HELPER, reason: `卡里有 ${th.length} 个酒馆助手脚本` });
  const cur = currentCharacter();
  return {
    avatar: char.avatar,
    name: char.name ?? d.name ?? '',
    isCurrent: !!cur && cur.avatar === char.avatar,
    shallow: !!char.shallow,
    creator: d.creator ?? char.creator ?? '',
    version: d.character_version ?? '',
    creatorNotes: d.creator_notes ?? char.creatorcomment ?? '',
    tags: d.tags ?? char.tags ?? [],
    contacts: detectContacts(`${d.creator ?? ''}\n${d.creator_notes ?? ''}`),
    autoSource: autoSourceUrl(ext),
    world: {
      name: bound,
      state,
      embedded: book?.entries ? book.entries.length : null,
      extra,
      importName: bound || book?.name || `${char.name}'s Lorebook`,
    },
    regex: {
      total: cardRegex.length,
      enabled: cardRegex.filter((r) => !r.disabled).length,
      allowed: (es.character_allowed_regex ?? []).includes(char.avatar),
    },
    scripts: {
      total: th.length,
      enabled: thCharacterScriptsEnabled(es, char),
      names: th.map((s) => s.name),
    },
    autoExts,
    record: settings().cards[char.avatar],
    preset: settings().profiles[char.avatar]?.preset,
  };
}

/** Everything this card needs, hand-filled first, then derived ones not already listed. */
export function requiredExtensions(info: CardInfo): { req: RequiredExt; reason?: string; auto: boolean }[] {
  const manual = (info.record?.extensions ?? []).map((req) => ({ req, auto: false }));
  const installed = installedExtensions();
  const manualIds = new Set(manual.map((m) => matchExtension(m.req, installed)?.id ?? loose(m.req.name)));
  const auto = info.autoExts
    .filter((a) => !manualIds.has(matchExtension(a.req, installed)?.id ?? loose(a.req.name)))
    .map((a) => ({ ...a, auto: true }));
  return [...manual, ...auto];
}

// ------------------------------------------------------------ records ---

export function updateRecord(avatar: string, cardName: string, patch: Partial<CardRecord>): void {
  const s = settings();
  const next: CardRecord = { ...(s.cards[avatar] ?? emptyRecord(cardName)), ...patch, cardName, updatedAt: new Date().toISOString() };
  if (isRecordEmpty(next)) delete s.cards[avatar];
  else s.cards[avatar] = next;
  saveSettings();
  bump();
}

// --------------------------------------------------- recommended preset ---

export function presetApi(): string {
  try {
    return loaded.regexEngine?.getCurrentPresetAPI?.() ?? ctx().mainApi ?? '';
  } catch {
    return ctx().mainApi ?? '';
  }
}

export function currentPresetName(): string {
  try {
    return ctx().getPresetManager()?.getSelectedPresetName?.() ?? '';
  } catch {
    return '';
  }
}

export function presetNames(): string[] {
  try {
    return ctx().getPresetManager()?.getAllPresets?.() ?? [];
  } catch {
    return [];
  }
}

export function presetRegexCount(name: string): number {
  try {
    const p = ctx().getPresetManager()?.getCompletionPresetByName?.(name);
    return (p?.extensions?.regex_scripts ?? []).length;
  } catch {
    return 0;
  }
}

/** Shared with the remembered card environment: the recommended preset is the `preset` part of the remembered environment. */
export function setRecommendedPreset(avatar: string, cardName: string, name: string | null): void {
  const s = settings();
  const p: EnvProfile = s.profiles[avatar] ?? { savedAt: new Date().toISOString(), cardName };
  if (name) p.preset = { api: presetApi(), name };
  else delete p.preset;
  p.cardName = cardName;
  if (!p.preset && !p.globalWorlds && !p.globalRegexEnabled) delete s.profiles[avatar];
  else s.profiles[avatar] = p;
  saveSettings();
  refreshEnv();
  bump();
}

export async function switchPreset(name: string): Promise<void> {
  await runSlash(`/preset ${slashQuote(name)}`);
  refreshEnv();
  bump();
}

// ------------------------------------------------------------ lorebooks ---

export async function checkWorld(info: CardInfo): Promise<BookDiff | null> {
  if (info.world.state !== 'ok' || info.world.embedded === null) return null;
  const f = findChar(info.avatar);
  const data = await loaded.worldInfo?.loadWorldInfo?.(info.world.name);
  if (!f || !data) return null;
  return diffBooks(cardBookEntries(f.char.data?.character_book), worldBookEntries(data));
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Save the current world file to data/<user>/user/files before it gets overwritten. */
async function backupWorld(name: string): Promise<string> {
  const data = await loaded.worldInfo?.loadWorldInfo?.(name);
  if (!data) throw new Error(`读不到世界书「${name}」`);
  const file = backupFileName(name, new Date());
  const res = await fetch('/api/files/upload', {
    method: 'POST',
    headers: ctx().getRequestHeaders(),
    body: JSON.stringify({ name: file, data: toBase64(JSON.stringify({ ...data, rbtBackupOf: name }, null, 2)) }),
  });
  if (!res.ok) throw new Error(`备份失败：${res.status} ${await res.text()}`);
  settings().worldBackups.push({ file, world: name, at: new Date().toISOString() });
  saveSettings();
  return file;
}

export type ImportResult = 'imported' | 'overwritten' | 'exists' | 'nobook' | 'failed';

/**
 * Import the card's embedded lorebook (same as ST's "导入卡内世界书"), binding it to the card if needed.
 * Never overwrites an existing world file unless `overwrite` is set, and then backs it up first.
 */
export async function importCardWorld(avatar: string, { overwrite = false, quiet = false } = {}): Promise<ImportResult> {
  const f = findChar(avatar);
  const wi = loaded.worldInfo;
  const book = f?.char?.data?.character_book;
  if (!f || !wi || !book?.entries?.length) return 'nobook';
  const info = cardInfo(f.char);
  const name = info.world.importName;
  const exists = worldNames().includes(name);
  if (exists && !overwrite) return 'exists';
  try {
    let backup = '';
    if (exists) backup = await backupWorld(name);
    await wi.saveWorldInfo(name, wi.convertCharacterBook(structuredClone(book)), true);
    await wi.updateWorldInfoList();
    if (f.char.data?.extensions?.world !== name) await ctx().writeExtensionField(f.chid, 'world', name);
    // ST asks once per card whether to import; we just did it, so don't ask again.
    try { ctx().accountStorage?.setItem(`AlertWI_${avatar}`, 'true'); } catch { /* ignore */ }
    if (!quiet) {
      toast('success', exists
        ? `已用卡里的版本覆盖世界书「${name}」。旧文件备份在 user/files/${backup}`
        : `已从卡里导入世界书「${name}」并绑定到「${f.char.name}」`, '角色档案');
    }
    refreshEnv();
    bump();
    return exists ? 'overwritten' : 'imported';
  } catch (e) {
    console.error('[RedBird] world import failed', e);
    toast('error', `导入世界书「${name}」失败：${(e as Error).message}`, '角色档案');
    return 'failed';
  }
}

/** Cards whose embedded lorebook could be imported without overwriting anything. */
export function cardsMissingWorld(): CardInfo[] {
  const names = worldNames();
  return allCharacters().map(cardInfo).filter((i) => i.world.embedded && (i.world.state === 'missing' || (i.world.state === 'unbound' && !names.includes(i.world.importName))));
}

export async function importAllMissingWorlds(): Promise<number> {
  let n = 0;
  for (const i of cardsMissingWorld()) if ((await importCardWorld(i.avatar, { quiet: true })) === 'imported') n++;
  toast('success', `已从卡里导入 ${n} 本世界书`, '角色档案');
  return n;
}

// ----------------------------------------------------------- regex owners ---

export function globalRegexScripts(): Any[] {
  return ctx().extensionSettings?.regex ?? [];
}

export function setRegexOwner(id: string, owner: RegexOwner | null): void {
  const s = settings();
  if (owner) s.regexOwners[id] = owner;
  else delete s.regexOwners[id];
  saveSettings();
  refreshEnv();
  bump();
}

export function guessRegexOwner(script: Any): RegexOwner | null {
  const exts = installedExtensions();
  const id = guessRegexExtension(script.scriptName ?? '', exts.map((e) => e.id));
  if (!id) return null;
  return { kind: 'extension', key: id, label: exts.find((e) => e.id === id)?.name ?? id };
}

// --------------------------------------------------------------- overview ---

export interface Overview {
  cards: CardInfo[];
  byPreset: Map<string, CardInfo[]>;
  byWorld: Map<string, CardInfo[]>;
  unusedWorlds: { name: string; global: boolean }[];
  orphans: OrphanRecord[];
}

export function buildOverview(): Overview {
  const chars = allCharacters();
  const cards = chars.map(cardInfo).sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  const byPreset = new Map<string, CardInfo[]>();
  const byWorld = new Map<string, CardInfo[]>();
  for (const c of cards) {
    if (c.preset) byPreset.set(c.preset.name, [...(byPreset.get(c.preset.name) ?? []), c]);
    for (const w of [c.world.name, ...c.world.extra].filter(Boolean)) byWorld.set(w, [...(byWorld.get(w) ?? []), c]);
  }
  const selected: string[] = loaded.worldInfo?.selected_world_info ?? [];
  const unusedWorlds = worldNames().filter((w) => !byWorld.has(w)).map((name) => ({ name, global: selected.includes(name) }));
  const s = settings();
  const recordKeys: Record<string, { cardName: string }> = {};
  for (const [k, v] of Object.entries(s.cards)) recordKeys[k] = v;
  for (const [k, v] of Object.entries(s.profiles)) recordKeys[k] ??= v;
  const orphans = findOrphans(recordKeys, chars.map((c) => ({ avatar: c.avatar, name: c.name })));
  return { cards, byPreset, byWorld, unusedWorlds, orphans };
}

/** Move a record (and profile, and card-owned regex tags) from an old avatar to a new one. */
export function relink(oldAvatar: string, newAvatar: string): void {
  const s = settings();
  const f = findChar(newAvatar);
  if (s.cards[oldAvatar]) { s.cards[newAvatar] = { ...s.cards[oldAvatar], cardName: f?.char?.name ?? s.cards[oldAvatar].cardName }; delete s.cards[oldAvatar]; }
  if (s.profiles[oldAvatar]) { s.profiles[newAvatar] = s.profiles[oldAvatar]; delete s.profiles[oldAvatar]; }
  for (const o of Object.values(s.regexOwners)) if (o.kind === 'card' && o.key === oldAvatar) o.key = newAvatar;
  saveSettings();
  refreshEnv();
  bump();
}

export function dropRecord(avatar: string): void {
  const s = settings();
  delete s.cards[avatar];
  delete s.profiles[avatar];
  saveSettings();
  refreshEnv();
  bump();
}

// ---------------------------------------------------------- export/import ---

export function exportArchive(): void {
  const s = settings();
  const file: ArchiveFile = {
    format: ARCHIVE_FORMAT, version: 1, exportedAt: new Date().toISOString(),
    cards: s.cards, profiles: s.profiles, regexOwners: s.regexOwners,
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `RedBird-角色档案-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importArchive(text: string, mode: 'merge' | 'overwrite'): Promise<void> {
  const inc = parseArchive(text);
  const s = settings();
  if (mode === 'overwrite') {
    const ok = await ctx().Popup?.show?.confirm?.('覆盖导入', '会用文件里的内容替换现在所有的角色档案、记住的环境和正则归属。确定吗？');
    if (!ok) return;
  }
  s.cards = mergeRecords(s.cards, inc.cards, mode, (v) => v.updatedAt ?? '');
  s.profiles = mergeRecords(s.profiles, inc.profiles as Record<string, EnvProfile>, mode, (v) => v.savedAt ?? '');
  s.regexOwners = mergeRecords(s.regexOwners, inc.regexOwners, mode);
  saveSettings();
  refreshEnv();
  bump();
  toast('success', `已导入 ${Object.keys(inc.cards).length} 张卡的档案（${mode === 'merge' ? '合并' : '覆盖'}）`, '角色档案');
}

// ---------------------------------------------------------------- watch ---

let lastAvatar: string | null = null;

export function installCardsWatch(openPanel: (tab: string) => void): void {
  const c = ctx();
  c.eventSource.on(c.eventTypes.CHAT_CHANGED, () => {
    archiveTarget.value = null;
    bump();
    setTimeout(async () => {
      const char = currentCharacter();
      if (!char?.avatar || char.avatar === lastAvatar) return;
      lastAvatar = char.avatar;
      const info = cardInfo(char);
      if (settings().autoImportWorld && info.world.embedded && (info.world.state === 'missing' || info.world.state === 'unbound')) {
        await importCardWorld(char.avatar);
      }
      if (settings().autoApplyEnv) return; // auto-apply reports the switch itself; reminders only when it is off
      const installed = installedExtensions();
      const bad = requiredExtensions(info).map((r) => ({ ...r, ...extStatus(r.req, installed) })).filter((r) => r.status !== 'enabled');
      if (bad.length) {
        const text = bad.map((b) => `${b.match?.name ?? b.req.name}${b.status === 'missing' ? '（没装）' : '（没启用）'}`).join('、');
        toast('warning', `「${info.name}」需要的插件：${text}。点这里查看。`, '角色档案', { onclick: () => openPanel('cards'), timeOut: 8000 });
      }
    }, 300);
  });
  for (const ev of [c.eventTypes.SETTINGS_UPDATED, c.eventTypes.WORLDINFO_SETTINGS_UPDATED, c.eventTypes.OAI_PRESET_CHANGED_AFTER, c.eventTypes.CHARACTER_EDITED]) {
    if (ev) c.eventSource.on(ev, bump);
  }
}
