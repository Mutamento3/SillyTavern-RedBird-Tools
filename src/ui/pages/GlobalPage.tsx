/**
 * 全局工具箱各标签共用的零件：一行开关、全局正则列表、加全局世界书、切预设、插件开关。
 */
import { useEffect, useState } from 'preact/hooks';
import type { RegexOwner } from '../../core/cards';
import { loaded, runSlash, settings, slashQuote } from '../../st/st';
import { allCharacters, archiveVersion, currentPresetName, findChar, globalRegexScripts, guessRegexOwner, installedExtensions, presetNames, setRegexOwner, switchPreset, worldNames } from '../../tools/cards/cards';
import { currentBookScopes } from '../../tools/flow/capture';
import { openDrawer } from '../../shell/drawers';
import { envReport, refreshEnv, type EnvItem, type EnvSubItem } from '../../tools/env/env';
import { Chip, CheckMark, Toggle } from '../common';
import { SourceEditor } from '../SourceEditor';
import { sourceFor } from '../../tools/sources';
import { OK, Section } from './parts';

const KIND_LABEL: Record<EnvItem['kind'], string> = {
  worldbook: '世界书', regex: '正则', script: '脚本', extension: '插件', preset: '预设',
};

export function ItemRow({ item }: { item: EnvItem }) {
  const [busy, setBusy] = useState(false);
  const onToggle = async (on: boolean) => {
    if (!item.toggle) return;
    setBusy(true);
    try { await item.toggle(on); } finally { setBusy(false); refreshEnv(); }
  };
  const body = (
    <div class={`rbt-env-item ${item.enabled ? '' : 'off'}`}>
      <Chip>{KIND_LABEL[item.kind]}</Chip>
      <span class="rbt-env-name">{item.name}</span>
      {item.misplaced && <Chip color="#f0a43a" title={`标为${item.misplaced}`}>不属于这张卡</Chip>}
      {item.detail && <small class="rbt-muted">{item.detail}</small>}
      {item.toggle && (
        <span class="rbt-env-toggle">
          {busy && <small class="rbt-muted">…</small>}
          <Toggle checked={item.enabled} onChange={onToggle} title="点击开 / 关" />
        </span>
      )}
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
      <span class="rbt-env-toggle">
        {busy && <small class="rbt-muted">…</small>}
        <Toggle checked={sub.enabled} onChange={onToggle} title="点击开 / 关这一条" />
      </span>
    </div>
  );
}

function SubItemList({ items, groupOff }: { items: EnvSubItem[]; groupOff: boolean }) {
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
      {!shown.length && <small class="rbt-muted">没有匹配的正则</small>}
    </div>
  );
}

function ownerValue(o: RegexOwner | undefined): string {
  return o ? `${o.kind}:${o.key}` : '';
}

