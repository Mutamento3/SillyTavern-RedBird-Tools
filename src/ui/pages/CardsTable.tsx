/**
 * 全局工具箱 › 角色：一张表看完每张卡「换到这张卡时」会换成什么，能直接解绑。
 *
 * 数据都是现成的：推荐预设 / 模型 / 美化 / 全局世界书 / 全局正则在 settings().profiles 里（工具箱自己记的），
 * 人设是酒馆自己的「连接」（power_user.persona_descriptions[id].connections）。
 *
 * - 电脑：一张表，每项一个小块，点 ✕ 解绑，8 秒内可以撤销。行末 ⋯：打开角色档案 / 记住现在的设置（只有正在聊的卡）/ 全部解绑。
 * - 手机：列表，每张卡两行灰字；点进去是整页（BindingsDetail），每项一个「解绑」。
 *
 * 「—」= 不换（保持换卡前的）。例外直接写出来：模型用预设推荐的、人设用酒馆的默认人设、美化用全局美化。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { allCharacters, archiveVersion, presetApi, presetNames, setCardModel, setCardTheme, setProfile, setProfileList, setRecommendedPreset, thumbnailUrl } from '../../tools/cards/cards';
import { loadThemes, stThemes, themesLoading } from '../../look/look';
import { cardLookEnabled, cardLookTick } from '../../look/cardLook';
import { envReport, rememberProfile } from '../../tools/env/env';
import { modelLabel, type ModelChoice } from '../../tools/model';
import { ctx, currentCharacter, settings, toast, type Any, type EnvProfile } from '../../st/st';
import { undoable } from '../undo';
import { Empty, NavRow, Tag } from '../common';
import { isPhone, Menu } from '../Menu';
import { GLOBAL_TAB_LABELS, openDetail } from '../views';
import { bindPersona, boundPersonas, personaTick, unbindPersona, watchPersonas } from './parts';

const EMPTY_NOTE = '「—」表示不换';
const COL = { preset: '预设', model: '模型', persona: 'user 人设', theme: '美化', worlds: '全局世界书', regex: '全局正则' } as const;
const SHOW = 3;

interface Row {
  avatar: string;
  name: string;
  isCurrent: boolean;
  profile?: EnvProfile;
  presetMissing: boolean;
  presetOtherApi: boolean;
  /** 记的美化已经删掉了 */
  themeMissing: boolean;
  modelFromPreset?: ModelChoice;
  personas: { id: string; name: string }[];
  defaultPersona?: string;
  has: boolean;
}

function personaNames(): Record<string, string> {
  return ctx().powerUserSettings?.personas ?? {};
}

function buildRows(): Row[] {
  const s = settings();
  const names = personaNames();
  const def = String(ctx().powerUserSettings?.default_persona ?? '');
  const presets = new Set(presetNames());
  const api = presetApi();
  const cur = currentCharacter()?.avatar;
  const themes = new Set(stThemes.value.map((t) => t.name));
  return allCharacters().map((ch: Any) => {
    const avatar = String(ch.avatar);
    const p = s.profiles[avatar];
    const personas = boundPersonas(avatar).map((id) => ({ id, name: names[id] || id }));
    const rec = p?.preset;
    return {
      avatar,
      name: String(ch.name ?? ''),
      isCurrent: avatar === cur,
      profile: p,
      presetMissing: !!rec && rec.api === api && !presets.has(rec.name),
      presetOtherApi: !!rec && rec.api !== api,
      themeMissing: !!p?.theme && themes.size > 0 && !themes.has(p.theme),
      modelFromPreset: !p?.model && rec ? s.presetInfo[rec.name]?.model : undefined,
      personas,
      defaultPersona: !personas.length && def && names[def] ? names[def] : undefined,
      has: !!p || personas.length > 0,
    };
  }).sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || a.name.localeCompare(b.name, 'zh'));
}

// ------------------------------------------------------------ 解绑 + 撤销 ---


function unbindPreset(r: Row): void {
  const was = r.profile?.preset?.name;
  if (!was) return;
  setRecommendedPreset(r.avatar, r.name, null);
  undoable(was, () => setRecommendedPreset(r.avatar, r.name, was));
}

