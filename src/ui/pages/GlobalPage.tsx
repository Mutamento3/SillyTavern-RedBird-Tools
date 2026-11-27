/**
 * 全局工具箱各标签共用的零件：一行开关、全局正则列表、加全局世界书、切预设、插件开关。
 */
import { trash } from '../../tools/trash';
import { useEffect, useState } from 'preact/hooks';
import type { RegexOwner } from '../../core/cards';
import { APP_NAME, confirmText, loaded, settings, toast } from '../../st/st';
import { allCharacters, archiveVersion, currentPresetName, globalRegexScripts, installedExtensions, loose, moveRegex, presetNames, thumbnailUrl, worldNames } from '../../tools/cards/cards';
import { bookOwners, globalValue, heldByCard, keepForOwner, setGlobal, trueGlobalWorlds } from '../../tools/env/setup';
import { currentBookScopes } from '../../tools/flow/capture';
import { extButtonHandlers, extDrawers, openDrawer } from '../../shell/drawers';
import { envReport, refreshEnv, type EnvItem, type EnvSubItem } from '../../tools/env/env';
import { Chip, CheckMark, Toggle } from '../common';
import { sourceFor } from '../../tools/sources';
import { NotesSection, OK, Section, useOrganize } from './parts';
import { checkPluginUpdates, deletePlugin, pluginStates, updatePlugins } from '../../tools/update';
import { Popup, type Opt } from './setupParts';
import { MoreMenu } from '../Menu';
import type { ComponentChildren } from 'preact';

const KIND_LABEL: Record<EnvItem['kind'], string> = {
  worldbook: '世界书', regex: '正则', script: '脚本', extension: '插件', preset: '预设',
};

/** Where to edit what a row shows: one regex → its editor; a group of regex → that list; scripts → 酒馆助手. */
function editFor(item: EnvItem) {
  if (item.kind === 'regex' && item.id.startsWith('rx:g:')) return <EditButton title="编辑这条正则" onClick={() => editRegex(item.id.slice(5))} />;
  if (item.kind === 'regex' && item.id === 'rx:p') return <EditButton title="在正则面板里编辑预设的正则" onClick={() => openRegexManager('preset')} />;
  if (item.kind === 'regex' && item.id === 'rx:c') return <EditButton title="在正则面板里编辑这张卡的正则" onClick={() => openRegexManager('scoped')} />;
  if (item.kind === 'script') return <EditButton title="在酒馆助手里编辑脚本" onClick={openScriptManager} />;
  return null;
}

/**
 * 一行：种类、名字、灰字、编辑、开关。`more` 给了的话（全局正则那种只有一个种类的列表），
 * 不写种类、不放编辑，编辑和别的操作都在行尾的 ⋯ 里。
 */
export function ItemRow({ item, action, more }: { item: EnvItem; action?: ComponentChildren; more?: ComponentChildren }) {
  const [busy, setBusy] = useState(false);
  const onToggle = async (on: boolean) => {
    if (!item.toggle) return;
    setBusy(true);
    try { await item.toggle(on); } finally { setBusy(false); refreshEnv(); }
  };
  const body = (
    <div class={`rbt-env-item ${item.enabled ? '' : 'off'}`}>
      {!more && <Chip>{KIND_LABEL[item.kind]}</Chip>}
      {more ? (
        <span class="rbt-env-main"><span class="rbt-env-name">{item.name}</span>{item.detail && <small class="rbt-muted">{item.detail}</small>}</span>
      ) : (
        <>
          <span class="rbt-env-name">{item.name}</span>
          {item.detail && <small class="rbt-muted">{item.detail}</small>}
        </>
      )}
      {action}
      {!more && editFor(item)}
      {item.toggle && (
        <span class="rbt-env-toggle">
          {busy && <small class="rbt-muted">…</small>}
          <Toggle checked={item.enabled} onChange={onToggle} title="点击开 / 关" />
        </span>
      )}
      {more}
    </div>
  );
  if (item.subItems?.length) {
    return (
      <details class="rbt-env-details">
        <summary>{body}</summary>
        <SubItemList items={item.subItems} groupOff={!item.enabled} />
      </details>
    );
  }
  if (!item.children?.length) return body;
  return (
    <details class="rbt-env-details">
      <summary>{body}</summary>
      <div class="rbt-env-children">{item.children.map((c, i) => <div key={i}>{c}</div>)}</div>
    </details>
  );
}

