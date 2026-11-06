/**
 * 角色档案 — pure helpers (no SillyTavern access, unit-tested).
 */

// ------------------------------------------------------------ records ---

export interface CardLink { label: string; url: string }
export interface RequiredExt { name: string; url?: string }

/** What the user fills in by hand for one card. Keyed by the card's avatar file name. */
export interface CardRecord {
  cardName: string;
  links: CardLink[];
  notes: string;
  extensions: RequiredExt[];
  updatedAt: string;
}

/** A Chat Completion API (ST's chat_completion_source) and a model id on it. */
export interface ModelChoice { source: string; model: string }

/** Author and links for a preset or a plugin (tutorials, release posts…). */
export interface SourceRecord {
  /** Empty = use what the plugin itself says (manifest). */
  author: string;
  links: CardLink[];
  /** Presets / worldbooks: which series this belongs to, so versions line up. */
  series?: string;
  version?: string;
  /** What changed in this version, how to use it… */
  notes?: string;
  /** Presets: the model to use with it. */
  model?: ModelChoice;
  updatedAt: string;
}

export type RegexOwnerKind = 'extension' | 'card' | 'preset';
export interface RegexOwner {
  kind: RegexOwnerKind;
  /** extension folder name / card avatar / preset name */
  key: string;
  /** what to show, e.g. the card name */
  label: string;
  /** when it was set (for merging copies) */
  at?: string;
}

export function emptyRecord(cardName: string): CardRecord {
  return { cardName, links: [], notes: '', extensions: [], updatedAt: new Date().toISOString() };
}

export function isRecordEmpty(r: CardRecord | undefined): boolean {
  return !r || (!r.links.length && !r.notes.trim() && !r.extensions.length);
}

// ------------------------------------------------------------ contacts ---

export interface Contact { kind: 'discord' | 'qq' | 'qqgroup' | 'url'; value: string }

const SEP = String.raw`\s*[:：@＠]?\s*`;

/**
 * Find contact handles in free text such as the card's `creator` field
 * ("作者：陈小耶Yeah\nDisocrd：chen_yeah", "Signal（qq：206949571 群：893821637）").
 */
export function detectContacts(text: string): Contact[] {
  if (!text) return [];
  const out: Contact[] = [];
  const push = (kind: Contact['kind'], value: string) => {
    const v = value.trim().replace(/[)）\]】,，。;；]+$/, '');
    if (v && !out.some((c) => c.kind === kind && c.value === v)) out.push({ kind, value: v });
  };
  for (const url of extractUrls(text)) push('url', url);
  const noUrls = text.replace(URL_RE, ' ');
  // Discord, including common typos and the "DC" abbreviation.
  for (const m of noUrls.matchAll(new RegExp(String.raw`(?:dis[a-z]{0,3}rd|discord旅程|\bdc)${SEP}([A-Za-z0-9_.]{2,32})`, 'gi'))) push('discord', m[1]);
  for (const m of noUrls.matchAll(new RegExp(String.raw`(?:qq群|q群|群号?)${SEP}(\d{5,12})`, 'gi'))) push('qqgroup', m[1]);
  for (const m of noUrls.matchAll(new RegExp(String.raw`qq(?!群)${SEP}(\d{5,12})`, 'gi'))) push('qq', m[1]);
  return out;
}

// --------------------------------------------------------------- links ---