function unbindModel(r: Row): void {
  const was = r.profile?.model;
  if (!was) return;
  setCardModel(r.avatar, r.name, null);
  undoable(modelLabel(was), () => setCardModel(r.avatar, r.name, was));
}

function unbindTheme(r: Row): void {
  const was = r.profile?.theme;
  if (!was) return;
  setCardTheme(r.avatar, r.name, null);
  undoable(was, () => setCardTheme(r.avatar, r.name, was));
}

/** 美化的灰字：删掉了、或者「换成这张卡的美化」关着，都不会换。 */
function themeNote(r: Row): string | undefined {
  if (r.themeMissing) return '找不到这个美化，不会换';
  if (!cardLookEnabled()) return '「换成这张卡的美化」关着，不会换';
  return undefined;
}

function unbindPersonaUndo(r: Row, id: string, name: string): void {
  unbindPersona(id, r.avatar);
  undoable(name, () => bindPersona(id, r.avatar));
}

function unbindItem(r: Row, key: 'globalWorlds' | 'globalRegexEnabled', item: string): void {
  const was = r.profile?.[key];
  if (!was) return;
  setProfileList(r.avatar, r.name, key, was.filter((x) => x !== item));
  undoable(item, () => setProfileList(r.avatar, r.name, key, was));
}

function unbindAll(r: Row): void {
  const was = r.profile ? { ...r.profile } : null;
  const personas = r.personas.map((p) => p.id);
  setProfile(r.avatar, null);
  for (const id of personas) unbindPersona(id, r.avatar);
  toast('success', `已解绑「${r.name}」的全部配套。点这里撤销。`, 'RedBird 工具箱', {
    timeOut: 8000,
    onclick: () => { if (was) setProfile(r.avatar, was); for (const id of personas) bindPersona(id, r.avatar); },
  });
}

// ------------------------------------------------------------ 小块 ---

function Pill({ text, onRemove, tone, sub, full }: { text: string; onRemove?: () => void; tone?: 'warn'; sub?: string; full?: string }) {
  return (
    <span class="rbt-ct-cellitem">
      <span class={`rbt-ct-pill ${tone ? `tone-${tone}` : ''}`}>
        <span class="rbt-ct-pill-text" title={full ?? text}>{text}</span>
        {onRemove && <button type="button" class="rbt-ct-x" title={`解绑「${text}」`} aria-label={`解绑「${text}」`} onClick={onRemove}><i class="fa-solid fa-xmark" /></button>}
      </span>
      {sub && <small class={`rbt-ct-sub ${tone ? `tone-${tone}` : ''}`}>{sub}</small>}
    </span>
  );
}

const Dash = () => <span class="rbt-ct-none">—</span>;
const Soft = ({ text, sub }: { text: string; sub: string }) => <span class="rbt-ct-soft">{text}<small>{sub}</small></span>;

function ListCell({ r, k }: { r: Row; k: 'globalWorlds' | 'globalRegexEnabled' }) {
  const [all, setAll] = useState(false);
  const list = r.profile?.[k];
  if (!list) return <Dash />;
  if (!list.length) return <span class="rbt-ct-soft">全部关掉</span>;
  const shown = all ? list : list.slice(0, SHOW);
  return (
    <span class="rbt-ct-pills">
      {shown.map((x) => <Pill key={x} text={x} onRemove={() => unbindItem(r, k, x)} />)}
      {list.length > SHOW && <button type="button" class="rbt-ct-more" onClick={() => setAll(!all)}>{all ? '收起' : `+${list.length - SHOW}`}</button>}
    </span>
  );
}

function PresetCell({ r }: { r: Row }) {
  const p = r.profile?.preset;
  if (!p) return <Dash />;
  if (r.presetMissing) return <Pill text={p.name} tone="warn" sub="找不到这个预设，不会换" onRemove={() => unbindPreset(r)} />;
  if (r.presetOtherApi) return <Pill text={p.name} sub={`在「${p.api}」下设的，现在不会换`} onRemove={() => unbindPreset(r)} />;
  return <Pill text={p.name} onRemove={() => unbindPreset(r)} />;
}