function SubItemRow({ sub }: { sub: EnvSubItem }) {
  const [busy, setBusy] = useState(false);
  const onToggle = async (on: boolean) => {
    setBusy(true);
    try { await sub.toggle(on); } finally { setBusy(false); refreshEnv(); }
  };
  return (
    <div class={`rbt-sub-item ${sub.enabled ? '' : 'off'}`}>
      <span class="rbt-sub-name">{sub.name}</span>
      {sub.detail && <small class="rbt-muted">{sub.detail}</small>}
      <EditButton title="编辑这条正则" onClick={() => editRegex(sub.id)} />
      <span class="rbt-env-toggle">
        {busy && <small class="rbt-muted">…</small>}
        <Toggle checked={sub.enabled} onChange={onToggle} title="点击开 / 关这一条" />
      </span>
    </div>
  );
}

export function SubItemList({ items, groupOff }: { items: EnvSubItem[]; groupOff: boolean }) {
  const [filter, setFilter] = useState('');
  const [onlyOn, setOnlyOn] = useState(false);
  const shown = items.filter((s) => (!filter || s.name.includes(filter)) && (!onlyOn || s.enabled));
  return (
    <div class="rbt-sub-list">
      {groupOff && <div class="rbt-hint">上面的总开关关着，所以下面这些都不会运行。</div>}
      {items.length > 10 && (
        <div class="rbt-sub-tools">
          <input class="text_pole rbt-input" placeholder="搜索正则…" value={filter} onInput={(e) => setFilter((e.currentTarget as HTMLInputElement).value)} />
          <label class="rbt-check-row rbt-check-inline"><CheckMark checked={onlyOn} onChange={setOnlyOn} /><span class="rbt-check-text"><span>只看开着的</span></span></label>
        </div>
      )}
      {shown.map((s) => <SubItemRow key={s.id} sub={s} />)}
      {!shown.length && <small class="rbt-muted">没有符合的正则</small>}
    </div>
  );
}

/**
 * 一条全局正则行尾的 ⋯：编辑、移到角色卡或预设。
 * 「移到」点了才列出角色卡和预设（卡多时整页上万个选项，手机上滑动很卡）。
 */
function RegexMore({ id, name, busy, onMove }: { id: string; name: string; busy: boolean; onMove: (id: string, to: RegexOwner & { kind: 'card' | 'preset' }) => void }) {
  const [open, setOpen] = useState(false);
  const pick = (to: RegexOwner & { kind: 'card' | 'preset' }) => { setOpen(false); onMove(id, to); };
  const options: Opt[] = open ? [
    ...allCharacters().map((c) => ({ key: `card:${c.avatar}`, title: c.name, group: '角色卡', lead: thumbnailUrl(c.avatar), onPick: () => pick({ kind: 'card', key: c.avatar, label: c.name }) })),
    ...presetNames().map((p) => ({ key: `preset:${p}`, title: p, group: '预设', onPick: () => pick({ kind: 'preset', key: p, label: p }) })),
  ] : [];
  return (
    <Popup title={`把「${name}」移到`} placeholder="搜角色卡或预设" open={open} onClose={() => setOpen(false)} options={options} cls="rbt-move">
      <MoreMenu title={name} items={[
        { icon: 'fa-pen', text: '编辑', onClick: () => editRegex(id) },
        ...(busy ? [] : [{ icon: 'fa-arrow-right-to-bracket', text: '移到角色卡或预设…', onClick: () => setOpen(true) }]),
      ]} />
    </Popup>
  );
}

