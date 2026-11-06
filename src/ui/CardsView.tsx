import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { isHttpUrl, splitLinks, type BookDiff, type RegexOwner } from '../core/cards';
import { ctx, currentCharacter, saveSettings, settings } from '../st/st';
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
} from '../tools/cards/cards';
import { Chip, Empty } from './common';

type Sub = 'card' | 'all' | 'regex';
export const cardsSub = signal<Sub>('card');

const SUBS: { id: Sub; label: string }[] = [
  { id: 'card', label: '这张卡' },
  { id: 'all', label: '全部卡' },
  { id: 'regex', label: '正则归属' },
];

const OK = '#2fbf8f';
const WARN = '#f0a43a';
const BAD = '#e5484d';

// --------------------------------------------------------------- bits ---

function LinkText({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((p, i) => ('url' in p
        ? <a key={i} href={p.url} target="_blank" rel="noopener noreferrer">{p.url}</a>
        : <span key={i}>{p.text}</span>))}
    </>
  );
}

function LongText({ text, limit = 400 }: { text: string; limit?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > limit;
  return (
    <div class="rbt-pre">
      <LinkText text={long && !open ? `${text.slice(0, limit)}…` : text} />
      {long && <div><button class="rbt-btn rbt-btn-small" onClick={() => setOpen(!open)}>{open ? '收起' : '展开全部'}</button></div>}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ComponentChildren }) {
  return (
    <div class="rbt-card-section">
      <div class="rbt-card-section-head"><b>{title}</b>{hint && <small class="rbt-muted"> {hint}</small>}</div>
      {children}
    </div>
  );
}

const STATUS_CHIP: Record<ExtStatus, { color: string; text: string }> = {
  enabled: { color: OK, text: '已启用' },
  disabled: { color: WARN, text: '已装但没启用' },
  missing: { color: BAD, text: '没装' },
};

const CONTACT_LABEL = { discord: 'Discord', qq: 'QQ', qqgroup: 'QQ 群', url: '链接' } as const;

function inputValue(e: Event): string {
  return (e.currentTarget as HTMLInputElement).value;
}

// ------------------------------------------------------------ header ---

function CardHeader({ info }: { info: CardInfo }) {
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

function SourceSection({ info }: { info: CardInfo }) {
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

function PresetSection({ info }: { info: CardInfo }) {
  const names = presetNames();
  const rec = info.preset;
  const current = currentPresetName();
  const otherApi = rec && rec.api !== presetApi();
  return (
    <Section title="推荐预设" hint="和「换卡体检」记住的预设是同一份">
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
      {rec && <small class="rbt-muted">以后换到这张卡时，如果预设不对，会弹提示，点一下就能切过去。</small>}
    </Section>
  );
}

function ExtSection({ info }: { info: CardInfo }) {
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

function DiffList({ title, entries }: { title: string; entries: { comment: string; content: string }[] }) {
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

function WorldSection({ info }: { info: CardInfo }) {
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

function RegexSection({ info }: { info: CardInfo }) {
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
      <small class="rbt-muted">逐条开关正则请到「换卡体检」页。</small>
    </Section>
  );
}

// ------------------------------------------------------------ archive ---

function ArchiveView() {
  archiveVersion.value; // subscribe
  const cur = currentCharacter();
  const avatar = archiveTarget.value ?? cur?.avatar;
  useEffect(() => { if (avatar) ensureFullCharacter(avatar); }, [avatar]);
  const f = avatar ? findChar(avatar) : null;
  if (!f) return <Empty>现在没有打开角色卡（或者是群聊）。可以到「全部卡」里点一张卡查看。</Empty>;
  const info = cardInfo(f.char);
  return (
    <div class="rbt-cards">
      <CardHeader info={info} />
      <SourceSection info={info} />
      <PresetSection info={info} />
      <ExtSection info={info} />
      <WorldSection info={info} />
      <RegexSection info={info} />
    </div>
  );
}

// ----------------------------------------------------------- overview ---

function openCard(avatar: string) {
  archiveTarget.value = avatar;
  cardsSub.value = 'card';
}

function CardLink({ info }: { info: CardInfo }) {
  return <a class="rbt-card-link" onClick={() => openCard(info.avatar)}>{info.name}</a>;
}

function OverviewRow({ info }: { info: CardInfo }) {
  const installed = installedExtensions();
  const exts = requiredExtensions(info);
  const bad = exts.filter((e) => extStatus(e.req, installed).status !== 'enabled').length;
  const links = info.record?.links.length ?? 0;
  const w = info.world;
  return (
    <div class={`rbt-card-row ${info.isCurrent ? 'current' : ''}`} onClick={() => openCard(info.avatar)} title="点开看这张卡的档案">
      <img class="rbt-avatar-sm" src={thumbnailUrl(info.avatar)} alt="" loading="lazy" />
      <div class="rbt-card-row-main">
        <div class="rbt-card-title"><b>{info.name}</b>{info.isCurrent && <Chip color="#3d8bfd">正在玩</Chip>}</div>
        <div class="rbt-chips">
          {w.state === 'ok' && <Chip color={OK} title={w.name}>世界书</Chip>}
          {w.state === 'missing' && <Chip color={BAD} title={w.name}>世界书缺文件</Chip>}
          {w.state === 'unbound' && <Chip color={WARN}>世界书没导入</Chip>}
          {info.regex.total > 0 && <Chip color={info.regex.allowed ? undefined : BAD} title={info.regex.allowed ? '已允许运行' : '没允许运行'}>正则 {info.regex.total}</Chip>}
          {info.scripts.total > 0 && <Chip color={info.scripts.enabled ? undefined : BAD} title={info.scripts.enabled ? '已启用' : '没启用'}>脚本 {info.scripts.total}</Chip>}
          {info.preset && <Chip color="#8e7cf0" title="推荐预设">{info.preset.name}</Chip>}
          {exts.length > 0 && <Chip color={bad ? BAD : OK}>插件 {bad ? `缺 ${bad}` : '齐了'}</Chip>}
          {links > 0 && <Chip color="#3d8bfd">链接 {links}</Chip>}
          {info.record?.notes && <Chip color="#3d8bfd">有说明</Chip>}
        </div>
      </div>
    </div>
  );
}

function BackupBox() {
  const [auto, setAuto] = useState(settings().autoImportWorld);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'merge' | 'overwrite'>('merge');
  const s = settings();
  const backups = s.worldBackups.slice(-5).reverse();
  const pickFile = (m: 'merge' | 'overwrite') => { setMode(m); fileRef.current?.click(); };
  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await importArchive(await file.text(), mode);
    } catch (err) {
      window.toastr?.error?.((err as Error).message, '导入失败');
    }
  };
  return (
    <details class="rbt-section">
      <summary><b>设置与备份</b></summary>
      <label class="rbt-check">
        <input type="checkbox" checked={auto} onChange={(e) => { const v = (e.currentTarget as HTMLInputElement).checked; s.autoImportWorld = v; saveSettings(); setAuto(v); }} />
        打开一张卡时，如果它带的世界书还没导入，就自动导入并绑定（不会覆盖已有的世界书）
      </label>
      <div class="rbt-card-sub">
        <small class="rbt-muted">手填的档案、推荐预设、正则归属都存在 settings.json 的 extension_settings.redbird_tools 里，跟着 data/default-user 文件夹走。也可以单独导出成一个文件：</small>
        <div class="rbt-row">
          <button class="rbt-btn rbt-btn-primary" onClick={() => exportArchive()}>导出档案</button>
          <button class="rbt-btn" onClick={() => pickFile('merge')}>导入（合并）</button>
          <button class="rbt-btn" onClick={() => pickFile('overwrite')}>导入（覆盖）</button>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} />
        </div>
        <small class="rbt-muted">合并：同一张卡保留较新的那份。覆盖：用文件里的内容替换全部。</small>
      </div>
      {backups.length > 0 && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">最近的世界书备份（在 data/default-user/user/files/ 里）：</small>
          {backups.map((b) => <div key={b.file}><small>{new Date(b.at).toLocaleString()} 「{b.world}」 → {b.file}</small></div>)}
        </div>
      )}
    </details>
  );
}

function OverviewView() {
  archiveVersion.value; // subscribe
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'nosource' | 'problem'>('all');
  const [busy, setBusy] = useState(false);
  const ov = buildOverview();
  const missing = cardsMissingWorld();
  const installed = installedExtensions();
  const shown = ov.cards.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.creator.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'nosource') return !c.record?.links.length;
    if (filter === 'problem') {
      return c.world.state === 'missing' || c.world.state === 'unbound' || (c.regex.total > 0 && !c.regex.allowed) || (c.scripts.total > 0 && !c.scripts.enabled)
        || requiredExtensions(c).some((e) => extStatus(e.req, installed).status !== 'enabled');
    }
    return true;
  });
  const sharedWorlds = [...ov.byWorld.entries()].filter(([, cs]) => cs.length > 1);
  return (
    <div class="rbt-cards">
      <div class="rbt-toolbar">
        <input class="text_pole rbt-input" placeholder="搜索卡名或作者…" value={q} onInput={(e) => setQ(inputValue(e))} />
        <select class="text_pole rbt-select rbt-w-filter" value={filter} onChange={(e) => setFilter((e.currentTarget as HTMLSelectElement).value as typeof filter)}>
          <option value="all">全部 {ov.cards.length} 张</option>
          <option value="nosource">没填链接的</option>
          <option value="problem">有问题的</option>
        </select>
      </div>
      {missing.length > 0 && (
        <div class="rbt-warn rbt-row-between">
          <span>{missing.length} 张卡带了世界书但还没导入：{missing.map((m) => m.name).join('、')}</span>
          <button class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { await importAllMissingWorlds(); } finally { setBusy(false); } }}>全部导入</button>
        </div>
      )}
      {ov.orphans.length > 0 && (
        <div class="rbt-warn">
          <div>有 {ov.orphans.length} 份档案找不到对应的卡（卡被删了，或者重新导入后文件名变了）：</div>
          {ov.orphans.map((o) => (
            <div key={o.avatar} class="rbt-link-row">
              <span>「{o.cardName}」<small class="rbt-muted">{o.avatar}</small></span>
              {o.candidates.map((c) => <button key={c} class="rbt-btn rbt-btn-small" onClick={() => relink(o.avatar, c)}>接到 {c}</button>)}
              <button class="rbt-btn rbt-btn-small" onClick={async () => { if (await ctx().Popup?.show?.confirm?.('删除档案', `删除「${o.cardName}」的档案和记住的环境？`)) dropRecord(o.avatar); }}>删除</button>
            </div>
          ))}
        </div>
      )}
      <div class="rbt-stack">
        {shown.map((c) => <OverviewRow key={c.avatar} info={c} />)}
        {!shown.length && <Empty>没有符合条件的卡</Empty>}
      </div>

      <details class="rbt-section">
        <summary><b>按推荐预设</b> <small class="rbt-muted">{ov.byPreset.size} 个预设</small></summary>
        {!ov.byPreset.size && <small class="rbt-muted">还没有卡设置推荐预设。</small>}
        {[...ov.byPreset.entries()].map(([p, cs]) => (
          <div key={p} class="rbt-lookup-row"><b>{p}</b>：{cs.map((c, i) => <span key={c.avatar}>{i > 0 && '、'}<CardLink info={c} /></span>)}</div>
        ))}
      </details>
      <details class="rbt-section">
        <summary><b>几张卡共用的世界书</b> <small class="rbt-muted">{sharedWorlds.length} 本</small></summary>
        {!sharedWorlds.length && <small class="rbt-muted">没有被多张卡共用的世界书。</small>}
        {sharedWorlds.map(([w, cs]) => (
          <div key={w} class="rbt-lookup-row"><b>{w}</b>：{cs.map((c, i) => <span key={c.avatar}>{i > 0 && '、'}<CardLink info={c} /></span>)}</div>
        ))}
      </details>
      <details class="rbt-section">
        <summary><b>没绑定任何卡的世界书</b> <small class="rbt-muted">{ov.unusedWorlds.length} 本</small></summary>
        {ov.unusedWorlds.map((w) => (
          <div key={w.name} class="rbt-lookup-row">{w.name} {w.global && <Chip color={BAD} title="在全局世界书里开着，对所有卡生效">全局开着</Chip>}</div>
        ))}
      </details>
      <BackupBox />
    </div>
  );
}

