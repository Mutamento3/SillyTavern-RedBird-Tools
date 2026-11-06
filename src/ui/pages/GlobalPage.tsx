/**
 * 「全局」：对所有卡都生效的东西——全局世界书、全局正则（开关和"属于谁"在同一行）、预设带的正则和脚本、
 * 用户设定的世界书、酒馆助手全局脚本、已启用的插件。合并了原「换卡体检」的全局部分和「角色档案 · 正则归属」。
 */
import { useEffect, useState } from 'preact/hooks';
import type { RegexOwner } from '../../core/cards';
import { loaded, runSlash, settings, slashQuote } from '../../st/st';
import { allCharacters, archiveVersion, currentPresetName, findChar, globalRegexScripts, guessRegexOwner, installedExtensions, presetNames, setRegexOwner, switchPreset, worldNames } from '../../tools/cards/cards';
import { currentBookScopes } from '../../tools/flow/capture';
import { openDrawer } from '../../shell/drawers';
import { envReport, refreshEnv, type EnvItem, type EnvSubItem } from '../../tools/env/env';
import { Chip, Toggle } from '../common';
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
      {item.misplaced && <Chip color="#f0a43a" title={`标记为${item.misplaced}`}>不属于这张卡</Chip>}
      {item.detail && <small class="rbt-muted">{item.detail}</small>}
      {item.toggle && (
        <span class="rbt-env-toggle">
          <small class={item.enabled ? 'rbt-ok' : 'rbt-muted'}>{busy ? '…' : item.enabled ? '已开启' : '已关闭'}</small>
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
        <small class={sub.enabled ? 'rbt-ok' : 'rbt-muted'}>{busy ? '…' : sub.enabled ? '开' : '关'}</small>
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
      {groupOff && <div class="rbt-hint">总开关是关的，下面这些即使显示"开"也不会运行。</div>}
      {items.length > 10 && (
        <div class="rbt-sub-tools">
          <input class="text_pole rbt-input" placeholder="搜索正则名…" value={filter} onInput={(e) => setFilter((e.currentTarget as HTMLInputElement).value)} />
          <label class="rbt-check"><input type="checkbox" checked={onlyOn} onChange={(e) => setOnlyOn((e.currentTarget as HTMLInputElement).checked)} />只看开着的</label>
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
function GlobalRegexList({ items }: { items: EnvItem[] }) {
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
      <small class="rbt-muted">标上"属于谁"以后，换卡时会自动开关：属于这张卡或当前预设的打开，属于别的卡或预设的关掉。</small>
      {guesses.length > 1 && (
        <div class="rbt-row"><button class="rbt-btn rbt-btn-small" onClick={() => { for (const { r, g } of guesses) setRegexOwner(r.id, g!); }}>按名字猜，全部标上（{guesses.length} 条）</button></div>
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
                <option value="">未标注（换卡时不动它）</option>
                <optgroup label="插件">{exts.map((e) => <option key={e.id} value={`extension:${e.id}`}>{e.name}</option>)}</optgroup>
                <optgroup label="预设">{presets.map((p) => <option key={p} value={`preset:${p}`}>{p}</option>)}</optgroup>
                <optgroup label="角色卡">{chars.map((c) => <option key={c.avatar} value={`card:${c.avatar}`}>{c.name}</option>)}</optgroup>
              </select>
              {g && <button class="rbt-btn rbt-btn-small" title="按名字猜的" onClick={() => setRegexOwner(r.id, g)}>猜是 {g.label}</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Open ST's own regex manager (create / edit / import) inside the 扩展·正则 panel. */
function openRegexManager(): void {
  openDrawer('extensions');
  setTimeout(() => {
    const box = document.querySelector<HTMLElement>('.regex_settings');
    const content = box?.querySelector<HTMLElement>('.inline-drawer-content');
    if (content && getComputedStyle(content).display === 'none') box?.querySelector<HTMLElement>('.inline-drawer-toggle')?.click();
    box?.scrollIntoView({ block: 'start' });
  }, 350);
}

function AddGlobalWorld() {
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
        {options.map((w) => <option key={w} value={w}>{w}{scopes.character.has(w) ? '（已经绑在这张卡上）' : ''}</option>)}
      </select>
    </div>
  );
}

function PresetPicker() {
  const names = presetNames();
  const cur = currentPresetName();
  const [busy, setBusy] = useState(false);
  return (
    <div class="rbt-form-row">
      <select class="text_pole rbt-select" value={cur} disabled={busy} onChange={async (e) => {
        const name = (e.currentTarget as HTMLSelectElement).value;
        if (!name || name === cur) return;
        setBusy(true);
        try { await switchPreset(name); } finally { setBusy(false); refreshEnv(); }
      }}>
        {names.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button class="rbt-btn" onClick={() => openDrawer('preset')}>编辑这个预设</button>
    </div>
  );
}

/** Plugins: switch each one; ST needs a page reload to apply, so changes are staged. */
function PluginList() {
  const list = installedExtensions().sort((x, y) => Number(y.enabled) - Number(x.enabled) || x.name.localeCompare(y.name));
  const [want, setWant] = useState<Record<string, boolean>>({});
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
          <div key={e.id} class={`rbt-env-item ${on ? '' : 'off'}`}>
            <span class="rbt-env-name">{e.name}</span>
            {e.name !== e.id && <small class="rbt-muted">{e.id}</small>}
            {e.id in want && want[e.id] !== e.enabled && <Chip color="#f0a43a">刷新后生效</Chip>}
            <span class="rbt-env-toggle">
              <small class={on ? 'rbt-ok' : 'rbt-muted'}>{on ? '已启用' : '已停用'}</small>
              <Toggle checked={on} onChange={(v) => setWant({ ...want, [e.id]: v })} title="启用 / 停用这个插件" />
            </span>
          </div>
        );
      })}
      {changed.length > 0 && (
        <div class="rbt-warn rbt-row-between">
          <span>改了 {changed.length} 个插件，要刷新页面才生效。</span>
          <span class="rbt-row">
            <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => setWant({})}>还原</button>
            <button class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={apply}>保存并刷新</button>
          </span>
        </div>
      )}
    </>
  );
}

export function GlobalPage() {
  const report = envReport.value;
  useEffect(() => { refreshEnv(); }, []);
  void archiveVersion.value;
  if (!report) return null;
  const pick = (f: (i: EnvItem) => boolean) => report.items.filter(f);
  const worlds = pick((i) => i.kind === 'worldbook' && (i.scope === 'global' || i.scope === 'persona'));
  const regex = pick((i) => i.scope === 'global' && i.kind === 'regex');
  const presetRx = pick((i) => i.scope === 'preset' && i.kind !== 'preset');
  const scripts = pick((i) => i.scope === 'global' && i.kind === 'script');
  return (
    <div class="rbt-page">
      <div class="rbt-page-lead">这里的东西换卡时不会跟着走，对所有卡都生效。跟某张卡配套的，最好绑到卡上；全局正则可以标"属于谁"，换卡时就会自动开关。</div>
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <Section title="全局世界书" hint="打开后对所有卡生效">
            {worlds.map((i) => <ItemRow key={i.id} item={i} />)}
            {!worlds.length && <small class="rbt-muted">现在没有开着的全局世界书。</small>}
            <AddGlobalWorld />
          </Section>
          <Section title="全局正则">
            <GlobalRegexList items={regex} />
            <div class="rbt-row"><button class="rbt-btn" onClick={openRegexManager}>新建 / 编辑 / 导入正则</button></div>
          </Section>
          {scripts.length > 0 && <Section title="酒馆助手全局脚本">{scripts.map((i) => <ItemRow key={i.id} item={i} />)}</Section>}
        </div>
        <div class="rbt-page-group">
          <Section title="预设" hint="换卡时会切到那张卡的推荐预设">
            <PresetPicker />
            {presetRx.map((i) => <ItemRow key={i.id} item={i} />)}
            {!presetRx.length && <small class="rbt-muted">这个预设没有自带正则和脚本。</small>}
          </Section>
          <Section title="插件" hint="对所有卡生效">
            <PluginList />
          </Section>
        </div>
      </div>
    </div>
  );
}
