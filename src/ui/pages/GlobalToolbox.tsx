/**
 * 全局工具箱：按酒馆自己的东西分标签——预设、世界书、正则、插件、美化，加一个备份。
 * 「对所有卡生效」不再是一个标签，而是每样东西身上的标记（全局开着 / 正在用）。
 *
 * 交互规则（整个工具箱一致）：
 * - 结尾有 › 的整行：在这里打开详情，顶部「‹ 返回」回来，不跳去别处；
 * - 结尾有 ↗ 的：去酒馆自己的面板或网页；
 * - 开关就是开关，按钮就是按钮；其余文字不可点，也不上色。
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ctx, runSlash, saveSettings, settings, slashQuote } from '../../st/st';
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
  switchPreset,
  thumbnailUrl,
  worldNames,
  type CardInfo,
} from '../../tools/cards/cards';
import { envReport, refreshEnv, type EnvItem } from '../../tools/env/env';
import { currentBookScopes } from '../../tools/flow/capture';
import { allSeries, compareVersions, setSeries, sourceFor, sourcesTick, suggestSeries, updateSource, type SourceKind } from '../../tools/sources';
import { openDrawer } from '../../shell/drawers';
import { openBookInEditor } from '../../shell/worldNote';
import { Empty, NavRow, CheckRow, Tag, Toggle } from '../common';
import { SourceEditor } from '../SourceEditor';
import { ModelPicker } from '../ModelPicker';
import { currentModel, modelLabel, presetBindsConnection, presetConnection, SOURCE_LABEL } from '../../tools/model';
import { currentDetail, detailStack, GLOBAL_TAB_LABELS, GLOBAL_TABS, globalTab, goBack, openDetail, setGlobalTab, type GlobalTab } from '../views';
import { installPlugin } from '../../tools/importer';
import { openImport } from '../ImportDialog';
import { CardPage } from './CardPage';
import { AddGlobalWorld, GlobalRegexList, ItemRow, openRegexManager, PluginList, PresetPicker } from './GlobalPage';
import { Section } from './parts';
import {
  ACCENTS, accentId, currentStTheme, deleteStTheme, loadThemes, LOOKS, lookId, lookOn, setAccent, setLook, stThemes, themeHasCss, themesLoading,
  useBuiltInLook, useStTheme, type StTheme,
} from '../../look/look';

// ------------------------------------------------------------ shared ---

/** Names of every preset / worldbook / theme, for series and version lists. */
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

function SeriesSuggestions({ kind, names }: { kind: SourceKind; names: string[] }) {
  void sourcesTick.value;
  const [hidden, setHidden] = useState<string[]>([]);
  const list = suggestSeries(kind, names).filter((g) => !hidden.includes(g.series));
  if (!list.length) return null;
  return (
    <>
      {list.map((g) => (
        <div key={g.series} class="rbt-hint rbt-row-between">
          <span>{g.names.length} 个名字里都有「{g.series}」，可能是同一系列的不同版本。</span>
          <span class="rbt-row">
            <button type="button" class="rbt-btn rbt-btn-small" onClick={() => setHidden([...hidden, g.series])}>不是</button>
            <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary" onClick={() => setSeries(kind, g.names, g.series)}>归为「{g.series}」系列</button>
          </span>
        </div>
      ))}
    </>
  );
}

/**
 * 按系列分组的列表。平时每行是 ›（打开详情）；点「整理」后每行变成勾选框，
 * 选几个、写一个系列名，就能归到一组或移出。
 */