// -------------------------------------------------------------- regex ---

function ownerValue(o: RegexOwner | undefined): string {
  return o ? `${o.kind}:${o.key}` : '';
}

function RegexOwnerView() {
  archiveVersion.value; // subscribe
  const scripts = globalRegexScripts();
  const owners = settings().regexOwners;
  const exts = installedExtensions();
  const presets = presetNames();
  const chars = allCharacters();
  const guesses = scripts.map((r) => ({ r, g: owners[r.id] ? null : guessRegexOwner(r) })).filter((x) => x.g);
  const onPick = (id: string, v: string) => {
    if (!v) return setRegexOwner(id, null);
    const i = v.indexOf(':');
    const kind = v.slice(0, i) as RegexOwner['kind'];
    const key = v.slice(i + 1);
    const label = kind === 'extension' ? exts.find((e) => e.id === key)?.name ?? key : kind === 'card' ? findChar(key)?.char?.name ?? key : key;
    setRegexOwner(id, { kind, key, label });
  };
  const presetRx = presets.map((p) => ({ p, n: presetRegexCount(p) })).filter((x) => x.n > 0);
  const cardRx = chars.map(cardInfo).filter((c) => c.regex.total > 0).sort((a, b) => b.regex.total - a.regex.total);
  const curPreset = currentPresetName();
  return (
    <div class="rbt-cards">
      <Section title="全局正则" hint="对所有卡都生效">
        <small class="rbt-muted">可以标一下每条全局正则是哪来的。标成属于某张卡或某个预设后，换到别的卡它还开着时会提醒你。</small>
        {guesses.length > 1 && (
          <div class="rbt-row"><button class="rbt-btn rbt-btn-small" onClick={() => { for (const { r, g } of guesses) setRegexOwner(r.id, g!); }}>按猜测全部标上（{guesses.length} 条）</button></div>
        )}
        {!scripts.length && <div class="rbt-muted">没有全局正则。</div>}
        {scripts.map((r) => {
          const g = owners[r.id] ? null : guessRegexOwner(r);
          return (
            <div key={r.id} class="rbt-owner-row">
              <div class="rbt-link-row">
                <span class="rbt-env-name">{r.scriptName || '(未命名正则)'}</span>
                {r.disabled ? <Chip>关</Chip> : <Chip color={OK}>开</Chip>}
              </div>
              <div class="rbt-form-row">
                <select class="text_pole rbt-select" value={ownerValue(owners[r.id])} onChange={(e) => onPick(r.id, (e.currentTarget as HTMLSelectElement).value)}>
                  <option value="">未标注</option>
                  <optgroup label="扩展">{exts.map((e) => <option key={e.id} value={`extension:${e.id}`}>{e.name}</option>)}</optgroup>
                  <optgroup label="预设">{presets.map((p) => <option key={p} value={`preset:${p}`}>{p}</option>)}</optgroup>
                  <optgroup label="角色卡">{chars.map((c) => <option key={c.avatar} value={`card:${c.avatar}`}>{c.name}</option>)}</optgroup>
                </select>
                {g && <button class="rbt-btn rbt-btn-small" title="按名字猜的" onClick={() => setRegexOwner(r.id, g)}>猜是 {g.label}，标上</button>}
              </div>
            </div>
          );
        })}
      </Section>
      <Section title="预设正则" hint="存在预设里，用这个预设时生效">
        {!presetRx.length && <div class="rbt-muted">没有预设带正则。</div>}
        {presetRx.map(({ p, n }) => <div key={p} class="rbt-link-row"><span>{p}</span><b>{n} 条</b>{p === curPreset && <Chip color="#3d8bfd">当前预设</Chip>}</div>)}
      </Section>
      <Section title="卡内正则" hint="存在角色卡里，只对这张卡生效">
        {cardRx.map((c) => (
          <div key={c.avatar} class="rbt-link-row">
            <CardLink info={c} />
            <b>{c.regex.total} 条</b>
            {c.regex.allowed ? <Chip color={OK}>已允许</Chip> : <Chip color={BAD}>没允许运行</Chip>}
          </div>
        ))}
      </Section>
    </div>
  );
}

// --------------------------------------------------------------- root ---

export function CardsView() {
  const sub = cardsSub.value;
  return (
    <div class="rbt-cards-root">
      <div class="rbt-subtabs">
        {SUBS.map((s) => <button key={s.id} class={sub === s.id ? 'active' : ''} onClick={() => { cardsSub.value = s.id; }}>{s.label}</button>)}
      </div>
      {sub === 'card' && <ArchiveView />}
      {sub === 'all' && <OverviewView />}
      {sub === 'regex' && <RegexOwnerView />}
    </div>
  );
}
