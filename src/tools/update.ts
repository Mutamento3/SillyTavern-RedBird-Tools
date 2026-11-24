/**
 * 新版本提醒：每天最多一次，拿 GitHub 上 manifest.json 的版本号和装着的比，
 * 有新版本就弹一条提示，点一下直接更新（用酒馆自己的更新接口，和在「管理扩展程序」里点更新一样），
 * 更新完问一句要不要刷新页面。
 * 不依赖酒馆自己的「在扩展程序更新时通知」开关。只读一个公开文件，不发送任何东西。
 */
import { signal } from '@preact/signals';
import { compareVersion } from '../core/version';
import { APP_NAME, confirmText, ctx, loaded, toast } from '../st/st';

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
      if (m && (m.display_name === APP_NAME || String(m.homePage ?? '').includes('SillyTavern-RedBird-Tools'))) return n;
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

interface Latest { version: string; whatsNew: string }
/** GitHub 上比装着的新的版本（没有就是 null）。每次打开页面查一次；左栏版本号和扩展设置里的「更新」行都看它。 */
export const newVersion = signal<Latest | null>(null);

async function fetchLatest(): Promise<Latest | null> {
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

/** 插件是给所有用户装的（global）还是只给自己装的；更新、查版本时酒馆要知道。 */
const isGlobal = (id: string): boolean => loaded.extensions?.extensionTypes?.[`third-party/${id}`] === 'global';

/**
 * 更新一个插件：调用酒馆自己的更新接口（git pull），和在「管理扩展程序」里点更新一样。
 * `id` 是插件的文件夹名（不带 third-party/）。
 */
export async function updateExtension(id: string): Promise<{ ok: true; upToDate: boolean } | { ok: false; why: string }> {
  try {
    const res = await fetch('/api/extensions/update', {
      method: 'POST',
      headers: ctx().getRequestHeaders(),
      body: JSON.stringify({ extensionName: id, global: isGlobal(id) }),
    });
    if (!res.ok) return { ok: false, why: res.status === 403 ? '这个插件是给所有用户装的，只有管理员能更新。' : (await res.text()).slice(0, 160) || `错误 ${res.status}` };
    const data = await res.json().catch(() => ({}));
    return { ok: true, upToDate: !!data?.isUpToDate };
  } catch (e) {
    return { ok: false, why: (e as Error).message };
  }
}

/** 刷新页面后新版本才生效：问一句要不要现在刷新。 */
export async function askReload(): Promise<void> {
  if (await confirmText('已经更新好了', '刷新页面后新版本才会生效。现在刷新吗？', '刷新页面', '稍后')) location.reload();
  else toast('info', '下次刷新页面时会换成新版本。', APP_NAME);
}

let updating = false;

/** 一键更新工具箱自己。更新完问要不要刷新页面；失败时说清原因，并给出手动更新的入口。 */
export async function updateNow(): Promise<void> {
  if (updating) return;
  const id = installedId();
  if (!id) { openManager(); return; }
  updating = true;
  toast('info', '正在更新…', APP_NAME, { timeOut: 4000 });
  try {
    const r = await updateExtension(id.replace(/^third-party\//, ''));
    if (!r.ok) { toast('error', `没能更新工具箱。点这里打开「管理扩展程序」手动更新。（${r.why}）`, APP_NAME, { onclick: openManager, timeOut: 12000 }); return; }
    if (r.upToDate) { toast('success', '已经是最新版本。', APP_NAME); return; }
    await askReload();
  } finally {
    updating = false;
  }
}

// ---------------------------------------------------------- 别的插件 ---

/** 每个插件的更新状态。插件页打开时查一遍（每次打开页面最多查一次，酒馆每查一个都要去 Git 仓库拉一次）。 */
export type PluginState = 'new' | 'updating' | 'updated';
export const pluginStates = signal<Record<string, PluginState>>({});
let pluginsChecked = false;

export function checkPluginUpdates(ids: string[]): void {
  if (pluginsChecked) return;
  pluginsChecked = true;
  for (const id of ids) {
    void (async () => {
      try {
        const res = await fetch('/api/extensions/version', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ extensionName: id, global: isGlobal(id) }) });
        const data = res.ok ? await res.json() : null;
        // 不是 Git 装的插件，酒馆会说「已是最新」，这里就什么都不显示
        if (data && data.isUpToDate === false) pluginStates.value = { ...pluginStates.value, [id]: 'new' };
      } catch { /* 查不到就当没有新版本 */ }
    })();
  }
}

/** 更新这些插件（一个接一个），全部做完后问一次要不要刷新。 */
export async function updatePlugins(list: { id: string; name: string }[]): Promise<void> {
  const set = (id: string, st: PluginState | undefined) => {
    const next = { ...pluginStates.value };
    if (st) next[id] = st; else delete next[id];
    pluginStates.value = next;
  };
  let done = 0;
  for (const { id, name } of list) {
    set(id, 'updating');
    const r = await updateExtension(id);
    if (r.ok) { set(id, 'updated'); done++; } else { set(id, 'new'); toast('error', `没能更新「${name}」。请在「管理扩展程序」里手动更新。（${r.why}）`, APP_NAME, { timeOut: 12000 }); }
  }
  if (done) await askReload();
}

/** 问一句要不要更新到这个版本，点「更新」就更新。 */
export async function askUpdate(latest: Latest): Promise<void> {
  if (await confirmText(`有新版本 ${latest.version}`, `你装的是 ${installedVersion()}。${latest.whatsNew ? `${latest.whatsNew}　` : ''}现在更新吗？`, '更新', '以后再说')) await updateNow();
}

/** `force`: the 「检查更新」 button — always says something. Otherwise the startup check: the toast shows at most once a day. */
export async function checkForUpdate(force = false): Promise<UpdateInfo | null> {
  const current = installedVersion();
  if (!current) return null;
  const latest = await fetchLatest();
  if (!latest) {
    if (force) toast('warning', '连不上 GitHub，没法检查更新。', APP_NAME);
    return null;
  }
  const newer = compareVersion(latest.version, current) > 0;
  newVersion.value = newer ? latest : null;
  if (!newer) {
    if (force) toast('success', `已经是最新版本（${current}）。`, APP_NAME);
    return null;
  }
  const info = { current, latest: latest.version, whatsNew: latest.whatsNew };
  // 手动点「检查更新」时，有新版本就直接问要不要现在更新
  if (force) { await askUpdate(latest); return info; }
  try {
    const today = new Date().toDateString();
    if (localStorage.getItem(DAY_KEY) === today || localStorage.getItem(SKIP_KEY) === latest.version) return info;
    localStorage.setItem(DAY_KEY, today);
  } catch { /* private mode: just show it */ }
  toast('info', `新版 ${latest.version}，当前 ${current}。${latest.whatsNew}点这里更新。`, `${APP_NAME}有更新`, {
    onclick: () => { void updateNow(); },
    timeOut: 15000,
    extendedTimeOut: 8000,
  });
  return info;
}

/** On startup, a few seconds after load so it doesn't compete with ST's own work. */
export function installUpdateCheck(): void {
  // 等酒馆加载完再过一会儿才查，别和启动时的请求抢网速（手机流量下启动要几十秒）
  let done = false;
  const run = () => { if (done) return; done = true; void checkForUpdate(false); };
  const c = ctx();
  if (c.eventTypes?.APP_READY) c.eventSource.on(c.eventTypes.APP_READY, () => setTimeout(run, 15000));
  setTimeout(run, 90000);
}
