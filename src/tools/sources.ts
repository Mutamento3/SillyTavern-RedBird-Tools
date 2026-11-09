/**
 * 预设 / 世界书 / 插件 / 美化的作者和链接（教程、发布帖、主页…），方便回头去看。
 * 插件自己的 manifest.json 里有 author 和 homePage，会自动带出来；你手填的作者会盖过它，链接是叠加的。
 * 预设里没有可靠的作者信息（文字里的网址多是图片和字体），只能手填。
 */
import { signal } from '@preact/signals';
import type { CardLink, SourceRecord } from '../core/cards';
import { loaded, saveSettings, settings } from '../st/st';
import { markDeleted } from '../st/store';

export type SourceKind = 'preset' | 'plugin' | 'world' | 'theme';

/** Bumped after an edit so every view showing the same source re-reads it. */
export const sourcesTick = signal(0);

const SECTION = { preset: 'presetInfo', world: 'worldSources', plugin: 'pluginInfo', theme: 'themeInfo' } as const;

function store(kind: SourceKind): Record<string, SourceRecord> {
  return settings()[SECTION[kind]];
}

/** What the plugin says about itself. `id` is the folder name under third-party/. */
export function pluginManifest(id: string): { author: string; homePage: string } {
  try {
    const m = loaded.extensions?.getExtensionManifest?.(`third-party/${id}`) ?? {};
    return { author: String(m.author ?? '').trim(), homePage: /^https?:\/\//i.test(String(m.homePage ?? '')) ? String(m.homePage) : '' };
  } catch {
    return { author: '', homePage: '' };
  }
}

export interface SourceView {
  /** Shown author: the hand-filled one, else the plugin's own. */
  author: string;
  /** The plugin's own author, used as placeholder when editing. */
  autoAuthor: string;
  /** From the plugin itself (not removable). */
  autoLinks: CardLink[];
  /** Hand-added. */
  links: CardLink[];
  series: string;
  /** Hand-filled version, else one read from the name (e.g. v1.1.7). */
  version: string;
  versionIsAuto: boolean;
  notes: string;
}

export function sourceFor(kind: SourceKind, key: string): SourceView {
  void sourcesTick.value;
  const rec = store(kind)[key];
  const auto = kind === 'plugin' ? pluginManifest(key) : { author: '', homePage: '' };
  const links = rec?.links ?? [];
  const autoLinks = auto.homePage && !links.some((l) => l.url === auto.homePage) ? [{ label: '主页', url: auto.homePage }] : [];
  const autoVer = kind === 'plugin' ? '' : versionFromName(key);
  return {
    author: rec?.author?.trim() || auto.author, autoAuthor: auto.author, autoLinks, links,
    series: rec?.series?.trim() ?? '', version: rec?.version?.trim() || autoVer, versionIsAuto: !rec?.version?.trim() && !!autoVer, notes: rec?.notes ?? '',
  };
}

export function hasSource(v: SourceView): boolean {
  return !!(v.author || v.autoLinks.length || v.links.length);
}

export function updateSource(kind: SourceKind, key: string, patch: Partial<Omit<SourceRecord, 'updatedAt'>>): void {
  const all = store(kind);
  const cur = all[key] ?? { author: '', links: [], updatedAt: '' };
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  if (!next.author.trim() && !next.links.length && !next.series?.trim() && !next.version?.trim() && !next.notes?.trim() && !next.model) { delete all[key]; markDeleted(SECTION[kind], key); }
  else all[key] = next;
  saveSettings();
  sourcesTick.value++;
}

// ------------------------------------------------------------- series ---

/** A version number written in the name: v1.1.7, 8.0, 8_0 → "1.1.7", "8.0". */
export function versionFromName(name: string): string {
  const m = name.match(/(?:^|[^a-z0-9])v?(\d+(?:[._]\d+)+)(?!\d)/i) ?? name.match(/(?:^|[^a-z0-9])v(?:er)?(\d+)(?!\d)/i);
  return m ? m[1].replace(/_/g, '.') : '';
}

/** Compare version strings naturally (1.10 > 1.9). Empty sorts last. */
export function compareVersions(a: string, b: string): number {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  const pa = a.split(/[^0-9]+/).filter(Boolean).map(Number);
  const pb = b.split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d) return d;
  }
  return b.localeCompare(a);
}