/**
 * 「全局正则」卡片：一行一条，开关和 ⋯（编辑、移到角色卡或预设）。
 * 标题右边「管理」：每行变成勾选框，底部一条「删除」（和预设、世界书、美化的库一样）；页面上只留这一块（RegexPage）。
 */
export function GlobalRegexList({ items, footer }: { items: EnvItem[]; footer?: ComponentChildren }) {
  void archiveVersion.value;
  const scripts = globalRegexScripts();
  const byId = new Map(items.map((i) => [i.id, i]));
  const [moving, setMoving] = useState(false);
  const move = async (list: Parameters<typeof moveRegex>[0]) => { setMoving(true); try { await moveRegex(list); } finally { setMoving(false); } };
  const org = useOrganize('regex');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const allOn = scripts.length > 0 && scripts.every((r) => picked.includes(r.id));
  const done = () => { org.stop(); setPicked([]); };
  const del = async () => {
    const list = scripts.filter((r) => picked.includes(r.id));
    if (!list.length) return;
    const shown = list.length <= 6 ? list.map((r) => `「${r.scriptName}」`).join('') : `${list.slice(0, 6).map((r) => `「${r.scriptName}」`).join('')} 等 ${list.length} 条`;
    if (!(await confirmText(`删除 ${list.length} 条全局正则？`, `${shown}　删除前自动备份。删除后 15 秒内可撤销。`, '删除'))) return;
    setBusy(true);
    try { if (await trash('regex', list.map((r) => r.id))) setPicked([]); } finally { setBusy(false); }
  };
  const actions = org.on ? (
    <>
      <button type="button" class="rbt-linkbtn" disabled={!scripts.length} onClick={() => setPicked(allOn ? [] : scripts.map((r) => r.id))}>{allOn ? '取消全选' : '全选'}</button>
      <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary" onClick={done}>完成</button>
    </>
  ) : scripts.length ? <button type="button" class="rbt-btn rbt-btn-small" onClick={org.start}>管理</button> : undefined;
  return (
    <Section title="全局正则" hint={org.on ? undefined : '对所有卡生效'} actions={actions}>
      <div ref={org.ref} class="rbt-folder-list">
        {org.on ? scripts.map((r) => (
          <label key={r.id} class={`rbt-pickrow ${picked.includes(r.id) ? 'on' : ''}`}>
            <input type="checkbox" checked={picked.includes(r.id)} onChange={() => setPicked((cur) => (cur.includes(r.id) ? cur.filter((x) => x !== r.id) : [...cur, r.id]))} />
            <span class="rbt-navrow-main"><span class="rbt-navrow-title">{r.scriptName || '(未命名正则)'}</span><span class="rbt-navrow-sub">{r.disabled ? '关着' : '开着'}</span></span>
          </label>
        )) : scripts.map((r) => {
          const live = byId.get(`rx:g:${r.id ?? r.scriptName}`);
          // 显示、修改真正的全局：正在聊的卡单独停用 / 启用的，按进卡前的算，改了等离开这张卡再换上
          const item = live && { ...live, enabled: !!globalValue(`r:${r.id}`), toggle: (on: boolean) => setGlobal(`r:${r.id}`, on) };
          const name = r.scriptName || '(未命名正则)';
          const more = <RegexMore id={String(r.id)} name={name} busy={moving} onMove={(id, to) => { void move([{ id, to }]); }} />;
          return (
            <div key={r.id} class="rbt-owner-row">
              {item ? <ItemRow item={item} more={more} /> : <div class="rbt-env-item"><span class="rbt-env-name">{name}</span>{more}</div>}
            </div>
          );
        })}
        {!scripts.length && <small class="rbt-muted">没有全局正则。</small>}
      </div>
      {org.on ? (
        <div class="rbt-selbar" role="toolbar" aria-label="对选中的正则">
          <span class="rbt-org-count">已选 {picked.length} 条</span>
          <button type="button" class="rbt-btn rbt-btn-small rbt-btn-danger rbt-push" disabled={!picked.length || busy} onClick={del}>{busy ? '正在删除…' : `删除${picked.length ? ` ${picked.length} 条` : ''}`}</button>
        </div>
      ) : footer}
    </Section>
  );
}

