/**
 * 「这张卡」页面用到的各个分区（原「角色档案 · 这张卡」）。
 */
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { isHttpUrl, splitLinks, type BookDiff, type RegexOwner } from '../../core/cards';
import { ctx, currentCharacter, saveSettings, settings } from '../../st/st';
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
  disabled: { color: WARN, text: '已装但没启用' },
  missing: { color: BAD, text: '没装' },
};

const CONTACT_LABEL = { discord: 'Discord', qq: 'QQ', qqgroup: 'QQ 群', url: '链接' } as const;

export function inputValue(e: Event): string {
  return (e.currentTarget as HTMLInputElement).value;
}

// ------------------------------------------------------------ header ---

export function CardHeader({ info }: { info: CardInfo }) {
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
      {!info.isCurrent && currentCharacter() && <button class="rbt-btn rbt-btn-small" onClick={() => { archiveTarget.value = null; }}>回到当前卡</button>}
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
  const urlOk = isHttpUrl(url);

  const addLink = () => {
    if (!urlOk) return;
    updateRecord(info.avatar, info.name, { links: [...links, { label: label.trim() || '链接', url: url.trim() }] });
    setLabel('');
    setUrl('');
  };

  return (
    <Section title="来源与作者说明">
      {(info.contacts.length > 0 || info.autoSource) && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">卡里写的联系方式 / 来源：</small>
          <div class="rbt-chips">
            {info.contacts.map((c, i) => (c.kind === 'url'
              ? <a key={i} href={c.value} target="_blank" rel="noopener noreferrer">{c.value}</a>
              : <Chip key={i} title="从卡的作者字段里识别出来的">{CONTACT_LABEL[c.kind]} {c.value}</Chip>))}
            {info.autoSource && <a href={info.autoSource} target="_blank" rel="noopener noreferrer">{info.autoSource}</a>}
          </div>
        </div>
      )}
      {info.creatorNotes.trim() && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">卡里的作者备注（creator_notes）：</small>
          <LongText text={info.creatorNotes} />
        </div>
      )}

      <div class="rbt-card-sub">
        <small class="rbt-muted">链接（DC 发布帖、更新帖、教程…）：</small>
        {links.map((l, i) => (
          <div key={i} class="rbt-link-row">
            <a href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}>{l.label}</a>
            <small class="rbt-muted rbt-ellipsis">{l.url}</small>
            <button class="rbt-btn rbt-btn-small" title="删除这条链接" onClick={() => updateRecord(info.avatar, info.name, { links: links.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        <div class="rbt-form-row">
          <input class="text_pole rbt-input rbt-w-label" placeholder="名字，如 DC 发布帖" value={label} onInput={(e) => setLabel(inputValue(e))} />
          <input class="text_pole rbt-input" placeholder="https://…" value={url} onInput={(e) => setUrl(inputValue(e))} onKeyDown={(e) => { if (e.key === 'Enter') addLink(); }} />
          <button class="rbt-btn" disabled={!urlOk} onClick={addLink}>添加</button>
        </div>
      </div>

      <div class="rbt-card-sub">
        <div class="rbt-row-between">
          <small class="rbt-muted">作者说明（发布帖里的推荐设置、玩法、注意事项）：</small>
          {!editing && <button class="rbt-btn rbt-btn-small" onClick={() => { setDraft(rec?.notes ?? ''); setEditing(true); }}>{rec?.notes ? '编辑' : '填写'}</button>}
        </div>
        {editing ? (
          <>
            <textarea class="text_pole rbt-textarea" rows={10} value={draft} placeholder="把发布帖里的说明整段粘进来，网址会自动变成可以点的链接。" onInput={(e) => setDraft((e.currentTarget as HTMLTextAreaElement).value)} />
            <div class="rbt-row">
              <button class="rbt-btn rbt-btn-primary" onClick={() => { updateRecord(info.avatar, info.name, { notes: draft }); setEditing(false); }}>保存</button>
              <button class="rbt-btn" onClick={() => setEditing(false)}>取消</button>
            </div>
          </>
        ) : rec?.notes ? <LongText text={rec.notes} limit={600} /> : <div class="rbt-muted">还没填。</div>}
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
    <Section title="推荐预设" hint="换到这张卡时会自动切到它">
      <div class="rbt-form-row">
        <select class="text_pole rbt-select" value={rec?.name ?? ''} onChange={(e) => setRecommendedPreset(info.avatar, info.name, (e.currentTarget as HTMLSelectElement).value || null)}>
          <option value="">— 不指定 —</option>
          {rec && !names.includes(rec.name) && <option value={rec.name}>{rec.name}（找不到）</option>}
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {!rec && info.isCurrent && current && <button class="rbt-btn" onClick={() => setRecommendedPreset(info.avatar, info.name, current)}>用当前预设</button>}
      </div>
      {otherApi && <div class="rbt-hint">这个推荐预设是在「{rec!.api}」接口下设的，现在用的接口不同，换卡时不会比较。</div>}
      {rec && info.isCurrent && !otherApi && rec.name !== current && (
        <div class="rbt-warn rbt-row-between">
          <span>现在用的是「{current}」，不是推荐的「{rec.name}」。</span>
          <button class="rbt-btn rbt-btn-primary rbt-btn-small" onClick={() => switchPreset(rec.name)}>切换过去</button>
        </div>
      )}
      {rec && <small class="rbt-muted">以后换到这张卡时会自动切到这个预设（可以在「换卡时」里关掉自动切换）。</small>}
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
    const req = pick === '__other' ? { name: name.trim(), url: isHttpUrl(url) ? url.trim() : undefined } : { name: pick };
    if (!req.name) return;
    updateRecord(info.avatar, info.name, { extensions: [...manual, req] });
    setPick('');
    setName('');
    setUrl('');
  };
  return (
    <Section title="需要的插件">
      {!list.length && <div class="rbt-muted">还没填。从下面选，或者手动写没装的插件。</div>}
      {list.map((l, i) => {
        const st = extStatus(l.req, installed);
        const chip = STATUS_CHIP[st.status];
        return (
          <div key={`${l.req.name}${i}`} class="rbt-link-row">
            <Chip color={chip.color}>{chip.text}</Chip>
            <span class="rbt-env-name">{st.match?.name ?? l.req.name}</span>
            {l.auto && <small class="rbt-muted">自动识别：{l.reason}</small>}
            {st.status === 'missing' && l.req.url && <a href={l.req.url} target="_blank" rel="noopener noreferrer">安装地址</a>}
            {!l.auto && <button class="rbt-btn rbt-btn-small rbt-push" title="从列表里删除" onClick={() => updateRecord(info.avatar, info.name, { extensions: manual.filter((m) => m !== l.req) })}>✕</button>}
          </div>
        );
      })}
      <div class="rbt-form-row">
        <select class="text_pole rbt-select" value={pick} onChange={(e) => setPick((e.currentTarget as HTMLSelectElement).value)}>
          <option value="">添加一个插件…</option>
          {installed.filter((e) => !listed.has(e.id)).map((e) => <option key={e.id} value={e.id}>{e.name}{e.enabled ? '' : '（没启用）'}</option>)}
          <option value="__other">其他（没装的，手动填）</option>
        </select>
        {pick && pick !== '__other' && <button class="rbt-btn" onClick={add}>添加</button>}
      </div>
      {pick === '__other' && (
        <div class="rbt-form-row">
          <input class="text_pole rbt-input rbt-w-label" placeholder="插件名" value={name} onInput={(e) => setName(inputValue(e))} />
          <input class="text_pole rbt-input" placeholder="安装地址（可不填）" value={url} onInput={(e) => setUrl(inputValue(e))} />
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
        {entries.slice(0, 30).map((e, i) => <li key={i}><b>{e.comment || '(无标题)'}</b> <small class="rbt-muted">{e.content.slice(0, 60)}</small></li>)}
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
      const ok = await ctx().Popup?.show?.confirm?.('用卡里的版本覆盖世界书',
        `会把世界书「${w.importName}」换成卡里内嵌的版本。只在文件里的条目会丢掉（可能是你或脚本加的）。覆盖前会把旧文件备份到 data/default-user/user/files/。确定吗？`);
      if (!ok) return;
    }
    setBusy(true);
    try { await importCardWorld(info.avatar, { overwrite }); } finally { setBusy(false); }
  };

  const nameTaken = worldNames().includes(w.importName);
  return (
    <Section title="世界书">
      {w.state === 'none' && <div class="rbt-muted">这张卡没有绑定世界书，卡里也没带。</div>}
      {w.state !== 'none' && (
        <div class="rbt-link-row">
          <span class="rbt-env-name">{w.name || w.importName}</span>
          {w.state === 'ok' && <Chip color={OK}>已绑定</Chip>}
          {w.state === 'missing' && <Chip color={BAD}>绑定了，但世界书文件不存在</Chip>}
          {w.state === 'unbound' && <Chip color={WARN}>卡里带了，但没导入</Chip>}
          {w.embedded !== null && <small class="rbt-muted">卡里内嵌 {w.embedded} 条</small>}
        </div>
      )}
      {(w.state === 'missing' || w.state === 'unbound') && w.embedded !== null && (
        nameTaken
          ? <div class="rbt-warn rbt-row-between"><span>已经有一本同名世界书「{w.importName}」，没有自动导入。</span><button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(true)}>用卡里的版本覆盖</button></div>
          : <div class="rbt-row"><button class="rbt-btn rbt-btn-primary" disabled={busy} onClick={() => run(false)}>{busy ? '导入中…' : '从卡里导入并绑定'}</button></div>
      )}
      {w.state === 'ok' && w.embedded !== null && (
        diff === 'loading' ? <small class="rbt-muted">正在对比卡里和文件…</small>
          : diff && (diff.onlyCard.length || diff.onlyWorld.length) ? (
            <div class="rbt-warn">
              <div>卡里的世界书和已导入的文件不一样：卡里 {diff.card} 条，文件 {diff.world} 条，内容相同 {diff.same} 条。</div>
              <small>只在文件里有的，可能是你自己或脚本加的；只在卡里有的，多半是作者更新了卡。</small>
              <DiffList title="只在卡里有" entries={diff.onlyCard} />
              <DiffList title="只在文件里有" entries={diff.onlyWorld} />
              <div class="rbt-row"><button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(true)}>用卡里的版本覆盖（先备份）</button></div>
            </div>
          ) : diff ? <small class="rbt-ok">和卡里内嵌的版本一致 ✓</small> : null
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
        <span>卡内正则 <b>{info.regex.total}</b> 条（启用 {info.regex.enabled}）</span>
        {info.regex.total > 0 && (info.regex.allowed ? <Chip color={OK}>已允许运行</Chip> : <Chip color={BAD}>没允许运行</Chip>)}
      </div>
      <div class="rbt-link-row">
        <span>酒馆助手角色脚本 <b>{info.scripts.total}</b> 个</span>
        {info.scripts.total > 0 && (info.scripts.enabled ? <Chip color={OK}>已启用</Chip> : <Chip color={BAD}>没启用</Chip>)}
      </div>
      {info.scripts.names.length > 0 && <div class="rbt-chips">{info.scripts.names.map((n, i) => <Chip key={i}>{n}</Chip>)}</div>}
      {owned.length > 0 && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">标记为属于这张卡的全局正则：</small>
          {owned.map((r) => <div key={r.id} class="rbt-link-row"><span>{r.scriptName}</span>{r.disabled ? <Chip>关</Chip> : <Chip color={OK}>开</Chip>}</div>)}
        </div>
      )}
      {preset && presetRx > 0 && <small class="rbt-muted">另外，当前预设「{preset}」带了 {presetRx} 条预设正则，玩哪张卡都会生效。</small>}
      <small class="rbt-muted">全局正则在左栏「全局」里逐条开关。</small>
    </Section>
  );
}
