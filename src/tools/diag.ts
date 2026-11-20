/**
 * 导出诊断数据：把最近捕获的提示词归因、变量楼层、换卡体检结果存成一个 JSON 文件，
 * 写进酒馆的 data/<用户>/user/files/，方便排查问题（也方便把文件发给别人看）。
 */
import { ctx, currentCharacter, settings, toast } from '../st/st';
import { planFor } from './env/autoapply';
import { installedVersion } from './update';
import { buildEnvReport } from './env/env';
import { captures } from './flow/capture';
import { collectFloors, floorDiffs } from './vars/vars';
import { isPhone } from '../ui/Menu';

export function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * 打开页面时下载的两大块：角色卡列表（没开「懒加载角色」时是每张卡的全部内容）、设置（含所有预设）。
 * 查「手机打开很慢」用。transferKB = 实际传了多少，sizeKB = 解开后多大；浏览器没记下就是 null。
 */
export function startupSizes(): unknown {
  const entry = (path: string) => {
    const e = firstRequest(path);
    return e ? { transferKB: Math.round(e.transferSize / 1024), sizeKB: Math.round(e.decodedBodySize / 1024) } : null;
  };
  const chars = (ctx().characters ?? []) as { shallow?: boolean }[];
  return { cards: chars.length, cardsNotLoaded: chars.filter((c) => c.shallow).length, cardList: entry('/api/characters/all'), settings: entry('/api/settings/get') };
}

function firstRequest(path: string): PerformanceResourceTiming | undefined {
  return performance.getEntriesByType('resource').find((x) => x.name.includes(path)) as PerformanceResourceTiming | undefined;
}

const SLOW_KEY = 'rbt-slow-load-noticed';
const SLOW_MB = 10;
const SLOW_HELP = 'https://github.com/RebBirdTD/SillyTavern-RedBird-Tools#手机上打开酒馆很慢';

/**
 * 手机上打开页面时下载的角色卡（解开后）超过 10 MB，提醒一次怎么让酒馆只在打开卡时才下载（每台设备只提醒一次）。
 * 开了「懒加载角色」时角色卡列表只有几 KB，不会提醒。
 */
export function installSlowLoadNotice(): void {
  const c = ctx();
  c.eventSource.once(c.eventTypes.APP_READY, () => {
    const mb = Math.round((firstRequest('/api/characters/all')?.decodedBodySize ?? 0) / 1048576);
    if (!isPhone() || mb < SLOW_MB) return;
    try {
      if (localStorage.getItem(SLOW_KEY)) return;
      localStorage.setItem(SLOW_KEY, '1');
    } catch { return; /* 记不住就不提醒，免得每次都弹 */ }
    toast('info', `打开酒馆要先下载 ${mb} MB 的角色卡，所以手机上打开可能会卡顿。点这里看怎么改。`, 'RedBird 工具箱', {
      onclick: () => window.open(SLOW_HELP, '_blank', 'noopener'),
      timeOut: 15000,
    });
  });
}

export function buildDiagnostics(): unknown {
  const c = ctx();
  const char = currentCharacter();
  let env: unknown = null;
  try {
    const r = buildEnvReport();
    env = { ...r, items: r.items.map(({ toggle: _t, subItems, ...rest }) => ({ ...rest, subItems: subItems?.map(({ toggle: _s, ...s }) => s) })) };
  } catch (e) {
    env = { error: String(e) };
  }
  let vars: unknown = null;
  try {
    vars = floorDiffs(collectFloors()).map((d) => ({ floor: d.floor.index, prev: d.prev?.index ?? null, changes: d.changes }));
  } catch (e) {
    vars = { error: String(e) };
  }
  // 换卡时会换哪些、依据是什么（本卡专用、正则归属、进卡前的原值）：查「换卡时怎么没换 / 换错了」要用
  let switching: unknown = null;
  try {
    const plan = char ? planFor(char) : null;
    switching = {
      regexOwners: settings().regexOwners,
      profile: char ? settings().profiles[char.avatar] ?? null : null,
      baseline: settings().baseline ?? null,
      plan: plan && { preset: plan.preset, worldsOn: plan.worldsOn, worldsOff: plan.worldsOff, regexOn: plan.regexOn, regexOff: plan.regexOff },
    };
  } catch (e) {
    switching = { error: String(e) };
  }
  return {
    exportedAt: new Date().toISOString(),
    tool: 'RedBird 工具箱',
    version: installedVersion(),
    chatId: c.getCurrentChatId?.() ?? null,
    card: char?.name ?? null,
    mainApi: c.mainApi,
    chatLength: c.chat?.length ?? 0,
    startup: startupSizes(),
    captures: captures.value.map(({ rawChat: _raw, ...cap }) => cap),
    vars,
    env,
    switching,
  };
}

/** Save diagnostics into ST's user files folder. Returns the server-relative path. */
export async function exportDiagnostics(): Promise<string | null> {
  try {
    const name = `redbird-diagnostics-${stamp()}.json`;
    const body = JSON.stringify({ name, data: toBase64Utf8(JSON.stringify(buildDiagnostics(), null, 1)) });
    const res = await fetch('/api/files/upload', { method: 'POST', headers: ctx().getRequestHeaders(), body });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { path } = await res.json();
    toast('success', `诊断数据已保存：${path}`);
    return path;
  } catch (e) {
    console.error('[RedBird] export failed', e);
    toast('error', `导出失败：${String(e)}`);
    return null;
  }
}
