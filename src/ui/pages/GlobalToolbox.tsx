/**
 * 全局工具箱：按酒馆自己的东西分标签——预设、世界书、正则、插件、美化，加一个备份。
 * 「对所有卡生效」不再是一个标签，而是每样东西身上的标记（全局开着 / 正在用）。
 *
 * 交互规则（整个工具箱一致）：
 * - 结尾有 › 的整行：在这里打开详情，顶部「‹ 返回」回来，不跳去别处；
 * - 结尾有 ↗ 的：去酒馆自己的面板或网页；
 * - 开关就是开关，按钮就是按钮；其余文字不可点，也不上色。
 */
import { signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { askText, confirmText, ctx, currentCharacter, loaded, saveSettings, settings, toast } from '../../st/st';
import { createPersona, currentPersona, deletePersona, lockChatPersona, personaCards, personaDesc, personaIds, personaImage, personaLabel, personaName, personaThumb, personaTitle, pickAvatar, renamePersona, setPersonaAvatar, setPersonaDesc, setPersonaTitle, type PickedAvatar } from '../../st/personas';
import {
  allCharacters,
  archiveVersion,
  buildOverview,
  cardInfo,
  cardsMissingWorld,
  currentPresetName,
  dropRecord,
  exportArchive,
  importAllMissingWorlds,
  importArchive,
  presetNames,
  presetRegexCount,
  relink,
  setCardTheme,
  switchPreset,
  thumbnailUrl,
  worldNames,
  type CardInfo,
} from '../../tools/cards/cards';
import { envReport, refreshEnv, type EnvItem } from '../../tools/env/env';
import { currentBookScopes } from '../../tools/flow/capture';
import { compareVersions, renameSeries, setSeries, sourceFor, sourcesTick, suggestSeries, updateSource, type SourceKind } from '../../tools/sources';
import { openDrawer } from '../../shell/drawers';
import { shortSaveName } from '../../shell/recent';
import { openBookInEditor } from '../../shell/worldNote';
import { Empty, NavRow, CheckRow, Tag, Toggle } from '../common';
import { attachBook, detachBook, globalValue, setCardItem, setGlobal, trueGlobalWorlds } from '../../tools/env/setup';
import { currentModel, modelLabel, modelsApply, presetBindsConnection, presetConnection, SOURCE_LABEL, stModelList, type ModelChoice } from '../../tools/model';
import { currentDetail, detailStack, GLOBAL_TAB_ICONS, GLOBAL_TAB_LABELS, GLOBAL_TABS, globalTab, goBack, openDetail, setGlobalTab, type GlobalTab } from '../views';
import { installPlugin } from '../../tools/importer';
import { importOpen, openImport } from '../ImportDialog';
import { CardPage } from './CardPage';
import { AddGlobalWorld, GlobalRegexList, GlobalWorldList, ItemRow, openRegexManager, PluginList, PresetPicker, SubItemList } from './GlobalPage';
import { trash, TRASH_LABEL, type TrashKind } from '../../tools/trash';
import { charsTick } from '../../shell/characters';
import { bindPersona, NotesSection, organizing, personaTick, Section, unbindPersona, useOrganize, watchPersonas } from './parts';
import { QUOTE_COLORS, type LookKind } from '../../core/quote';
import { personaStatus } from '../../shell/StatusBar';
import { BindingsDetail, CardsTablePage } from './CardsTable';
import { ScopePage } from './scope';
import { LOOK_COPY, LOOK_NAME } from '../copy';
import { mesLayoutOn, setMesLayout } from '../../shell/mesActions';
import { compact, shellOn } from '../../shell/Shell';
import { PresetScriptsSection, ScriptsPage } from './ScriptsPage';
import { MenuHead, MenuOpt, ModelForm, PickRow, Popup, type Opt } from './setupParts';
import { MoreMenu } from '../Menu';
import {
  ACCENTS, accentId, currentStTheme, loadThemes, LOOKS, lookId, lookOn, quoteId, READ_WIDTHS, readWidth, setAccent, setQuoteColor, setReadWidth, setStChatWidth, stChatWidth, stThemes, themeHasCss, themesLoading,
  useBuiltInLook, useStTheme, type StTheme,
} from '../../look/look';

// ------------------------------------------------------------ shared ---

/** Names of every preset / worldbook / theme, for series and version lists. */

/** 全部卡的总览：几百张卡时一次要几十毫秒。卡、档案、来源都没变时，各页面重画直接用上次的 */
let ovCache: { key: string; val: ReturnType<typeof buildOverview> } | null = null;
function overview(): ReturnType<typeof buildOverview> {
  const key = `${archiveVersion.value}|${charsTick.value}|${sourcesTick.value}|${ctx().characters?.length ?? 0}`;
  if (ovCache?.key !== key) ovCache = { key, val: buildOverview() };
  return ovCache.val;
}

function namesOf(kind: SourceKind): string[] {
  if (kind === 'preset') return presetNames();
  if (kind === 'theme') return stThemes.value.map((t) => t.name);
  return worldNames();
}

function openItem(kind: SourceKind, name: string, back: string): void {
  if (kind === 'preset') openDetail({ kind: 'preset', name }, back);
  else if (kind === 'theme') openDetail({ kind: 'theme', name }, back);
  else openDetail({ kind: 'world', name }, back);
}

function cardsOf(list: CardInfo[] | undefined): string {
  if (!list?.length) return '';
  return list.length <= 2 ? list.map((c) => c.name).join('、') : `${list.slice(0, 2).map((c) => c.name).join('、')} 等 ${list.length} 张卡`;
}

function openWorldInST(name: string): void {
  openDrawer('worldinfo');
  setTimeout(() => openBookInEditor(name), 300);
}

/** Group names by series; items without one go to the end, one group each? No — together under 其他. */
function groupBySeries(kind: SourceKind, names: string[]): { series: string; names: string[] }[] {
  const by = new Map<string, string[]>();
  for (const n of names) {
    const s = sourceFor(kind, n).series;
    by.set(s, [...(by.get(s) ?? []), n]);
  }
  const groups = [...by.entries()].filter(([s]) => s).sort(([a], [b]) => a.localeCompare(b, 'zh')).map(([series, ns]) => ({
    series,
    names: ns.sort((x, y) => compareVersions(sourceFor(kind, x).version, sourceFor(kind, y).version) || x.localeCompare(y, 'zh')),
  }));
  const rest = by.get('') ?? [];
  if (rest.length) groups.push({ series: '', names: rest.sort((x, y) => x.localeCompare(y, 'zh')) });
  return groups;
}

/**
 * 「名字相近」的提示：平时只占一行小字，点「看看」才展开。
 * 点「不用」记下来（存在设置里），以后打开也不再提这一组。
 */
function SeriesSuggestions({ kind, names }: { kind: SourceKind; names: string[] }) {
  void sourcesTick.value;
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const no = settings().seriesNoSuggest?.[kind] ?? [];
  const list = suggestSeries(kind, names).filter((g) => !no.includes(g.series));
  if (!list.length) return null;
  const dismiss = (series: string) => {
    const s = settings();
    s.seriesNoSuggest ??= {};
    s.seriesNoSuggest[kind] = [...new Set([...(s.seriesNoSuggest[kind] ?? []), series])];
    saveSettings();
    bump((n) => n + 1);
  };
  if (!open) {
    return (
      <button type="button" class="rbt-series-tip" onClick={() => setOpen(true)}>
        <i class="fa-solid fa-lightbulb" /> 有 {list.length} 组名字相近，可以各放进一个文件夹 <span class="rbt-series-tip-go">查看 <i class="fa-solid fa-chevron-down" /></span>
      </button>
    );
  }
  return (
    <div class="rbt-series-suggest">
      {list.map((g) => (
        <div key={g.series} class="rbt-hint rbt-row-between">
          <span>{g.names.length} 个名字里都有「{g.series}」。</span>
          <span class="rbt-row">
            <button type="button" class="rbt-btn rbt-btn-small" onClick={() => dismiss(g.series)}>忽略</button>
            <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary" onClick={() => setSeries(kind, g.names, g.series)}>移入「{g.series}」文件夹</button>
          </span>
        </div>
      ))}
      <button type="button" class="rbt-linkbtn rbt-self-start" onClick={() => setOpen(false)}>收起</button>
    </div>
  );
}

/** 哪些文件夹收起来了：按种类记在浏览器里（只是看的方式，不用同步）。 */
const COLLAPSE_KEY = 'rbt-series-collapsed';
function readCollapsed(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '{}'); } catch { return {}; }
}

