/**
 * 导入窗口：选好（或拖进来）文件后，先列出每个文件认出来是什么，顺便问：
 * - 导入后要不要设成现在在用的（预设换过去 / 世界书全局打开 / 角色卡直接打开）；
 * - 有没有作者、链接、备注（选填，导入后存进对应的档案里）。
 * 都不勾不填，就是普通导入。
 */
import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { normalizeUrl } from '../core/cards';
import { ctx, runSlash, slashQuote, toast } from '../st/st';
import { presetNames, switchPreset, updateRecord, worldNames, archiveVersion } from '../tools/cards/cards';
import { KIND_LABEL, KIND_TAB, prepareImport, runImport, type ImportItem } from '../tools/importer';
import { updateSource } from '../tools/sources';
import { refreshStatus } from '../shell/EnvStatus';
import { Tag } from './common';
import { setGlobalTab, sheetOpen } from './views';

const draft = signal<ImportItem[] | null>(null);

export async function openImport(files: File[]): Promise<void> {
  if (!files.length) return;
  draft.value = await prepareImport(files);
}

export const IMPORT_ACCEPT = '.json,.settings,.lorebook,.png,.charx,.byaf,.yaml,.yml';

const ACTIVATE: Partial<Record<ImportItem['kind'], string>> = {
  preset: '导入后换成这个预设',
  world: '导入后作为全局世界书打开（对所有卡生效）',
  character: '导入后打开这张卡',
};

function Row({ it, onChange }: { it: ImportItem; onChange: (patch: Partial<ImportItem>) => void }) {
  const [more, setMore] = useState(false);
  const canExtra = it.kind === 'preset' || it.kind === 'world' || it.kind === 'character';
  const bad = it.url.trim() && !normalizeUrl(it.url);
  return (
    <div class={`rbt-imp-row ${it.kind === 'unknown' ? 'off' : ''}`}>
      <div class="rbt-imp-head">
        <Tag tone={it.kind === 'unknown' ? 'bad' : undefined}>{KIND_LABEL[it.kind]}</Tag>
        <span class="rbt-imp-name">{it.file.name}</span>
      </div>
      {it.kind === 'unknown' && <small class="rbt-muted">认不出是什么，会跳过。支持预设、世界书、正则和角色卡。</small>}
      {it.kind === 'regex' && <small class="rbt-muted">导入时酒馆会问放到哪里：全局、当前这张卡，还是当前预设。</small>}
      {ACTIVATE[it.kind] && (
        <label class="rbt-imp-check"><input type="checkbox" checked={it.activate} onChange={(e) => onChange({ activate: (e.currentTarget as HTMLInputElement).checked })} />{ACTIVATE[it.kind]}</label>
      )}
      {canExtra && !more && <button type="button" class="rbt-linkbtn rbt-imp-more" onClick={() => setMore(true)}>＋ 作者、链接和备注（选填）</button>}
      {canExtra && more && (
        <div class="rbt-source-edit">
          {it.kind !== 'character' && (
            <div class="rbt-form-row"><small class="rbt-muted rbt-source-k">作者</small><input class="text_pole rbt-input" placeholder="作者名字" value={it.author} onInput={(e) => onChange({ author: (e.currentTarget as HTMLInputElement).value })} /></div>
          )}
          <div class="rbt-form-row">
            <input class="text_pole rbt-input rbt-w-label" placeholder="名称，如：发布帖" value={it.linkLabel} onInput={(e) => onChange({ linkLabel: (e.currentTarget as HTMLInputElement).value })} />
            <input class="text_pole rbt-input" placeholder="链接，比如 discord.com/channels/…" value={it.url} onInput={(e) => onChange({ url: (e.currentTarget as HTMLInputElement).value })} />
          </div>
          {bad && <small class="rbt-warn-text">这不像一个网址。</small>}
          <textarea class="text_pole rbt-textarea" rows={2} placeholder={it.kind === 'character' ? '作者说明：推荐设置、玩法、注意事项' : '备注：这一版改了什么、怎么用'} value={it.notes} onInput={(e) => onChange({ notes: (e.currentTarget as HTMLTextAreaElement).value })} />
        </div>
      )}
    </div>
  );
}

export function ImportDialog() {
  const items = draft.value;
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!items) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy && !document.querySelector('dialog[open]')) draft.value = null; };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [items, busy]);
  if (!items) return null;
  const usable = items.filter((i) => i.kind !== 'unknown');
  const set = (idx: number, patch: Partial<ImportItem>) => { draft.value = items.map((it, i) => (i === idx ? { ...it, ...patch } : it)); };

  const go = async () => {
    setBusy(true);
    try {
      const done = await runImport(usable, {
        presetNames, worldNames,
        characterAvatars: () => (ctx().characters ?? []).map((c: { avatar: string }) => c.avatar),
        switchPreset,
        setWorldGlobal: async (n) => { await runSlash(`/world state=on silent=true ${slashQuote(n)}`); },
        openCharacter: async (avatar) => { const i = (ctx().characters ?? []).findIndex((c: { avatar: string }) => c.avatar === avatar); if (i >= 0) await ctx().selectCharacterById(i); },
        saveSource: (kind, name, rec) => updateSource(kind, name, { author: rec.author, links: rec.links, notes: rec.notes }),
        saveCardRecord: (avatar, rec) => {
          const ch = (ctx().characters ?? []).find((c: { avatar: string }) => c.avatar === avatar);
          updateRecord(avatar, ch?.name ?? avatar, { links: rec.links, notes: rec.notes });
        },
        normalizeUrl,
      });
      const missed = done.filter((d) => !d.name && d.item.kind !== 'regex');
      if (missed.length) toast('warning', `这些没能确认导入成功（可能在酒馆的提示里取消了）：${missed.map((d) => d.item.file.name).join('、')}`, '导入');
      const tabs = [...new Set(usable.map((i) => KIND_TAB[i.kind]).filter(Boolean))];
      if (tabs.length === 1 && sheetOpen.value) setGlobalTab(tabs[0]!);
      archiveVersion.value++;
      refreshStatus();
      draft.value = null;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div class="rbt-sheet-backdrop rbt-imp-backdrop" onMouseDown={() => { if (!busy) draft.value = null; }} />
      <section class="rbt-sheet rbt-scope rbt-imp" role="dialog" aria-label="导入">
        <header class="rbt-sheet-bar">
          <span class="rbt-sheet-title"><i class="fa-solid fa-file-import fa-fw" />导入 {items.length} 个文件</span>
          <button type="button" class="rbt-sheet-close" title="取消（Esc）" aria-label="取消" disabled={busy} onClick={() => { draft.value = null; }}>✕</button>
        </header>
        <div class="rbt-sheet-body">
          {items.map((it, i) => <Row key={`${it.file.name}${i}`} it={it} onChange={(p) => set(i, p)} />)}
        </div>
        <footer class="rbt-imp-foot">
          <small class="rbt-muted">都不勾不填，就是普通导入。用的是酒馆自己的导入，重名时酒馆会问要不要覆盖。</small>
          <button type="button" class="rbt-btn" disabled={busy} onClick={() => { draft.value = null; }}>取消</button>
          <button type="button" class="rbt-btn rbt-btn-primary" disabled={busy || !usable.length} onClick={go}>{busy ? '正在导入…' : `导入 ${usable.length} 个`}</button>
        </footer>
      </section>
    </>
  );
}
