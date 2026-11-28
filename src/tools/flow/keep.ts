/**
 * 花费明细的「本轮」存到浏览器里（IndexedDB），刷新、换存档再回来还能看。
 *
 * 数据（两个存储，键都是 chatId）：
 * - rounds：{ chatId, rounds }，这个存档最近 KEEP_ROUNDS 轮自己的回复（最新一轮 + 上一轮，「比上一轮」和缓存分界要用上一轮）。
 *   插件后台调用、预览不存；原始提示词（rawChat）不存。
 * - meta：{ chatId, openedAt, size }，算空间只读这个，不用把每个存档的全文都读出来。
 * 上限按大小算：电脑 12 MB，手机 4 MB；另外最多 MAX_CHATS 个存档。超了从最久没打开的存档开始删，当前存档不删。
 * 实测：一个约 9 万 Token 的存档一轮约 310 KB（UTF-8），两轮约 0.6 MB。
 * 什么时候写：本轮的轮次或用量变了之后，页面空闲时写一次（存哪个存档在变的时候就定好）。什么时候读：换到一个存档时。
 */
import { effect } from '@preact/signals';
import { ctx } from '../../st/st';
import { captures, renameCaptures, restoreCaptures, type Capture } from './capture';
import { usageTick } from './usage';

const DB = 'redbird-tools';
const ROUNDS = 'flow-rounds';
const META = 'flow-meta';
const KEEP_ROUNDS = 2;
const MAX_CHATS = 20;
const budget = (): number => (window.innerWidth < 1000 ? 4 : 12) * 1024 * 1024;

type Stored = Omit<Capture, 'id' | 'rawChat'>;
interface Meta { chatId: string; openedAt: number; size: number }

let dbp: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  dbp ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      // 第 2 版加了 meta。第 1 版（开发时的版本）的记录没有 meta、不会被淘汰：整个删掉重建
      const req = indexedDB.open(DB, 2);
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const name of [ROUNDS, META]) if (d.objectStoreNames.contains(name)) d.deleteObjectStore(name);
        for (const name of [ROUNDS, META]) d.createObjectStore(name, { keyPath: 'chatId' });
      };
      req.onsuccess = () => {
        // 别的标签页要升级数据库时：关掉这边的连接，下次用时再开
        req.result.onversionchange = () => { req.result.close(); dbp = null; };
        resolve(req.result);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }).then((d) => { if (!d) dbp = null; return d; }); // 打开失败：下次再试
  return dbp;
}

/** 一个事务：body 里发请求，事务提交了才算成功 */
function tx(mode: IDBTransactionMode, body: (rounds: IDBObjectStore, meta: IDBObjectStore) => void): Promise<boolean> {
  return db().then((d) => new Promise<boolean>((resolve) => {
    if (!d) return resolve(false);
    try {
      const t = d.transaction([ROUNDS, META], mode);
      t.oncomplete = () => resolve(true);
      t.onerror = () => resolve(false);
      t.onabort = () => resolve(false);
      body(t.objectStore(ROUNDS), t.objectStore(META));
    } catch {
      resolve(false);
    }
  }));
}

const mine = (c: Capture): boolean => c.genType !== 'quiet' && c.genType !== 'preview';
const chatNow = (): string => String(ctx().getCurrentChatId?.() ?? '');
const strip = (list: Capture[]): string => JSON.stringify(list.map(({ id: _id, rawChat: _raw, ...rest }) => rest));
/** 一份轮次的签名：时间 + 用量（轮次内容不会变，只有用量会被原地改，比如插件后台调用记进来） */
const sigOf = (list: { time: Date | string; usage?: unknown }[]): string => list.map((c) => `${new Date(c.time).getTime()}:${JSON.stringify(c.usage ?? null)}`).join('|');

/** 每个存档最后一次写成功（或刚读回来）的签名：一样就不重写 */
const saved = new Map<string, string>();

/** 把内存里 chatId 这个存档的最近几轮写进去；同时删掉最久没打开的存档，直到不超过上限 */
async function save(chatId: string): Promise<void> {
  const rounds = captures.value.filter((c) => c.chatId === chatId && mine(c)).slice(0, KEEP_ROUNDS);
  if (!rounds.length) return;
  const sig = sigOf(rounds);
  if (saved.get(chatId) === sig) return;
  // 先拍一份快照（用量之后还会被原地改）：算大小、写进去的都是这一份
  let json = strip(rounds);
  let size = new Blob([json]).size;
  // 一个存档就超过上限（超长上下文）：只存最新一轮；还超就不存
  if (size > budget() && rounds.length > 1) { json = strip(rounds.slice(0, 1)); size = new Blob([json]).size; }
  if (size > budget()) return;
  const snap = JSON.parse(json) as Stored[];
  const ok = await tx('readwrite', (rs, ms) => {
    const req = ms.getAll();
    req.onsuccess = () => {
      const others = (req.result as Meta[]).filter((m) => m.chatId !== chatId).sort((a, b) => b.openedAt - a.openedAt);
      // 从最近打开的往旧的数：放得下就留；一旦放不下，它和比它更旧的都删
      let total = size, count = 1, full = false;
      for (const m of others) {
        if (!full && total + m.size <= budget() && count < MAX_CHATS) { total += m.size; count++; continue; }
        full = true;
        rs.delete(m.chatId);
        ms.delete(m.chatId);
      }
      rs.put({ chatId, rounds: snap });
      ms.put({ chatId, openedAt: Date.now(), size } satisfies Meta);
    };
  });
  if (ok) saved.set(chatId, sig);
}