function ModelCell({ r }: { r: Row }) {
  // 表里只写模型名（API 名太长），鼠标移上去看全称
  if (r.profile?.model) return <Pill text={r.profile.model.model} full={modelLabel(r.profile.model)} onRemove={() => unbindModel(r)} />;
  if (r.modelFromPreset) return <Soft text={r.modelFromPreset.model} sub="用预设推荐的" />;
  return <Dash />;
}

function PersonaCell({ r }: { r: Row }) {
  if (r.personas.length) return <span class="rbt-ct-pills">{r.personas.map((p) => <Pill key={p.id} text={p.name} onRemove={() => unbindPersonaUndo(r, p.id, p.name)} />)}</span>;
  if (r.defaultPersona) return <Soft text={r.defaultPersona} sub="酒馆的默认人设" />;
  return <Dash />;
}

function ThemeCell({ r }: { r: Row }) {
  const t = r.profile?.theme;
  // 没设美化不是「保持换卡前的」，而是用全局美化，直接写出来
  if (!t) return <span class="rbt-ct-soft">全局美化</span>;
  return <Pill text={t} tone={r.themeMissing ? 'warn' : undefined} sub={themeNote(r)} onRemove={() => unbindTheme(r)} />;
}

function RowMenu({ r }: { r: Row }) {
  const [open, setOpen] = useState(false);
  // 表格在横向滚动的容器里，菜单贴在格子里会被裁掉：按按钮的位置用 fixed 弹出，下面放不下就往上弹
  const [pos, setPos] = useState<Record<string, string | number> | undefined>();
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggle = () => {
    const b = ref.current?.getBoundingClientRect();
    if (b) {
      const up = window.innerHeight - b.bottom < 160;
      setPos({ position: 'fixed', right: `${window.innerWidth - b.right}px`, ...(up ? { top: 'auto', bottom: `${window.innerHeight - b.top + 4}px` } : { top: `${b.bottom + 4}px` }) });
    }
    setOpen(!open);
  };
  // 全局工具箱的窗口带 transform，fixed 是相对窗口算的：量一下实际位置，差多少挪多少
  useLayoutEffect(() => {
    const m = menuRef.current; const b = ref.current?.getBoundingClientRect();
    if (!open || !m || !b || isPhone()) return;
    const r = m.getBoundingClientRect();
    const up = m.style.bottom && m.style.bottom !== 'auto';
    const dy = up ? (b.top - 4) - r.bottom : (b.bottom + 4) - r.top;
    const dx = b.right - r.right;
    if (Math.abs(dy) > 1) { if (up) m.style.bottom = `${parseFloat(m.style.bottom) - dy}px`; else m.style.top = `${parseFloat(m.style.top) + dy}px`; }
    if (Math.abs(dx) > 1) m.style.right = `${parseFloat(m.style.right) - dx}px`;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const scroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('scroll', scroll, true);
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!ref.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', scroll, true); };
  }, [open]);
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <div class="rbt-ct-menuwrap" ref={ref}>
      <button type="button" class="rbt-iconbtn rbt-ct-dots" aria-haspopup="menu" aria-expanded={open} title={`「${r.name}」的更多操作`} aria-label={`「${r.name}」的更多操作`} onClick={toggle}>
        <i class="fa-solid fa-ellipsis" />
      </button>
      {open && (
        <Menu title={r.name} cls="rbt-ct-menu" menuRef={menuRef} style={pos} onClose={() => setOpen(false)}>
          <button type="button" role="menuitem" onClick={run(() => openDetail({ kind: 'card', avatar: r.avatar }, GLOBAL_TAB_LABELS.cards))}><i class="fa-solid fa-id-card fa-fw" /> 打开角色档案</button>
          {r.isCurrent && <button type="button" role="menuitem" onClick={run(rememberProfile)}><i class="fa-solid fa-floppy-disk fa-fw" /> 记住现在的配套</button>}
          {r.has && <button type="button" role="menuitem" class="danger" onClick={run(() => unbindAll(r))}><i class="fa-solid fa-link-slash fa-fw" /> 全部解绑</button>}
        </Menu>
      )}
    </div>
  );
}

// ------------------------------------------------------------ 页面 ---

