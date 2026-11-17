/**
 * 对白（引号里的话）的颜色，只用在红鸟自带美化上。玩家选的是一种颜色，
 * 每种在深色、浅色、护眼三套里各调一个值，在那套聊天底色上对比度至少 4.5:1（quote.test.ts 检查）。
 */
export type LookKind = 'dark' | 'light' | 'warm';

/** 三套美化的聊天区底色（和 look.css 的 --rbd-canvas 一致）。 */
export const CANVAS: Record<LookKind, string> = { dark: '#161618', light: '#faf9f6', warm: '#f4ecd8' };

export const QUOTE_COLORS: ({ id: string; label: string } & Record<LookKind, string>)[] = [
  { id: 'khaki', label: '卡其', dark: '#cfc79a', light: '#6f6530', warm: '#655a28' },
  { id: 'orange', label: '柔橙', dark: '#f2a65a', light: '#a8570e', warm: '#97490b' },
  { id: 'pink', label: '雾粉', dark: '#efa7b9', light: '#b4486a', warm: '#a03f58' },
  { id: 'teal', label: '青绿', dark: '#7fd1c2', light: '#1f7f72', warm: '#22685c' },
  { id: 'violet', label: '淡紫', dark: '#b9a7ff', light: '#6a54c8', warm: '#6b4fa8' },
  { id: 'blue', label: '天蓝', dark: '#8ec5ff', light: '#2a6fb5', warm: '#2f6596' },
];

/** 这种颜色在这套美化上的值；没选（null）或不认识的 id 返回 null。 */
export function quoteColor(id: string | null | undefined, look: LookKind): string | null {
  return QUOTE_COLORS.find((q) => q.id === id)?.[look] ?? null;
}

/** 相对亮度（WCAG），rgb 是 0–255。 */
export function relLum(rgb: readonly number[]): number {
  const ch = rgb.slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const hexRgb = (hex: string): number[] => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** WCAG 对比度：两个颜色（#hex 或 0–255 的 rgb）。 */
export function contrast(a: string | readonly number[], b: string | readonly number[]): number {
  const la = relLum(typeof a === 'string' ? hexRgb(a) : a);
  const lb = relLum(typeof b === 'string' ? hexRgb(b) : b);
  const [x, y] = [la, lb].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * 有背景图时聊天区盖多深的黑（0–1）。正文用深色那套的浅色字（#ececf1），对白可能另有颜色；
 * 图越亮盖得越多，让每种字和盖过之后的图（按图里偏亮那部分的颜色算，见 bgShade.ts）对比度至少 4.5:1。
 * 最少 30%（暗图也盖这么多，图还是很清楚），最多 70%（很亮的图配彩色对白时）。
 */
export const SHADE_MIN = 0.3;
export const SHADE_MAX = 0.7;
/** 图读不到（比如从别的网站加载）时用这个。 */
export const SHADE_UNKNOWN = 0.4;
export const ON_IMAGE_TEXT = '#ececf1';
export function shadeFor(avg: readonly number[], texts: readonly string[] = [ON_IMAGE_TEXT]): number {
  for (let i = Math.round(SHADE_MIN * 100); i < SHADE_MAX * 100; i++) {
    const bg = avg.map((v) => v * (1 - i / 100));
    if (texts.every((t) => contrast(t, bg) >= 4.5)) return i / 100;
  }
  return SHADE_MAX;
}
