/**
 * 工具箱数据的合并规则（纯函数，可单测）。
 *
 * 酒馆保存设置时是整份覆盖 settings.json：开着的旧页面会用它内存里的旧数据盖掉新数据。
 * 所以工具箱另外存一份自己的文件，每次写之前先读回来，按「每条记录谁新留谁」合并。
 * 删除也要记下来（墓碑：被删的时间），不然合并时会把删掉的东西又带回来。
 */

export const STORE_SECTIONS = ['cards', 'profiles', 'regexOwners', 'presetInfo', 'pluginInfo', 'worldSources', 'themeInfo'] as const;
export type StoreSection = (typeof STORE_SECTIONS)[number];

type Rec = Record<string, unknown>;
export type StoreData = Partial<Record<StoreSection, Record<string, Rec>>>;
export type Tombstones = Partial<Record<StoreSection, Record<string, string>>>;
export interface StoreSnapshot { data: StoreData; deleted: Tombstones }

/** When a record was last changed (ISO string; '' = unknown, which loses to anything dated). */
export function stampOf(section: StoreSection, rec: Rec | undefined): string {
  if (!rec) return '';
  const v = section === 'profiles' ? (rec.updatedAt ?? rec.savedAt) : section === 'regexOwners' ? rec.at : rec.updatedAt;
  return typeof v === 'string' ? v : '';
}

/**
 * Merge two snapshots. Per record the newer one wins (ties: `local`). A record is dropped when it
 * was deleted at or after its own last change.
 */
export function mergeStores(local: StoreSnapshot, remote: StoreSnapshot): StoreSnapshot {
  const data: StoreData = {};
  const deleted: Tombstones = {};
  for (const sec of STORE_SECTIONS) {
    const a = local.data[sec] ?? {};
    const b = remote.data[sec] ?? {};
    const ta = local.deleted[sec] ?? {};
    const tb = remote.deleted[sec] ?? {};
    const tomb: Record<string, string> = { ...tb };
    for (const [k, t] of Object.entries(ta)) if (!tomb[k] || t > tomb[k]) tomb[k] = t;
    const out: Record<string, Rec> = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const ra = a[k];
      const rb = b[k];
      const pick = !ra ? rb : !rb ? ra : stampOf(sec, rb) > stampOf(sec, ra) ? rb : ra;
      if (!pick) continue;
      if (tomb[k] && tomb[k] >= stampOf(sec, pick)) continue;
      out[k] = pick;
    }
    // A tombstone only matters while some copy might still hold the record; keep a month of them.
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    for (const [k, t] of Object.entries(tomb)) if (t < cutoff && !(k in a) && !(k in b)) delete tomb[k];
    data[sec] = out;
    deleted[sec] = tomb;
  }
  return { data, deleted };
}

/** Cheap equality for "did the merge change anything". */
export function sameStore(a: StoreSnapshot, b: StoreSnapshot): boolean {
  return JSON.stringify(a.data) === JSON.stringify(b.data);
}
