/**
 * 导入窗口。按用户看到它时依次想知道的事情排层级：
 * 1. 这是什么（真实名字 + 类型，角色卡带头像）——最醒目；
 * 2. 会不会导入（跳过的：提醒和「仍然导入」放在同一个提醒块里）；
 * 3. 和别的文件的关系（一起发布的世界书、预设、重复的 JSON 挂在那张卡下面）；
 * 4. 导入后做什么（勾选项）；
 * 5. 来源：作者、链接、备注——一次发布通常同一个作者和帖子，所以整批只填一次，默认收起；
 * 6. 文件名——最弱的一行小灰字。
 * 都不勾、不填，就是普通导入。
 */
import { signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { normalizeUrl } from '../core/cards';
import { charaFileName, ctx, loaded, runSlash, settings, slashQuote, toast } from '../st/st';
import { importCardWorld, presetNames, setRecommendedPreset, switchPreset, updateRecord, worldNames, archiveVersion } from '../tools/cards/cards';
import { KIND_LABEL, KIND_TAB, prepareImport, runImport, type ImportItem } from '../tools/importer';
import { updateSource } from '../tools/sources';
import { refreshStatus } from '../shell/EnvStatus';
import { importCharacterUrl } from '../shell/characters';
import { CheckRow } from './common';
import { TitleBar } from './TitleBar';
import { loadThemes, useStTheme } from '../look/look';
import { setGlobalTab, sheetOpen } from './views';

const draft = signal<ImportItem[] | null>(null);
/** The window is open on its first step: nothing picked yet. */
const picking = signal(false);
/** Files are being dragged over the first step's drop area. */
const over = signal(false);

/** Open the import window. With no files it starts on the drop area / file picker. */
export async function openImport(files: File[] = []): Promise<void> {
  if (!files.length) { picking.value = true; return; }
  draft.value = await prepareImport(files);
  picking.value = false;
}

/** True while the import window is open (either step). */
export const importOpen = (): boolean => picking.value || !!draft.value;

function closeImport(): void {
  draft.value = null;
  picking.value = false;
  over.value = false;
}

export const IMPORT_ACCEPT = '.json,.settings,.lorebook,.png,.charx,.byaf,.yaml,.yml';
const canDrag = (): boolean => !window.matchMedia?.('(pointer: coarse)').matches;
const hasFiles = (e: DragEvent): boolean => [...(e.dataTransfer?.types ?? [])].includes('Files');

/**
 * Drops on the import window (and its backdrop) never reach ST's page-wide handler,
 * which would import everything as a character. First step: take the files. Second step: refuse.
 */
const dropHandlers = {
  onDragOver: (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = picking.value ? 'copy' : 'none';
    if (picking.value) over.value = true;
  },
  onDragLeave: (e: DragEvent) => { if (!e.relatedTarget || !(e.currentTarget as Node).contains(e.relatedTarget as Node)) over.value = false; },
  onDrop: (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    over.value = false;
    if (picking.value) void openImport([...(e.dataTransfer?.files ?? [])]);
  },
};

const KINDS: { label: string; icon: string }[] = [
  { label: '角色卡', icon: 'fa-user' }, { label: '预设', icon: 'fa-sliders' }, { label: '世界书', icon: 'fa-book' },
  { label: '正则', icon: 'fa-code' }, { label: '美化', icon: 'fa-palette' },
];

/** First step: one big drop area that is also the file picker. */
function PickStep() {
  const ref = useRef<HTMLInputElement>(null);
  const drag = canDrag();
  const pick = () => ref.current?.click();
  return (
    <>
      <div class="rbt-sheet-backdrop rbt-imp-backdrop" onMouseDown={closeImport} {...dropHandlers} />
      <section class="rbt-sheet rbt-scope rbt-imp rbt-imp-pick" role="dialog" aria-label="导入文件" {...dropHandlers}>
        <TitleBar class="rbt-sheet-bar" icon="fa-file-import" title="导入文件" onClose={closeImport} />
        <div class="rbt-sheet-body">
          <div class={`rbt-imp-drop ${over.value ? 'over' : ''}`} onClick={pick}>
            <i class="fa-solid fa-arrow-up-from-bracket rbt-imp-drop-ico" />
            {drag && <b>{over.value ? '松开鼠标，开始导入' : '把文件拖到这里'}</b>}
            <button type="button" class="rbt-btn rbt-btn-primary" onClick={(e) => { e.stopPropagation(); pick(); }}>选择文件</button>
            <small>可以多选。工具箱会识别每个文件的类型。</small>
          </div>
          <div class="rbt-imp-kinds">
            <span>支持</span>
            {KINDS.map((k) => <span key={k.label} class="rbt-imp-kind"><i class={`fa-solid ${k.icon} fa-fw`} />{k.label}</span>)}
          </div>
          <input ref={ref} type="file" multiple accept={IMPORT_ACCEPT} style={{ display: 'none' }} onChange={(e) => {
            const input = e.currentTarget as HTMLInputElement;
            const files = [...(input.files ?? [])];
            input.value = '';
            void openImport(files);
          }} />
        </div>
        <footer class="rbt-imp-foot">
          <button type="button" class="rbt-linkbtn" onClick={() => { closeImport(); importCharacterUrl(); }}>
            <i class="fa-solid fa-link fa-fw" /> 从链接导入角色卡
          </button>
        </footer>
      </section>
    </>
  );
}

const KIND_ICON: Record<ImportItem['kind'], string> = {
  character: 'fa-user', preset: 'fa-sliders', world: 'fa-book', regex: 'fa-code', theme: 'fa-palette', unknown: 'fa-file-circle-question',
};

/** 「导入后」的选项。名字自己就说清楚，不靠上面的小标题。 */
const ACTIVATE: Partial<Record<ImportItem['kind'], { label: string; detail?: string }>> = {
  preset: { label: '导入后换成这个预设' },
  world: { label: '导入后作为全局世界书打开', detail: '对所有卡生效' },
  character: { label: '导入后打开这张卡' },
  theme: { label: '导入后换成这个美化', detail: '会关掉工具箱自带的美化' },
};

/** 第二层：类型 + 关键事实，一行。 */
function facts(it: ImportItem): string {
  const k = KIND_LABEL[it.kind];
  if (it.kind === 'character' && it.card) return [k, it.card.bookEntries ? `自带世界书 ${it.card.bookEntries} 条` : '', it.card.regexCount ? `自带正则 ${it.card.regexCount} 条` : ''].filter(Boolean).join(' · ');
  if (it.kind === 'world' && it.entries !== undefined) return `${k} · ${it.entries} 条`;
  if (it.kind === 'regex') return `${k}${it.entries ? ` · ${it.entries} 条` : ''} · 导入时酒馆会问放到哪里`;
  if (it.kind === 'theme') return `${k} · 以后也能在「用户设置 › 界面主题」里换`;
  return k;
}

/** 角色卡 PNG 的头像。 */
function useThumb(it: ImportItem): string | null {
  const url = useMemo(() => (it.kind === 'character' && /\.png$/i.test(it.file.name) ? URL.createObjectURL(it.file) : null), [it.file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

function Item({ it, onChange, cardName, nested, children }: {
  it: ImportItem;
  onChange: (patch: Partial<ImportItem>) => void;
  cardName?: string;
  nested?: boolean;
  children?: preact.ComponentChildren;
}) {
  const thumb = useThumb(it);
  const unknown = it.kind === 'unknown';
  const act = !it.skip && !unknown ? ACTIVATE[it.kind] : undefined;
  const bindWorld = !it.skip && it.kind === 'world' && it.toCard !== undefined && !!cardName;
  const bindPreset = !it.skip && it.kind === 'preset' && it.toCard !== undefined && !!cardName;
  const off = it.skip || unknown;
  // 被认成重复、默认不导入的：最不需要操作，收成一行提醒
  if (it.dupOf && it.skip) {
    return (
      <div class={`rbt-imp-item compact ${nested ? 'nested' : ''}`}>
        <div class="rbt-imp-alert">
          <i class="fa-solid fa-circle-exclamation" />
          <div>
            <p>不导入 {it.file.name}</p>
            <small>{it.note}</small>
            <CheckRow label="仍然导入" checked={false} onChange={(v) => onChange({ skip: !v })} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div class={`rbt-imp-item ${nested ? 'nested' : ''} ${off ? 'off' : ''}`}>
      <div class="rbt-imp-top">
        {thumb ? <img class="rbt-imp-thumb" src={thumb} alt="" /> : <span class="rbt-imp-ico"><i class={`fa-solid ${KIND_ICON[it.kind]}`} /></span>}
        <div class="rbt-imp-id">
          <div class="rbt-imp-title">{unknown ? it.file.name : it.title}</div>
          <div class="rbt-imp-facts">{facts(it)}</div>
          {!unknown && it.file.name !== it.title && <div class="rbt-imp-file">{it.file.name}</div>}
        </div>
      </div>

      {/* 不导入的：原因和「仍然导入」是一件事，放在同一个提醒块里 */}
      {unknown && <div class="rbt-imp-alert"><i class="fa-solid fa-circle-exclamation" /><div><p>认不出是什么文件，会跳过。</p><small>支持预设、世界书、正则、角色卡和美化。</small></div></div>}
      {it.dupOf && (
        <div class={`rbt-imp-alert ${it.skip ? '' : 'resolved'}`}>
          <i class="fa-solid fa-circle-exclamation" />
          <div>
            <p>{it.skip ? '不会导入' : '会照样导入'}</p>
            <small>{it.note}</small>
            <CheckRow label="仍然导入" checked={!it.skip} onChange={(v) => onChange({ skip: !v })} />
          </div>
        </div>
      )}

      {(bindWorld || bindPreset || act) && (
        <div class="rbt-imp-actions">
          {bindWorld && <CheckRow label={`绑到「${cardName}」上`} detail={it.note || undefined} checked={!!it.toCard} onChange={(v) => onChange({ toCard: v })} />}
          {bindPreset && <CheckRow label={`设为「${cardName}」的推荐预设`} detail="切到这张卡时自动换成它" checked={!!it.toCard} onChange={(v) => onChange({ toCard: v })} />}
          {act && <CheckRow label={act.label} detail={act.detail} checked={it.activate} onChange={(v) => onChange({ activate: v })} />}
        </div>
      )}
      {children}
    </div>
  );
}

interface Source { author: string; linkLabel: string; url: string; notes: string }
const NO_SOURCE: Source = { author: '', linkLabel: '', url: '', notes: '' };

function SourceFields({ src, set, count }: { src: Source; set: (s: Source) => void; count: number }) {
  const [open, setOpen] = useState(false);
  const bad = src.url.trim() && !normalizeUrl(src.url);
  if (!open) return <button type="button" class="rbt-linkbtn rbt-imp-more" onClick={() => setOpen(true)}>＋ 记下作者、链接和备注（选填）</button>;
  return (
    <div class="rbt-imp-source">
      <div class="rbt-imp-source-head">
        <b>来源</b>
        <small>{count > 1 ? `会记在这次导入的 ${count} 个东西上，以后在全局工具箱和角色档案里能看到` : '以后在全局工具箱和角色档案里能看到'}</small>
      </div>
      <div class="rbt-form-row"><small class="rbt-muted rbt-source-k">作者</small><input class="text_pole rbt-input" placeholder="作者名字" value={src.author} onInput={(e) => set({ ...src, author: (e.currentTarget as HTMLInputElement).value })} /></div>
      <div class="rbt-form-row">
        <input class="text_pole rbt-input rbt-w-label" placeholder="名称，如：发布帖" value={src.linkLabel} onInput={(e) => set({ ...src, linkLabel: (e.currentTarget as HTMLInputElement).value })} />
        <input class="text_pole rbt-input" placeholder="链接，比如 discord.com/channels/…" value={src.url} onInput={(e) => set({ ...src, url: (e.currentTarget as HTMLInputElement).value })} />
      </div>
      {bad && <small class="rbt-warn-text">这不像一个网址。</small>}
      <textarea class="text_pole rbt-textarea" rows={2} placeholder="备注：推荐设置、这一版改了什么、怎么用" value={src.notes} onInput={(e) => set({ ...src, notes: (e.currentTarget as HTMLTextAreaElement).value })} />
    </div>
  );
}

export function ImportDialog() {
  const items = draft.value;
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState<Source>(NO_SOURCE);
  useEffect(() => { if (!items) setSrc(NO_SOURCE); }, [items]);
  const open = !!items || picking.value;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy && !document.querySelector('dialog[open]')) closeImport(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy]);
  if (picking.value) return <PickStep />;
  if (!items) return null;
  const usable = items.filter((i) => i.kind !== 'unknown' && !i.skip);
  const theCard = items.filter((i) => i.kind === 'character' && !i.skip);
  const cardName = theCard.length === 1 ? theCard[0].card?.name : undefined;
  const set = (it: ImportItem, patch: Partial<ImportItem>) => { draft.value = items.map((x) => (x === it ? { ...x, ...patch } : x)); };
  // 一起发布的：一张卡 + 和它有关的文件（绑上去的世界书 / 预设、重复的 JSON、卡里自带的那本世界书）
  const main = theCard.length === 1 && theCard[0].card ? theCard[0] : null;
  const related = (it: ImportItem) => it !== main && (it.toCard !== undefined || (!!it.dupOf && (it.kind === 'character' ? it.card?.name === main?.card?.name : true)));
  const companions = main ? items.filter(related).sort((a, b) => Number(!!a.skip) - Number(!!b.skip)) : [];
  const others = items.filter((it) => it !== main && !companions.includes(it));
  const withSource = usable.filter((i) => i.kind === 'preset' || i.kind === 'world' || i.kind === 'character' || i.kind === 'theme').length;

  const go = async () => {
    setBusy(true);
    try {
      const done = await runImport(usable.map((it) => ({ ...it, ...src })), {
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
        bindWorld: async (avatar, world, extra) => {
          const chars = ctx().characters ?? [];
          const chid = chars.findIndex((c: { avatar: string }) => c.avatar === avatar);
          if (chid < 0) return;
          if (!extra && !chars[chid].data?.extensions?.world) { await ctx().writeExtensionField(chid, 'world', world); return; }
          // 卡已经有主世界书：作为附加世界书绑上（酒馆存在 world_info.charLore 里）
          const wi = loaded.worldInfo?.world_info;
          if (!wi) return;
          const file = charaFileName(avatar);
          const lore = (wi.charLore ??= []);
          let e = lore.find((x: { name: string }) => x.name === file);
          if (!e) { e = { name: file, extraBooks: [] }; lore.push(e); }
          if (!e.extraBooks.includes(world)) e.extraBooks.push(world);
          ctx().saveSettingsDebounced();
        },
        useTheme: useStTheme,
        importCardWorld: settings().autoImportWorld ? (avatar) => importCardWorld(avatar, { quiet: true }) : undefined,
        setCardPreset: (avatar, preset) => {
          const ch = (ctx().characters ?? []).find((c: { avatar: string }) => c.avatar === avatar);
          setRecommendedPreset(avatar, ch?.name ?? avatar, preset);
        },
      });
      const missed = done.filter((d) => !d.name && d.item.kind !== 'regex');
      if (missed.length) toast('warning', `这些没能确认导入成功（可能在酒馆的提示里取消了）：${missed.map((d) => d.item.file.name).join('、')}`, '导入');
      const tabs = [...new Set(usable.map((i) => KIND_TAB[i.kind]).filter(Boolean))];
      if (tabs.length === 1 && sheetOpen.value) setGlobalTab(tabs[0]!);
      archiveVersion.value++;
      if (usable.some((i) => i.kind === 'theme')) void loadThemes();
      refreshStatus();
      closeImport();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div class="rbt-sheet-backdrop rbt-imp-backdrop" onMouseDown={() => { if (!busy) closeImport(); }} {...dropHandlers} />
      <section class="rbt-sheet rbt-scope rbt-imp" role="dialog" aria-label="导入" {...dropHandlers}>
        <TitleBar class="rbt-sheet-bar" icon="fa-file-import" title={`导入 ${items.length} 个文件`} closeLabel="取消" disabled={busy} onClose={closeImport} />
        <div class="rbt-sheet-body">
          {main && (
            <Item it={main} onChange={(p) => set(main, p)}>
              {companions.length > 0 && (
                <div class="rbt-imp-group">
                  <div class="rbt-imp-group-title">一起发布的 {companions.length} 个文件</div>
                  {companions.map((it) => <Item key={it.file.name} it={it} nested cardName={cardName} onChange={(p) => set(it, p)} />)}
                </div>
              )}
            </Item>
          )}
          {others.map((it) => <Item key={it.file.name} it={it} cardName={cardName} onChange={(p) => set(it, p)} />)}
          {withSource > 0 && <SourceFields src={src} set={setSrc} count={withSource} />}
        </div>
        <footer class="rbt-imp-foot">
          <small class="rbt-muted">用的是酒馆自己的导入，重名时酒馆会问要不要覆盖。</small>
          <button type="button" class="rbt-btn" disabled={busy} onClick={closeImport}>取消</button>
          <button type="button" class="rbt-btn rbt-btn-primary" disabled={busy || !usable.length} onClick={go}>{busy ? '正在导入…' : `导入 ${usable.length} 个`}</button>
        </footer>
      </section>
    </>
  );
}