/** First meaningful word of a name: "【Puppy】小狗之神-8.0" → "Puppy". */
function stem(name: string): string {
  const parts = name.split(/[\s_\-—·.,，。、|/\\()（）[\]【】《》「」『』<>]+/).filter(Boolean);
  const word = parts.find((p) => !/^v?\d+$/i.test(p) && p.length >= 2);
  return word ?? '';
}

/** Words that show up in many names without meaning they belong together. */
const GENERIC = ['世界书', '预设', '设定集', '角色卡', '正则', '模板', '女性向', '男性向', '不完全版', '精简版', '重制版'];
/** Plain words that start many unrelated names (e.g. ST's own themes Dark Lite / Dark V 1.0). */
const GENERIC_STEMS = ['dark', 'light', 'default', 'new', 'my', 'test'];

/**
 * Names that start with the same word and have no series yet — probably versions of one thing.
 * Returns suggested series name → member names (only groups of 2+).
 */
export function suggestSeries(kind: SourceKind, names: string[]): { series: string; names: string[] }[] {
  const by = new Map<string, { label: string; names: string[] }>();
  for (const n of names) {
    if (sourceFor(kind, n).series) continue;
    const w = stem(n);
    if (!w || w.length < 3 || GENERIC_STEMS.includes(w.toLowerCase())) continue;
    const k = w.toLowerCase();
    const e = by.get(k) ?? { label: w, names: [] };
    e.names.push(n);
    by.set(k, e);
  }
  // Also: a Chinese word of 3+ characters that several names share (「小狗之神」 in 【Puppy】小狗之神-8.0…).
  const free = names.filter((n) => !sourceFor(kind, n).series);
  const runs = new Map<string, Set<string>>();
  for (const n of free) {
    for (const run of n.match(/[㐀-鿿]{3,}/g) ?? []) {
      for (let len = run.length; len >= 3; len--) {
        for (let i = 0; i + len <= run.length; i++) {
          const w = run.slice(i, i + len);
          runs.set(w, (runs.get(w) ?? new Set()).add(n));
        }
      }
    }
  }
  const cjk = [...runs.entries()]
    .filter(([w, ns]) => ns.size > 1 && !GENERIC.some((g) => w.includes(g) || g.includes(w)))
    .sort(([a, x], [b, y]) => y.size - x.size || b.length - a.length);
  const seen = new Set<string>();
  const cjkGroups: { series: string; names: string[] }[] = [];
  for (const [w, ns] of cjk) {
    const key = [...ns].sort().join('\n');
    if (seen.has(key)) continue; // a shorter word covering the same names adds nothing
    seen.add(key);
    cjkGroups.push({ series: w, names: [...ns] });
  }
  const out = [...by.values()].filter((e) => e.names.length > 1).map((e) => ({ series: e.label, names: e.names }));
  for (const g of cjkGroups) if (!out.some((o) => o.names.length === g.names.length && o.names.every((n) => g.names.includes(n)) && o.series === g.series)) out.push(g);
  // Biggest groups first, and at most a few so it stays a hint, not a wall.
  return out.sort((a, b) => b.names.length - a.names.length).slice(0, 3);
}

export function setSeries(kind: SourceKind, names: string[], series: string): void {
  for (const n of names) {
    const all = store(kind);
    const cur = all[n] ?? { author: '', links: [], updatedAt: '' };
    all[n] = { ...cur, series, updatedAt: new Date().toISOString() };
  }
  saveSettings();
  sourcesTick.value++;
}

/** 把一个系列改名（新名字为空 = 解散这个系列，里面的都回到「其他」）。 */
export function renameSeries(kind: SourceKind, from: string, to: string): void {
  const names = Object.entries(store(kind)).filter(([, r]) => (r.series ?? '').trim() === from).map(([n]) => n);
  if (names.length) setSeries(kind, names, to.trim());
}

/** Every series name in use for this kind, for the input suggestions. */
export function allSeries(kind: SourceKind): string[] {
  return [...new Set(Object.values(store(kind)).map((r) => r.series?.trim()).filter((x): x is string => !!x))].sort();
}
