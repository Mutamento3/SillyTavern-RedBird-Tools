/**
 * 这个聊天的背景：读出现在用的是哪张、有没有「锁定到这个聊天」。
 * 不另存任何东西：锁用的是酒馆自己的（存在聊天的 chat_metadata.custom_background 里，和背景面板上的锁是同一个），
 * 锁 / 解锁走酒馆的 /lockbg、/unlockbg 命令。
 */
import { signal } from '@preact/signals';
import { ctx, runSlash } from '../st/st';

/** 背景换了、锁了、解锁了：酒馆都会改 #bg1 的行内样式，看着它就知道要重画。 */
export const bgTick = signal(0);
let watching = false;
function watch(): void {
  if (watching) return;
  const el = document.getElementById('bg1');
  if (!el) return;
  watching = true;
  new MutationObserver(() => { bgTick.value++; }).observe(el, { attributes: true, attributeFilter: ['style'] });
}

export interface ChatBg {
  /** 酒馆写在 #bg1 上的 url(...)，没有背景时是 '' */
  url: string;
  /** 给人看的名字（文件名去掉扩展名） */
  name: string;
  /** 缩略图地址 */
  thumb: string;
  /** 锁定在这个聊天上 */
  locked: boolean;
}

export function currentChatBg(): ChatBg {
  watch();
  void bgTick.value;
  const c = ctx();
  const lockedUrl: string = c.chatMetadata?.custom_background ?? '';
  const url = lockedUrl || document.getElementById('bg1')?.style.backgroundImage || '';
  const path = url.match(/url\(\s*["']?([^"')]+)["']?\s*\)/)?.[1] ?? '';
  const file = decodeURIComponent(path.split('/').pop() ?? '');
  const sys = path.match(/^\/?backgrounds\/(.+)$/);
  const thumb = sys ? (c.getThumbnailUrl?.('bg', decodeURIComponent(sys[1])) ?? path) : path;
  return { url, name: file.replace(/\.[^.]+$/, ''), thumb, locked: !!lockedUrl };
}

/** 酒馆里的背景图（文件名）。只读一次，换背景面板里上传了新的，下次打开角色档案时会重读。 */
export const bgFiles = signal<string[]>([]);
let loading = false;
export async function loadBgFiles(): Promise<void> {
  if (loading) return;
  loading = true;
  try {
    const res = await fetch('/api/backgrounds/all', { method: 'POST', headers: ctx().getRequestHeaders(), body: '{}' });
    if (!res.ok) return;
    const j = await res.json();
    const list: unknown[] = Array.isArray(j?.images) ? j.images : Array.isArray(j) ? j : [];
    bgFiles.value = list.map((x) => (typeof x === 'string' ? x : String((x as { filename?: string })?.filename ?? ''))).filter(Boolean);
  } catch { /* 读不到就只显示现在这张 */ } finally {
    loading = false;
  }
}

/** 锁定的是这个存档自己上传的背景（不在背景库里），下拉框里单独一项。 */
export const CUSTOM_BG = '__rbt_custom__';

/** 现在锁定的是哪个文件（没锁是 ''；锁的是这个存档自己上传的背景时是 CUSTOM_BG）。 */
export function lockedFile(): string {
  void bgTick.value;
  const u: string = ctx().chatMetadata?.custom_background ?? '';
  if (!u) return '';
  const p = u.match(/url\(\s*["']?\/?backgrounds\/([^"')]+)["']?\s*\)/)?.[1];
  return p ? decodeURIComponent(p) : CUSTOM_BG;
}

/**
 * 这个存档用哪张背景（null = 跟着全局背景）。
 * 和酒馆背景面板里「先锁定、再点图」一样：只改这个聊天，不改全局背景，所以别的存档、别的卡不受影响。
 */
export async function setChatBg(file: string | null): Promise<void> {
  const c = ctx();
  if (!file) { await runSlash('/unlockbg'); bgTick.value++; return; }
  if (file === CUSTOM_BG) return;
  const url = `url("backgrounds/${encodeURIComponent(file)}")`;
  if (!c.chatMetadata) return;
  c.chatMetadata.custom_background = url;
  c.saveMetadataDebounced?.();
  const bg = document.getElementById('bg1');
  if (bg) bg.style.backgroundImage = url;
  bgTick.value++;
}