function SeriesList({ kind, names: allNames, back, sub, trail, restTitle, filters, defaultFilter = 0 }: {
  kind: SourceKind;
  names: string[];
  /** Optional quick filters shown as a segmented control (first one = all). */
  filters?: { label: string; test: (n: string) => boolean }[];
  /** Index of the filter selected when the list opens. */
  defaultFilter?: number;
  back: string;
  sub: (n: string) => string;
  trail?: (n: string) => preact.ComponentChildren;
  restTitle: string;
}) {
  void sourcesTick.value;
  const [organizing, setOrganizing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [series, setSeriesName] = useState('');
  const [fi, setFi] = useState(defaultFilter);
  const names = filters ? allNames.filter(filters[fi]?.test ?? (() => true)) : allNames;
  const groups = groupBySeries(kind, names);
  const listId = `rbt-org-${kind}`;
  const toggle = (n: string) => setPicked((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
  const done = () => { setOrganizing(false); setPicked([]); setSeriesName(''); };
  const apply = (name: string) => { setSeries(kind, picked, name); setPicked([]); };
  return (
    <>
      {!organizing && <SeriesSuggestions kind={kind} names={allNames} />}
      {filters && (
        <div class="rbt-vseg rbt-list-filter" role="tablist">
          {filters.map((f, i) => <button key={f.label} type="button" class={fi === i ? 'active' : ''} onClick={() => setFi(i)}>{f.label} {allNames.filter(f.test).length}</button>)}
        </div>
      )}
      <div class="rbt-org-bar">
        {organizing ? (
          <>
            <span class="rbt-org-count">已选 {picked.length} 个</span>
            <input class="text_pole rbt-input" list={listId} placeholder="系列名，比如：小狗之神" value={series} onInput={(e) => setSeriesName((e.currentTarget as HTMLInputElement).value)} />
            <datalist id={listId}>{allSeries(kind).map((x) => <option key={x} value={x} />)}</datalist>
            <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={!picked.length || !series.trim()} onClick={() => apply(series.trim())}>归为这个系列</button>
            <button type="button" class="rbt-btn rbt-btn-small" disabled={!picked.length} onClick={() => apply('')}>移出系列</button>
            <button type="button" class="rbt-btn rbt-btn-small" onClick={done}>完成</button>
          </>
        ) : (
          <>
            <small class="rbt-muted">点一项看详情。想把几个归成一组，点「整理」。</small>
            <button type="button" class="rbt-btn rbt-btn-small" onClick={() => setOrganizing(true)}>整理</button>
          </>
        )}
      </div>
      {groups.map((g) => (
        <Section key={g.series || '_'} title={g.series ? `${g.series} 系列` : (groups.length > 1 ? `其他${restTitle}` : `全部${restTitle}`)} hint={`${g.names.length} 个`}>
          {g.names.map((n) => organizing ? (
            <label key={n} class={`rbt-pickrow ${picked.includes(n) ? 'on' : ''}`}>
              <input type="checkbox" checked={picked.includes(n)} onChange={() => toggle(n)} />
              <span class="rbt-navrow-main"><span class="rbt-navrow-title">{n}</span>{sub(n) && <span class="rbt-navrow-sub">{sub(n)}</span>}</span>
            </label>
          ) : (
            <NavRow key={n} title={n} sub={sub(n) || undefined} trailing={trail?.(n)} onClick={() => openItem(kind, n, back)} />
          ))}
        </Section>
      ))}
    </>
  );
}

/** 系列 / 版本 / 更新说明 for a preset or worldbook. */
function VersionSection({ kind, id }: { kind: SourceKind; id: string }) {
  const v = sourceFor(kind, id);
  const listId = `rbt-series-${kind}`;
  const series = allSeries(kind);
  const siblings = v.series ? namesOf(kind).filter((n) => n !== id && sourceFor(kind, n).series === v.series) : [];
  const back = id;
  return (
    <Section title="系列和版本" hint="同一个东西的不同版本归到一个系列，方便对比和回头找">
      <div class="rbt-form-row">
        <small class="rbt-muted rbt-source-k">系列</small>
        <input class="text_pole rbt-input" list={listId} placeholder="比如：小狗之神" value={v.series} onChange={(e) => updateSource(kind, id, { series: (e.currentTarget as HTMLInputElement).value.trim() })} />
        <datalist id={listId}>{series.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      <div class="rbt-form-row">
        <small class="rbt-muted rbt-source-k">版本</small>
        <input class="text_pole rbt-input" placeholder={v.versionIsAuto ? `${v.version}（从名字里读到的）` : '比如：v8.0'} value={v.versionIsAuto ? '' : v.version} onChange={(e) => updateSource(kind, id, { version: (e.currentTarget as HTMLInputElement).value.trim() })} />
      </div>
      <textarea class="text_pole rbt-textarea" rows={3} placeholder="更新说明：这一版改了什么、和上一版有什么不同、怎么用" value={v.notes} onChange={(e) => updateSource(kind, id, { notes: (e.currentTarget as HTMLTextAreaElement).value })} />
      {siblings.length > 0 && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">同系列的其他版本：</small>
          {siblings.sort((x, y) => compareVersions(sourceFor(kind, x).version, sourceFor(kind, y).version)).map((n) => (
            <NavRow key={n} title={n} sub={sourceFor(kind, n).version ? `版本 ${sourceFor(kind, n).version}` : undefined} onClick={() => openItem(kind, n, back)} />
          ))}
        </div>
      )}
    </Section>
  );
}

function SourceSection({ kind, id }: { kind: SourceKind; id: string }) {
  return (
    <Section title="作者和链接" hint="发布帖、教程、更新帖…">
      <SourceEditor kind={kind} id={id} />
    </Section>
  );
}

/** Up to three overlapping card avatars, then +N. */
function AvatarStack({ cards }: { cards: CardInfo[] }) {
  if (!cards.length) return null;
  return (
    <span class="rbt-avstack" title={cards.map((c) => c.name).join('、')}>
      {cards.slice(0, 3).map((c) => <img key={c.avatar} src={thumbnailUrl(c.avatar)} alt="" loading="lazy" />)}
      {cards.length > 3 && <span class="rbt-avstack-more">+{cards.length - 3}</span>}
    </span>
  );
}

function CardRows({ cards, back, empty }: { cards: CardInfo[]; back: string; empty: string }) {
  if (!cards.length) return <small class="rbt-muted">{empty}</small>;
  return <>{cards.map((c) => <NavRow key={c.avatar} img={thumbnailUrl(c.avatar)} title={c.name} onClick={() => openDetail({ kind: 'card', avatar: c.avatar }, back)} />)}</>;
}

// ----------------------------------------------------------- presets ---

function PresetsPage() {
  void archiveVersion.value;
  void sourcesTick.value;
  const report = envReport.value;
  useEffect(() => { refreshEnv(); }, []);
  const names = presetNames();
  const cur = currentPresetName();
  const ov = buildOverview();
  const presetRx = (report?.items ?? []).filter((i) => i.scope === 'preset' && i.kind !== 'preset');
  const back = GLOBAL_TAB_LABELS.presets;
  return (
    <div class="rbt-page">
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <Section title="正在用" hint="切到有推荐预设的卡时会自动换">
            <PresetPicker />
            {presetRx.map((i) => <ItemRow key={i.id} item={i} />)}
            {!presetRx.length && <small class="rbt-muted">这个预设没有自带正则或脚本。</small>}
          </Section>
        </div>
        <div class="rbt-page-group">
          <SeriesList
            kind="preset"
            names={names}
            back={back}
            restTitle="预设"
            sub={(n) => {
              const v = sourceFor('preset', n);
              const rec = ov.byPreset.get(n);
              const rx = presetRegexCount(n);
              const m = settings().presetInfo[n]?.model;
              return [v.version && `版本 ${v.version}`, m && `模型 ${m.model}`, v.author && `作者 ${v.author}`, rec?.length && `${rec.length} 张卡推荐`, rx && `${rx} 条正则`].filter(Boolean).join(' · ');
            }}
            trail={(n) => (n === cur ? <Tag tone="accent">正在用</Tag> : null)}
          />
        </div>
      </div>
    </div>
  );
}

function PresetDetail({ name }: { name: string }) {
  void archiveVersion.value;
  const cur = currentPresetName();
  const ov = buildOverview();
  const exists = presetNames().includes(name);
  const rx = presetRegexCount(name);
  const [busy, setBusy] = useState(false);
  return (
    <div class="rbt-page">
      <div class="rbt-detail-head">
        <h2>{name}</h2>
        {name === cur ? <Tag tone="accent">正在用</Tag> : exists && <button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { await switchPreset(name); } finally { setBusy(false); } }}>换成这个</button>}
        {name === cur && <button type="button" class="rbt-btn rbt-btn-small" onClick={() => openDrawer('preset')}>编辑预设 <i class="fa-solid fa-arrow-up-right-from-square" /></button>}
      </div>
      {!exists && <div class="rbt-warn">找不到这个预设，可能被删除或改名了。</div>}
      {rx > 0 && <small class="rbt-muted">自带 {rx} 条正则，用这个预设时生效。</small>}
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <SourceSection kind="preset" id={name} />
          <VersionSection kind="preset" id={name} />
        </div>
        <div class="rbt-page-group">
          <PresetModelSection name={name} isCurrent={name === cur} />
          <Section title="推荐它的卡" hint="切到这些卡时会自动换上这个预设">
            <CardRows cards={ov.byPreset.get(name) ?? []} back={name} empty="还没有卡推荐它。在角色档案的「推荐预设」里设置。" />
          </Section>
        </div>
      </div>
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
  const ov = buildOverview();
  const missing = cardsMissingWorld();
  const globalOn = (report?.items ?? []).filter((i) => i.kind === 'worldbook' && (i.scope === 'global' || i.scope === 'persona'));
  const names = worldNames();
  const back = GLOBAL_TAB_LABELS.worlds;
  const scopes = currentBookScopes();
  const viaChat = [...scopes.character, ...scopes.chat].filter((n) => !scopes.global.has(n));
  return (
    <div class="rbt-page">
      {missing.length > 0 && (
        <div class="rbt-warn rbt-row-between">
          <span>{missing.length} 张卡自带的世界书还没导入：{missing.map((m) => m.name).join('、')}</span>
          <button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { await importAllMissingWorlds(); } finally { setBusy(false); } }}>全部导入</button>
        </div>
      )}
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <Section title="正在用" hint="全局世界书对所有卡生效；只给某张卡用的，最好绑到那张卡上">
            {globalOn.map((i) => <ItemRow key={i.id} item={i} />)}
            {!globalOn.length && <small class="rbt-muted">没有开着的全局世界书。</small>}
            <AddGlobalWorld />
            {viaChat.length > 0 && <small class="rbt-muted">现在的聊天还通过角色卡加载了：{viaChat.join('、')}。</small>}
          </Section>
          <Section title="设置">
            <CheckRow label="自动导入卡里的世界书" detail="打开一张卡时，如果它自带的世界书还没导入，就自动导入并绑定。不会覆盖已有的同名世界书。" checked={auto} onChange={(x) => { settings().autoImportWorld = x; saveSettings(); setAuto(x); }} />
          </Section>
        </div>
        <div class="rbt-page-group">
          <SeriesList
            kind="world"
            names={names}
            back={back}
            restTitle="世界书"
            sub={(n) => { const v = sourceFor('world', n); const cs = cardsOf(ov.byWorld.get(n)); return [cs ? `绑定：${cs}` : '未绑定角色', v.version && `版本 ${v.version}`, v.author && `作者 ${v.author}`].filter(Boolean).join(' · '); }}
            filters={[
              { label: '全部', test: () => true },
              { label: '已绑定角色', test: (n) => ov.byWorld.has(n) },
              { label: '未绑定角色', test: (n) => !ov.byWorld.has(n) },
            ]}
            defaultFilter={2}
            trail={(n) => (
              <>
                {scopes.global.has(n) && <Tag tone="warn">全局开着</Tag>}
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
  const ov = buildOverview();
  const on = currentBookScopes().global.has(name);
  const [busy, setBusy] = useState(false);
  const toggle = async (v: boolean) => {
    setBusy(true);
    try { await runSlash(`/world state=${v ? 'on' : 'off'} silent=true ${slashQuote(name)}`); } finally { setBusy(false); refreshEnv(); archiveVersion.value++; }
  };
  return (
    <div class="rbt-page">
      <div class="rbt-detail-head">
        <h2>{name}</h2>
        <button type="button" class="rbt-btn rbt-btn-small" onClick={() => openWorldInST(name)}>在世界书里打开 <i class="fa-solid fa-arrow-up-right-from-square" /></button>
      </div>
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <SourceSection kind="world" id={name} />
          <VersionSection kind="world" id={name} />
        </div>
        <div class="rbt-page-group">
          <Section title="用到它的卡" hint="绑在这些卡上，玩它们时自动加载">
            <CardRows cards={ov.byWorld.get(name) ?? []} back={name} empty="没绑在任何卡上。" />
          </Section>
          <Section title="全局">
            <div class="rbt-switch-row">
              <div class="rbt-switch-text"><span>作为全局世界书打开</span><small>打开后对所有卡生效。</small></div>
              {busy ? <small class="rbt-muted">…</small> : <Toggle checked={on} onChange={toggle} />}
            </div>
          </Section>
        </div>
      </div>
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
  const scripts = items.filter((i: EnvItem) => i.scope === 'global' && i.kind === 'script');
  const cardRx = useMemo(() => allCharacters().map(cardInfo).filter((c) => c.regex.total > 0).sort((a, b) => b.regex.total - a.regex.total), [archiveVersion.value]);
  const presetRx = presetNames().map((p) => ({ p, n: presetRegexCount(p) })).filter((x) => x.n > 0);
  const cur = currentPresetName();
  const back = GLOBAL_TAB_LABELS.regex;
  return (
    <div class="rbt-page">
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <Section title="全局正则" hint="对所有卡生效">
            <GlobalRegexList items={regex} />
            <div class="rbt-row"><button type="button" class="rbt-btn" onClick={() => openRegexManager()}>新建、编辑或导入正则 <i class="fa-solid fa-arrow-up-right-from-square" /></button></div>
          </Section>
          {scripts.length > 0 && <Section title="酒馆助手全局脚本" hint="对所有卡生效">{scripts.map((i) => <ItemRow key={i.id} item={i} />)}</Section>}
        </div>
        <div class="rbt-page-group">
          <Section title="带正则的卡" hint="只对那张卡生效">
            {cardRx.map((c) => (
              <NavRow key={c.avatar} img={thumbnailUrl(c.avatar)} title={c.name} sub={`${c.regex.total} 条正则`} trailing={!c.regex.allowed ? <Tag tone="bad">未允许运行</Tag> : undefined} onClick={() => openDetail({ kind: 'card', avatar: c.avatar }, back)} />
            ))}
            {!cardRx.length && <small class="rbt-muted">没有。</small>}
          </Section>
          <Section title="带正则的预设" hint="只在用这个预设时生效">
            {presetRx.map(({ p, n }) => <NavRow key={p} title={p} sub={`${n} 条正则`} trailing={p === cur ? <Tag tone="accent">正在用</Tag> : undefined} onClick={() => openDetail({ kind: 'preset', name: p }, back)} />)}
            {!presetRx.length && <small class="rbt-muted">没有。</small>}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------- plugins ---

function PluginsPage() {
  return (
    <div class="rbt-page">
      <Section title="安装插件" hint="粘贴插件的 Git 链接，用酒馆自己的安装流程">
        <InstallPlugin />
      </Section>
      <Section title="已安装" hint="对所有卡生效；点名字看作者和链接">
        <PluginList />
      </Section>
    </div>
  );
}

// ------------------------------------------------------------ backup ---

function BackupPage() {
  void archiveVersion.value;
  const ov = buildOverview();
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
            <small class="rbt-muted">你在工具箱里填的东西——卡的来源和说明、推荐预设、记住的配置、正则归属，以及预设、世界书和插件的来源——都和酒馆设置存在一起。换电脑或想留个底时，可以导出成一个文件。</small>
            <div class="rbt-row">
              <button type="button" class="rbt-btn rbt-btn-primary" onClick={() => exportArchive()}>导出</button>
              <button type="button" class="rbt-btn" onClick={() => pickFile('merge')}>导入并合并</button>
              <button type="button" class="rbt-btn" onClick={() => pickFile('overwrite')}>导入并覆盖</button>
              <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} />
            </div>
            <small class="rbt-muted">合并：同一样东西留下较新的那份。覆盖：全部换成文件里的。</small>
          </Section>
          {ov.orphans.length > 0 && (
            <Section title="找不到卡的档案" hint="卡可能被删了，或重新导入后换了文件名">
              {ov.orphans.map((o) => (
                <div key={o.avatar} class="rbt-link-row">
                  <span>「{o.cardName}」</span>
                  {o.candidates.map((c) => <button key={c} type="button" class="rbt-btn rbt-btn-small" onClick={() => relink(o.avatar, c)}>转给「{c}」</button>)}
                  <button type="button" class="rbt-btn rbt-btn-small rbt-push" onClick={async () => { if (await ctx().Popup?.show?.confirm?.('删除这份档案？', `「${o.cardName}」的来源、说明和记住的配置都会删除。`)) dropRecord(o.avatar); }}>删除</button>
                </div>
              ))}
            </Section>
          )}
        </div>
        <div class="rbt-page-group">
          <Section title="世界书备份" hint="用卡里的版本覆盖世界书之前，会自动备份旧的">
            {backups.map((b) => <div key={b.file} class="rbt-link-row" title={`酒馆的 user/files 文件夹里：${b.file}`}><span>「{b.world}」</span><small class="rbt-muted rbt-push">{new Date(b.at).toLocaleString()}</small></div>)}
            {!backups.length && <small class="rbt-muted">还没有备份。</small>}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- looks ---
// 美化：工具箱自带的一套，加上装在酒馆里的界面主题（别人做的美化）。和预设一样：左边正在用，右边全部。

/** 几个关键颜色的小色块：面板底色、正文、斜体、引号。 */
function Swatches({ t, big }: { t: StTheme; big?: boolean }) {
  const cols = [t.blur_tint_color, t.main_text_color, t.italics_text_color, t.quote_text_color].filter(Boolean) as string[];
  if (!cols.length) return null;
  return <span class={`rbt-swatches ${big ? 'big' : ''}`} aria-hidden="true">{cols.map((c, i) => <i key={i} style={{ background: c }} />)}</span>;
}

function useThemes(): void {
  useEffect(() => { if (!stThemes.value.length && !themesLoading.value) void loadThemes(); }, []);
}

/** 工具箱自带的一套：一张小样（纸色、卡片、两行字、强调色点）+ 名字 + 一句话。点了就换上。 */
function LookCard({ l, on }: { l: (typeof LOOKS)[number]; on: boolean }) {
  const p = l.preview;
  return (
    <button type="button" class={`rbt-lookcard ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => { void useBuiltInLook(l.id); }}>
      <span class="rbt-lookcard-art" style={{ background: p.canvas }}>
        <span class="rbt-lookcard-panel" style={{ background: p.panel }}>
          <i style={{ background: p.text }} />
          <i style={{ background: p.sub }} />
          <b style={{ background: 'var(--rbd-accent)' }} />
        </span>
      </span>
      <span class="rbt-lookcard-name">{l.label}{on && <i class="fa-solid fa-circle-check" />}</span>
      <span class="rbt-lookcard-desc">{l.desc}</span>
    </button>
  );
}

function LooksPage() {
  useThemes();
  void sourcesTick.value;
  const list = stThemes.value;
  const cur = currentStTheme();
  const curTheme = list.find((t) => t.name === cur);
  const builtIn = lookOn.value;
  const back = GLOBAL_TAB_LABELS.looks;
  return (
    <div class="rbt-page">
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          {!builtIn && (
            <Section title="正在用" hint="酒馆里装的美化">
              <NavRow title={cur || '酒馆默认'} sub={themeHasCss(curTheme) ? '带自定义样式' : '只换颜色'} trailing={curTheme ? <Swatches t={curTheme} /> : undefined} onClick={() => cur && openDetail({ kind: 'theme', name: cur }, back)} />
            </Section>
          )}
          <Section title="工具箱自带" hint="按三栏界面做的，布局不会冲突">
            <div class="rbt-lookcards">
              {LOOKS.map((l) => <LookCard key={l.id} l={l} on={builtIn && lookId.value === l.id} />)}
            </div>
            {builtIn && (
              <>
                <div class="rbt-look-accents">
                  <small>强调色</small>
                  {ACCENTS.map((a) => (
                    <button key={a.id} type="button" class={`rbt-accent-dot ${accentId.value === a.id ? 'on' : ''}`} title={a.label} aria-label={a.label} style={{ '--c': a.color }} onClick={() => setAccent(a.id)} />
                  ))}
                </div>
                <button type="button" class="rbt-btn rbt-btn-small rbt-self-start" onClick={() => setLook(false)}>关掉，用酒馆主题「{cur || '默认'}」</button>
              </>
            )}
            {!builtIn && <small class="rbt-muted">点一套就换上。换美化时，酒馆面板、三栏界面和工具箱会一起换。</small>}
          </Section>
        </div>
        <div class="rbt-page-group">
          <small class="rbt-muted rbt-looks-note">下面是装在酒馆里的美化，是别人按酒馆原版界面做的。在三栏界面里布局以工具箱为准，个别地方可能不协调。</small>
          {themesLoading.value && !list.length ? <small class="rbt-muted">读取中…</small> : (
            <SeriesList
              kind="theme"
              names={list.map((t) => t.name)}
              back={back}
              restTitle="美化"
              sub={(n) => {
                const t = list.find((x) => x.name === n);
                const v = sourceFor('theme', n);
                return [themeHasCss(t) ? '带自定义样式' : '只换颜色', v.version && `版本 ${v.version}`, v.author && `作者 ${v.author}`].filter(Boolean).join(' · ');
              }}
              trail={(n) => {
                const t = list.find((x) => x.name === n);
                return <>{!builtIn && n === cur && <Tag tone="accent">正在用</Tag>}{t && <Swatches t={t} />}</>;
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ThemeDetail({ name }: { name: string }) {
  useThemes();
  const t = stThemes.value.find((x) => x.name === name);
  const cur = currentStTheme();
  const inUse = !lookOn.value && name === cur;
  const [busy, setBusy] = useState(false);
  const css = t?.custom_css?.trim() ?? '';
  const colors: [string, string | undefined][] = t ? [
    ['面板底色', t.blur_tint_color], ['聊天底色', t.chat_tint_color], ['正文', t.main_text_color], ['斜体（动作、旁白）', t.italics_text_color], ['引号里的话', t.quote_text_color],
  ] : [];
  return (
    <div class="rbt-page">
      <div class="rbt-detail-head">
        <h2>{name}</h2>
        {inUse ? <Tag tone="accent">正在用</Tag> : t && <button type="button" class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { await useStTheme(name); } finally { setBusy(false); } }}>换成这个</button>}
        {t && name !== cur && <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { if (await deleteStTheme(name)) { updateSource('theme', name, { author: '', links: [], series: '', version: '', notes: '' }); goBack(); } } finally { setBusy(false); } }}>删除…</button>}
      </div>
      {!t && !themesLoading.value && <div class="rbt-warn">找不到这个美化，可能被删除了。</div>}
      {lookOn.value && t && <small class="rbt-muted">现在用的是工具箱自带的美化。换成这个会把它关掉。</small>}
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          {t && (
            <Section title="样子" hint={css ? `带自定义样式（约 ${Math.max(1, Math.round(css.length / 1024))} KB），会改酒馆的排版和细节` : '只换颜色，不改排版'}>
              <div class="rbt-theme-colors">
                {colors.filter(([, c]) => !!c).map(([label, c]) => (
                  <div key={label} class="rbt-theme-color"><i style={{ background: c }} /><span>{label}</span></div>
                ))}
              </div>
            </Section>
          )}
          <SourceSection kind="theme" id={name} />
        </div>
        <div class="rbt-page-group">
          <VersionSection kind="theme" id={name} />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- host ---

function DetailBody() {
  const e = currentDetail()!;
  return (
    <>
      <button type="button" class="rbt-back" onClick={goBack}><i class="fa-solid fa-chevron-left" /> {e.back}</button>
      {e.d.kind === 'card' && <CardPage avatar={e.d.avatar} embedded />}
      {e.d.kind === 'preset' && <PresetDetail name={e.d.name} />}
      {e.d.kind === 'world' && <WorldDetail name={e.d.name} />}
      {e.d.kind === 'theme' && <ThemeDetail name={e.d.name} />}
    </>
  );
}

export function GlobalTabs() {
  return (
    <div class="rbt-sheet-tabs" role="tablist">
      {GLOBAL_TABS.map((t) => (
        <button key={t} type="button" role="tab" class={globalTab.value === t ? 'active' : ''} onClick={() => setGlobalTab(t)}>{GLOBAL_TAB_LABELS[t]}</button>
      ))}
    </div>
  );
}

/** The body of 全局工具箱 (tabs are drawn by the host: the overlay header, or the dock). */
export function GlobalToolbox() {
  void detailStack.value;
  const t: GlobalTab = globalTab.value;
  if (currentDetail()) return <DetailBody />;
  if (t === 'presets') return <PresetsPage />;
  if (t === 'worlds') return <WorldsPage />;
  if (t === 'regex') return <RegexPage />;
  if (t === 'plugins') return <PluginsPage />;
  if (t === 'looks') return <LooksPage />;
  if (t === 'backup') return <BackupPage />;
  return <Empty>没有这个标签。</Empty>;
}

// ------------------------------------------------------- quick import ---

const ACCEPT = '.json,.settings,.lorebook,.png,.charx,.byaf,.yaml,.yml';

async function runImport(files: File[]): Promise<void> {
  await openImport(files);
}

/** 「导入」 in the toolbox header: pick files, they go to the right ST importer. */
/** 「导入」: pick files → the import window asks what to do with each. `big`: the left-column style. */
export function ImportButton({ big }: { big?: boolean } = {}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" class={big ? 'rbt-gtool rbt-gtool-import' : 'rbt-btn rbt-btn-small rbt-import-btn'} title="导入预设、世界书、正则、角色卡或美化，也可以直接把文件拖进来" onClick={() => ref.current?.click()}>
        <i class="fa-solid fa-file-import" /> 导入
      </button>
      <input ref={ref} type="file" multiple accept={ACCEPT} style={{ display: 'none' }} onChange={(e) => {
        const input = e.currentTarget as HTMLInputElement;
        const files = [...(input.files ?? [])];
        input.value = '';
        void runImport(files);
      }} />
    </>
  );
}

/** Drag files anywhere over the toolbox to import them. */
export function useDropImport(): { dragging: boolean; handlers: Record<string, (e: DragEvent) => void> } {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  return {
    dragging,
    handlers: {
      onDragEnter: (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setDragging(true); },
      onDragOver: (e) => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; },
      onDragLeave: () => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false); },
      onDrop: (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation(); // ST's own page-wide drop handler would try to import it a second time
        depth.current = 0;
        setDragging(false);
        void runImport([...(e.dataTransfer?.files ?? [])]);
      },
    },
  };
}

export function DropHint() {
  return (
    <div class="rbt-drop-hint">
      <i class="fa-solid fa-file-import" />
      <b>松开就导入</b>
      <span>预设、世界书、正则、角色卡、美化都可以，会自动认出是哪种</span>
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

/** 预设详情：推荐模型，以及预设文件里自己带的连接（「预设绑定连接」开着时换过去会生效）。 */
function PresetModelSection({ name, isCurrent }: { name: string; isCurrent: boolean }) {
  void sourcesTick.value;
  const own = presetConnection(name);
  const cur = currentModel();
  const bound = presetBindsConnection();
  return (
    <Section title="推荐模型" hint="推荐了这个预设、又没单独指定模型的卡，换过去时会用这个模型">
      <ModelPicker value={settings().presetInfo[name]?.model} onChange={(m) => updateSource('preset', name, { model: m ?? undefined })} offerSwitch={isCurrent} />
      {own && (
        <div class={bound && cur && own.source !== cur.source ? 'rbt-warn' : 'rbt-hint'}>
          这个预设文件自己带着连接：{own.model ? modelLabel(own) : SOURCE_LABEL[own.source] ?? own.source}。
          {bound
            ? own.source !== cur?.source ? ' 酒馆开着「预设绑定连接」，换到这个预设时 API 也会跟着换过去。' : ' 酒馆开着「预设绑定连接」，换到这个预设时会用它带的模型（设了推荐模型的话，会再换成推荐的）。'
            : ' 酒馆没开「预设绑定连接」，所以换预设不会改 API 和模型。'}
        </div>
      )}
    </Section>
  );
}
