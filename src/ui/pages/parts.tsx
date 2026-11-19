/**
 * 「这张卡」页面用到的各个分区（原「角色档案 · 这张卡」）。
 */
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { normalizeUrl, splitLinks } from '../../core/cards';
import { ctx, currentCharacter, loaded, toast } from '../../st/st';
import { openFloatMenu } from '../floatMenu';
import {
  archiveTarget,
  extStatus,
  installedExtensions,
  requiredExtensions,
  thumbnailUrl,
  updateRecord,
  type CardInfo,
  type ExtStatus,
} from '../../tools/cards/cards';
import { Chip } from '../common';
import { SourceLine } from '../SourceEditor';
import { openDrawer } from '../../shell/drawers';
import { closeSheet } from '../views';
import { openBookInEditor } from '../../shell/worldNote';

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

/**
 * 分区：标题在左上，打开酒馆对应编辑面板的按钮（「编辑」「预设设置」…）统一放在右上，
 * 和卡面的「编辑角色」同一个位置（DESIGN.md「按钮」）。
 */
export function Section({ title, hint, actions, children, lintSpacing }: { title: string; hint?: string; actions?: ComponentChildren; children: ComponentChildren; /** 里面有小标题、故意留不一样的间距（ui-audit 不查） */ lintSpacing?: 'ok' }) {
  return (
    <section class="rbt-card-section" data-lint-spacing={lintSpacing}>
      <div class="rbt-card-section-head">
        <div class="rbt-card-section-top">
          <h3 class="rbt-card-section-title">{title}</h3>
          {actions && <div class="rbt-card-section-actions">{actions}</div>}
        </div>
        {hint && <p class="rbt-card-section-hint">{hint}</p>}
      </div>
      {children}
    </section>
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

/**
 * 角色档案里的按钮在哪里打开都一样。编辑角色、编辑这张卡的正则和脚本，酒馆只能对正在聊的卡做，
 * 所以看的不是正在聊的卡时（比如从全局工具箱点进来），先打开这张卡，再打开对应的面板。
 */
export async function withCardOpen(info: CardInfo, then: () => void): Promise<void> {
  if (!info.isCurrent) {
    const c = ctx();
    const idx = (c.characters ?? []).findIndex((x: { avatar?: string }) => x.avatar === info.avatar);
    if (idx < 0) return;
    closeSheet();
    await c.selectCharacterById(idx);
    // 换卡时会关掉开着的面板，等它关完再打开
    await new Promise((r) => setTimeout(r, 400));
  }
  then();
}

export function CardHeader({ info, embedded }: { info: CardInfo; embedded?: boolean }) {
  const [firstLine, ...rest] = info.version.split(/\r?\n/);
  return (
    <div class="rbt-card-head">
      <img class="rbt-avatar" src={thumbnailUrl(info.avatar)} alt="" loading="lazy" />
      <div class="rbt-card-head-main">
        <div class="rbt-card-title">
          <b>{info.name}</b>
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
      <div class="rbt-card-head-actions">
        {!info.isCurrent && <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary" title={`打开和「${info.name}」的聊天`} onClick={() => { void withCardOpen(info, () => {}); }}>去聊天</button>}
        <button type="button" class="rbt-btn rbt-btn-small" title={`在酒馆的角色面板里编辑「${info.name}」`} onClick={() => { void withCardOpen(info, () => openDrawer('characters')); }}>编辑角色 ↗</button>
        {!embedded && !info.isCurrent && currentCharacter() && <button class="rbt-btn rbt-btn-small" onClick={() => { archiveTarget.value = null; }}>回到当前卡</button>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ source ---

/** `bare`: 只要内容（放进「卡面」那一块里），不要外面的分区框。 */
export function SourceSection({ info, bare }: { info: CardInfo; bare?: boolean }) {
  const rec = info.record;
  const links = rec?.links ?? [];
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  // 正在改的那条链接（序号），和它的草稿
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const editOk = !!normalizeUrl(editUrl);
  const saveEdit = () => {
    if (editIdx === null || !editOk) return;
    updateRecord(info.avatar, info.name, { links: links.map((l, j) => (j === editIdx ? { label: editLabel.trim() || '链接', url: normalizeUrl(editUrl) } : l)) });
    setEditIdx(null);
  };
  const urlOk = !!normalizeUrl(url);

  const addLink = () => {
    if (!urlOk) return;
    updateRecord(info.avatar, info.name, { links: [...links, { label: label.trim() || '链接', url: normalizeUrl(url) }] });
    setLabel('');
    setUrl('');
    setAdding(false);
  };
  // 删链接收在每行的「⋯」里（不和「打开」挨着，免得误点）；删完可以撤销
  const removeLink = (i: number) => {
    const before = links;
    const gone = links[i];
    updateRecord(info.avatar, info.name, { links: links.filter((_, j) => j !== i) });
    toast('success', `已删除链接「${gone.label}」。点这里撤销。`, 'RedBird 工具箱', { onclick: () => updateRecord(info.avatar, info.name, { links: before }), timeOut: 8000 });
  };
  const linkMenu = (i: number, anchor: HTMLElement) => {
    const l = links[i];
    openFloatMenu(anchor, l.label, [
      { label: '编辑', icon: 'fa-pen', run: () => { setEditLabel(l.label); setEditUrl(l.url); setEditIdx(i); } },
      { label: '复制链接', icon: 'fa-copy', run: async () => { try { await navigator.clipboard.writeText(l.url); toast('success', '已复制链接。'); } catch { toast('error', '没能复制，请长按链接复制。'); } } },
      { label: '删除', icon: 'fa-trash-can', danger: true, run: () => removeLink(i) },
    ]);
  };

  const body = (
    <>
      {(info.contacts.length > 0 || info.autoSource) && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">卡里的联系方式</small>
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
          <small class="rbt-muted">卡里的备注</small>
          <LongText text={info.creatorNotes} />
        </div>
      )}

      <div class="rbt-card-sub">
        <small class="rbt-muted">链接</small>
        {/* 整行点一下就是打开链接（新标签页）；右边的「⋯」里是复制、删除 */}
        {links.length > 0 && (
          <div class="rbt-linklist">
            {links.map((l, i) => (editIdx === i ? (
              <div key={i} class="rbt-form-row rbt-linkitem-edit">
                <input class="text_pole rbt-input rbt-w-label" placeholder="名称，如发布帖" aria-label="链接名称" value={editLabel} onInput={(e) => setEditLabel(inputValue(e))} />
                <input class="text_pole rbt-input" placeholder="https://…" aria-label="网址" value={editUrl} autoFocus onInput={(e) => setEditUrl(inputValue(e))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditIdx(null); }} />
                <button class="rbt-btn rbt-btn-primary" disabled={!editOk} onClick={saveEdit}>保存</button>
                <button class="rbt-btn" onClick={() => setEditIdx(null)}>取消</button>
              </div>
            ) : (
              <div key={i} class="rbt-linkitem">
                <a class="rbt-linkitem-main" href={l.url} target="_blank" rel="noopener noreferrer" title={`打开 ${l.url}`}>
                  <i class={`fa-${/discord\.(com|gg)/i.test(l.url) ? 'brands fa-discord' : 'solid fa-link'} fa-fw rbt-linkitem-icon`} aria-hidden="true" />
                  <span class="rbt-linkitem-text"><span class="rbt-linkitem-label">{l.label}</span><small class="rbt-linkitem-url">{l.url.replace(/^https?:\/\//, '')}</small></span>
                  <i class="fa-solid fa-arrow-up-right-from-square rbt-linkitem-go" aria-hidden="true" />
                </a>
                <button type="button" class="rbt-linkitem-more" title="编辑、复制、删除" aria-label="更多" aria-haspopup="menu" onClick={(e) => linkMenu(i, e.currentTarget as HTMLElement)}>
                  <i class="fa-solid fa-ellipsis" />
                </button>
              </div>
            )))}
          </div>
        )}
        {adding ? (
          <div class="rbt-form-row">
            <input class="text_pole rbt-input rbt-w-label" placeholder="名称，如发布帖" value={label} onInput={(e) => setLabel(inputValue(e))} />
            <input class="text_pole rbt-input" placeholder="https://…" value={url} autoFocus onInput={(e) => setUrl(inputValue(e))} onKeyDown={(e) => { if (e.key === 'Enter') addLink(); if (e.key === 'Escape') setAdding(false); }} />
            <button class="rbt-btn rbt-btn-primary" disabled={!urlOk} onClick={addLink}>添加</button>
            <button class="rbt-btn" onClick={() => { setAdding(false); setLabel(''); setUrl(''); }}>取消</button>
          </div>
        ) : (
          <button type="button" class="rbt-linkbtn rbt-self-start" onClick={() => setAdding(true)}>＋ 添加链接</button>
        )}
      </div>

      <div class="rbt-card-sub">
        {(rec?.notes || editing) && (
          <div class="rbt-row-between">
            <small class="rbt-muted">作者说明</small>
            {!editing && <IconBtn icon="fa-pen" title="编辑作者说明" onClick={() => { setDraft(rec?.notes ?? ''); setEditing(true); }} />}
          </div>
        )}
        {editing ? (
          <>
            <textarea class="text_pole rbt-textarea" rows={10} value={draft} placeholder="把发布帖里的推荐设置、玩法和注意事项粘进来。网址会自动变成链接。" onInput={(e) => setDraft((e.currentTarget as HTMLTextAreaElement).value)} />
            <div class="rbt-row">
              <button class="rbt-btn rbt-btn-primary" onClick={() => { updateRecord(info.avatar, info.name, { notes: draft }); setEditing(false); }}>保存</button>
              <button class="rbt-btn" onClick={() => setEditing(false)}>取消</button>
            </div>
          </>
        ) : rec?.notes ? <LongText text={rec.notes} limit={600} /> : <button type="button" class="rbt-linkbtn rbt-self-start" onClick={() => { setDraft(''); setEditing(true); }}>＋ 添加作者说明</button>}
      </div>
    </>
  );
  return bare ? body : <Section title="来源和作者说明">{body}</Section>;
}

// ---------------------------------------------------- preset & extensions ---

/** 打开酒馆的世界书面板，并选中这本书。 */
export function openWorldInST(name: string): void {
  openDrawer('worldinfo');
  setTimeout(() => openBookInEditor(name), 300);
}

/** 分区右上角打开酒馆编辑面板的按钮：短字（「编辑」「API 设置」），带 ↗ 表示会打开别的面板。 */
export function OpenBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return <button type="button" class="rbt-btn rbt-btn-small" title={title} onClick={onClick}>{label} ↗</button>;
}

/** 一个只有图标的按钮（有边框，看得出能点）。 */
function IconBtn({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return <button type="button" class="rbt-iconbtn" title={title} aria-label={title} onClick={onClick}><i class={`fa-solid ${icon}`} /></button>;
}

export const personaTick = signal(0);
let personaWatch = false;
export function watchPersonas(): void {
  if (personaWatch) return;
  personaWatch = true;
  const c = ctx();
  const bump = () => { personaTick.value++; };
  for (const k of ['PERSONA_CHANGED', 'PERSONA_CREATED', 'PERSONA_UPDATED', 'PERSONA_RENAMED', 'PERSONA_DELETED', 'SETTINGS_UPDATED']) {
    const ev = c.eventTypes?.[k];
    if (ev) c.eventSource?.on(ev, bump);
  }
}

type Conn = { type: string; id: string };
const isCardConn = (avatar: string) => (x: Conn) => x.type === 'character' && x.id === avatar;

export function boundPersonas(avatar: string): string[] {
  const d = ctx().powerUserSettings?.persona_descriptions ?? {};
  return Object.keys(d).filter((id) => (d[id]?.connections as Conn[] | undefined)?.some(isCardConn(avatar)));
}

/** 把人设绑到这张卡。酒馆没开「允许一张卡连多个人设」时，先解开别的人设和这张卡的绑定（和酒馆自己一样）。 */
export function bindPersona(id: string, avatar: string): void {
  const pu = ctx().powerUserSettings;
  // 只填了名字和头像、没写过描述的人设还没有这一条：和酒馆一样先建一条空的
  if (id === String(loaded.personas?.user_avatar ?? '')) loaded.personas?.getOrCreatePersonaDescriptor?.();
  const all = pu?.persona_descriptions ?? {};
  // 不是现在用的人设、又从没写过描述：酒馆里还没有它这一条，建一条空的（和酒馆建的一样，只是描述留空，不抄现在人设的）
  if (!all[id] && pu?.personas?.[id] !== undefined) {
    all[id] = { description: '', position: pu.persona_description_position ?? 0, depth: pu.persona_description_depth ?? 2, role: pu.persona_description_role ?? 0, lorebook: '', connections: [], title: '' };
  }
  if (!all[id]) return;
  if (!pu.persona_allow_multi_connections) {
    for (const k of Object.keys(all)) if (k !== id && all[k].connections) all[k].connections = all[k].connections.filter((x: Conn) => !isCardConn(avatar)(x));
  }
  all[id].connections = [...(all[id].connections ?? []).filter((x: Conn) => !isCardConn(avatar)(x)), { type: 'character', id: avatar }];
  ctx().saveSettingsDebounced();
  personaTick.value++;
}

export function unbindPersona(id: string, avatar: string): void {
  const d = ctx().powerUserSettings?.persona_descriptions?.[id];
  if (!d?.connections) return;
  d.connections = d.connections.filter((x: Conn) => !isCardConn(avatar)(x));
  ctx().saveSettingsDebounced();
  personaTick.value++;
}

export function ExtSection({ info, bare }: { info: CardInfo; bare?: boolean }) {
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
  // 角色档案的「插件」一块（收起 / 展开）里只要内容；全局工具箱的卡详情还是一整块
  const Wrap = ({ children }: { children: ComponentChildren }) => (bare ? <div class="rbt-fold-list">{children}</div>
    : <Section title="需要的插件" actions={<OpenBtn label="插件设置" title="打开酒馆的扩展面板，安装和设置插件" onClick={() => openDrawer('extensions')} />}>{children}</Section>);
  return (
    <Wrap>
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
            {!l.auto && <button class="rbt-btn rbt-btn-small rbt-push" title="从列表里删除" onClick={() => updateRecord(info.avatar, info.name, { extensions: manual.filter((m) => m !== l.req) })}>删除</button>}
          </div>
          {st.match && <SourceLine kind="plugin" id={st.match.id} />}
          </div>
        );
      })}
      <div class="rbt-form-row">
        <select class="text_pole rbt-select" value={pick} onChange={(e) => setPick((e.currentTarget as HTMLSelectElement).value)}>
          <option value="">添加需要的插件…</option>
          {installed.filter((e) => !listed.has(e.id)).map((e) => <option key={e.id} value={e.id}>{e.name}{e.enabled ? '' : '（未启用）'}</option>)}
          <option value="__other">没装的插件（手动填写）…</option>
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
    </Wrap>
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