/** 一个文件夹：标题行点一下收起 / 展开，右边 ⋯ 里重命名、删除文件夹（里面的东西留着）。 */
function Folder({ kind, name, count, managing, children }: { kind: SourceKind & TrashKind; name: string; count: number; managing: boolean; children: preact.ComponentChildren }) {
  const [collapsed, setCollapsed] = useState(() => (readCollapsed()[kind] ?? []).includes(name));
  const toggle = () => {
    const all = readCollapsed();
    const set = new Set(all[kind] ?? []);
    if (collapsed) set.delete(name); else set.add(name);
    all[kind] = [...set];
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(all)); } catch { /* ignore */ }
    setCollapsed(!collapsed);
  };
  const rename = async () => {
    const to = await askText('重命名文件夹', name, '保存');
    if (to && to !== name) renameSeries(kind, name, to);
  };
  const remove = async () => {
    if (await confirmText(`删除文件夹「${name}」？`, `里面的 ${count} 个${TRASH_LABEL[kind]}会保留在库中，不会被删除。`, '删除文件夹')) renameSeries(kind, name, '');
  };
  return (
    <div class={`rbt-folder ${collapsed ? 'collapsed' : ''}`}>
      <div class="rbt-folder-head">
        <button type="button" class="rbt-folder-toggle" aria-expanded={!collapsed} onClick={toggle}>
          <i class={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-down'} fa-fw rbt-folder-caret`} />
          <i class={`fa-solid ${collapsed ? 'fa-folder' : 'fa-folder-open'} fa-fw rbt-folder-icon`} />
          <span class="rbt-folder-name">{name}</span>
          <span class="rbt-folder-count">{count}</span>
        </button>
        {!managing && <MoreMenu title={name} items={[
          { icon: 'fa-pen', text: '重命名', onClick: () => { void rename(); } },
          { icon: 'fa-trash-can', text: '删除文件夹', danger: true, onClick: () => { void remove(); } },
        ]} />}
      </div>
      {!collapsed && <div class="rbt-folder-items">{children}</div>}
    </div>
  );
}

/**
 * 「X 库」：一张卡片，上面是文件夹，下面是没放进文件夹的。标题右边「新建文件夹」「管理」。
 * 管理：每行变成勾选框，底部一条「移到文件夹」「删除」，一次处理很多个；页面上只留这一块（useOrganize）。
 * 新建文件夹：起好名字后直接进管理，选好放进去的（文件夹存在每一项身上，空文件夹存不下来）。
 * 正在用的（`locked` 返回原因）可以选、可以移，只是不能删。
 */