/** 换到一个存档：把浏览器里存的轮次补进内存（内存里已有的不重复），并记下打开时间 */
async function load(chatId: string): Promise<void> {
  let stored: Stored[] = [];
  await tx('readwrite', (rs, ms) => {
    const r = rs.get(chatId);
    r.onsuccess = () => { stored = (r.result?.rounds as Stored[] | undefined) ?? []; };
    const m = ms.get(chatId);
    m.onsuccess = () => { if (m.result) ms.put({ ...(m.result as Meta), openedAt: Date.now() }); };
  });
  if (!stored.length || chatNow() !== chatId) return;
  saved.set(chatId, sigOf(stored));
  const have = new Set(captures.value.filter((c) => c.chatId === chatId).map((c) => c.time.getTime()));
  const chat = ctx().chat ?? [];
  const add = stored.map((s) => {
    // 用量重新连到那一楼消息上的同一个对象：之后插件后台调用的花费是加在消息上的，这样花费明细也跟着变
    const own = s.targetFloor != null ? chat[s.targetFloor]?.extra?.rbt_usage : null;
    const same = own && s.usage && own.model === s.usage.model && own.input === s.usage.input && own.output === s.usage.output;
    // chatId 用现在的名字（存档改过名时，记录里存的还是旧名字）
    return { ...s, chatId, time: new Date(s.time), rawChat: [], usage: same ? own : s.usage };
  }).filter((s) => !have.has(s.time.getTime()));
  if (add.length) restoreCaptures(add);
}

export function installKeep(): void {
  if (typeof indexedDB === 'undefined') return;
  const c = ctx();
  const open = () => { const id = chatNow(); if (id) void load(id); };
  c.eventSource.on(c.eventTypes.CHAT_CHANGED, open);
  open();
  // 删了存档：它的记录（里面有整份提示词）也删掉
  const drop = (name: unknown) => {
    const id = String(name ?? '').replace(/\.jsonl$/, '');
    if (!id) return;
    saved.delete(id);
    void tx('readwrite', (rs, ms) => { rs.delete(id); ms.delete(id); });
  };
  for (const ev of [c.eventTypes.CHAT_DELETED, c.eventTypes.GROUP_CHAT_DELETED]) if (ev) c.eventSource.on(ev, drop);
  // 存档改名：记录从旧名字挪到新名字（一个事务里），内存里的轮次也改成新名字。
  // 酒馆先用新名字重新打开聊天、再发这个事件，所以挪完再读一次
  const rename = async (e: unknown) => {
    const d = (e ?? {}) as { oldFileName?: unknown; newFileName?: unknown };
    const from = String(d.oldFileName ?? '').replace(/\.jsonl$/, '');
    const to = String(d.newFileName ?? '').replace(/\.jsonl$/, '');
    if (!from || !to || from === to) return;
    renameCaptures(from, to);
    const sig = saved.get(from);
    saved.delete(from);
    if (sig) saved.set(to, sig);
    await tx('readwrite', (rs, ms) => {
      for (const s of [rs, ms]) {
        const r = s.get(from);
        r.onsuccess = () => { if (r.result) { s.put({ ...r.result, chatId: to }); s.delete(from); } };
      }
    });
    if (chatNow() === to) await load(to);
  };
  if (c.eventTypes.CHAT_RENAMED) c.eventSource.on(c.eventTypes.CHAT_RENAMED, (e: unknown) => { void rename(e); });
  // 轮次或用量一变（插件后台调用记到用量里时只有 usageTick 变）：记下是哪个存档，等页面空闲时存（连着变只存最后一次）
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  effect(() => {
    void captures.value;
    void usageTick.value;
    // 当前存档，加上最新一轮所属的存档（回复写完前换了存档，那一轮也要存到它自己的存档里）
    const ids = [chatNow(), captures.value[0]?.chatId ?? ''].filter(Boolean);
    if (!ids.length) return;
    for (const id of ids) pending.add(id);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const go = () => { const ids = [...pending]; pending.clear(); for (const x of ids) void save(x); };
      if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 3000 }); else go();
    }, 1500);
  });
}