const URL_RE = /https?:\/\/[^\s<>"'`，。、！？）)】\]]+/gi;

export function extractUrls(text: string): string[] {
  return [...new Set(text.match(URL_RE) ?? [])];
}

export type TextPart = { text: string } | { url: string };

/** Split text into plain parts and URL parts so the UI can render clickable links without innerHTML. */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ url: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** "discord.com/channels/…" → "https://discord.com/channels/…"; anything that is not a link → "". */
export function normalizeUrl(s: string): string {
  const t = s.trim();
  if (!t) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : (/^[^\s/]+\.[^\s/]+/.test(t) ? `https://${t}` : t);
  return isHttpUrl(withScheme) ? withScheme : '';
}

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Mirror of ST's getCharacterSource(): a source link some card sites embed in the card. */
export function autoSourceUrl(ext: Record<string, unknown> | undefined): string {
  const e = (ext ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (e.chub?.full_path) return `https://chub.ai/characters/${e.chub.full_path}`;
  if (e.pygmalion_id) return `https://pygmalion.chat/${e.pygmalion_id}`;
  if (e.github_repo) return `https://github.com/${e.github_repo}`;
  if (typeof e.source_url === 'string' && e.source_url) return e.source_url;
  const risu = e.risuai?.source;
  if (Array.isArray(risu) && typeof risu[0] === 'string' && risu[0].startsWith('risurealm:')) {
    return `https://realm.risuai.net/character/${risu[0].split(':')[1]}`;
  }
  if (e.perchance_data?.slug) return `https://perchance.org/ai-character-chat?data=${e.perchance_data.slug}`;
  return '';
}

// ----------------------------------------------------------- lorebooks ---

export interface BookEntryLite { content: string; comment: string; keys: string[] }
export interface BookDiff {
  card: number;
  world: number;
  same: number;
  onlyCard: BookEntryLite[];
  onlyWorld: BookEntryLite[];
}

const norm = (s: string) => (s ?? '').replace(/\r\n/g, '\n').trim();

/** Card `character_book.entries` → lite entries. */
export function cardBookEntries(book: { entries?: any[] } | undefined): BookEntryLite[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (book?.entries ?? []).map((e) => ({ content: norm(e.content), comment: e.comment ?? e.name ?? '', keys: e.keys ?? [] }));
}

/** World file `entries` (object keyed by uid) → lite entries. */
export function worldBookEntries(world: { entries?: Record<string, any> } | undefined): BookEntryLite[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  return Object.values(world?.entries ?? {}).map((e) => ({ content: norm(e.content), comment: e.comment ?? '', keys: e.key ?? [] }));
}

/** Compare by entry content (multiset). Order, keys and settings are ignored on purpose. */
export function diffBooks(card: BookEntryLite[], world: BookEntryLite[]): BookDiff {
  const pool = new Map<string, number>();
  for (const w of world) pool.set(w.content, (pool.get(w.content) ?? 0) + 1);
  const onlyCard: BookEntryLite[] = [];
  let same = 0;
  for (const c of card) {
    const n = pool.get(c.content) ?? 0;
    if (n > 0) { same++; pool.set(c.content, n - 1); } else onlyCard.push(c);
  }
  const onlyWorld: BookEntryLite[] = [];
  for (const w of world) {
    const n = pool.get(w.content) ?? 0;
    if (n > 0) { onlyWorld.push(w); pool.set(w.content, n - 1); }
  }
  return { card: card.length, world: world.length, same, onlyCard, onlyWorld };
}

export function booksMatch(d: BookDiff): boolean {
  return d.onlyCard.length === 0 && d.onlyWorld.length === 0;
}

/** ST's /api/files/upload only accepts [A-Za-z0-9_.-]. */
export function backupFileName(world: string, at: Date): string {
  const ascii = world.normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  let h = 0;
  for (const ch of world) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  const stamp = at.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  return `rbt-world-backup-${stamp}-${ascii ? `${ascii}-` : ''}${h.toString(36)}.json`;
}

// --------------------------------------------------------- regex owner ---

function acronym(name: string): string {
  return (name.match(/[A-Z]/g) ?? []).join('');
}

/**
 * Guess which extension a global regex script came from, by its name.
 * "st-chatu8-隐藏imgthink" → "st-chatu8"; "VN注入折叠" → "VisualNoval" (capital-letter acronym).
 */
export function guessRegexExtension(scriptName: string, extensions: string[]): string | null {
  const name = scriptName.trim();
  const lower = name.toLowerCase();
  let best: string | null = null;
  for (const ext of extensions) {
    const e = ext.toLowerCase();
    if (e.length >= 3 && lower.startsWith(e) && (!best || e.length > best.length)) best = ext;
  }
  if (best) return best;
  const head = name.match(/^[A-Za-z][A-Za-z0-9]*/)?.[0];
  if (!head) return null;
  const hits = extensions.filter((ext) => {
    const a = acronym(ext);
    return (a.length >= 2 && a === head.toUpperCase() && head === head.toUpperCase()) || (head.length >= 3 && ext.toLowerCase().startsWith(head.toLowerCase()));
  });
  return hits.length === 1 ? hits[0] : null;
}

// ------------------------------------------------------------- relink ---

export interface OrphanRecord { avatar: string; cardName: string; candidates: string[] }

/**
 * Records whose avatar no longer exists (card re-imported, new computer): find characters with the
 * same name that do not have a record yet.
 */
export function findOrphans(records: Record<string, { cardName: string }>, chars: { avatar: string; name: string }[]): OrphanRecord[] {
  const avatars = new Set(chars.map((c) => c.avatar));
  const out: OrphanRecord[] = [];
  for (const [avatar, r] of Object.entries(records)) {
    if (avatars.has(avatar)) continue;
    const candidates = chars.filter((c) => c.name === r.cardName && !(c.avatar in records)).map((c) => c.avatar);
    out.push({ avatar, cardName: r.cardName, candidates });
  }
  return out;
}

// ------------------------------------------------------- export/import ---

export const ARCHIVE_FORMAT = 'redbird-tools-card-archive';

export interface ArchiveFile {
  format: typeof ARCHIVE_FORMAT;
  version: 1;
  exportedAt: string;
  cards: Record<string, CardRecord>;
  profiles: Record<string, unknown>;
  regexOwners: Record<string, RegexOwner>;
  presetInfo?: Record<string, SourceRecord>;
  pluginInfo?: Record<string, SourceRecord>;
  worldSources?: Record<string, SourceRecord>;
  themeInfo?: Record<string, SourceRecord>;
}

export function parseArchive(text: string): ArchiveFile {
  const j = JSON.parse(text);
  if (j?.format !== ARCHIVE_FORMAT) throw new Error('这不是 RedBird 工具箱导出的角色档案文件');
  return { ...j, cards: j.cards ?? {}, profiles: j.profiles ?? {}, regexOwners: j.regexOwners ?? {}, presetInfo: j.presetInfo ?? {}, pluginInfo: j.pluginInfo ?? {}, worldSources: j.worldSources ?? {}, themeInfo: j.themeInfo ?? {} };
}

/** merge: keep whichever record is newer; overwrite: incoming replaces everything. */
export function mergeRecords<T>(cur: Record<string, T>, incoming: Record<string, T>, mode: 'merge' | 'overwrite', stamp: (v: T) => string = () => ''): Record<string, T> {
  if (mode === 'overwrite') return { ...incoming };
  const out = { ...cur };
  for (const [k, v] of Object.entries(incoming)) {
    if (!(k in out) || stamp(v) > stamp(out[k])) out[k] = v;
  }
  return out;
}
