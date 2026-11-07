/**
 * 「这张卡」页面用到的各个分区（原「角色档案 · 这张卡」）。
 */
import { EditButton, editRegex, openRegexManager, openScriptManager } from './GlobalPage';
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { normalizeUrl, splitLinks, type BookDiff, type RegexOwner } from '../../core/cards';
import { ctx, currentCharacter, saveSettings, settings, confirmText } from '../../st/st';
import {
  allCharacters,
  archiveTarget,
  archiveVersion,
  buildOverview,
  cardInfo,
  cardsMissingWorld,
  checkWorld,
  currentPresetName,
  dropRecord,
  ensureFullCharacter,
  exportArchive,
  extStatus,
  findChar,
  globalRegexScripts,
  guessRegexOwner,
  importAllMissingWorlds,
  importArchive,
  importCardWorld,
  installedExtensions,
  presetApi,
  presetNames,
  presetRegexCount,
  relink,
  requiredExtensions,
  setCardModel,
  setRecommendedPreset,
  setRegexOwner,
  switchPreset,
  thumbnailUrl,
  updateRecord,
  worldNames,
  type CardInfo,
  type ExtStatus,
} from '../../tools/cards/cards';
import { Chip } from '../common';
import { SourceLine } from '../SourceEditor';
import { ModelPicker } from '../ModelPicker';

export const OK = '#2fbf8f';
export const WARN = '#f0a43a';
export const BAD = '#e5484d';

// --------------------------------------------------------------- bits ---

export function LinkText({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((p, i) => ('url' in p
        ? <a key={i} href={p.url} target="_blank" rel="noopener noreferrer">{p.url}</a>
        : <span key={i}>{p.text}</span>))}
    </>
  );
}

