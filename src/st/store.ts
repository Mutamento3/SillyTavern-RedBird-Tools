/**
 * 工具箱数据的第二份存档：data/<用户>/user/files/redbird-tools.json。
 *
 * 为什么要有：工具箱的数据本来存在酒馆的 settings.json 里，但酒馆每次保存都是整份覆盖——
 * 开着的另一个（旧）页面一保存，就会用它内存里的旧数据把你刚填的东西盖掉。
 * 这份文件每次写之前先读回来，按每条记录的修改时间合并（谁新留谁，删除也记着），
 * 所以哪个页面后保存都不会丢东西。打开酒馆时也会先用它把 settings.json 里旧了的部分补回来。
 */
import { mergeStores, sameStore, STORE_SECTIONS, type StoreSection, type StoreSnapshot } from '../core/store';
import { toBase64Utf8 } from '../tools/diag';
import { ctx, onSaveSettings, settings } from './st';

const FILE = 'redbird-tools.json';
const FORMAT = 'redbird-tools-store';
/** 一个请求最多等这么久：网慢时不能让同步一直挂着（挂着的话之后的保存都不会再同步）。 */
const FETCH_MS = 10000;
const deadline = (): AbortSignal | undefined => (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(FETCH_MS) : undefined);

function localSnapshot(): StoreSnapshot {
  const s = settings() as unknown as Record<string, unknown>;
  const data: StoreSnapshot['data'] = {};
  for (const sec of STORE_SECTIONS) data[sec] = (s[sec] ?? {}) as Record<string, Record<string, unknown>>;
  return { data, deleted: (settings().deleted ?? {}) as StoreSnapshot['deleted'] };
}

function applySnapshot(snap: StoreSnapshot): void {
  const s = settings() as unknown as Record<string, unknown>;
  for (const sec of STORE_SECTIONS) s[sec] = snap.data[sec] ?? {};
  settings().deleted = snap.deleted as Record<string, Record<string, string>>;
}

async function readFile(): Promise<StoreSnapshot | null> {
  try {
    const res = await fetch(`/user/files/${FILE}?t=${Date.now()}`, { cache: 'no-store', signal: deadline() });
    if (!res.ok) return null;
    const j = await res.json();
    if (j?.format !== FORMAT) return null;
    return { data: j.data ?? {}, deleted: j.deleted ?? {} };
  } catch {
    return null;
  }
}

async function writeFile(snap: StoreSnapshot): Promise<void> {
  const body = JSON.stringify({ name: FILE, data: toBase64Utf8(JSON.stringify({ format: FORMAT, version: 1, savedAt: new Date().toISOString(), ...snap })) });
  const res = await fetch('/api/files/upload', { method: 'POST', headers: ctx().getRequestHeaders(), body, signal: deadline() });
  if (!res.ok) throw new Error(`${res.status}`);
}

let running: Promise<void> | null = null;
let again = false;
/** What the file held after the last sync; a save that did not touch any of it needs no request. */
let lastSynced = '';

/**
 * Read the file, merge it with what this page has, keep the result here and write it back.
 * `authoritative`: this page's data replaces the file (after 导入并覆盖).
 */
export async function syncStore(authoritative = false): Promise<boolean> {
  if (running) { again = true; await running; return false; }
  let changed = false;
  running = (async () => {
    try {
      const local = localSnapshot();
      const remote = authoritative ? null : await readFile();
      const merged = remote ? mergeStores(local, remote) : local;
      if (!sameStore(merged, local)) {
        applySnapshot(merged);
        changed = true;
        // Bring settings.json up to date too (without re-triggering this sync).
        ctx().saveSettingsDebounced();
      }
      if (!remote || !sameStore(merged, remote) || JSON.stringify(merged.deleted) !== JSON.stringify(remote.deleted)) await writeFile(merged);
      lastSynced = JSON.stringify(merged);
    } catch (e) {
      console.warn('[RedBird] could not sync redbird-tools.json', e);
    }
  })();
  await running;
  running = null;
  if (again) { again = false; await syncStore(); }
  return changed;
}

let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleSync(): void {
  clearTimeout(timer);
  // 酒馆设置经常保存，但大多数时候我们存的东西没变：没变就不发请求；变了也攒 3 秒再同步
  timer = setTimeout(() => { if (JSON.stringify(localSnapshot()) !== lastSynced) void syncStore(); }, 3000);
}

/** Remember that a record was deleted (call right where it is deleted). */
export function markDeleted(section: StoreSection, key: string): void {
  const d = settings().deleted;
  (d[section] ??= {})[key] = new Date().toISOString();
}

/** On startup: pull in anything newer from the file, then keep it in sync after every save. */
export async function installStore(): Promise<boolean> {
  const changed = await syncStore();
  onSaveSettings(scheduleSync);
  return changed;
}