function FolderList({ kind, names: allNames, title, hint, back, sub, trail, filters, defaultFilter = 0, locked, deleteNote, embed }: {
  kind: SourceKind & TrashKind;
  names: string[];
  title: string;
  /** 放在另一张卡片里（美化库里的「其他美化」） */
  embed?: boolean;
  hint?: string;
  /** Optional quick filters shown as a segmented control (first one = all). */
  filters?: { label: string; test: (n: string) => boolean }[];
  /** Index of the filter selected when the list opens. */
  defaultFilter?: number;
  back: string;
  sub: (n: string) => string;
  trail?: (n: string) => preact.ComponentChildren;
  /** 不能删的（比如正在用的），返回原因。 */
  locked?: (n: string) => string | null;
  /** 删除确认框里额外要说的话（比如哪些卡在用这本世界书）。 */
  deleteNote?: (names: string[]) => string;
}) {
  void sourcesTick.value;
  const org = useOrganize(kind);
  const managing = org.on;
  const label = TRASH_LABEL[kind];
  const [picked, setPicked] = useState<string[]>([]);
  /** 刚新建、正在选要放进去的文件夹 */
  const [target, setTarget] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fi, setFi] = useState(defaultFilter);
  const names = filters ? allNames.filter(filters[fi]?.test ?? (() => true)) : allNames;
  const groups = groupBySeries(kind, names);
  const loose = groups.find((g) => !g.series)?.names ?? [];
  const deletable = picked.filter((n) => !locked?.(n));
  const toggle = (n: string) => setPicked((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
  const allOn = names.length > 0 && names.every((n) => picked.includes(n));
  const done = () => { org.stop(); setPicked([]); setTarget(null); };
  const moveTo = (folder: string) => { setSeries(kind, picked, folder); setPicked([]); setMoving(false); };
  const newFolder = async () => {
    const n = await askText('新建文件夹', '', '下一步');
    if (!n) return;
    setPicked([]);
    setTarget(n);
    if (!managing) org.start();
  };
  const moveToNew = async () => {
    setMoving(false);
    const n = await askText('新建文件夹', '', '移入');
    if (n) moveTo(n);
  };
  const del = async () => {
    if (!deletable.length) return;
    const shown = deletable.length <= 6 ? deletable.map((n) => `「${n}」`).join('') : `${deletable.slice(0, 6).map((n) => `「${n}」`).join('')} 等 ${deletable.length} 个`;
    const kept = picked.filter((n) => locked?.(n));
    const note = deleteNote?.(deletable);
    const ok = await confirmText(`删除 ${deletable.length} 个${label}？`, `${shown}\n\n${kept.length ? `${kept.map((n) => `「${n}」`).join('')}${locked?.(kept[0])}，不会删除。\n\n` : ''}${note ? `${note}\n\n` : ''}删除前自动备份。删除后 15 秒内可撤销。`, '删除');
    if (!ok) return;
    setBusy(true);
    try { if (await trash(kind, deletable)) { for (const n of deletable) updateSource(kind, n, { author: '', links: [], series: '', version: '', notes: '' }); setPicked([]); } } finally { setBusy(false); }
  };
  const row = (n: string) => {
    // 记了链接的，名字后面有个链接图标：一眼看出点进去有发布帖、教程
    if (!managing) return <NavRow key={n} title={sourceFor(kind, n).links.length || /https?:\/\//.test(sourceFor(kind, n).notes) ? <>{n}<i class="fa-solid fa-link rbt-navrow-link" role="img" aria-label="有链接" /></> : n} sub={sub(n) || undefined} trailing={trail?.(n)} onClick={() => openItem(kind, n, back)} />;
    const why = locked?.(n);
    return (
      <label key={n} class={`rbt-pickrow ${picked.includes(n) ? 'on' : ''}`}>
        <input type="checkbox" checked={picked.includes(n)} onChange={() => toggle(n)} />
        <span class="rbt-navrow-main"><span class="rbt-navrow-title">{n}</span>{(why || sub(n)) && <span class="rbt-navrow-sub">{why ?? sub(n)}</span>}</span>
      </label>
    );
  };
  const folderOptions: Opt[] = [
    { key: ' none', title: '移出文件夹', onPick: () => moveTo('') },
    ...groupBySeries(kind, allNames).filter((g) => g.series).map((g) => ({ key: g.series, title: g.series, onPick: () => moveTo(g.series) })),
    { key: ' new', title: '新建文件夹…', onPick: () => { void moveToNew(); } },
  ];
  return (
    <Section sub={embed} title={title} hint={managing ? undefined : hint} actions={managing ? (
      <>
        <button type="button" class="rbt-linkbtn" disabled={!names.length} onClick={() => setPicked(allOn ? [] : names)}>{allOn ? '取消全选' : '全选'}</button>
        <button type="button" class={`rbt-btn rbt-btn-small ${target ? '' : 'rbt-btn-primary'}`} onClick={done}>{target ? '取消' : '完成'}</button>
      </>
    ) : (
      <>
        <button type="button" class="rbt-btn rbt-btn-small" onClick={() => { void newFolder(); }}><i class="fa-solid fa-folder-plus" /> 新建文件夹</button>
        <button type="button" class="rbt-btn rbt-btn-small" onClick={org.start}>管理</button>
      </>
    )}>
      {!managing && <SeriesSuggestions kind={kind} names={allNames} />}
      {filters && (
        <div class="rbt-vseg rbt-list-filter" role="tablist">
          {filters.map((f, i) => <button key={f.label} type="button" class={fi === i ? 'active' : ''} onClick={() => setFi(i)}>{f.label} {allNames.filter(f.test).length}</button>)}
        </div>
      )}
      <div ref={org.ref} class="rbt-folder-list">
        {groups.filter((g) => g.series).map((g) => (
          <Folder key={g.series} kind={kind} name={g.series} count={g.names.length} managing={managing}>{g.names.map(row)}</Folder>
        ))}
        {loose.map(row)}
        {!names.length && <small class="rbt-muted">暂无{label}。</small>}
      </div>
      {managing && (
        <div class="rbt-selbar" role="toolbar" aria-label={`对选中的${label}`}>
          <span class="rbt-org-count">{target ? `选择要移入「${target}」的${label}` : `已选 ${picked.length} 个`}</span>
          {target ? (
            <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary rbt-push" disabled={!picked.length} onClick={() => { setSeries(kind, picked, target); done(); }}>移入{picked.length ? ` ${picked.length} 个` : ''}</button>
          ) : (
            <>
              <Popup title="移到文件夹" open={moving} onClose={() => setMoving(false)} options={folderOptions} cls="rbt-move rbt-push">
                <button type="button" class="rbt-btn rbt-btn-small" disabled={!picked.length} aria-haspopup="listbox" aria-expanded={moving} onClick={() => setMoving(!moving)}>移到文件夹…</button>
              </Popup>
              <button type="button" class="rbt-btn rbt-btn-small rbt-btn-danger" disabled={!deletable.length || busy} onClick={del}>{busy ? '正在删除…' : `删除${deletable.length ? ` ${deletable.length} 个` : ''}`}</button>
            </>
          )}
        </div>
      )}
    </Section>
  );
}

/** 详情页最下面的「删除」：和批量删除走同一套（先确认、先备份、可以撤销）。 */
function DeleteOne({ kind, name, locked, note }: { kind: TrashKind; name: string; locked?: string | null; note?: string }) {
  const [busy, setBusy] = useState(false);
  const label = TRASH_LABEL[kind];
  if (locked) return <small class="rbt-muted rbt-delete-one">{locked}，不能删除。</small>;
  return (
    <button type="button" class="rbt-btn rbt-btn-small rbt-btn-danger rbt-delete-one" disabled={busy} onClick={async () => {
      const ok = await confirmText(`删除${label}「${name}」？`, `${note ? `${note}\n\n` : ''}删除前自动备份。删除后 15 秒内可撤销。`, '删除');
      if (!ok) return;
      setBusy(true);
      try { if (await trash(kind, [name])) { if (kind !== 'regex') updateSource(kind as SourceKind, name, { author: '', links: [], series: '', version: '', notes: '' }); goBack(); } } finally { setBusy(false); }
    }}>{busy ? '正在删除…' : `删除${label}`}</button>
  );
}

/** 详情页的头：名字和状态小标签；下面一行按钮，位置固定（不跟在长短会变的名字后面）。 */
function DetailHead({ title, tags, note, actions }: { title: string; tags?: preact.ComponentChildren; note?: preact.ComponentChildren; actions?: preact.ComponentChildren }) {
  return (
    <div class="rbt-detail-top">
      <div class="rbt-detail-head"><h2>{title}</h2>{tags}</div>
      {note && <small class="rbt-muted">{note}</small>}
      {actions && <div class="rbt-detail-actions">{actions}</div>}
    </div>
  );
}

/**
 * 「专用它的卡」这类：列出卡，标题右边「添加角色卡」，每张卡的 ⋯ 里去掉。
 * `fixed` 返回原因的卡不能在这里去掉（比如角色卡自己绑的世界书），灰字写原因；`note` 是能去掉的卡的灰字。
 */
function BoundCards({ title, hint, cards, back, empty, onAdd, onRemove, removeText = '取消专用', fixed, note }: {
  title: string; hint?: string; cards: { avatar: string; name: string }[]; back: string; empty: string;
  onAdd: (c: { avatar: string; name: string }) => unknown; onRemove: (c: { avatar: string; name: string }) => unknown;
  removeText?: string; fixed?: (avatar: string) => string | null; note?: string;
}) {
  const [open, setOpen] = useState(false);
  const have = new Set(cards.map((c) => c.avatar));
  const options: Opt[] = open ? allCharacters().filter((c) => !have.has(c.avatar)).map((c) => ({
    key: c.avatar, title: c.name, lead: thumbnailUrl(c.avatar), onPick: () => { setOpen(false); void onAdd({ avatar: c.avatar, name: c.name }); },
  })) : [];
  return (
    <Section title={title} hint={hint} actions={
      <Popup title="添加角色卡" placeholder="搜角色卡" open={open} onClose={() => setOpen(false)} options={options} cls="rbt-move">
        <button type="button" class="rbt-btn rbt-btn-small" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}><i class="fa-solid fa-plus" /> 添加角色卡</button>
      </Popup>
    }>
      {cards.length > 0 && (
        <div class="rbt-cardrows">
          {cards.map((c) => {
            const why = fixed?.(c.avatar);
            return (
              <div key={c.avatar} class="rbt-cardrow">
                <NavRow img={thumbnailUrl(c.avatar)} title={c.name} sub={why ?? note} onClick={() => openDetail({ kind: 'card', avatar: c.avatar }, back)} />
                {!why && <MoreMenu title={c.name} items={[{ icon: 'fa-xmark', text: removeText, onClick: () => { void onRemove(c); } }]} />}
              </div>
            );
          })}
        </div>
      )}
      {!cards.length && <small class="rbt-muted">{empty}</small>}
    </Section>
  );
}

/**
 * 点了没在用的预设的「编辑预设」「编辑正则」：酒馆只能编辑正在用的预设，问一句要不要先换到它；换好就直接打开编辑面板。
 */
async function editOtherPreset(name: string, what: 'preset' | 'regex'): Promise<void> {
  const [title, text, ok] = what === 'preset' ? POP_PRESET : POP_REGEX;
  if (!(await confirmText(title, text, ok))) return;
  if (!(await switchPreset(name))) return;
  if (what === 'preset') openDrawer('preset');
  else openRegexManager('preset');
}
const POP_PRESET = ['换到这个预设再编辑？', '酒馆只能编辑正在用的预设。', '换好就编辑'];
const POP_REGEX = ['换到这个预设再编辑正则？', '酒馆只能编辑正在用的预设里的正则。', '换好就编辑'];

/**
 * 预设自带的正则。正在用的预设：「允许运行」和每一条都能开关（和全局工具箱 › 预设里的一样）。
 * 别的预设：只列出来（开着绿点、关着灰点），写清为什么不能开关——酒馆只能改正在用的预设里的正则。
 */
function PresetRegexSection({ name, isCurrent }: { name: string; isCurrent: boolean }) {
  const report = envReport.value;
  let list: { scriptName?: string; disabled?: boolean }[] = [];
  try { list = ctx().getPresetManager()?.getCompletionPresetByName?.(name)?.extensions?.regex_scripts ?? []; } catch { /* 读不到就当没有 */ }
  if (!list.length) return null;
  const on = list.filter((r) => !r.disabled).length;
  const live = isCurrent ? report?.items.find((i) => i.id === 'rx:p') : undefined;
  // 不是正在用的预设：按钮是灰的，但点得动，点了说明为什么不能编辑
  const edit = <button type="button" class="rbt-btn rbt-btn-small" aria-disabled={!isCurrent} onClick={() => isCurrent ? openRegexManager('preset')
    : void editOtherPreset(name, 'regex')}>编辑正则 <i class="fa-solid fa-arrow-up-right-from-square" /></button>;
  return (
    <Section title="预设自带正则" hint={isCurrent ? `使用此预设时应用 · 已启用 ${on} / ${list.length} 条` : '这个预设没在用。酒馆只能开关、编辑正在用的预设里的正则。'} actions={edit}>
      {live?.toggle && (
        <div class="rbt-switch-row rbt-script-allow">
          <div class="rbt-switch-text"><span>允许运行</span><small>{live.enabled ? '关闭后，下面的正则都不运行。' : '现在关着，下面的正则都不运行。'}</small></div>
          <Toggle checked={live.enabled} onChange={(v) => { void Promise.resolve(live.toggle?.(v)).then(() => refreshEnv()); }} title="允许 / 不允许这个预设的正则运行" />
        </div>
      )}
      {live?.subItems ? <SubItemList items={live.subItems} groupOff={!live.enabled} /> : (
        <div class="rbt-rx-list">
          {list.map((r, i) => (
            <div key={i} class={`rbt-rx-line ${r.disabled ? 'off' : ''}`}>
              <i class="fa-solid fa-circle rbt-rx-dot" aria-hidden="true" />
              <span>{r.scriptName || '(未命名正则)'}</span>
              {r.disabled && <small>已停用</small>}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/** Up to three overlapping card avatars, then +N. */
function AvatarStack({ cards }: { cards: { avatar: string; name: string }[] }) {
  if (!cards.length) return null;
  return (
    <span class="rbt-avstack" title={cards.map((c) => c.name).join('、')}>
      {cards.slice(0, 3).map((c) => <img key={c.avatar} src={thumbnailUrl(c.avatar)} alt="" loading="lazy" />)}
      {cards.length > 3 && <span class="rbt-avstack-more">+{cards.length - 3}</span>}
    </span>
  );
}

// ----------------------------------------------------------- presets ---

function PresetsPage() {
  void archiveVersion.value;
  void sourcesTick.value;
  const report = envReport.value;
  useEffect(() => { refreshEnv(); }, []);
  const names = presetNames();
  const cur = currentPresetName();
  const ov = overview();
  const presetRx = (report?.items ?? []).filter((i) => i.scope === 'preset' && i.kind !== 'preset');
  const global = String(globalValue('preset') ?? cur);
  const back = GLOBAL_TAB_LABELS.presets;
  // 「管理」时只留下面的列表（useOrganize）
  const org = organizing.value === 'preset';
  return (
    <div class="rbt-page">
      <div class={`rbt-page-cols ${org ? 'one' : ''}`}>
        {!org && (
          <div class="rbt-page-group">
            <Section title="全局预设" hint="没设专用预设的卡都用它">
              <PresetPicker />
              {/* 自带的正则、脚本说的是正在用的预设；正在聊的卡用自己的预设时，那不是全局预设，不列 */}
              {cur === global && presetRx.map((i) => <ItemRow key={i.id} item={i} />)}
              {cur === global && !presetRx.length && <small class="rbt-muted">这个预设没有自带正则或脚本。</small>}
            </Section>
          </div>
        )}
        <div class="rbt-page-group">
          <FolderList
            kind="preset"
            names={names}
            title="预设库"
            back={back}
            sub={(n) => {
              const v = sourceFor('preset', n);
              const rec = ov.byPreset.get(n);
              const rx = presetRegexCount(n);
              const m = settings().presetInfo[n]?.model;
              return [v.author && `作者 ${v.author}`, v.version && `版本 ${v.version}`, m && `模型 ${m.model}`, rec?.length && `${rec.length} 张卡专用`, rx && `${rx} 条正则`].filter(Boolean).join(' · ');
            }}
            trail={(n) => (n === cur ? <Tag tone="accent">正在用</Tag> : n === global ? <Tag>全局</Tag> : null)}
            locked={(n) => (n === cur ? '正在用' : n === global ? '全局预设' : null)}
            deleteNote={(list) => { const used = list.filter((n) => ov.byPreset.get(n)?.length); return used.length ? `这些预设有卡专用：${used.map((n) => `「${n}」`).join('')}。删除后这些卡改用全局的预设。` : ''; }}
          />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------- personas ---

/**
 * 全局人设 = 酒馆的默认人设：没设专用人设（没绑定、存档没锁定）的卡都用它。
 * 正在聊的卡用自己的人设时，换全局不动现在的人设，离开这张卡后生效。
 * 下面是全部人设：头像、名字、描述，点进去改（PersonaDetail），不用先换成正在用的。
 */
function PersonasPage() {
  void personaTick.value;
  useEffect(watchPersonas, []);
  const pu = ctx().powerUserSettings ?? {};
  const all = personaIds();
  const def = String(pu.default_persona ?? '');
  const now = personaStatus();
  const held = !!currentCharacter() && (now.source === 'chat' || now.source === 'character' || now.source === 'group');
  const [busy, setBusy] = useState(false);
  const back = GLOBAL_TAB_LABELS.personas;
  const pick = async (id: string) => {
    if (!id || id === def) return;
    setBusy(true);
    try { await setGlobalPersona(id); } finally { setBusy(false); }
  };
  return (
    <div class="rbt-page">
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <Section title="全局人设" hint="没设专用人设的卡都用它">
            <select class="text_pole rbt-select" value={def} disabled={busy} onChange={(e) => { void pick((e.currentTarget as HTMLSelectElement).value); }}>
              {!def && <option value="">还没设</option>}
              {all.map((id) => <option key={id} value={id}>{personaLabel(id)}</option>)}
            </select>
            {held && now.avatar !== def && <small class="rbt-muted">「{currentCharacter()?.name}」用自己的「{now.name}」。在这里换的全局人设，离开这张卡后生效。</small>}
          </Section>
        </div>
        <div class="rbt-page-group">
          <Section title="人设库" actions={<button type="button" class="rbt-btn rbt-btn-small" onClick={() => openDetail({ kind: 'persona-new' }, back)}><i class="fa-solid fa-plus" aria-hidden="true" /> 新建人设</button>}>
            {all.map((id) => (
              <NavRow key={id} img={personaThumb(id)} onClick={() => openDetail({ kind: 'persona', id }, back)}
                title={<span class="rbt-persona-title">{personaName(id)}{id === now.avatar && <Tag tone="accent">正在用</Tag>}{id === def && <Tag>全局</Tag>}</span>}
                sub={personaTitle(id) || personaDesc(id) ? <>{personaTitle(id) && <span class="rbt-persona-note">{personaTitle(id)}</span>}{personaDesc(id) && <span class="rbt-clamp2">{personaDesc(id)}</span>}</> : undefined}
                trailing={<AvatarStack cards={personaCards(id)} />} />
            ))}
            {!all.length && <small class="rbt-muted">还没有人设。</small>}
          </Section>
        </div>
      </div>
    </div>
  );
}

/** 设成全局人设。正在聊的卡用的就是全局人设时，马上换上。 */
async function setGlobalPersona(id: string): Promise<void> {
  const c = ctx();
  const now = personaStatus();
  const held = !!currentCharacter() && (now.source === 'chat' || now.source === 'character' || now.source === 'group');
  c.powerUserSettings.default_persona = id;
  c.saveSettingsDebounced();
  if (currentCharacter() && !held && now.avatar !== id) await loaded.personas?.setUserAvatar?.(id);
  personaTick.value++;
}

/** 一个人设自己的页面：头像、名字、描述，改完自动保存；下面是专用它的卡。 */
/** 正在用的人设是从哪来的（和酒馆选人设的顺序一样：存档锁定 > 卡 / 群专用 > 全局人设 > 手动换上）。 */
function personaWhy(source: string): string {
  if (source === 'chat') return '当前人设来源：存档锁定';
  if (source === 'character') return `当前人设来源：角色卡「${currentCharacter()?.name ?? ''}」专用`;
  if (source === 'group') return '当前人设来源：群聊专用';
  if (source === 'default') return '当前人设来源：全局人设';
  return '当前人设来源：手动选择';
}

function PersonaDetail({ id }: { id: string }) {
  void personaTick.value;
  useEffect(watchPersonas, []);
  const pu = ctx().powerUserSettings ?? {};
  const [name, setName] = useState(personaName(id));
  const [desc, setDesc] = useState(personaDesc(id));
  const [title, setTitle] = useState(personaTitle(id));
  const [busy, setBusy] = useState(false);
  if (pu.personas?.[id] === undefined) return <div class="rbt-warn">找不到这个人设，可能被删除了。</div>;
  const cards = personaCards(id);
  const isDef = String(pu.default_persona ?? '') === id;
  const isNow = currentPersona() === id;
  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    try { await f(); } catch (e) { toast('error', `没能保存人设「${personaName(id)}」。请再试一次。（${(e as Error).message}）`); } finally { setBusy(false); personaTick.value++; }
  };
  const copy = () => run(async () => {
    const to = `${personaName(id)} 副本`;
    const nid = await createPersona({ name: to, description: personaDesc(id), from: id });
    toast('success', `已复制成「${to}」。`);
    openDetail({ kind: 'persona', id: nid }, personaName(id));
  });
  // 酒馆的人设面板只能改正在用的人设：不是正在用的，先问要不要换过去
  const more = async () => {
    if (!isNow) {
      if (!(await confirmText('切换人设并打开设置？', `酒馆只能编辑当前人设。继续会切换到「${personaName(id)}」。`, '切换并打开'))) return;
      await loaded.personas?.setUserAvatar?.(id);
      personaTick.value++;
    }
    openDrawer('persona');
  };
  return (
    <div class="rbt-page rbt-card-page">
      <DetailHead title={personaName(id)}
        tags={<>{personaTitle(id) && <span class="rbt-muted">{personaTitle(id)}</span>}{isNow && <Tag tone="accent">正在用</Tag>}{isDef && <Tag>全局</Tag>}</>}
        note={isNow ? personaWhy(personaStatus().source) : undefined}
        actions={<>
          {!isDef && <button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={() => void run(() => setGlobalPersona(id))}>设为全局人设</button>}
          <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => void copy()}><i class="fa-regular fa-copy" aria-hidden="true" /> 复制一份</button>
          <button type="button" class="rbt-btn rbt-btn-small" title="插入位置、绑定世界书在这里改" onClick={() => void more()}>编辑人设 <i class="fa-solid fa-arrow-up-right-from-square" /></button>
        </>} />
      <Section title="头像和资料">
        <div class="rbt-persona-av">
          <img src={personaImage(id)} alt="" />
          <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={async () => { const p = await pickAvatar(); if (p) await run(() => setPersonaAvatar(id, p)); }}>换头像</button>
        </div>
        <label class="rbt-field">
          <span class="rbt-field-head"><span class="rbt-field-label">名字</span><small class="rbt-field-hint">发送给 AI，作为故事中的称呼。</small></span>
          <input class="text_pole" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
            onBlur={(e) => { const v = (e.currentTarget as HTMLInputElement).value.trim(); if (v) void run(() => renamePersona(id, v)); else setName(personaName(id)); }} />
        </label>
        <label class="rbt-field">
          <span class="rbt-field-head"><span class="rbt-field-label">备注名</span><small class="rbt-field-hint">不发送给 AI，用于区分同名人设。</small></span>
          <input class="text_pole" value={title} placeholder="选填" onInput={(e) => setTitle((e.currentTarget as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
            onBlur={(e) => { const v = (e.currentTarget as HTMLInputElement).value.trim(); setTitle(v); void run(() => setPersonaTitle(id, v)); }} />
        </label>
        <label class="rbt-field">
          <span class="rbt-field-head"><span class="rbt-field-label">描述</span><small class="rbt-field-hint">发给 AI。</small></span>
          <textarea class="text_pole" rows={6} placeholder="简述人设的身份或背景。" value={desc} onInput={(e) => { const v = (e.currentTarget as HTMLTextAreaElement).value; setDesc(v); setPersonaDesc(id, v); }} />
        </label>
      </Section>
      <BoundCards title="专用角色卡" hint="与以下角色聊天时，自动切换至此人设。" cards={cards} back={personaName(id)} empty="暂无专用角色卡。"
        onAdd={(c) => { bindPersona(id, c.avatar); personaTick.value++; }} onRemove={(c) => { unbindPersona(id, c.avatar); personaTick.value++; }} />
      <button type="button" class="rbt-btn rbt-btn-small rbt-btn-danger rbt-delete-one" disabled={busy} onClick={async () => { if (await deletePersona(id, () => { personaTick.value++; })) { personaTick.value++; goBack(); } }}>删除人设</button>
    </div>
  );
}

/** 新建人设：头像、名字、描述。从某张卡点进来的（forCard），建好就给这张卡用；从某段聊天点进来的（forChat），建好就锁定在这段聊天上。 */
function PersonaNew({ forCard, forChat }: { forCard?: string; forChat?: string }) {
  const card = forCard ? (ctx().characters ?? []).find((x: { avatar: string }) => x.avatar === forCard) : null;
  const chatName = forChat ? shortSaveName(forChat, currentCharacter()?.name) : '';
  const [avatar, setAvatar] = useState<PickedAvatar | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const id = await createPersona({ name: n, description: desc, avatar });
      // 还在那段聊天里才锁定（建的时候换了聊天，就只建不锁）
      if (forChat && ctx().getCurrentChatId?.() === forChat) {
        await lockChatPersona(id);
        toast('success', `已创建「${n}」，这段聊天现在用它。`);
      } else if (card) {
        bindPersona(id, card.avatar);
        if (currentCharacter()?.avatar === card.avatar) await loaded.personas?.setUserAvatar?.(id);
        toast('success', `已创建「${n}」，「${card.name}」现在用它。`);
      } else toast('success', `已创建「${n}」。`);
      personaTick.value++;
      goBack();
      openDetail({ kind: 'persona', id }, GLOBAL_TAB_LABELS.personas);
    } catch (e) {
      toast('error', `没能创建人设。请再试一次。（${(e as Error).message}）`);
    } finally { setBusy(false); }
  };
  return (
    <div class="rbt-page">
      <div class="rbt-detail-head"><h2>新建人设</h2></div>
      {forChat ? <small class="rbt-muted">建好后只有这段聊天「{chatName}」用这个人设。</small>
        : card && <small class="rbt-muted">建好后「{card.name}」就用这个人设。</small>}
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <section class="rbt-card-section">
            <div class="rbt-persona-av">
              <img src={avatar?.url ?? 'img/user-default.png'} alt="" />
              <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={async () => { const p = await pickAvatar(); if (p) { if (avatar) URL.revokeObjectURL(avatar.url); setAvatar(p); } }}>选图片</button>
            </div>
            <label class="rbt-field">
              <span class="rbt-field-label">名字</span>
              <input class="text_pole" placeholder="比如：旅人" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
            </label>
            <label class="rbt-field">
              <span class="rbt-field-label">描述</span>
              <textarea class="text_pole" rows={6} placeholder="简述人设的身份或背景。" value={desc} onInput={(e) => setDesc((e.currentTarget as HTMLTextAreaElement).value)} />
              <small class="rbt-muted">这段会发给 AI。可以先空着，以后再写。</small>
            </label>
            <div class="rbt-form-row">
              <button type="button" class="rbt-btn rbt-btn-primary" disabled={busy || !name.trim()} onClick={() => void create()}>创建</button>
              <button type="button" class="rbt-btn" disabled={busy} onClick={goBack}>取消</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PresetDetail({ name }: { name: string }) {
  void archiveVersion.value;
  useEffect(() => { refreshEnv(); }, [name]);
  const cur = currentPresetName();
  const global = String(globalValue('preset') ?? cur);
  const ov = overview();
  const exists = presetNames().includes(name);
  const cards = ov.byPreset.get(name) ?? [];
  const [busy, setBusy] = useState(false);
  const toGlobal = name !== global && exists;
  return (
    <div class="rbt-page rbt-card-page">
      <DetailHead title={name}
        tags={<>{name === cur && <Tag tone="accent">正在用</Tag>}{name === global && <Tag>全局</Tag>}</>}
        note={exists && name !== cur ? '这个预设没在用。酒馆只能编辑正在用的预设。' : undefined}
        actions={exists ? <>
          {toGlobal && <button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { await setGlobal('preset', name); } finally { setBusy(false); } }}>设为全局预设</button>}
          <button type="button" class="rbt-btn rbt-btn-small" aria-disabled={name !== cur} onClick={() => name === cur ? openDrawer('preset')
            : void editOtherPreset(name, 'preset')}>编辑预设 <i class="fa-solid fa-arrow-up-right-from-square" /></button>
        </> : undefined} />
      {!exists && <div class="rbt-warn">找不到这个预设，可能被删除或改名了。</div>}
      <NotesSection kind="preset" id={name} />
      <PresetModelSection name={name} />
      <PresetRegexSection name={name} isCurrent={name === cur} />
      <PresetScriptsSection name={name} />
      <BoundCards title="专用角色卡" hint="与以下角色聊天时，自动切换至此预设。" cards={cards} back={name} empty="暂无专用角色卡。"
        onAdd={async (c) => { await setCardItem(c.avatar, c.name, 'preset', name); archiveVersion.value++; refreshEnv(); }} onRemove={async (c) => { await setCardItem(c.avatar, c.name, 'preset', null); archiveVersion.value++; refreshEnv(); }} />
      {exists && <DeleteOne kind="preset" name={name} locked={name === cur ? '正在用这个预设' : null} note={cards.length ? `有 ${cards.length} 张卡专用这个预设，删除后这些卡改用全局的预设。` : undefined} />}
    </div>
  );
}

// ------------------------------------------------------------ worlds ---

function WorldsPage() {
  void archiveVersion.value;
  void sourcesTick.value;
  const report = envReport.value;
  useEffect(() => { refreshEnv(); }, []);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(settings().autoImportWorld);
  const ov = overview();
  const missing = cardsMissingWorld();
  const personaOn = (report?.items ?? []).filter((i) => i.kind === 'worldbook' && i.scope === 'persona');
  const names = worldNames();
  const back = GLOBAL_TAB_LABELS.worlds;
  const scopes = currentBookScopes();
  const viaChat = [...scopes.character, ...scopes.chat].filter((n) => !scopes.global.has(n));
  // 「管理」时只留下面的列表（useOrganize）
  const org = organizing.value === 'world';
  return (
    <div class="rbt-page">
      {!org && missing.length > 0 && (
        <div class="rbt-warn rbt-row-between">
          <span>{missing.length} 张卡自带的世界书还没导入：{missing.map((m) => m.name).join('、')}</span>
          <button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { await importAllMissingWorlds(); } finally { setBusy(false); } }}>全部导入</button>
        </div>
      )}
      <div class={`rbt-page-cols ${org ? 'one' : ''}`}>
        {!org && (
          <div class="rbt-page-group">
            <Section title="全局世界书" hint="所有角色的聊天均会加载全局世界书。只给某张卡用的，建议关联到那张卡。" actions={<AddGlobalWorld />}>
              <GlobalWorldList />
              {personaOn.map((i) => <ItemRow key={i.id} item={i} />)}
              {viaChat.length > 0 && <small class="rbt-muted">当前聊天通过角色卡或存档加载的世界书：{viaChat.join('、')}</small>}
            </Section>
            <Section title="设置">
              <CheckRow label="自动导入卡里的世界书" detail="打开一张卡时，如果它自带的世界书还没导入，就自动导入并绑定。不会覆盖已有的同名世界书。" checked={auto} onChange={(x) => { settings().autoImportWorld = x; saveSettings(); setAuto(x); }} />
            </Section>
          </div>
        )}
        <div class="rbt-page-group">
          <FolderList
            kind="world"
            names={names}
            title="世界书库"
            back={back}
            sub={(n) => { const v = sourceFor('world', n); const cs = cardsOf(ov.byWorld.get(n)); return [v.author && `作者 ${v.author}`, cs ? `关联角色卡：${cs}` : '未关联角色卡', v.version && `版本 ${v.version}`].filter(Boolean).join(' · '); }}
            filters={[
              { label: '全部', test: () => true },
              { label: '已关联', test: (n) => ov.byWorld.has(n) },
              { label: '未关联', test: (n) => !ov.byWorld.has(n) },
            ]}
            defaultFilter={2}
            deleteNote={(list) => { const used = list.filter((n) => ov.byWorld.has(n)); return used.length ? `这些世界书有关联角色卡：${used.map((n) => `「${n}」（${cardsOf(ov.byWorld.get(n))}）`).join('、')}。删除后，这些角色的聊天将无法加载它们。` : ''; }}
            trail={(n) => (
              <>
                {scopes.global.has(n) && <Tag>全局</Tag>}
                <AvatarStack cards={ov.byWorld.get(n) ?? []} />
              </>
            )}
          />
        </div>
      </div>
    </div>
  );
}

function WorldDetail({ name }: { name: string }) {
  void archiveVersion.value;
  const ov = overview();
  const cards = ov.byWorld.get(name) ?? [];
  // 真正的全局：正在聊的卡单独停用的也算开着，改了离开这张卡后生效
  const on = trueGlobalWorlds().includes(name);
  const [busy, setBusy] = useState(false);
  const toggle = async (v: boolean) => {
    setBusy(true);
    try { await setGlobal(`w:${name}`, v); } finally { setBusy(false); refreshEnv(); }
  };
  return (
    <div class="rbt-page rbt-card-page">
      <DetailHead title={name} tags={on ? <Tag>全局</Tag> : undefined}
        actions={<>
          {on
            ? <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => void toggle(false)}>取消全局</button>
            : <button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={() => void toggle(true)}>设为全局世界书</button>}
          <button type="button" class="rbt-btn rbt-btn-small" onClick={() => openWorldInST(name)}>编辑世界书 <i class="fa-solid fa-arrow-up-right-from-square" /></button>
        </>}
        note={on ? '全局世界书：所有角色的聊天均会加载它。' : undefined} />
      <NotesSection kind="world" id={name} />
      <BoundCards title="关联角色卡" hint="与以下角色聊天时，自动加载此世界书。" cards={cards} back={name} empty="还没有关联的角色卡。" removeText="解除关联" note="手动关联"
        fixed={(avatar) => (cards.find((c) => c.avatar === avatar)?.world.name === name ? '角色卡绑定 · 在角色档案中管理' : null)}
        onAdd={(c) => attachBook(c.avatar, name)} onRemove={(c) => detachBook(c.avatar, name)} />
      <DeleteOne kind="world" name={name} note={cards.length ? `关联角色卡：${cardsOf(cards)}。删除后，这些角色的聊天将无法加载它。` : undefined} />
    </div>
  );
}

// ------------------------------------------------------------- regex ---

function RegexPage() {
  void archiveVersion.value;
  const report = envReport.value;
  useEffect(() => { refreshEnv(); }, []);
  const items = report?.items ?? [];
  const regex = items.filter((i: EnvItem) => i.scope === 'global' && i.kind === 'regex');
  const curAvatar = currentCharacter()?.avatar as string | undefined;
  // 正在聊的卡、正在用的预设排第一，标「正在聊」「正在用」
  const cardRx = useMemo(() => allCharacters().map(cardInfo).filter((c) => c.regex.total > 0)
    .sort((a, b) => Number(b.avatar === curAvatar) - Number(a.avatar === curAvatar) || b.regex.total - a.regex.total), [archiveVersion.value, curAvatar]);
  const cur = currentPresetName();
  const presetRx = presetNames().map((p) => ({ p, n: presetRegexCount(p) })).filter((x) => x.n > 0)
    .sort((a, b) => Number(b.p === cur) - Number(a.p === cur));
  const back = GLOBAL_TAB_LABELS.regex;
  // 「管理」时只留全局正则的列表（useOrganize）
  const org = organizing.value === 'regex';
  return (
    <ScopePage id="regex" nowCount={regex.length} presetCount={presetRx.length} cardCount={cardRx.length} focus={org}
      now={
        <GlobalRegexList items={regex} footer={<div class="rbt-row"><button type="button" class="rbt-btn" onClick={() => openRegexManager()}>新建、编辑或导入正则 <i class="fa-solid fa-arrow-up-right-from-square" /></button></div>} />
      }
      presets={
        <Section title="含正则的预设" hint="使用这个预设时生效">
          {presetRx.map(({ p, n }) => <NavRow key={p} title={p} sub={`${n} 条正则`} trailing={p === cur ? <Tag tone="accent">正在用</Tag> : undefined} onClick={() => openDetail({ kind: 'preset', name: p }, back, '预设自带正则')} />)}
          {!presetRx.length && <small class="rbt-muted">暂无含正则的预设。</small>}
        </Section>
      }
      cards={
        <Section title="含正则的角色卡" hint="和对应的角色聊天时生效">
          {cardRx.map((c) => (
            <NavRow key={c.avatar} img={thumbnailUrl(c.avatar)} title={c.name} sub={`${c.regex.total} 条正则`}
              trailing={!c.regex.allowed ? <Tag tone="bad">未允许运行</Tag> : c.avatar === curAvatar ? <Tag tone="accent">正在聊</Tag> : undefined}
              onClick={() => openDetail({ kind: 'card', avatar: c.avatar }, back, '正则')} />
          ))}
          {!cardRx.length && <small class="rbt-muted">暂无含正则的角色卡。</small>}
        </Section>
      }
    />
  );
}

// ----------------------------------------------------------- plugins ---

function PluginsPage() {
  return (
    <div class="rbt-page">
      <Section title="安装插件" hint="粘贴插件仓库链接，由酒馆安装。">
        <InstallPlugin />
      </Section>
      <Section title="已安装">
        <PluginList />
      </Section>
    </div>
  );
}

// ------------------------------------------------------------ backup ---

function BackupPage() {
  void archiveVersion.value;
  const ov = overview();
  const s = settings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'merge' | 'overwrite'>('merge');
  const backups = s.worldBackups.slice(-8).reverse();
  const pickFile = (m: 'merge' | 'overwrite') => { setMode(m); fileRef.current?.click(); };
  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try { await importArchive(await file.text(), mode); } catch (err) { window.toastr?.error?.((err as Error).message, '导入失败'); }
  };
  return (
    <div class="rbt-page">
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <Section title="导出和导入">
            <small class="rbt-muted">导出工具箱设置，用于备份或换电脑。文件包含角色卡来源、说明、专用设置，以及预设、世界书和插件的备注。</small>
            <div class="rbt-row">
              <button type="button" class="rbt-btn rbt-btn-primary" onClick={() => exportArchive()}>导出</button>
              <button type="button" class="rbt-btn" onClick={() => pickFile('merge')}>导入并合并</button>
              <button type="button" class="rbt-btn" onClick={() => pickFile('overwrite')}>导入并覆盖</button>
              <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} />
            </div>
            <small class="rbt-muted">合并：同一条记录保留较新的版本。覆盖：全部换成文件里的内容。</small>
          </Section>
          {ov.orphans.length > 0 && (
            <Section title="未匹配角色卡的档案" hint="角色卡可能已删除，或重新导入后文件名变了。">
              {ov.orphans.map((o) => (
                <div key={o.avatar} class="rbt-link-row">
                  <span>「{o.cardName}」</span>
                  {o.candidates.map((c) => <button key={c} type="button" class="rbt-btn rbt-btn-small" onClick={() => relink(o.avatar, c)}>关联至「{c}」</button>)}
                  <button type="button" class="rbt-btn rbt-btn-small rbt-push" onClick={async () => { if (await confirmText(`删除「${o.cardName}」的档案？`, '这张卡的来源、说明和本卡专用的设置都会删除。', '删除')) dropRecord(o.avatar); }}>删除</button>
                </div>
              ))}
            </Section>
          )}
        </div>
        <div class="rbt-page-group">
          <Section title="世界书备份" hint="替换世界书或更新角色卡前，都会自动备份原版本">
            {backups.map((b) => <div key={b.file} class="rbt-link-row" title={`酒馆的 user/files 文件夹里：${b.file}`}><span>「{b.world}」</span><small class="rbt-muted rbt-push">{new Date(b.at).toLocaleString()}</small></div>)}
            {!backups.length && <small class="rbt-muted">还没有备份。</small>}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- looks ---
// 美化：工具箱自带的一套，加上装在酒馆里的界面主题（别人做的美化）。左边全局美化，右边全部。

/** 几个关键颜色的小色块：面板底色、正文、斜体、引号。 */
function Swatches({ t, big }: { t: StTheme; big?: boolean }) {
  const cols = [t.blur_tint_color, t.main_text_color, t.italics_text_color, t.quote_text_color].filter(Boolean) as string[];
  if (!cols.length) return null;
  return <span class={`rbt-swatches ${big ? 'big' : ''}`} aria-hidden="true">{cols.map((c, i) => <i key={i} style={{ background: c }} />)}</span>;
}

function useThemes(): void {
  useEffect(() => { if (!stThemes.value.length && !themesLoading.value) void loadThemes(); }, []);
}

/** 红鸟适配美化的一套：小样（纸色、卡片、两行字、强调色点）+ 名字 + 一句话。点了就换上。 */
function LookCard({ l }: { l: (typeof LOOKS)[number] }) {
  const p = l.preview;
  const on = lookOn.value && lookId.value === l.id;
  return (
    <button type="button" class={`rbt-lookcard ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => { void useBuiltInLook(l.id); }}>
      <span class="rbt-lookcard-art" style={{ background: p.canvas }}>
        <span class="rbt-lookcard-panel" style={{ background: p.panel }}>
          <i style={{ background: p.text }} />
          <i style={{ background: p.sub }} />
          <b style={{ background: 'var(--rbd-accent)' }} />
        </span>
      </span>
      <span class="rbt-lookcard-name">{l.label}{on && <i class="fa-solid fa-check" aria-label="正在用" />}</span>
      <span class="rbt-lookcard-desc">{l.desc}</span>
    </button>
  );
}

/** 别的美化的阅读宽度：就是酒馆「用户设置 › 聊天宽度」，两边改哪个都一样。 */
function ChatWidthRow() {
  const [v, setV] = useState(stChatWidth());
  return (
    <>
      <div class="rbt-frow">
        <span class="rbt-frow-k">阅读宽度</span>
        {/* 有的美化给滑条画填充色，长度看滑条身上写的 background-size（酒馆自己的滑条会写）：这里也写上，填充和圆点才对得上 */}
        <input type="range" min={25} max={100} step={1} value={v} aria-label="阅读宽度（屏幕宽度的百分比）" style={{ backgroundSize: `${((v - 25) / 75) * 100}% 100%` }}
          onInput={(e) => setV(Number((e.currentTarget as HTMLInputElement).value))}
          onChange={(e) => setStChatWidth(Number((e.currentTarget as HTMLInputElement).value))} />
        <span class="rbt-frow-k">{v}%</span>
        <span />
      </div>
      <small class="rbt-width-note">和酒馆「用户设置」里的「聊天宽度」是同一个设置。</small>
    </>
  );
}

/** 对白（引号里的话）的颜色：不上色，或者六种颜色之一。圆点画的是现在这套美化上的颜色，选中的名字写在标签里。 */
function QuoteColorRow() {
  const look = (lookId.value === 'light' || lookId.value === 'warm' ? lookId.value : 'dark') as LookKind;
  const cur = quoteId.value;
  return (
    <div class="rbt-look-accents rbt-quote-row">
      <small>对白颜色</small>
      <button type="button" class={`rbt-accent-dot rbt-quote-none ${cur ? '' : 'on'}`} title="不上色" aria-label="不上色" aria-pressed={!cur} onClick={() => setQuoteColor(null)} />
      {QUOTE_COLORS.map((q) => (
        <button key={q.id} type="button" class={`rbt-accent-dot ${cur === q.id ? 'on' : ''}`} title={q.label} aria-label={q.label} aria-pressed={cur === q.id} style={{ '--c': q[look] }} onClick={() => setQuoteColor(q.id)} />
      ))}
    </div>
  );
}

function LooksPage() {
  useThemes();
  void sourcesTick.value;
  void archiveVersion.value;
  const ov = overview();
  const list = stThemes.value;
  const cur = currentStTheme();
  const curTheme = list.find((t) => t.name === cur);
  const builtIn = lookOn.value;
  const back = GLOBAL_TAB_LABELS.looks;
  const [open, setOpen] = useState(false);
  const curLook = LOOKS.find((l) => l.id === lookId.value) ?? LOOKS[0];
  // 「管理」时只留「别人做的美化」的列表（useOrganize）
  const org = organizing.value === 'theme';
  // 所有美化都在这一个选择框里换：红鸟适配美化的三套在前（推荐），别人做的美化在后
  const options: Opt[] = [
    ...LOOKS.map((l) => ({ key: `rbt:${l.id}`, title: l.label, sub: l.desc, group: `${LOOK_NAME}（推荐）`, selected: builtIn && lookId.value === l.id, onPick: () => { setOpen(false); void useBuiltInLook(l.id); } })),
    ...list.map((t) => ({ key: t.name, title: t.name, sub: themeHasCss(t) ? '含自定义样式' : '仅配色', group: '其他美化', trail: <Swatches t={t} />, selected: !builtIn && cur === t.name, onPick: () => { setOpen(false); void useStTheme(t.name); } })),
  ];
  return (
    <div class="rbt-page">
      <div class={`rbt-page-cols ${org ? 'one' : ''}`}>
        {!org && (
          <div class="rbt-page-group">
            {/* 左边是全局：现在用哪套（选择框）和这一套能调的。右边是美化库：红鸟适配美化一块、别人做的美化一块 */}
            <Section title="全局美化" hint="没设美化的卡都用它">
              <PickRow k="美化" value={builtIn ? curLook.label : (cur || '酒馆默认')} sub={builtIn ? LOOK_NAME : '其他美化'}
                pill={!builtIn && curTheme ? <Swatches t={curTheme} /> : undefined}
                open={open} onToggle={() => setOpen(!open)} onClose={() => setOpen(false)} options={options} />
              {builtIn ? (
                <>
                  <div class="rbt-look-accents">
                    <small>强调色</small>
                    {ACCENTS.map((a) => (
                      <button key={a.id} type="button" class={`rbt-accent-dot ${accentId.value === a.id ? 'on' : ''}`} title={a.label} aria-label={a.label} style={{ '--c': a.color }} onClick={() => setAccent(a.id)} />
                    ))}
                  </div>
                  <QuoteColorRow />
                  {/* 手机屏幕本来就窄，正文总是铺满，这一项只在电脑上有用 */}
                  {!compact.value && (
                    <div class="rbt-frow">
                      <span class="rbt-frow-k">阅读宽度</span>
                      <select class="text_pole rbt-select" value={readWidth.value} onChange={(e) => setReadWidth((e.currentTarget as HTMLSelectElement).value as 'normal' | 'wide' | 'full')}>
                        {READ_WIDTHS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                      </select>
                      <span />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {shellOn.value && !compact.value && <ChatWidthRow />}
                  <small class="rbt-muted">{LOOK_COPY.othersRisk}{LOOK_COPY.noAdapt}</small>
                </>
              )}
              {/* 手机沉浸阅读对所有美化都生效，算全局美化的一项 */}
              {shellOn.value && <CheckRow label={LOOK_COPY.mesLayoutLabel} detail={LOOK_COPY.mesLayoutDesc} checked={mesLayoutOn.value} onChange={setMesLayout} />}
            </Section>
          </div>
        )}
        {/* 美化库：一张卡片。最上面红鸟适配美化（推荐，三张预览图），下面其他美化（文件夹、管理）。管理时只留其他美化 */}
        <div class="rbt-page-group">
          <Section title="美化库" lintSpacing="ok">
            {!org && (
              <Section sub title={LOOK_NAME} tag={<span class="rbt-tag rbt-tag-rec">推荐</span>} hint={LOOK_COPY.libPitch}>
                <div class="rbt-lookcards">{LOOKS.map((l) => <LookCard key={l.id} l={l} />)}</div>
              </Section>
            )}
            {themesLoading.value && !list.length ? <Section sub title="其他美化"><small class="rbt-muted">读取中…</small></Section> : (
            <FolderList
              embed
              kind="theme"
              names={list.map((t) => t.name)}
              title="其他美化"
              hint={LOOK_COPY.libOthers}
              back={back}
              sub={(n) => {
                const t = list.find((x) => x.name === n);
                const v = sourceFor('theme', n);
                const used = ov.byTheme.get(n)?.length;
                return [v.author && `作者 ${v.author}`, themeHasCss(t) ? '含自定义样式' : '仅配色', v.version && `版本 ${v.version}`, used && `${used} 张角色卡专用`].filter(Boolean).join(' · ');
              }}
              trail={(n) => {
                const t = list.find((x) => x.name === n);
                return <>{!builtIn && n === cur && <Tag tone="accent">正在用</Tag>}{t && <Swatches t={t} />}</>;
              }}
              locked={(n) => (n === cur ? '正在用这套美化' : null)}
            />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/**
 * 美化的预览图：玩家自己上传的一张截图，存在酒馆的 user/files 里，路径记在这个美化的备注里。
 * 换一张时删掉旧的那张文件，移除时也删。
 */
function PreviewSection({ name }: { name: string }) {
  void sourcesTick.value;
  const cur = sourceFor('theme', name).preview;
  const [busy, setBusy] = useState(false);
  const drop = (path: string) => fetch('/api/files/delete', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ path }) }).catch(() => undefined);
  const upload = async () => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif' });
    const file = await new Promise<File | null>((resolve) => {
      input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
      input.addEventListener('cancel', () => resolve(null), { once: true });
      input.click();
    });
    if (!file) return;
    setBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] ?? ''); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const res = await fetch('/api/files/upload', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ name: `rbt-look-preview-${Date.now().toString(36)}.${ext}`, data }) });
      if (!res.ok) throw new Error(`${res.status}`);
      const { path } = await res.json();
      if (cur) void drop(cur);
      updateSource('theme', name, { preview: String(path) });
    } catch (e) {
      toast('error', `没能上传「${name}」的预览图。请换一张图片再试。（${(e as Error).message}）`);
    } finally {
      setBusy(false);
    }
  };
  const remove = () => { void drop(cur); updateSource('theme', name, { preview: '' }); };
  return (
    <Section title="预览图" actions={<>
      <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => void upload()}>{busy ? '正在上传…' : cur ? '更换预览图' : '上传预览图'}</button>
      {cur && <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={remove}>移除</button>}
    </>}>
      {cur ? <img class="rbt-look-preview" src={cur} alt={`「${name}」的预览图`} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : <small class="rbt-muted">暂无预览图。可上传这套美化的截图，方便记住它的样子。</small>}
    </Section>
  );
}

function ThemeDetail({ name }: { name: string }) {
  useThemes();
  void archiveVersion.value;
  const users = overview().byTheme.get(name) ?? [];
  const t = stThemes.value.find((x) => x.name === name);
  const cur = currentStTheme();
  const inUse = !lookOn.value && name === cur;
  const [busy, setBusy] = useState(false);
  const css = t?.custom_css?.trim() ?? '';
  const colors: [string, string | undefined][] = t ? [
    ['面板底色', t.blur_tint_color], ['聊天底色', t.chat_tint_color], ['正文', t.main_text_color], ['斜体（动作、旁白）', t.italics_text_color], ['对白', t.quote_text_color],
  ] : [];
  return (
    <div class="rbt-page rbt-card-page">
      <DetailHead title={name} tags={inUse ? <Tag tone="accent">正在用</Tag> : undefined}
        note={lookOn.value && t ? LOOK_COPY.willTurnOff : undefined}
        actions={t ? <>
          {!inUse && <button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { await useStTheme(name); } finally { setBusy(false); } }}>设为全局美化</button>}
          <button type="button" class="rbt-btn rbt-btn-small" title="在酒馆的「用户设置」里改颜色和自定义样式" onClick={() => openDrawer('settings')}>编辑美化 <i class="fa-solid fa-arrow-up-right-from-square" /></button>
        </> : undefined} />
      {!t && !themesLoading.value && <div class="rbt-warn">找不到这个美化，可能被删除了。</div>}
      <NotesSection kind="theme" id={name} />
      {t && (
        <Section title="颜色" hint={css ? '含自定义样式，可能影响排版。' : '仅配色，不影响排版。'}>
          <div class="rbt-theme-colors">
            {colors.filter(([, c]) => !!c).map(([label, c]) => (
              <div key={label} class="rbt-theme-color"><i style={{ background: c }} /><span>{label}</span></div>
            ))}
          </div>
        </Section>
      )}
      <PreviewSection name={name} />
      <BoundCards title="专用角色卡" hint="与以下角色聊天时，自动切换至此美化。" cards={users} back={name} empty="暂无专用角色卡。"
        onAdd={(c) => setCardTheme(c.avatar, c.name, name)} onRemove={(c) => setCardTheme(c.avatar, c.name, null)} />
      {t && <DeleteOne kind="theme" name={name} locked={name === cur ? '正在用这套美化' : null} note={users.length ? `有 ${users.length} 张卡用这个美化，删除后和它们聊天时会用全局美化。` : undefined} />}
    </div>
  );
}

// -------------------------------------------------------------- host ---

function DetailBody() {
  const e = currentDetail()!;
  // data-rbt-detail：从别处点进来要滚到的那一块，只在这里面找（见 useFocusSection）
  return (
    <div class="rbt-detail-body" data-rbt-detail>
      <button type="button" class="rbt-back" onClick={goBack}><i class="fa-solid fa-chevron-left" /> {e.back}</button>
      {e.d.kind === 'card' && <CardPage avatar={e.d.avatar} embedded />}
      {e.d.kind === 'preset' && <PresetDetail name={e.d.name} />}
      {e.d.kind === 'world' && <WorldDetail name={e.d.name} />}
      {e.d.kind === 'theme' && <ThemeDetail name={e.d.name} />}
      {e.d.kind === 'bindings' && <BindingsDetail avatar={e.d.avatar} />}
      {e.d.kind === 'persona' && <PersonaDetail key={e.d.id} id={e.d.id} />}
      {e.d.kind === 'persona-new' && <PersonaNew forCard={e.d.forCard} forChat={e.d.forChat} />}
    </div>
  );
}

/**
 * 标签一行放不下时（窄手机）可以左右滑：哪边还有没露出来的标签，那边就淡出一截，提示能滑；
 * 选中的标签自动滚到看得见的地方。
 */
export function GlobalTabs({ vertical }: { vertical?: boolean } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState('');
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdge(`${left ? ' more-left' : ''}${right ? ' more-right' : ''}`);
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    measure();
  }, [globalTab.value]);
  return (
    <div ref={ref} class={vertical ? 'rbt-sheet-rail' : `rbt-sheet-tabs${edge}`} role="tablist" aria-orientation={vertical ? 'vertical' : undefined} onScroll={measure}>
      {GLOBAL_TABS.map((t) => (
        <button key={t} type="button" role="tab" aria-selected={globalTab.value === t} class={globalTab.value === t ? 'active' : ''} onClick={() => setGlobalTab(t)}>
          {vertical && <i class={`fa-solid ${GLOBAL_TAB_ICONS[t]} fa-fw`} aria-hidden="true" />}{GLOBAL_TAB_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

/** The body of 全局工具箱 (tabs are drawn by the host: the overlay header, or the dock). */
export function GlobalToolbox() {
  void detailStack.value;
  const t: GlobalTab = globalTab.value;
  if (currentDetail()) return <DetailBody />;
  if (t === 'cards') return <CardsTablePage />;
  if (t === 'presets') return <PresetsPage />;
  if (t === 'personas') return <PersonasPage />;
  if (t === 'worlds') return <WorldsPage />;
  if (t === 'regex') return <RegexPage />;
  if (t === 'scripts') return <ScriptsPage />;
  if (t === 'plugins') return <PluginsPage />;
  if (t === 'looks') return <LooksPage />;
  if (t === 'backup') return <BackupPage />;
  return <Empty>没有这个标签。</Empty>;
}

// ------------------------------------------------------- quick import ---

/** 「导入文件」: opens the import window on its first step (drop area + file picker). */
export function ImportButton({ big }: { big?: boolean } = {}) {
  return (
    <button type="button" class={big ? 'rbt-gtool rbt-gtool-import' : 'rbt-btn rbt-btn-small rbt-import-btn'} title="导入角色卡、预设、世界书、正则、美化或酒馆助手脚本。可以多选，也可以把文件拖进窗口。" onClick={() => { void openImport(); }}>
      <i class="fa-solid fa-file-import fa-fw" /> <span>导入文件</span>
    </button>
  );
}

const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
/** How many files are being dragged; 0 when the browser does not say. */
const dragCount = (e: DragEvent) => [...(e.dataTransfer?.items ?? [])].filter((i) => i.kind === 'file').length;

/** Drag files over the toolbox dock (stock UI) to import them. */
export function useDropImport(): { dragging: number | null; handlers: Record<string, (e: DragEvent) => void> } {
  const [dragging, setDragging] = useState<number | null>(null);
  const depth = useRef(0);
  return {
    dragging,
    handlers: {
      onDragEnter: (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setDragging(dragCount(e)); },
      onDragOver: (e) => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; },
      onDragLeave: () => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(null); },
      onDrop: (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation(); // ST's own page-wide drop handler would try to import it a second time
        depth.current = 0;
        setDragging(null);
        void openImport([...(e.dataTransfer?.files ?? [])]);
      },
    },
  };
}

/** Files dragged over the three-column UI: how many (0 = unknown), or null when nothing is dragged. */
export const windowDrag = signal<number | null>(null);

/**
 * Three-column UI: files dropped anywhere go to the import window instead of ST's page-wide
 * handler (which only knows character cards). Places that take files themselves keep them:
 * the chat input (attachments), ST popups, and the import window.
 */
const OWN_DROP = '#form_sheld, .popup, dialog, #select_chat_popup, [id^="dragGallery"], .rbt-imp, .rbt-imp-backdrop';
export function installWindowDrop(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => { clearTimeout(timer); windowDrag.value = null; };
  const ours = (e: DragEvent) => hasFiles(e) && !importOpen() && !(e.target as Element | null)?.closest?.(OWN_DROP);
  const onOver = (e: DragEvent) => {
    if (!ours(e)) { if (windowDrag.value !== null) hide(); return; }
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    const n = dragCount(e);
    if (windowDrag.value !== n) windowDrag.value = n;
    // dragover keeps firing while files are over the page; when it stops, the drag left or was cancelled
    clearTimeout(timer);
    timer = setTimeout(hide, 300);
  };
  const onDrop = (e: DragEvent) => {
    if (!ours(e)) { hide(); return; }
    e.preventDefault();
    e.stopPropagation();
    hide();
    void openImport([...(e.dataTransfer?.files ?? [])]);
  };
  window.addEventListener('dragenter', onOver, true);
  window.addEventListener('dragover', onOver, true);
  window.addEventListener('drop', onDrop, true);
  return () => {
    hide();
    window.removeEventListener('dragenter', onOver, true);
    window.removeEventListener('dragover', onOver, true);
    window.removeEventListener('drop', onDrop, true);
  };
}

/** Shown while files are dragged over a drop area. `count`: how many files, 0 when unknown. */
export function DropHint({ count = 0, full }: { count?: number; full?: boolean }) {
  return (
    <div class={`rbt-drop-hint ${full ? 'full' : ''}`}>
      <i class="fa-solid fa-arrow-up-from-bracket" />
      <b>{count > 0 ? `松开鼠标，导入 ${count} 个文件` : '松开鼠标，开始导入'}</b>
      <span>工具箱会识别每个文件是角色卡、预设、世界书、正则、美化还是酒馆助手脚本。</span>
    </div>
  );
}

/** 插件 tab: install from a Git link. */
function InstallPlugin() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = /^https?:\/\/\S+$/i.test(url.trim());
  const go = async () => {
    if (!ok) return;
    setBusy(true);
    try { if (await installPlugin(url)) setUrl(''); } finally { setBusy(false); }
  };
  return (
    <div class="rbt-form-row">
      <input class="text_pole rbt-input" placeholder="插件的 Git 链接，比如 https://github.com/作者/插件名" value={url} onInput={(e) => setUrl((e.currentTarget as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') void go(); }} />
      <button type="button" class="rbt-btn rbt-btn-primary" disabled={!ok || busy} onClick={go}>{busy ? '正在安装…' : '安装'}</button>
    </div>
  );
}

/** 推荐模型：和角色档案里选模型一样，列出现在连着的 API 的模型，列表里没有的手动填写。 */
function PresetModelSection({ name }: { name: string }) {
  void sourcesTick.value;
  const [open, setOpen] = useState(false);
  if (!modelsApply()) return null;
  const value = settings().presetInfo[name]?.model;
  const cur = currentModel();
  const own = presetConnection(name);
  const set = (m: ModelChoice | null) => { setOpen(false); updateSource('preset', name, { model: m ?? undefined }); };
  return (
    <Section title="推荐模型" hint="用这个预设时自动换成这个模型">
      <PickRow k="模型" value={value ? value.model : '不指定'} sub={value ? SOURCE_LABEL[value.source] ?? value.source : undefined}
        open={open} onToggle={() => setOpen(!open)} onClose={() => setOpen(false)}
        top={<MenuOpt title="不指定" sub="换到这个预设时不换模型" selected={!value} onPick={() => set(null)} />}
        head={cur ? `${SOURCE_LABEL[cur.source] ?? cur.source} 的模型` : undefined}
        options={cur ? stModelList(cur.source).map((o) => ({ key: o.id, title: o.label, selected: !!value && value.source === cur.source && value.model === o.id, onPick: () => set({ source: cur.source, model: o.id }) })) : []}
        bottom={<><MenuHead>列表里没有，手动填写</MenuHead><ModelForm initial={value ?? cur ?? undefined} onUse={set} /></>} />
      {own && presetBindsConnection() && cur && own.source !== cur.source && (
        <div class="rbt-warn">预设内置 API 配置：{own.model ? modelLabel(own) : SOURCE_LABEL[own.source] ?? own.source}。酒馆已启用「将预设与 API 配置绑定」，切换到此预设时 API 配置也会切换。</div>
      )}
    </Section>
  );
}
