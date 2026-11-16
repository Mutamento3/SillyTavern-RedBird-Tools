/**
 * 全局 / 本卡专用（纯函数，可单测）。用到酒馆的部分在 tools/env/setup.ts。
 */

export interface ProfileLike {
  worlds?: Record<string, boolean>;
  regex?: Record<string, boolean>;
  globalWorlds?: string[];
  globalRegexEnabled?: string[];
  savedAt?: string;
}

export interface LiveRegex { id: string; name: string; on: boolean }

/** 正则在旧数据里用的名字：没名字的都叫这个（和旧版一样）。 */
export const unnamedRegex = (name: string | undefined): string => name || '(未命名正则)';

/**
 * 旧版「记住的配套」（整份清单：清单里的开，其余开着的关）→ 本卡专用的开 / 关。
 * 进卡结果和旧版一样：清单里的 = 开；现在开着、不在清单里的 = 关。正则按名字找 id，同名的都算。
 * 不是旧格式就原样返回。
 */
export function migrateProfile<T extends ProfileLike>(p: T, live: { worldsOn: string[]; regex: LiveRegex[] }): T {
  if (!p.globalWorlds && !p.globalRegexEnabled && p.savedAt === undefined) return p;
  const out: T = { ...p };
  if (p.globalWorlds) {
    const worlds: Record<string, boolean> = { ...(p.worlds ?? {}) };
    for (const w of p.globalWorlds) worlds[w] = true;
    for (const w of live.worldsOn) if (!p.globalWorlds.includes(w)) worlds[w] = false;
    if (Object.keys(worlds).length) out.worlds = worlds;
  }
  if (p.globalRegexEnabled) {
    const regex: Record<string, boolean> = { ...(p.regex ?? {}) };
    for (const r of live.regex) {
      const want = p.globalRegexEnabled.includes(unnamedRegex(r.name));
      if (want) regex[r.id] = true;
      else if (r.on) regex[r.id] = false;
    }
    if (Object.keys(regex).length) out.regex = regex;
  }
  delete out.globalWorlds;
  delete out.globalRegexEnabled;
  delete out.savedAt;
  return out;
}

export type Items = Record<string, { before: unknown; after: unknown }>;

/**
 * 离卡时每一项怎么处理：
 * - 现在还是进卡时换上的（after）：换回原来的（before）；
 * - 玩家在别处改过、而且是本卡专用的：现在的值记进这张卡（restore 不动它）；
 * - 玩家在别处改过、不是本卡专用的：当全局改了，不动。
 */
export function leavePlan(items: Items, live: Record<string, unknown>, overridden: Set<string>, same: (key: string, a: unknown, b: unknown) => boolean): {
  restore: Record<string, unknown>;
  save: Record<string, unknown>;
} {
  const restore: Record<string, unknown> = {};
  const save: Record<string, unknown> = {};
  for (const [key, { before, after }] of Object.entries(items)) {
    if (!(key in live)) continue;
    const now = live[key];
    if (same(key, now, after)) restore[key] = before;
    else if (overridden.has(key)) { save[key] = now; restore[key] = before; }
  }
  return { restore, save };
}
