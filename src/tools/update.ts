/**
 * 新版本提醒：每天最多一次，拿 GitHub 上 manifest.json 的版本号和装着的比，
 * 有新版本就弹一条提示（点一下打开酒馆的「管理扩展程序」，在那里点更新）。
 * 不依赖酒馆自己的「在扩展程序更新时通知」开关。只读一个公开文件，不发送任何东西。
 */
import { compareVersion } from '../core/version';
import { loaded, toast } from '../st/st';

const REMOTE = 'https://raw.githubusercontent.com/RebBirdTD/SillyTavern-RedBird-Tools/main/manifest.json';
const DAY_KEY = 'rbt-update-checked';
const SKIP_KEY = 'rbt-update-skip';

/** This extension's manifest as ST loaded it (folder names differ between installs). */
export function installedManifest(): { version: string } | null {
  const names: string[] = loaded.extensions?.extensionNames ?? [];
  for (const n of names) {
    if (!n.startsWith('third-party/')) continue;
    try {
      const m = loaded.extensions?.getExtensionManifest?.(n);
      if (m && (m.display_name === 'RedBird 工具箱' || String(m.homePage ?? '').includes('SillyTavern-RedBird-Tools'))) return m;
    } catch { /* ignore */ }
  }
  return null;
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
  let skipped = '';
  try { skipped = localStorage.getItem(SKIP_KEY) ?? ''; } catch { /* ignore */ }
  if (!force && skipped === latest.version) return null;
  toast('info', `新版 ${latest.version}，当前 ${current}。${latest.whatsNew}点此打开「管理扩展程序」，找到 RedBird 工具箱，点更新，完成后刷新页面。`, 'RedBird 工具箱有更新', {
    onclick: openManager,
    timeOut: 15000,
    extendedTimeOut: 8000,
  });
  return { current, latest: latest.version, whatsNew: latest.whatsNew };
}

/** On startup, a few seconds after load so it doesn't compete with ST's own work. */
export function installUpdateCheck(): void {
  setTimeout(() => { void checkForUpdate(false); }, 8000);
}