export function LongText({ text, limit = 400 }: { text: string; limit?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > limit;
  return (
    <div class="rbt-pre">
      <LinkText text={long && !open ? `${text.slice(0, limit)}…` : text} />
      {long && <div><button class="rbt-btn rbt-btn-small" onClick={() => setOpen(!open)}>{open ? '收起' : '展开全部'}</button></div>}
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ComponentChildren }) {
  return (
    <div class="rbt-card-section">
      <div class="rbt-card-section-head"><b>{title}</b>{hint && <small class="rbt-muted"> {hint}</small>}</div>
      {children}
    </div>
  );
}

export const STATUS_CHIP: Record<ExtStatus, { color: string; text: string }> = {
  enabled: { color: OK, text: '已启用' },
  disabled: { color: WARN, text: '已装，未启用' },
  missing: { color: BAD, text: '未安装' },
};

const CONTACT_LABEL = { discord: 'Discord', qq: 'QQ', qqgroup: 'QQ 群', url: '链接' } as const;

export function inputValue(e: Event): string {
  return (e.currentTarget as HTMLInputElement).value;
}

// ------------------------------------------------------------ header ---

export function CardHeader({ info, embedded }: { info: CardInfo; embedded?: boolean }) {
  const [firstLine, ...rest] = info.version.split(/\r?\n/);
  return (
    <div class="rbt-card-head">
      <img class="rbt-avatar" src={thumbnailUrl(info.avatar)} alt="" loading="lazy" />
      <div class="rbt-card-head-main">
        <div class="rbt-card-title">
          <b>{info.name}</b>
          {!info.isCurrent && <Chip color={WARN}>不是正在玩的卡</Chip>}
        </div>
        {info.creator && <div class="rbt-muted rbt-pre-line">作者：{info.creator}</div>}
        {firstLine && (
          rest.length ? (
            <details class="rbt-inline-details">
              <summary class="rbt-muted">版本：{firstLine}（还有 {rest.length} 行更新记录）</summary>
              <div class="rbt-pre">{rest.join('\n')}</div>
            </details>
          ) : <div class="rbt-muted">版本：{firstLine}</div>
        )}
        {info.tags.length > 0 && <div class="rbt-chips">{info.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>}
      </div>
      {!embedded && !info.isCurrent && currentCharacter() && <button class="rbt-btn rbt-btn-small" onClick={() => { archiveTarget.value = null; }}>回到当前卡</button>}
    </div>
  );
}

// ------------------------------------------------------------ source ---

export function SourceSection({ info }: { info: CardInfo }) {
  const rec = info.record;
  const links = rec?.links ?? [];
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const urlOk = !!normalizeUrl(url);

  const addLink = () => {
    if (!urlOk) return;
    updateRecord(info.avatar, info.name, { links: [...links, { label: label.trim() || '链接', url: normalizeUrl(url) }] });
    setLabel('');
    setUrl('');
  };

  return (
    <Section title="来源与作者说明">
      {(info.contacts.length > 0 || info.autoSource) && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">卡里写的来源和联系方式：</small>
          <div class="rbt-chips">
            {info.contacts.map((c, i) => (c.kind === 'url'
              ? <a key={i} href={c.value} target="_blank" rel="noopener noreferrer">{c.value}</a>
              : <Chip key={i} title="从卡的作者信息里找到的">{CONTACT_LABEL[c.kind]} {c.value}</Chip>))}
            {info.autoSource && <a href={info.autoSource} target="_blank" rel="noopener noreferrer">{info.autoSource}</a>}
          </div>
        </div>
      )}
      {info.creatorNotes.trim() && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">作者写在卡里的备注：</small>
          <LongText text={info.creatorNotes} />
        </div>
      )}

      <div class="rbt-card-sub">
        <small class="rbt-muted">相关链接，比如发布帖、更新帖、教程：</small>
        {links.map((l, i) => (
          <div key={i} class="rbt-link-row">
            <a href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}>{l.label}</a>
            <small class="rbt-muted rbt-ellipsis">{l.url}</small>
            <button class="rbt-btn rbt-btn-small" title="删除这条链接" onClick={() => updateRecord(info.avatar, info.name, { links: links.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        <div class="rbt-form-row">
          <input class="text_pole rbt-input rbt-w-label" placeholder="名称，如：发布帖" value={label} onInput={(e) => setLabel(inputValue(e))} />
          <input class="text_pole rbt-input" placeholder="https://…" value={url} onInput={(e) => setUrl(inputValue(e))} onKeyDown={(e) => { if (e.key === 'Enter') addLink(); }} />
          <button class="rbt-btn" disabled={!urlOk} onClick={addLink}>添加</button>
        </div>
      </div>

      <div class="rbt-card-sub">
        <div class="rbt-row-between">
          <small class="rbt-muted">作者说明：</small>
          {!editing && <button class="rbt-btn rbt-btn-small" onClick={() => { setDraft(rec?.notes ?? ''); setEditing(true); }}>{rec?.notes ? '编辑' : '填写'}</button>}
        </div>
        {editing ? (
          <>
            <textarea class="text_pole rbt-textarea" rows={10} value={draft} placeholder="把发布帖里的推荐设置、玩法和注意事项粘进来。网址会自动变成链接。" onInput={(e) => setDraft((e.currentTarget as HTMLTextAreaElement).value)} />
            <div class="rbt-row">
              <button class="rbt-btn rbt-btn-primary" onClick={() => { updateRecord(info.avatar, info.name, { notes: draft }); setEditing(false); }}>保存</button>
              <button class="rbt-btn" onClick={() => setEditing(false)}>取消</button>
            </div>
          </>
        ) : rec?.notes ? <LongText text={rec.notes} limit={600} /> : <div class="rbt-muted">还没填写。可以把发布帖里的推荐设置和玩法粘进来。</div>}
      </div>
    </Section>
  );
}

// ---------------------------------------------------- preset & extensions ---

export function PresetSection({ info }: { info: CardInfo }) {
  const names = presetNames();
  const rec = info.preset;
  const current = currentPresetName();
  const otherApi = rec && rec.api !== presetApi();
  return (
    <Section title="推荐预设和模型" hint="切到这张卡时自动换上">
      <div class="rbt-form-row">
        <select class="text_pole rbt-select" value={rec?.name ?? ''} onChange={(e) => setRecommendedPreset(info.avatar, info.name, (e.currentTarget as HTMLSelectElement).value || null)}>
          <option value="">不指定</option>
          {rec && !names.includes(rec.name) && <option value={rec.name}>{rec.name}（已不存在）</option>}
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {!rec && info.isCurrent && current && <button class="rbt-btn" onClick={() => setRecommendedPreset(info.avatar, info.name, current)}>用现在这个</button>}
      </div>
      {rec && names.includes(rec.name) && <SourceLine kind="preset" id={rec.name} />}
      {otherApi && <div class="rbt-hint">这个推荐是在「{rec!.api}」下设的，和现在用的 API 不同，所以不会自动换。</div>}
      {rec && info.isCurrent && !otherApi && rec.name !== current && (
        <div class="rbt-warn rbt-row-between">
          <span>现在用的是「{current}」，推荐的是「{rec.name}」。</span>
          <button class="rbt-btn rbt-btn-primary rbt-btn-small" onClick={() => switchPreset(rec.name)}>换上推荐的</button>
        </div>
      )}
      <div class="rbt-card-sub">
        <small class="rbt-muted">推荐模型：</small>
        <ModelPicker
          value={settings().profiles[info.avatar]?.model}
          onChange={(m) => setCardModel(info.avatar, info.name, m)}
          fallback={rec && settings().presetInfo[rec.name]?.model ? { text: '推荐预设的', model: settings().presetInfo[rec.name]!.model! } : undefined}
          offerSwitch={info.isCurrent}
        />
      </div>
    </Section>
  );
}

export function ExtSection({ info }: { info: CardInfo }) {
  const installed = installedExtensions();
  const list = requiredExtensions(info);
  const manual = info.record?.extensions ?? [];
  const [pick, setPick] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const listed = new Set(list.map((l) => extStatus(l.req, installed).match?.id).filter(Boolean));
  const add = () => {
    const req = pick === '__other' ? { name: name.trim(), url: normalizeUrl(url) || undefined } : { name: pick };
    if (!req.name) return;
    updateRecord(info.avatar, info.name, { extensions: [...manual, req] });
    setPick('');
    setName('');
    setUrl('');
  };
  return (
    <Section title="需要的插件">
      {!list.length && <div class="rbt-muted">还没登记。从下面选一个已装的插件，或手动填一个没装的。</div>}
      {list.map((l, i) => {
        const st = extStatus(l.req, installed);
        const chip = STATUS_CHIP[st.status];
        return (
          <div key={`${l.req.name}${i}`}>
          <div class="rbt-link-row">
            <Chip color={chip.color}>{chip.text}</Chip>
            <span class="rbt-env-name">{st.match?.name ?? l.req.name}</span>
            {l.auto && <small class="rbt-muted">{l.reason}</small>}
            {st.status === 'missing' && l.req.url && <a href={l.req.url} target="_blank" rel="noopener noreferrer">安装地址</a>}
            {!l.auto && <button class="rbt-btn rbt-btn-small rbt-push" title="从列表里删除" onClick={() => updateRecord(info.avatar, info.name, { extensions: manual.filter((m) => m !== l.req) })}>✕</button>}
          </div>
          {st.match && <SourceLine kind="plugin" id={st.match.id} />}
          </div>
        );
      })}
      <div class="rbt-form-row">
        <select class="text_pole rbt-select" value={pick} onChange={(e) => setPick((e.currentTarget as HTMLSelectElement).value)}>
          <option value="">添加插件…</option>
          {installed.filter((e) => !listed.has(e.id)).map((e) => <option key={e.id} value={e.id}>{e.name}{e.enabled ? '' : '（未启用）'}</option>)}
          <option value="__other">没装的插件，手动填写…</option>
        </select>
        {pick && pick !== '__other' && <button class="rbt-btn" onClick={add}>添加</button>}
      </div>
      {pick === '__other' && (
        <div class="rbt-form-row">
          <input class="text_pole rbt-input rbt-w-label" placeholder="插件名" value={name} onInput={(e) => setName(inputValue(e))} />
          <input class="text_pole rbt-input" placeholder="安装地址（选填）" value={url} onInput={(e) => setUrl(inputValue(e))} />
          <button class="rbt-btn" disabled={!name.trim()} onClick={add}>添加</button>
        </div>
      )}
    </Section>
  );
}

// ------------------------------------------------------------ lorebook ---

export function DiffList({ title, entries }: { title: string; entries: { comment: string; content: string }[] }) {
  if (!entries.length) return null;
  return (
    <details class="rbt-inline-details">
      <summary>{title} {entries.length} 条</summary>
      <ul class="rbt-diff-list">
        {entries.slice(0, 30).map((e, i) => <li key={i}><b>{e.comment || '（无标题）'}</b> <small class="rbt-muted">{e.content.slice(0, 60)}</small></li>)}
        {entries.length > 30 && <li class="rbt-muted">…还有 {entries.length - 30} 条</li>}
      </ul>
    </details>
  );
}

export function WorldSection({ info }: { info: CardInfo }) {
  const [diff, setDiff] = useState<BookDiff | null | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const w = info.world;
  useEffect(() => {
    let alive = true;
    setDiff('loading');
    checkWorld(info).then((d) => { if (alive) setDiff(d); }).catch(() => { if (alive) setDiff(null); });
    return () => { alive = false; };
  }, [info.avatar, w.name, w.state, archiveVersion.value]);

  const run = async (overwrite: boolean) => {
    if (overwrite) {
      const ok = await confirmText('用卡里的版本覆盖？',
        `世界书「${w.importName}」会换成卡里自带的版本，只在现有世界书里的条目会丢失（可能是你或脚本加的）。覆盖前会自动备份。`);
      if (!ok) return;
    }
    setBusy(true);
    try { await importCardWorld(info.avatar, { overwrite }); } finally { setBusy(false); }
  };

  const nameTaken = worldNames().includes(w.importName);
  return (
    <Section title="世界书">
      {w.state === 'none' && <div class="rbt-muted">这张卡没有世界书。</div>}
      {w.state !== 'none' && (
        <div class="rbt-link-row">
          <span class="rbt-env-name">{w.name || w.importName}</span>
          {w.state === 'ok' && <Chip color={OK}>已绑定</Chip>}
          {w.state === 'missing' && <Chip color={BAD}>找不到这本世界书</Chip>}
          {w.state === 'unbound' && <Chip color={WARN}>还没导入</Chip>}
          {w.embedded !== null && <small class="rbt-muted">卡里自带 {w.embedded} 条</small>}
        </div>
      )}
      {(w.state === 'missing' || w.state === 'unbound') && w.embedded !== null && (
        nameTaken
          ? <div class="rbt-warn rbt-row-between"><span>已有一本同名世界书「{w.importName}」，所以没有自动导入。</span><button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(true)}>用卡里的版本覆盖</button></div>
          : <div class="rbt-row"><button class="rbt-btn rbt-btn-primary" disabled={busy} onClick={() => run(false)}>{busy ? '正在导入…' : '导入并绑定'}</button></div>
      )}
      {w.state === 'ok' && w.embedded !== null && (
        diff === 'loading' ? <small class="rbt-muted">正在对比…</small>
          : diff && (diff.onlyCard.length || diff.onlyWorld.length) ? (
            <div class="rbt-warn">
              <div>卡里自带的和现在用的不一样：卡里 {diff.card} 条，现在 {diff.world} 条，其中 {diff.same} 条相同。</div>
              <small>只在现在这本里的，可能是你或脚本加的；只在卡里的，多半是作者更新了卡。</small>
              <DiffList title="只在卡里" entries={diff.onlyCard} />
              <DiffList title="只在现在这本里" entries={diff.onlyWorld} />
              <div class="rbt-row"><button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(true)}>用卡里的版本覆盖</button></div>
            </div>
          ) : diff ? <small class="rbt-ok">和卡里自带的一致 ✓</small> : null
      )}
      {w.extra.length > 0 && <div class="rbt-card-sub"><small class="rbt-muted">附加世界书：</small>{w.extra.map((b) => <Chip key={b}>{b}</Chip>)}</div>}
    </Section>
  );
}

// ------------------------------------------------------------- regex ---

export function RegexSection({ info }: { info: CardInfo }) {
  const owned = globalRegexScripts().filter((r) => {
    const o = settings().regexOwners[r.id];
    return o?.kind === 'card' && o.key === info.avatar;
  });
  const preset = info.isCurrent ? currentPresetName() : '';
  const presetRx = preset ? presetRegexCount(preset) : 0;
  return (
    <Section title="正则与脚本">
      <div class="rbt-link-row">
        <span>卡里的正则 <b>{info.regex.total}</b> 条{info.regex.total > 0 && `，开着 ${info.regex.enabled} 条`}</span>
        {info.regex.total > 0 && (info.regex.allowed ? <Chip color={OK}>已允许运行</Chip> : <Chip color={BAD}>未允许运行</Chip>)}
        {info.regex.total > 0 && info.isCurrent && <EditButton title="在正则面板里编辑这张卡的正则" onClick={() => openRegexManager('scoped')} />}
      </div>
      <div class="rbt-link-row">
        <span>酒馆助手角色脚本 <b>{info.scripts.total}</b> 个</span>
        {info.scripts.total > 0 && (info.scripts.enabled ? <Chip color={OK}>已启用</Chip> : <Chip color={BAD}>未启用</Chip>)}
        {info.scripts.total > 0 && info.isCurrent && <EditButton title="在酒馆助手里编辑脚本" onClick={openScriptManager} />}
      </div>
      {info.scripts.names.length > 0 && <div class="rbt-chips">{info.scripts.names.map((n, i) => <Chip key={i}>{n}</Chip>)}</div>}
      {owned.length > 0 && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">标为属于这张卡的全局正则：</small>
          {owned.map((r) => <div key={r.id} class="rbt-link-row"><span>{r.scriptName}</span>{r.disabled ? <Chip>关</Chip> : <Chip color={OK}>开</Chip>}<EditButton title="编辑这条正则" onClick={() => editRegex(r.id)} /></div>)}
        </div>
      )}
      {preset && presetRx > 0 && <small class="rbt-muted">另外，正在用的预设「{preset}」带了 {presetRx} 条正则，对所有卡生效。</small>}
      <small class="rbt-muted">全局正则在左栏「全局工具箱」里逐条开关。</small>
    </Section>
  );
}