/** Open ST's own regex manager (create / edit / import) inside the 扩展·正则 panel. */
/** Open an extension's section in 扩展 (expand it and scroll to it). */
function openExtensionSection(selector: string | HTMLElement, then?: (box: HTMLElement) => void): void {
  openDrawer('extensions');
  setTimeout(() => {
    const box = typeof selector === 'string' ? document.querySelector<HTMLElement>(selector) : selector;
    if (!box) return;
    const content = box.querySelector<HTMLElement>('.inline-drawer-content');
    if (content && getComputedStyle(content).display === 'none') box.querySelector<HTMLElement>('.inline-drawer-toggle')?.click();
    // 面板的标题栏钉在顶上：滚到它下面，不然这块的标题被挡住
    const head = document.querySelector<HTMLElement>('#rm_extensions_block > .rbt-sheet-head');
    box.style.scrollMarginTop = `${(head?.offsetHeight ?? 0) + 8}px`;
    box.scrollIntoView({ block: 'start' });
    then?.(box);
  }, 350);
}

/** 酒馆的「正则」面板；`list` 指定滚到全局 / 这张卡 / 预设哪一组。 */
export function openRegexManager(list?: 'global' | 'scoped' | 'preset'): void {
  const id = list === 'scoped' ? '#saved_scoped_scripts' : list === 'preset' ? '#saved_preset_scripts' : list === 'global' ? '#saved_regex_scripts' : '';
  openExtensionSection('.regex_settings', () => { if (id) document.querySelector<HTMLElement>(id)?.scrollIntoView({ block: 'start' }); });
}

/** Open ST's own editor for one regex script (the same as its ✎ in 扩展 › 正则); falls back to the regex panel. */
export function editRegex(id: string): void {
  for (const list of ['#saved_regex_scripts', '#saved_scoped_scripts', '#saved_preset_scripts']) {
    const btn = document.querySelector<HTMLElement>(`${list} [id="${CSS.escape(id)}"] .edit_existing_regex`);
    if (btn) { btn.click(); return; }
  }
  openRegexManager();
}

/** 酒馆助手的面板（脚本库在里面）。 */
export function openScriptManager(): void {
  openExtensionSection('#tavern_helper');
}

/** A small ✎ button for a row: opens the right editor. */
export function EditButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button type="button" class="rbt-row-edit" title={title} aria-label={title} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}>
      <i class="fa-solid fa-pen" />
    </button>
  );
}

/**
 * 全局世界书：真正的全局（正在聊的卡单独停用的也算开着）。别的卡的书被开成了全局，
 * 给一个「只给「X」用」：从全局拿掉，书留在那张卡上。
 */
export function GlobalWorldList() {
  void archiveVersion.value;
  const books = trueGlobalWorlds().sort((x, y) => x.localeCompare(y, 'zh-Hans-CN'));
  const owners = bookOwners('');
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<unknown>) => { setBusy(true); try { await f(); } finally { setBusy(false); refreshEnv(); } };
  const keep = (w: string, owner: string) => run(async () => {
    const undo = await keepForOwner(w);
    toast('success', `「${w}」不再是全局的，只在「${owner}」里启用。点这里撤销。`, APP_NAME, { onclick: () => { void run(undo); }, timeOut: 8000 });
  });
  if (!books.length) return <small class="rbt-muted">暂无全局世界书。</small>;
  return (
    <>
      {books.map((w) => {
        const owner = owners.get(w);
        return (
          <div key={w} class="rbt-env-item">
            <span class="rbt-env-name">{w}</span>
            {owner && <small class="rbt-muted">角色卡「{owner}」的书</small>}
            {owner && <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => { void keep(w, owner); }}>只给「{owner}」用</button>}
            <span class="rbt-env-toggle"><Toggle checked onChange={(on) => { void run(() => setGlobal(`w:${w}`, on)); }} title="点击开 / 关" /></span>
          </div>
        );
      })}
    </>
  );
}

