/**
 * 全局工具箱里的删除（单个和批量）：预设、世界书、美化、全局正则。
 *
 * 每次删除前：
 * 1. 把要删的东西整份备份成一个文件，放在 data/<用户>/user/files（备份失败就不删）；
 * 2. 再用酒馆自己的功能删除（和在酒馆面板里删一样，列表、下拉框都会跟着更新）。
 * 删完弹一条通知「已删除 N 个…，点这里撤销」，点一下就用备份恢复。
 *
 * 正在用的预设和美化不能删（界面上也不让选）。
 */
import { ctx, loaded, runSlash, saveSettings, slashQuote, toast, type Any } from '../st/st';
import { loadThemes, stThemes, type StTheme } from '../look/look';
import { archiveVersion } from './cards/cards';
import { refreshEnv } from './env/env';

export type TrashKind = 'preset' | 'world' | 'theme' | 'regex';

export const TRASH_LABEL: Record<TrashKind, string> = { preset: '预设', world: '世界书', theme: '美化', regex: '正则' };

interface Removed {
  kind: TrashKind;
  /** 预设 / 世界书 / 美化的名字，正则的 id */
  id: string;
  name: string;
  data: Any;
  /** 世界书：删之前是不是全局开着；正则：原来在列表里的位置 */
  wasGlobal?: boolean;
  index?: number;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function backup(kind: TrashKind, items: Removed[]): Promise<string> {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  const file = `rbt-deleted-${kind}-${stamp}.json`;
  const body = JSON.stringify({ rbtDeleted: kind, at: new Date().toISOString(), items: items.map(({ name, data, wasGlobal, index }) => ({ name, data, wasGlobal, index })) }, null, 2);
  const res = await fetch('/api/files/upload', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ name: file, data: toBase64(body) }) });
  if (!res.ok) throw new Error(`备份失败：${res.status}`);
  return file;
}

const presetManager = (): Any => ctx().getPresetManager?.();
const globalWorlds = (): string[] => (loaded.worldInfo?.selected_world_info ?? []) as string[];
const REGEX_GLOBAL = 0;

/** 先读出要删的东西（备份和撤销都用它）。读不到的跳过。 */
async function collect(kind: TrashKind, ids: string[]): Promise<Removed[]> {
  const out: Removed[] = [];
  if (kind === 'preset') {
    for (const name of ids) {
      const data = presetManager()?.getPresetSettings?.(name);
      if (data) out.push({ kind, id: name, name, data: structuredClone(data) });
    }
  } else if (kind === 'world') {
    for (const name of ids) {
      const data = await loaded.worldInfo?.loadWorldInfo?.(name);
      if (data) out.push({ kind, id: name, name, data: structuredClone(data), wasGlobal: globalWorlds().includes(name) });
    }
  } else if (kind === 'theme') {
    for (const name of ids) {
      const t = stThemes.value.find((x: StTheme) => x.name === name);
      if (t) out.push({ kind, id: name, name, data: structuredClone(t) });
    }
  } else {
    const list: Any[] = loaded.regexEngine?.getScriptsByType?.(REGEX_GLOBAL) ?? [];
    list.forEach((s, index) => { if (ids.includes(s.id)) out.push({ kind, id: s.id, name: s.scriptName || '(未命名正则)', data: structuredClone(s), index }); });
  }
  return out;
}

async function remove(items: Removed[]): Promise<Removed[]> {
  const done: Removed[] = [];
  const kind = items[0]?.kind;
  if (kind === 'regex') {
    const re = loaded.regexEngine;
    const ids = new Set(items.map((i) => i.id));
    const list: Any[] = re?.getScriptsByType?.(REGEX_GLOBAL) ?? [];
    await re?.saveScriptsByType?.(list.filter((s) => !ids.has(s.id)), REGEX_GLOBAL);
    saveSettings();
    return items;
  }
  for (const it of items) {
    try {
      if (kind === 'preset') {
        if (await presetManager()?.deletePreset?.(it.id)) done.push(it);
      } else if (kind === 'world') {
        if (await loaded.worldInfo?.deleteWorldInfo?.(it.id)) done.push(it);
      } else if (kind === 'theme') {
        const res = await fetch('/api/themes/delete', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ name: it.id }) });
        if (res.ok) {
          document.querySelectorAll<HTMLOptionElement>('#themes option').forEach((o) => { if (o.value === it.id) o.remove(); });
          stThemes.value = stThemes.value.filter((x: StTheme) => x.name !== it.id);
          done.push(it);
        }
      }
    } catch (e) {
      console.error('[RedBird] delete failed', it.name, e);
    }
  }
  return done;
}

async function restore(items: Removed[]): Promise<void> {
  const kind = items[0]?.kind;
  if (kind === 'regex') {
    const re = loaded.regexEngine;
    const list: Any[] = [...(re?.getScriptsByType?.(REGEX_GLOBAL) ?? [])];
    for (const it of [...items].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) list.splice(Math.min(it.index ?? list.length, list.length), 0, it.data);
    await re?.saveScriptsByType?.(list, REGEX_GLOBAL);
    saveSettings();
    return;
  }
  for (const it of items) {
    if (kind === 'preset') await presetManager()?.savePreset?.(it.name, it.data);
    else if (kind === 'world') {
      await loaded.worldInfo?.saveWorldInfo?.(it.name, it.data, true);
      await loaded.worldInfo?.updateWorldInfoList?.();
      if (it.wasGlobal) await runSlash(`/world state=on silent=true ${slashQuote(it.name)}`);
    } else if (kind === 'theme') {
      await fetch('/api/themes/save', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify(it.data) });
    }
  }
  if (kind === 'theme') await loadThemes();
}

function after(): void {
  archiveVersion.value++;
  refreshEnv();
  if (ctx().getCurrentChatId?.()) void ctx().reloadCurrentChat?.();
}

/**
 * 删除（已经确认过）。返回实际删掉的个数。删完弹一条可以撤销的通知。
 */
export async function trash(kind: TrashKind, ids: string[]): Promise<number> {
  const label = TRASH_LABEL[kind];
  const items = await collect(kind, ids);
  if (!items.length) return 0;
  let file = '';
  try {
    file = await backup(kind, items);
  } catch (e) {
    toast('error', `${(e as Error).message}，没有删除。`, '删除');
    return 0;
  }
  const done = await remove(items);
  after();
  if (!done.length) { toast('error', `没能删除${label}。`, '删除'); return 0; }
  const failed = items.length - done.length;
  const what = done.length === 1 ? `「${done[0].name}」` : `${done.length} 个${label}`;
  let undone = false;
  toast('success', `已删除${what}${failed ? `，另有 ${failed} 个没删掉` : ''}。点这里撤销。备份在 user/files/${file}`, '删除', {
    timeOut: 15000,
    extendedTimeOut: 8000,
    onclick: async () => {
      if (undone) return;
      undone = true;
      await restore(done);
      after();
      toast('success', `已恢复${what}。`, '删除');
    },
  });
  return done.length;
}
