/**
 * 首页卡片的清晰图。
 *
 * 酒馆的缩略图默认只有 96×144，首页卡片比它大，放大就糊；原图（角色卡 PNG）里嵌着整张卡的数据，常有 1–9MB，
 * 手机上一屏几张就是几十 MB。所以：先显示缩略图，卡片出现在屏幕上时，后台下载一次原图，缩到卡片够用的大小
 * （宽 600，webp，几十 KB），存进浏览器的 IndexedDB，再换上去。以后打开首页直接用存好的，不再下载原图。
 * 不用 Cache Storage：浏览器只在 https 和 localhost 下给它，手机用局域网 IP、Tailscale 这类 http 地址打开时没有，
 * 以前就一直只显示糊的缩略图。IndexedDB 在 http 下也能用。
 *
 * - 同时最多下载 2 张，点卡片进聊天的请求不会被挤在后面太久。
 * - 换过头像：用缩略图的 Last-Modified 当版本（酒馆会在原图变了以后重新生成缩略图），版本变了就重新做一张。
 * - 浏览器开了省流量（Save-Data）、或不支持 createImageBitmap 时，只用缩略图。存不进 IndexedDB（比如无痕模式）时，
 *   这次打开页面里照样换上清晰图，只是下次还要重新做。
 */

const DB = 'rbt-card-images';
const STORE = 'img';
const WIDTH = 600;
const MAX_PARALLEL = 2;

/** 这次打开页面里已经做好的：头像文件名 → blob: 地址 */
const ready = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
const queue: (() => void)[] = [];
let running = 0;

function supported(): boolean {
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  return typeof createImageBitmap === 'function' && !conn?.saveData;
}

function slot<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      running++;
      fn().then(resolve, reject).finally(() => {
        running--;
        queue.shift()?.();
      });
    };
    if (running < MAX_PARALLEL) run();
    else queue.push(run);
  });
}

// ---- IndexedDB：一张表，头像文件名 → { 版本, 图片 } ----
type Saved = { v: string; blob: Blob };
let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  return (dbp ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
async function store<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const q = fn(d.transaction(STORE, mode).objectStore(STORE));
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}

async function version(thumb: string): Promise<string> {
  try {
    const r = await fetch(thumb, { method: 'HEAD' });
    return r.headers.get('last-modified') ?? r.headers.get('etag') ?? '';
  } catch {
    return '';
  }
}

async function shrink(blob: Blob): Promise<Blob | null> {
  const bmp = await createImageBitmap(blob);
  const w = Math.min(WIDTH, bmp.width);
  const h = Math.round((bmp.height * w) / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (g) { g.imageSmoothingQuality = 'high'; g.drawImage(bmp, 0, 0, w, h); }
  bmp.close();
  // 不支持 webp 的浏览器（Safari）会存成 png，大一些，但照样清楚
  return new Promise((r) => canvas.toBlob(r, 'image/webp', 0.85));
}

async function make(avatar: string, thumb: string): Promise<string | null> {
  const v = await version(thumb);
  const saved = await store<Saved | undefined>('readonly', (s) => s.get(avatar)).catch(() => undefined);
  let blob = saved && saved.v === v ? saved.blob : null;
  if (!blob) {
    const made = await slot(async () => {
      const r = await fetch(`/characters/${encodeURIComponent(avatar)}`);
      if (!r.ok) return null;
      return shrink(await r.blob());
    });
    if (!made) return null;
    blob = made;
    // 同一张卡只留一份（换了头像就覆盖旧的）
    await store('readwrite', (s) => s.put({ v, blob: made } satisfies Saved, avatar)).catch((e) => console.warn('[RedBird] 首页清晰图没存进浏览器，下次打开还要重新做', e));
  }
  const url = URL.createObjectURL(blob);
  ready.set(avatar, url);
  return url;
}

/** 已经做好的清晰图（同一次打开页面里），没有就是 undefined。 */
export function sharpNow(avatar: string): string | undefined {
  return ready.get(avatar);
}

/** 拿这张卡的清晰图；做不了就返回 null，继续用缩略图。 */
export function sharpImage(avatar: string, thumb: string): Promise<string | null> {
  if (!supported()) return Promise.resolve(null);
  const done = ready.get(avatar);
  if (done) return Promise.resolve(done);
  let p = inflight.get(avatar);
  if (!p) {
    p = make(avatar, thumb).catch((e) => { console.warn('[RedBird] 首页清晰图没做成', avatar, e); return null; }).finally(() => inflight.delete(avatar));
    inflight.set(avatar, p);
  }
  return p;
}
