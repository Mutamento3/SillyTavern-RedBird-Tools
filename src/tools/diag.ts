/**
 * 导出诊断数据：把最近捕获的提示词归因、变量楼层、换卡体检结果存成一个 JSON 文件，
 * 写进酒馆的 data/<用户>/user/files/，方便排查问题（也方便把文件发给别人看）。
 */
import { ctx, currentCharacter, toast } from '../st/st';
import { buildEnvReport } from './env/env';
import { captures } from './flow/capture';
import { collectFloors, floorDiffs } from './vars/vars';

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
  return {
    exportedAt: new Date().toISOString(),
    tool: 'RedBird 工具箱',
    chatId: c.getCurrentChatId?.() ?? null,
    card: char?.name ?? null,
    mainApi: c.mainApi,
    chatLength: c.chat?.length ?? 0,
    captures: captures.value.map(({ rawChat: _raw, ...cap }) => cap),
    vars,
    env,
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
