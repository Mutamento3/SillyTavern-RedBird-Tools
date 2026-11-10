/**
 * 首页卡片的清晰图。
 *
 * 酒馆的缩略图默认只有 96×144，首页卡片比它大，放大就糊；原图（角色卡 PNG）里嵌着整张卡的数据，常有 1–9MB，
 * 手机上一屏几张就是几十 MB。所以：先显示缩略图，卡片出现在屏幕上时，后台下载一次原图，缩到卡片够用的大小
 * （宽 600，webp，几十 KB），存进浏览器的 Cache Storage，再换上去。以后打开首页直接用存好的，不再下载原图。
 *
 * - 同时最多下载 2 张，点卡片进聊天的请求不会被挤在后面太久。
 * - 换过头像：用缩略图的 Last-Modified 当版本（酒馆会在原图变了以后重新生成缩略图），版本变了就重新做一张。
 * - 浏览器开了省流量（Save-Data）、或不支持 Cache Storage / createImageBitmap 时，只用缩略图。
 */

const CACHE = 'rbt-card-images-v1';
const WIDTH = 600;
const MAX_PARALLEL = 2;

/** 这次打开页面里已经做好的：头像文件名 → blob: 地址 */
const ready = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
const queue: (() => void)[] = [];
let running = 0;

function supported(): boolean {
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  return typeof caches !== 'undefined' && typeof createImageBitmap === 'function' && !conn?.saveData;
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

async function version(thumb: string): Promise<string> {
  try {
    const r = await fetch(thumb, { method: 'HEAD' });
    return r.headers.get('last-modified') ?? r.headers.get('etag') ?? '';
  } catch {
    return '';
  }
}

async function shrink(blob: Blob): Promise<Blob | null> {
  const probe = await createImageBitmap(blob);
  const w = Math.min(WIDTH, probe.width);
  const h = Math.round((probe.height * w) / probe.width);
  probe.close();
  const bmp = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')?.drawImage(bmp, 0, 0);
  bmp.close();
  return new Promise((r) => canvas.toBlob(r, 'image/webp', 0.85));
}

async function make(avatar: string, thumb: string): Promise<string | null> {
  const v = await version(thumb);
  const key = `/rbt-card-image/${encodeURIComponent(avatar)}?v=${encodeURIComponent(v)}`;
  const cache = await caches.open(CACHE);
  let hit = await cache.match(key);
  if (!hit) {
    const blob = await slot(async () => {
      const r = await fetch(`/characters/${encodeURIComponent(avatar)}`);
      if (!r.ok) return null;
      return shrink(await r.blob());
    });
    if (!blob) return null;
    // 同一张卡的旧版本删掉，不让缓存越积越多
    for (const old of await cache.keys()) if (old.url.includes(`/rbt-card-image/${encodeURIComponent(avatar)}?`)) await cache.delete(old);
    await cache.put(key, new Response(blob, { headers: { 'content-type': 'image/webp' } }));
    hit = await cache.match(key);
  }
  if (!hit) return null;
  const url = URL.createObjectURL(await hit.blob());
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