function useRows(): Row[] {
  // 改了推荐 / 记住的设置（archiveVersion）、人设绑定（personaTick）、换了聊天（envReport）都重新算
  void personaTick.value;
  void archiveVersion.value;
  void envReport.value;
  void stThemes.value;
  void cardLookTick.value;
  useEffect(watchPersonas, []);
  // 要知道记的美化还在不在
  useEffect(() => { if (!stThemes.value.length && !themesLoading.value) void loadThemes(); }, []);
  return buildRows();
}

function Toolbar({ q, setQ, all, setAll, count }: { q: string; setQ: (v: string) => void; all: boolean; setAll: (v: boolean) => void; count: number }) {
  return (
    <div class="rbt-ct-bar">
      <input class="text_pole rbt-ct-search" type="search" placeholder="搜索角色" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
      <div class="rbt-vseg rbt-list-filter" role="tablist">
        <button type="button" role="tab" aria-selected={!all} class={!all ? 'active' : ''} onClick={() => setAll(false)}>有配套的</button>
        <button type="button" role="tab" aria-selected={all} class={all ? 'active' : ''} onClick={() => setAll(true)}>全部角色</button>
      </div>
      <small class="rbt-muted rbt-ct-count">{count} 张卡</small>
    </div>
  );
}

export function CardsTablePage() {
  const rows = useRows();
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const phone = isPhone();
  const shown = rows.filter((r) => (all || r.has) && (!q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <div class="rbt-page rbt-ct">
      <Toolbar q={q} setQ={setQ} all={all} setAll={setAll} count={shown.length} />
      {!shown.length && <Empty>{rows.some((r) => r.has) || q ? '没有符合的角色。' : '还没有卡设了配套。在角色档案里设推荐预设、人设、美化，或记住换卡时的设置。'}</Empty>}
      {shown.length > 0 && (phone ? <PhoneList rows={shown} /> : <DeskTable rows={shown} />)}
    </div>
  );
}

function Who({ r }: { r: Row }) {
  return (
    <span class="rbt-ct-who">
      <img class="rbt-ct-avatar" src={thumbnailUrl(r.avatar)} alt="" loading="lazy" />
      <span class="rbt-ct-name">{r.name}</span>
      {r.isCurrent && <Tag tone="accent">正在聊</Tag>}
    </span>
  );
}

function DeskTable({ rows }: { rows: Row[] }) {
  return (
    <div class="rbt-ct-scroll">
      <table class="rbt-ct-table">
        <thead>
          <tr class="rbt-ct-group"><th /><th colSpan={6}>换到这张卡时换成<small>{EMPTY_NOTE}</small></th><th /></tr>
          <tr><th>角色</th><th>{COL.preset}</th><th>{COL.model}</th><th>{COL.persona}</th><th>{COL.theme}</th><th>{COL.worlds}</th><th>{COL.regex}</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.avatar} class={r.isCurrent ? 'current' : ''}>
              <td><Who r={r} /></td>
              <td><PresetCell r={r} /></td>
              <td><ModelCell r={r} /></td>
              <td><PersonaCell r={r} /></td>
              <td><ThemeCell r={r} /></td>
              <td><ListCell r={r} k="globalWorlds" /></td>
              <td><ListCell r={r} k="globalRegexEnabled" /></td>
              <td><RowMenu r={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function phoneLines(r: Row): [string, string] {
  const p = r.profile;
  const a = [p?.preset ? (r.presetMissing ? `找不到预设「${p.preset.name}」` : p.preset.name) : '', p?.model ? p.model.model : ''].filter(Boolean).join(' · ');
  const b = [
    r.personas.length ? `user 人设 ${r.personas.map((x) => x.name).join('、')}` : '',
    p?.theme ? `美化 ${p.theme}` : '',
    p?.globalWorlds ? (p.globalWorlds.length ? `世界书 ${p.globalWorlds.length}` : '世界书全部关掉') : '',
    p?.globalRegexEnabled ? (p.globalRegexEnabled.length ? `正则 ${p.globalRegexEnabled.length}` : '正则全部关掉') : '',
  ].filter(Boolean).join(' · ');
  return [a, b];
}

function PhoneList({ rows }: { rows: Row[] }) {
  return (
    <div class="rbt-ct-list">
      {rows.map((r) => {
        const [a, b] = phoneLines(r);
        return (
          <NavRow key={r.avatar} img={thumbnailUrl(r.avatar)}
            title={<>{r.name}{r.isCurrent && <Tag tone="accent">正在聊</Tag>}</>}
            sub={(a || b) ? <>{a && <span class={r.presetMissing ? 'rbt-ct-warn' : ''}>{a}</span>}{a && b && <br />}{b}</> : '没有配套'}
            onClick={() => openDetail({ kind: 'bindings', avatar: r.avatar }, GLOBAL_TAB_LABELS.cards)} />
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ 手机：一张卡的整页 ---

function Item({ k, text, sub, tone, onRemove }: { k?: string; text: string; sub?: string; tone?: 'warn'; onRemove?: () => void }) {
  return (
    <div class="rbt-ct-item">
      {k && <span class="rbt-ct-item-k">{k}</span>}
      <span class="rbt-ct-item-v">
        <span class={tone ? `rbt-ct-warn` : ''}>{text}</span>
        {sub && <small class={tone ? 'rbt-ct-warn' : 'rbt-muted'}>{sub}</small>}
      </span>
      {onRemove && <button type="button" class="rbt-btn rbt-btn-small" onClick={onRemove}>解绑</button>}
    </div>
  );
}

export function BindingsDetail({ avatar }: { avatar: string }) {
  const r = useRows().find((x) => x.avatar === avatar);
  if (!r) return <div class="rbt-page"><Empty>找不到这张卡，可能已经被删除了。</Empty></div>;
  const p = r.profile;
  const list = (k: 'globalWorlds' | 'globalRegexEnabled') => {
    const l = p?.[k];
    if (!l) return <Item text="—" />;
    if (!l.length) return <Item text="全部关掉" />;
    return <>{l.map((x) => <Item key={x} text={x} onRemove={() => unbindItem(r, k, x)} />)}</>;
  };
  return (
    <div class="rbt-page rbt-ct-detail">
      <h2 class="rbt-ct-detail-title">{r.name}</h2>
      <div class="rbt-ct-sec">换到这张卡时换成</div>
      {p?.preset
        ? <Item k={COL.preset} text={p.preset.name} tone={r.presetMissing ? 'warn' : undefined} sub={r.presetMissing ? '找不到这个预设，不会换' : r.presetOtherApi ? `在「${p.preset.api}」下设的，现在不会换` : undefined} onRemove={() => unbindPreset(r)} />
        : <Item k={COL.preset} text="—" />}
      {p?.model
        ? <Item k={COL.model} text={modelLabel(p.model)} onRemove={() => unbindModel(r)} />
        : r.modelFromPreset ? <Item k={COL.model} text={modelLabel(r.modelFromPreset)} sub="用预设推荐的" /> : <Item k={COL.model} text="—" />}
      {r.personas.length
        ? r.personas.map((x) => <Item key={x.id} k={COL.persona} text={x.name} onRemove={() => unbindPersonaUndo(r, x.id, x.name)} />)
        : r.defaultPersona ? <Item k={COL.persona} text={r.defaultPersona} sub="酒馆的默认人设" /> : <Item k={COL.persona} text="—" />}
      {p?.theme
        ? <Item k={COL.theme} text={p.theme} tone={r.themeMissing ? 'warn' : undefined} sub={themeNote(r)} onRemove={() => unbindTheme(r)} />
        : <Item k={COL.theme} text="全局美化" />}
      <small class="rbt-muted rbt-ct-note">{EMPTY_NOTE}</small>
      <div class="rbt-ct-sec">{COL.worlds}</div>
      {list('globalWorlds')}
      <div class="rbt-ct-sec">{COL.regex}</div>
      {list('globalRegexEnabled')}
      <div class="rbt-ct-actions">
        <button type="button" class="rbt-btn" onClick={() => openDetail({ kind: 'card', avatar: r.avatar }, r.name)}>打开角色档案</button>
        {r.isCurrent && <button type="button" class="rbt-btn" onClick={() => rememberProfile()}>记住现在的配套</button>}
        {r.has && <button type="button" class="rbt-btn rbt-btn-danger" onClick={() => unbindAll(r)}>全部解绑</button>}
      </div>
    </div>
  );
}