/** 「全局世界书」标题右边的「添加全局世界书」：点开是能搜的列表（书多时下拉框太长）。 */
export function AddGlobalWorld() {
  void archiveVersion.value;
  const global = new Set(trueGlobalWorlds());
  const scopes = currentBookScopes();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const names = worldNames().filter((w) => !global.has(w)).sort((x, y) => x.localeCompare(y, 'zh-Hans-CN'));
  if (!names.length) return null;
  const add = async (name: string) => {
    setOpen(false);
    setBusy(true);
    try { await setGlobal(`w:${name}`, true); } finally { setBusy(false); refreshEnv(); }
  };
  const options: Opt[] = open ? names.map((w) => ({ key: w, title: w, sub: scopes.character.has(w) ? '已关联当前角色卡' : undefined, onPick: () => { void add(w); } })) : [];
  return (
    <Popup title="添加全局世界书" placeholder="搜世界书" open={open} onClose={() => setOpen(false)} options={options} cls="rbt-move">
      <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}><i class="fa-solid fa-plus" /> 添加全局世界书</button>
    </Popup>
  );
}

/** 全局预设：始终显示、修改全局的那个。正在聊的卡用自己的预设时，改了等离开这张卡再换上。 */
export function PresetPicker() {
  void archiveVersion.value;
  const names = presetNames();
  const cur = currentPresetName();
  const global = String(globalValue('preset') ?? cur);
  const held = heldByCard('preset');
  const [busy, setBusy] = useState(false);
  return (
    <>
    <div class="rbt-form-row">
      <select class="text_pole rbt-select" value={global} disabled={busy} onChange={async (e) => {
        const name = (e.currentTarget as HTMLSelectElement).value;
        if (!name || name === global) return;
        setBusy(true);
        try { await setGlobal('preset', name); } finally { setBusy(false); refreshEnv(); }
      }}>
        {!names.includes(global) && <option value={global}>{global}</option>}
        {names.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button class="rbt-btn" onClick={() => openDrawer('preset')}>编辑预设</button>
    </div>
    {held && cur !== global && <small class="rbt-muted">「{held}」用自己的「{cur}」。在这里换的全局预设，离开这张卡后生效。</small>}
    </>
  );
}

/** Plugins: switch each one; ST needs a page reload to apply, so changes are staged. */
/**
 * 打开一个插件自己的设置：酒馆「扩展」面板里标题对得上名字的那块，或者插件自己的面板按钮。
 * 酒馆没规定插件的设置叫什么，只能按名字找；找不到（停用了、没有设置）就是 null，不显示「设置」。
 */
function pluginSettings(name: string, id: string): (() => void) | null {
  const keys = [loose(name), loose(id)].filter(Boolean);
  // 标题和名字一样，或标题里含着名字（「酒馆助手 v3」）；名字里含着标题只认够长的标题，免得「正则」对上「正则助手」
  const hit = (text: string | null | undefined): boolean => {
    const t = loose(text ?? '');
    return !!t && keys.some((k) => t === k || t.includes(k) || (t.length >= 4 && k.includes(t)));
  };
  const head = [...document.querySelectorAll<HTMLElement>('#extensions_settings .inline-drawer-header, #extensions_settings2 .inline-drawer-header')].find((h) => hit(h.textContent));
  const box = head?.closest<HTMLElement>('.inline-drawer');
  if (box) return () => openExtensionSection(box);
  const own = extDrawers.value.find((x) => hit(x.label));
  if (own) return () => extButtonHandlers(own).onClick();
  return null;
}

export function PluginList() {
  const list = installedExtensions().sort((x, y) => Number(y.enabled) - Number(x.enabled) || x.name.localeCompare(y.name));
  const [want, setWant] = useState<Record<string, boolean>>({});
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changed = list.filter((e) => e.id in want && want[e.id] !== e.enabled);
  // 打开插件页时查一遍哪些插件有新版本
  useEffect(() => { checkPluginUpdates(list.map((e) => e.id)); }, []);
  const states = pluginStates.value;
  const fresh = list.filter((e) => states[e.id] === 'new');
  const apply = async () => {
    const ext = loaded.extensions;
    if (!ext) return;
    setBusy(true);
    for (const e of changed) {
      const name = `third-party/${e.id}`;
      if (want[e.id]) await ext.enableExtension(name, false);
      else await ext.disableExtension(name, false);
    }
    location.reload();
  };
  return (
    <>
      {fresh.length > 1 && (
        <div class="rbt-row-between rbt-plugin-news">
          <span>{fresh.length} 个插件有新版本</span>
          <button type="button" class="rbt-btn rbt-btn-small" onClick={() => { void updatePlugins(fresh); }}>全部更新</button>
        </div>
      )}
      {list.map((e) => {
        const on = e.id in want ? want[e.id] : e.enabled;
        const st = states[e.id];
        const openSettings = e.enabled ? pluginSettings(e.name, e.id) : null;
        const src = sourceFor('plugin', e.id);
        // 备注的第一行直接写在名字下面，不点开也看得到；以前分开记的链接也算备注
        const note = [...src.links.map((l) => `${l.label} ${l.url}`), ...src.notes.trim().split(/\r?\n/)].find((x) => x.trim()) ?? '';
        return (
          <div key={e.id} class="rbt-plugin">
          <div class={`rbt-env-item rbt-plugin-row ${on ? '' : 'off'}`}>
            <span class="rbt-env-toggle rbt-plugin-toggle">
              <Toggle checked={on} onChange={(v) => setWant({ ...want, [e.id]: v })} title={`启用或停用「${e.name}」`} />
            </span>
            <button type="button" class="rbt-env-main rbt-plugin-name" aria-expanded={notesFor === e.id} title="查看我的备注" onClick={() => setNotesFor(notesFor === e.id ? null : e.id)}>
              <span class="rbt-env-name">{e.name}{src.author && <small class="rbt-plugin-by"> by {src.author}</small>}</span>
              {note && <small class="rbt-muted rbt-plugin-note">{note}</small>}
            </button>
            {((e.id in want && want[e.id] !== e.enabled) || st === 'updated') && <Chip color="#f0a43a">刷新后生效</Chip>}
            {(st === 'new' || st === 'updating') && (
              <button type="button" class="rbt-btn rbt-btn-small rbt-plugin-up" disabled={st === 'updating'} onClick={() => { void updatePlugins([e]); }}>{st === 'updating' ? '正在更新…' : '更新'}</button>
            )}
            {openSettings && (
              <button type="button" class="rbt-btn rbt-btn-small rbt-plugin-set" title={`打开「${e.name}」的设置`} onClick={openSettings}>设置 <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></button>
            )}
            <MoreMenu title={e.name} items={[
              { icon: 'fa-pen', text: '我的备注', onClick: () => setNotesFor(notesFor === e.id ? null : e.id) },
              { icon: 'fa-trash-can', text: '删除插件', danger: true, onClick: () => { void deletePlugin(e.id, e.name); } },
            ]} />
          </div>
          {notesFor === e.id && <div class="rbt-plugin-more"><NotesSection sub kind="plugin" id={e.id} /></div>}
          </div>
        );
      })}
      {changed.length > 0 && (
        <div class="rbt-warn rbt-row-between">
          <span>{changed.length} 个插件的开关改动待保存，保存并刷新后生效。</span>
          <span class="rbt-row">
            <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => setWant({})}>撤销更改</button>
            <button class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={apply}>保存并刷新</button>
          </span>
        </div>
      )}
    </>
  );
}
