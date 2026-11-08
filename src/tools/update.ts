/**
 * 新版本提醒：每天最多一次，拿 GitHub 上 manifest.json 的版本号和装着的比，
 * 有新版本就弹一条提示，点一下直接更新（用酒馆自己的更新接口，和在「管理扩展程序」里点更新一样），
 * 更新完问一句要不要刷新页面。
 * 不依赖酒馆自己的「在扩展程序更新时通知」开关。只读一个公开文件，不发送任何东西。
 */
import { compareVersion } from '../core/version';
import { confirmText, ctx, loaded, toast } from '../st/st';

const REMOTE = 'https://raw.githubusercontent.com/RebBirdTD/SillyTavern-RedBird-Tools/main/manifest.json';
const DAY_KEY = 'rbt-update-checked';
const SKIP_KEY = 'rbt-update-skip';

/** This extension's id as ST loaded it, e.g. 'third-party/SillyTavern-RedBird-Tools' (folder names differ between installs). */
function installedId(): string | null {
  const names: string[] = loaded.extensions?.extensionNames ?? [];
  for (const n of names) {
    if (!n.startsWith('third-party/')) continue;
    try {
      const m = loaded.extensions?.getExtensionManifest?.(n);
      if (m && (m.display_name === 'RedBird 工具箱' || String(m.homePage ?? '').includes('SillyTavern-RedBird-Tools'))) return n;
    } catch { /* ignore */ }
  }
  return null;
}

/** This extension's manifest as ST loaded it. */
export function installedManifest(): { version: string } | null {
  const id = installedId();
  try { return id ? loaded.extensions?.getExtensionManifest?.(id) ?? null : null; } catch { return null; }
}

export function installedVersion(): string {
  return installedManifest()?.version ?? '';
}

export interface UpdateInfo { current: string; latest: string; whatsNew: string }

async function fetchLatest(): Promise<{ version: string; whatsNew: string } | null> {
  try {
    const res = await fetch(`${REMOTE}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const m = await res.json();
    return m?.version ? { version: String(m.version), whatsNew: String(m.rbt_whats_new ?? '') } : null;
  } catch {
    return null;
  }
}

function openManager(): void {
  document.getElementById('extensions_details')?.click();
}

let updating = false;

/**
 * 一键更新：调用酒馆自己的更新接口（git pull），和在「管理扩展程序」里点更新一样。
 * 更新完问要不要刷新页面（新版本刷新后才生效）。失败时说清原因，并给出手动更新的入口。
 */
export async function updateNow(): Promise<void> {
  if (updating) return;
  const id = installedId();
  if (!id) { openManager(); return; }
  updating = true;
  toast('info', '正在更新…', 'RedBird 工具箱', { timeOut: 4000 });
  try {
    const res = await fetch('/api/extensions/update', {
      method: 'POST',
      headers: ctx().getRequestHeaders(),
      body: JSON.stringify({ extensionName: id.replace(/^third-party\//, ''), global: loaded.extensions?.extensionTypes?.[id] === 'global' }),
    });
    if (!res.ok) {
      const why = res.status === 403 ? '这个扩展是给所有用户装的，只有管理员能更新。' : (await res.text()).slice(0, 160) || `错误 ${res.status}`;
      toast('error', `没能更新：${why} 点这里打开「管理扩展程序」手动更新。`, 'RedBird 工具箱', { onclick: openManager, timeOut: 12000 });
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data?.isUpToDate) { toast('success', '已经是最新版本。', 'RedBird 工具箱'); return; }
    if (await confirmText('已经更新好了', '刷新页面后新版本才会生效。现在刷新吗？')) location.reload();
    else toast('info', '下次刷新页面时会换成新版本。', 'RedBird 工具箱');
  } catch (e) {
    toast('error', `没能更新：${(e as Error).message}`, 'RedBird 工具箱', { onclick: openManager, timeOut: 12000 });
  } finally {
    updating = false;
  }
}

/** `force`: the 「检查更新」 button — always checks and always says something. */
export async function checkForUpdate(force = false): Promise<UpdateInfo | null> {
  const current = installedVersion();
  if (!current) return null;
  const today = new Date().toDateString();
  if (!force) {
    try {
      if (localStorage.getItem(DAY_KEY) === today) return null;
      localStorage.setItem(DAY_KEY, today);
    } catch { /* private mode: just check */ }
  }
  const latest = await fetchLatest();
  if (!latest) {
    if (force) toast('warning', '连不上 GitHub，没法检查更新。', 'RedBird 工具箱');
    return null;
  }
  if (compareVersion(latest.version, current) <= 0) {
    if (force) toast('success', `已经是最新版本（${current}）。`, 'RedBird 工具箱');
    return null;
  }
  // 手动点「检查更新」时，有新版本就直接问要不要现在更新
  if (force) {
    if (await confirmText(`有新版本 ${latest.version}`, `你装的是 ${current}。${latest.whatsNew ? `${latest.whatsNew}　` : ''}现在更新吗？`)) await updateNow();
    return { current, latest: latest.version, whatsNew: latest.whatsNew };
  }
  let skipped = '';
  try { skipped = localStorage.getItem(SKIP_KEY) ?? ''; } catch { /* ignore */ }
  if (!force && skipped === latest.version) return null;
  toast('info', `新版 ${latest.version}，当前 ${current}。${latest.whatsNew}点这里更新。`, 'RedBird 工具箱有更新', {
    onclick: () => { void updateNow(); },
    timeOut: 15000,
    extendedTimeOut: 8000,
  });
  return { current, latest: latest.version, whatsNew: latest.whatsNew };
}

/** 扩展设置用：GitHub 上的版本比装着的新时返回新版本号，否则返回空。 */
export async function newerVersion(): Promise<string> {
  const current = installedVersion();
  const latest = current ? await fetchLatest() : null;
  return latest && compareVersion(latest.version, current) > 0 ? latest.version : '';
}

/** On startup, a few seconds after load so it doesn't compete with ST's own work. */
export function installUpdateCheck(): void {
  setTimeout(() => { void checkForUpdate(false); }, 8000);
}
