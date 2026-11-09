/**
 * 慢操作日志：玩家说「卡死了」时，请他们打开浏览器控制台，把带 [RedBird] 的几行贴过来，就能看出是哪一步慢。
 * 只往控制台写，不弹提示。
 */

/** 从 t0（performance.now()）到现在超过 limit 毫秒，就记一行。 */
export function slow(name: string, t0: number, limit = 50): void {
  const ms = performance.now() - t0;
  if (ms > limit) console.warn(`[RedBird] 慢：${name} 用了 ${Math.round(ms)}ms`);
}

/** 等 p 最多 ms 毫秒；超时返回 fallback（p 照样在后台跑完）。 */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T, what: string): Promise<T> {
  let timer = 0;
  const late = new Promise<T>((r) => {
    timer = window.setTimeout(() => { console.warn(`[RedBird] ${what}超过 ${ms}ms 还没完成，先不等了`); r(fallback); }, ms);
  });
  return Promise.race([p.finally(() => clearTimeout(timer)), late]);
}

/** 页面整个卡住（主线程一次被占用超过 300ms）时记一行，带上时间，方便和上面的「慢」对上。 */
export function installLongTaskLog(): void {
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration > 300) console.warn(`[RedBird] 页面卡住 ${Math.round(e.duration)}ms（打开页面后第 ${Math.round(e.startTime / 1000)} 秒）`);
      }
    }).observe({ type: 'longtask', buffered: false });
  } catch { /* 有的浏览器（Safari）不支持 longtask */ }
}
