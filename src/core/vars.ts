/**
 * Variable snapshots and diffs. Handles MVU (MagVarUpdate) stat_data, including the
 * classic `[value, "description"]` pair format, and plain Tavern Helper variables.
 */

export interface Leaf {
  path: string;
  value: unknown;
  desc?: string;
}

export interface VarChange {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
  desc?: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** MVU v1 stores leaves as [value, description]. */
export function isMvuPair(v: unknown): v is [unknown, string] {
  return Array.isArray(v) && v.length === 2 && typeof v[1] === 'string';
}

/** Flatten a variable tree into path → leaf. Arrays that are not MVU pairs are treated as leaves. */
export function flattenVars(root: unknown, prefix = ''): Map<string, Leaf> {
  const out = new Map<string, Leaf>();
  const rec = (v: unknown, path: string) => {
    if (isMvuPair(v)) {
      const [value, desc] = v;
      if (isPlainObject(value)) rec(value, path);
      else out.set(path, { path, value, desc });
      return;
    }
    if (isPlainObject(v)) {
      const keys = Object.keys(v).filter((k) => k !== '$meta');
      if (!keys.length && path) out.set(path, { path, value: {} });
      for (const k of keys) rec(v[k], path ? `${path}.${k}` : k);
      return;
    }
    if (path) out.set(path, { path, value: v });
  };
  rec(root, prefix);
  return out;
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function diffVars(before: unknown, after: unknown): VarChange[] {
  const a = flattenVars(before);
  const b = flattenVars(after);
  const changes: VarChange[] = [];
  for (const [path, leaf] of b) {
    const old = a.get(path);
    if (!old) changes.push({ path, kind: 'added', after: leaf.value, desc: leaf.desc });
    else if (!same(old.value, leaf.value)) changes.push({ path, kind: 'changed', before: old.value, after: leaf.value, desc: leaf.desc ?? old.desc });
  }
  for (const [path, leaf] of a) {
    if (!b.has(path)) changes.push({ path, kind: 'removed', before: leaf.value, desc: leaf.desc });
  }
  return changes;
}

export function formatValue(v: unknown, max = 120): string {
  if (v === undefined) return '∅';
  if (typeof v === 'string') return v.length > max ? `${v.slice(0, max)}…` : v;
  let s: string;
  try {
    s = JSON.stringify(v);
  } catch {
    s = String(v);
  }
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Search terms used to find who reads a variable path in prompts / lorebook entries. */
export function referenceTerms(path: string): string[] {
  const parts = path.split('.');
  const terms = new Set<string>([path]);
  if (parts.length >= 2) terms.add(parts.slice(-2).join('.'));
  const leaf = parts[parts.length - 1];
  const cjk = /[㐀-鿿]/.test(leaf);
  if ((cjk && leaf.length >= 2) || leaf.length >= 6) terms.add(leaf);
  return [...terms];
}