/** One global regex: on/off and "belongs to" on the same row. */
export function GlobalRegexList({ items }: { items: EnvItem[] }) {
  void archiveVersion.value;
  const scripts = globalRegexScripts();
  const owners = settings().regexOwners;
  const exts = installedExtensions();
  const presets = presetNames();
  const chars = allCharacters();
  const byId = new Map(items.map((i) => [i.id, i]));
  const guesses = scripts.map((r) => ({ r, g: owners[r.id] ? null : guessRegexOwner(r) })).filter((x) => x.g);
  const onPick = (id: string, v: string) => {
    if (!v) return setRegexOwner(id, null);
    const i = v.indexOf(':');
    const kind = v.slice(0, i) as RegexOwner['kind'];
    const key = v.slice(i + 1);
    const label = kind === 'extension' ? exts.find((e) => e.id === key)?.name ?? key : kind === 'card' ? findChar(key)?.char?.name ?? key : key;
    setRegexOwner(id, { kind, key, label });
  };
  if (!scripts.length) return <div class="rbt-muted">没有全局正则。</div>;
  return (
    <>
      <small class="rbt-muted">给正则选好「属于」，换卡时就会自动开关：属于当前的卡或预设就打开，属于别的就关掉。</small>
      {guesses.length > 1 && (
        <div class="rbt-row"><button class="rbt-btn rbt-btn-small" onClick={() => { for (const { r, g } of guesses) setRegexOwner(r.id, g!); }}>按名字自动选好 {guesses.length} 条</button></div>
      )}
      {scripts.map((r) => {
        const item = byId.get(`rx:g:${r.id ?? r.scriptName}`);
        const g = owners[r.id] ? null : guessRegexOwner(r);
        return (
          <div key={r.id} class="rbt-owner-row">
            {item ? <ItemRow item={item} /> : <div class="rbt-env-item"><span class="rbt-env-name">{r.scriptName}</span></div>}
            <div class="rbt-form-row rbt-owner-pick">
              <small class="rbt-muted">属于</small>
              <select class="text_pole rbt-select" value={ownerValue(owners[r.id])} onChange={(e) => onPick(r.id, (e.currentTarget as HTMLSelectElement).value)}>
                <option value="">没选（换卡时不动它）</option>
                <optgroup label="插件">{exts.map((e) => <option key={e.id} value={`extension:${e.id}`}>{e.name}</option>)}</optgroup>
                <optgroup label="预设">{presets.map((p) => <option key={p} value={`preset:${p}`}>{p}</option>)}</optgroup>
                <optgroup label="角色卡">{chars.map((c) => <option key={c.avatar} value={`card:${c.avatar}`}>{c.name}</option>)}</optgroup>
              </select>
              {g && <button class="rbt-btn rbt-btn-small" title="按名字猜的，点一下就选上" onClick={() => setRegexOwner(r.id, g)}>可能是 {g.label}</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Open ST's own regex manager (create / edit / import) inside the 扩展·正则 panel. */
export function openRegexManager(): void {
  openDrawer('extensions');
  setTimeout(() => {
    const box = document.querySelector<HTMLElement>('.regex_settings');
    const content = box?.querySelector<HTMLElement>('.inline-drawer-content');
    if (content && getComputedStyle(content).display === 'none') box?.querySelector<HTMLElement>('.inline-drawer-toggle')?.click();
    box?.scrollIntoView({ block: 'start' });
  }, 350);
}

export function AddGlobalWorld() {
  const scopes = currentBookScopes();
  const options = worldNames().filter((w) => !scopes.global.has(w)).sort((x, y) => x.localeCompare(y, 'zh-Hans-CN'));
  const [busy, setBusy] = useState(false);
  if (!options.length) return null;
  return (
    <div class="rbt-form-row">
      <select class="text_pole rbt-select" value="" disabled={busy} onChange={async (e) => {
        const name = (e.currentTarget as HTMLSelectElement).value;
        if (!name) return;
        setBusy(true);
        try { await runSlash(`/world state=on silent=true ${slashQuote(name)}`); } finally { setBusy(false); refreshEnv(); }
      }}>
        <option value="">打开一本全局世界书…</option>
        {options.map((w) => <option key={w} value={w}>{w}{scopes.character.has(w) ? '（已绑在当前卡上）' : ''}</option>)}
      </select>
    </div>
  );
}

export function PresetPicker() {
  const names = presetNames();
  const cur = currentPresetName();
  const [busy, setBusy] = useState(false);
  return (
    <>
    <div class="rbt-form-row">
      <select class="text_pole rbt-select" value={cur} disabled={busy} onChange={async (e) => {
        const name = (e.currentTarget as HTMLSelectElement).value;
        if (!name || name === cur) return;
        setBusy(true);
        try { await switchPreset(name); } finally { setBusy(false); refreshEnv(); }
      }}>
        {names.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button class="rbt-btn" onClick={() => openDrawer('preset')}>编辑预设</button>
    </div>
    </>
  );
}

/** Plugins: switch each one; ST needs a page reload to apply, so changes are staged. */
export function PluginList() {
  const list = installedExtensions().sort((x, y) => Number(y.enabled) - Number(x.enabled) || x.name.localeCompare(y.name));
  const [want, setWant] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changed = list.filter((e) => e.id in want && want[e.id] !== e.enabled);
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
      {list.map((e) => {
        const on = e.id in want ? want[e.id] : e.enabled;
        return (
          <div key={e.id} class="rbt-plugin">
          <div class={`rbt-env-item ${on ? '' : 'off'}`}>
            <button type="button" class="rbt-plugin-name" title="作者和链接" onClick={() => setOpen(open === e.id ? null : e.id)}>
              <i class={`fa-solid fa-chevron-${open === e.id ? 'down' : 'right'} rbt-plugin-caret`} />
              <span class="rbt-env-name">{e.name}</span>
            </button>
            {sourceFor('plugin', e.id).author && <small class="rbt-muted">{sourceFor('plugin', e.id).author}</small>}
            {e.id in want && want[e.id] !== e.enabled && <Chip color="#f0a43a">刷新后生效</Chip>}
            <span class="rbt-env-toggle">
              <Toggle checked={on} onChange={(v) => setWant({ ...want, [e.id]: v })} title="启用 / 停用这个插件" />
            </span>
          </div>
          {open === e.id && <div class="rbt-plugin-more"><SourceEditor kind="plugin" id={e.id} /></div>}
          </div>
        );
      })}
      {changed.length > 0 && (
        <div class="rbt-warn rbt-row-between">
          <span>改了 {changed.length} 个插件，刷新页面后生效。</span>
          <span class="rbt-row">
            <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => setWant({})}>还原</button>
            <button class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={apply}>保存并刷新</button>
          </span>
        </div>
      )}
    </>
  );
}
