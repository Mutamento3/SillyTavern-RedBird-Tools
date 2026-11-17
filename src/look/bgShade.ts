/**
 * 红鸟自带美化遇到背景图：聊天区盖一层黑，深浅按图的亮度算（core/quote.ts shadeFor），
 * 正文换成深色那套的浅色字（样式见 look.css「有背景图」）。三套美化都一样；没有背景图时不变。
 * 酒馆的背景图写在 #bg1 的 background-image 上（视频会先转成动图 webp，也能当图片读）。
 */
import { ON_IMAGE_TEXT, quoteColor, relLum, SHADE_UNKNOWN, shadeFor } from '../core/quote';
import { settings } from '../st/st';

/** 酒馆自带的透明、纯黑、纯白「背景」：当成没有背景图。 */
const PLAIN = /(?:^|\/)(?:__transparent\.png|_black\.jpg|_white\.jpg)$/i;

let lastUrl: string | null = null;
let lastAvg: number[] | null = null; // 图里偏亮那部分的颜色

function bgUrl(): string {
  const m = document.getElementById('bg1')?.style.backgroundImage.match(/url\(\s*["']?(.+?)["']?\s*\)/);
  if (!m) return '';
  let name = m[1];
  try { name = decodeURIComponent(name); } catch { /* 留原样 */ }
  return PLAIN.test(name.split('?')[0]) ? '' : m[1];
}

/** 图里偏亮那部分的颜色（缩到 32×32，按亮度排第 90% 的那一格）；图读不到时 null。 */
function averageColor(url: string): Promise<number[] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 32;
        const g = cv.getContext('2d', { willReadFrequently: true });
        if (!g) return resolve(null);
        g.drawImage(img, 0, 0, 32, 32);
        const d = g.getImageData(0, 0, 32, 32).data;
        const px: number[][] = [];
        for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
        // 不用平均色：一张图大部分暗、中间一块很亮时，平均下来不亮，字落在亮的那块上就看不清。
        // 取偏亮那部分的颜色（按亮度排第 90%）：有一块亮区的图会多盖一些。
        // 实测酒馆自带的背景：夜景、室内暗图 30%（最少盖这么多），白天的风景、教室 40%–55%，纯白图 58%
        px.sort((x, y) => relLum(x) - relLum(y));
        resolve(px[Math.floor(px.length * 0.9)]);
      } catch { resolve(null); } // 别的网站的图：浏览器不让读像素
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** 按现在的图和对白颜色写 --rbd-shade（换了对白颜色也要重算：彩色字在亮图上要盖得更深）。 */
export function refreshShade(): void {
  const root = document.documentElement;
  if (!lastUrl) { root.style.removeProperty('--rbd-shade'); return; }
  const q = quoteColor(settings().quoteColor, 'dark');
  const shade = lastAvg ? shadeFor(lastAvg, q ? [ON_IMAGE_TEXT, q] : [ON_IMAGE_TEXT]) : SHADE_UNKNOWN;
  root.style.setProperty('--rbd-shade', String(shade));
}

async function check(): Promise<void> {
  const url = bgUrl();
  if (url === lastUrl) return;
  lastUrl = url;
  document.documentElement.classList.toggle('rbt-has-bg', !!url);
  lastAvg = null;
  refreshShade();
  if (!url) return;
  const avg = await averageColor(url);
  if (url !== lastUrl) return; // 算的时候又换了图
  lastAvg = avg;
  refreshShade();
}

export function watchBackground(): void {
  const bg = document.getElementById('bg1');
  if (!bg) return;
  new MutationObserver(() => { void check(); }).observe(bg, { attributes: true, attributeFilter: ['style'] });
  void check();
}
