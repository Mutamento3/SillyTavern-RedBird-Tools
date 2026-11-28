/**
 * 全局工具箱 › 角色：一张表看完每张卡「换到这张卡时」会换成什么，能直接解绑。
 *
 * 数据都是现成的：推荐预设 / 模型 / 美化 / 全局世界书 / 全局正则在 settings().profiles 里（工具箱自己记的），
 * 人设是酒馆自己的「连接」（power_user.persona_descriptions[id].connections）。
 *
 * - 电脑：一张表，每项一个小块，点 ✕ 解绑，8 秒内可以撤销。预设、模型、人设、美化空着时点「＋ 选…」直接设。行末 ⋯：打开角色档案 / 改回全局。
 *   表格自己滚动、高度不超过窗口，横向滚动条一直在窗口底部；「角色」列和 ⋯ 列固定不动。
 * - 手机：列表，每张卡两行灰字；点进去是整页（BindingsDetail），每项一个「取消专用」，空着的预设、模型、人设、美化可以选。
 *
 * 「—」= 不换（保持换卡前的）。例外直接写出来：模型用预设推荐的、人设用酒馆的默认人设、美化用全局美化。
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { matchSearch } from '../../core/text';
import { allCharacters, apiLabel, archiveVersion, presetApi, presetNames, setCardTheme, thumbnailUrl } from '../../tools/cards/cards';
import { globalValue, profileOf, regexName, revertCard, setCardItem } from '../../tools/env/setup';
import { loadThemes, LOOKS, stThemes, themesLoading } from '../../look/look';
import { cardLookTick, globalLookLabel, lookLabel, RBT_LOOK } from '../../look/cardLook';
import { envReport } from '../../tools/env/env';
import { currentModel, modelLabel, modelsApply, stModelList, type ModelChoice } from '../../tools/model';
import { APP_NAME, ctx, currentCharacter, loaded, settings, toast, type Any, type EnvProfile } from '../../st/st';
import { undoable } from '../undo';
import { personaIds, personaLabel, personaName, personaThumb, personaTitle } from '../../st/personas';
import { LOOK_NAME } from '../copy';
import { Empty, NavRow, Tag } from '../common';
import { isPhone, MoreMenu } from '../Menu';
import { GLOBAL_TAB_LABELS, openDetail } from '../views';
import { bindPersona, boundPersonas, personaTick, unbindPersona, watchPersonas } from './parts';
import { MenuHead, ModelForm, Popup, type Opt } from './setupParts';
import { IconPicker } from '../../shell/Home';

const EMPTY_NOTE = '「—」表示无专用设置';
const COL = { preset: '预设', model: '模型', persona: '用户人设', theme: '美化', worlds: '全局世界书', regex: '全局正则' } as const;
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
  /** 上次聊天的时间（排序「最近聊过」用） */
  lastChat: number;
}

function buildRows(): Row[] {
  const s = settings();
  const def = String(ctx().powerUserSettings?.default_persona ?? '');
  const presets = new Set(presetNames());
  const api = presetApi();
  const cur = currentCharacter()?.avatar;
  const themes = new Set(stThemes.value.map((t) => t.name));
  return allCharacters().map((ch: Any) => {
    const avatar = String(ch.avatar);
    const p = profileOf(avatar);
    const personas = boundPersonas(avatar).map((id) => ({ id, name: personaLabel(id) }));
    const rec = p?.preset;
    return {
      avatar,
      name: String(ch.name ?? ''),
      isCurrent: avatar === cur,
      profile: p,
      presetMissing: !!rec && rec.api === api && !presets.has(rec.name),
      presetOtherApi: !!rec && rec.api !== api,
      themeMissing: !!p?.theme && !p.theme.startsWith(RBT_LOOK) && themes.size > 0 && !themes.has(p.theme),
      modelFromPreset: !p?.model && rec ? s.presetInfo[rec.name]?.model : undefined,
      personas,
      defaultPersona: !personas.length && def && ctx().powerUserSettings?.personas?.[def] ? personaLabel(def) : undefined,
      has: !!p || personas.length > 0,
      lastChat: Number(ch.date_last_chat) || 0,
    };
  });
}

// ------------------------------------------------------------ 解绑 + 撤销 ---


function unbindPreset(r: Row): void {
  const was = r.profile?.preset?.name;
  if (!was) return;
  void setCardItem(r.avatar, r.name, 'preset', null);
  undoable(was, () => { void setCardItem(r.avatar, r.name, 'preset', was); });
}

function unbindModel(r: Row): void {
  const was = r.profile?.model;
  if (!was) return;
  void setCardItem(r.avatar, r.name, 'model', null);
  undoable(modelLabel(was), () => { void setCardItem(r.avatar, r.name, 'model', was); });
}

function unbindTheme(r: Row): void {
  const was = r.profile?.theme;
  if (!was) return;
  setCardTheme(r.avatar, r.name, null);
  undoable(was, () => setCardTheme(r.avatar, r.name, was));
}

/** 美化的灰字：删掉了就不会换。 */
function themeNote(r: Row): string | undefined {
  return r.themeMissing ? '美化不可用，保留当前美化。' : undefined;
}

function unbindPersonaUndo(r: Row, id: string, name: string): void {
  unbindPersona(id, r.avatar);
  undoable(name, () => bindPersona(id, r.avatar));
}

type ListKey = 'worlds' | 'regex';
/** 这张卡专用的全局世界书 / 全局正则开关：[键, 显示的字]。 */
function listOf(r: Row, k: ListKey): [string, string][] {
  const m = r.profile?.[k] ?? {};
  return Object.entries(m).map(([key, on]) => [key, `${on ? '启用' : '停用'} ${k === 'regex' ? regexName(key) : key}`]);
}

function unbindItem(r: Row, k: ListKey, key: string, text: string): void {
  const was = r.profile?.[k]?.[key];
  if (was === undefined) return;
  const item = `${k === 'worlds' ? 'w' : 'r'}:${key}`;
  void setCardItem(r.avatar, r.name, item, null);
  undoable(text, () => { void setCardItem(r.avatar, r.name, item, was); });
}

async function unbindAll(r: Row): Promise<void> {
  const personas = r.personas.map((p) => p.id);
  const undo = await revertCard(r.avatar);
  for (const id of personas) unbindPersona(id, r.avatar);
  toast('success', `已清除「${r.name}」的专用设置（含人设关联）。点这里撤销。`, APP_NAME, {
    timeOut: 8000,
    onclick: async () => { await undo(); for (const id of personas) bindPersona(id, r.avatar); },
  });
}

// ------------------------------------------------------------ 直接设专用预设 / 模型 ---

type PickKey = 'preset' | 'model' | 'persona' | 'theme';
const PICK_LABEL: Record<PickKey, string> = { preset: '选预设', model: '选模型', persona: '选人设', theme: '选美化' };

/** 设好了说一声：不在聊的卡只是记下来，下次进这张卡才换。 */
async function bindItem(r: Row, k: PickKey, value: string | ModelChoice, label: string): Promise<void> {
  let now = r.isCurrent;
  if (k === 'persona') {
    bindPersona(String(value), r.avatar);
    // 正在聊的卡马上换上；这段聊天锁定了别的人设就不换（和角色档案一样）
    if (now && !ctx().chatMetadata?.persona) await loaded.personas?.setUserAvatar?.(String(value));
    else now = false;
  } else if (k === 'theme') setCardTheme(r.avatar, r.name, String(value));
  else await setCardItem(r.avatar, r.name, k, value);
  const what = k === 'persona' ? COL.persona : `专用${COL[k]}`;
  toast('success', `已把「${r.name}」的${what}设为「${label}」。${now ? '现在已经换上。' : '下次进这张卡时换上。'}`, APP_NAME);
}

function pickOptions(k: PickKey, source: string, pick: (v: string | ModelChoice, label: string) => void): Opt[] {
  if (k === 'preset') return presetNames().map((n) => ({ key: n, title: n, onPick: () => pick(n, n) }));
  if (k === 'model') return stModelList(source).map((o) => ({ key: o.id, title: o.label, onPick: () => pick({ source, model: o.id }, o.id) }));
  if (k === 'persona') return personaIds().map((id) => ({ key: id, title: personaName(id), sub: personaTitle(id) || undefined, lead: personaThumb(id), onPick: () => pick(id, personaName(id)) }));
  return [
    ...LOOKS.map((l) => ({ key: `${RBT_LOOK}${l.id}`, title: `${LOOK_NAME} · ${l.label}`, sub: l.desc, onPick: () => pick(`${RBT_LOOK}${l.id}`, `${LOOK_NAME} · ${l.label}`) })),
    ...stThemes.value.map((t) => ({ key: t.name, title: t.name, onPick: () => pick(t.name, t.name) })),
  ];
}

/** 空着的格子里的「＋ 选预设」「＋ 选模型」「＋ 选人设」「＋ 选美化」：点了弹出选择框（电脑贴着按钮，手机从底部弹出）。 */
function AddPick({ r, k, big }: { r: Row; k: PickKey; big?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const pick = (value: string | ModelChoice, label: string) => { close(); void bindItem(r, k, value, label); };
  const source = currentModel()?.source ?? String(ctx().chatCompletionSettings?.chat_completion_source ?? '');
  return (
    <Popup title={`「${r.name}」的${k === 'persona' ? COL.persona : `专用${COL[k]}`}`} open={open} onClose={close} options={open ? pickOptions(k, source, pick) : []} fixed cls="rbt-ct-addpick"
      bottom={k === 'model' ? <><MenuHead>列表里没有，手动填写</MenuHead><ModelForm initial={{ source, model: '' }} onUse={(m) => pick(m, m.model)} /></> : undefined}>
      <button type="button" class={big ? 'rbt-btn rbt-btn-small' : 'rbt-ct-add'} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(!open)}>
        <i class="fa-solid fa-plus" aria-hidden="true" /> {PICK_LABEL[k]}
      </button>
    </Popup>
  );
}

// ------------------------------------------------------------ 小块 ---

function Pill({ text, onRemove, tone, sub, full }: { text: string; onRemove?: () => void; tone?: 'warn'; sub?: string; full?: string }) {
  return (
    <span class="rbt-ct-cellitem">
      <span class={`rbt-ct-pill ${tone ? `tone-${tone}` : ''}`}>
        <span class="rbt-ct-pill-text" title={full ?? text}>{text}</span>
        {onRemove && <button type="button" class="rbt-ct-x" title={`取消专用「${text}」`} aria-label={`取消专用「${text}」`} onClick={onRemove}><i class="fa-solid fa-xmark" /></button>}
      </span>
      {sub && <small class={`rbt-ct-sub ${tone ? `tone-${tone}` : ''}`}>{sub}</small>}
    </span>
  );
}

const Dash = () => <span class="rbt-ct-none">—</span>;
const Soft = ({ text, sub }: { text: string; sub: string }) => <span class="rbt-ct-soft">{text}<small>{sub}</small></span>;

function ListCell({ r, k }: { r: Row; k: ListKey }) {
  const [all, setAll] = useState(false);
  const list = listOf(r, k);
  if (!list.length) return <Dash />;
  const shown = all ? list : list.slice(0, SHOW);
  return (
    <span class="rbt-ct-pills">
      {shown.map(([key, text]) => <Pill key={key} text={text} onRemove={() => unbindItem(r, k, key, text)} />)}
      {list.length > SHOW && <button type="button" class="rbt-ct-more" onClick={() => setAll(!all)}>{all ? '收起' : `+${list.length - SHOW}`}</button>}
    </span>
  );
}

function PresetCell({ r }: { r: Row }) {
  const p = r.profile?.preset;
  if (!p) return <AddPick r={r} k="preset" />;
  if (r.presetMissing) return <Pill text={p.name} tone="warn" sub="预设不可用，保留当前预设。" onRemove={() => unbindPreset(r)} />;
  if (r.presetOtherApi) return <Pill text={p.name} sub={`预设适用于「${apiLabel(p.api)}」，当前接口不匹配。`} onRemove={() => unbindPreset(r)} />;
  return <Pill text={p.name} onRemove={() => unbindPreset(r)} />;
}

function ModelCell({ r }: { r: Row }) {
  // 表里只写模型名（API 名太长），鼠标移上去看全称
  if (r.profile?.model) return <Pill text={r.profile.model.model} full={modelLabel(r.profile.model)} onRemove={() => unbindModel(r)} />;
  const add = modelsApply() ? <AddPick r={r} k="model" /> : null;
  if (r.modelFromPreset) return <span class="rbt-ct-pills"><Soft text={r.modelFromPreset.model} sub="用预设推荐的" />{add}</span>;
  return add ?? <Dash />;
}

function PersonaCell({ r }: { r: Row }) {
  if (r.personas.length) return <span class="rbt-ct-pills">{r.personas.map((p) => <Pill key={p.id} text={p.name} onRemove={() => unbindPersonaUndo(r, p.id, p.name)} />)}</span>;
  // 全局人设写在表头，这里不每行重复
  return <AddPick r={r} k="persona" />;
}

function ThemeCell({ r }: { r: Row }) {
  const t = r.profile?.theme;
  // 全局美化写在表头，这里不每行重复
  if (!t) return <AddPick r={r} k="theme" />;
  return <Pill text={lookLabel(t)} tone={r.themeMissing ? 'warn' : undefined} sub={themeNote(r)} onRemove={() => unbindTheme(r)} />;
}

function RowMenu({ r }: { r: Row }) {
  return (
    <MoreMenu title={r.name} items={[
      { icon: 'fa-id-card', text: '打开角色档案', onClick: () => openDetail({ kind: 'card', avatar: r.avatar }, GLOBAL_TAB_LABELS.cards) },
      ...(r.has ? [{ icon: 'fa-rotate-left', text: '清除专用设置', danger: true, onClick: () => { void unbindAll(r); } }] : []),
    ]} />
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

type Sort = 'custom' | 'recent' | 'name';
const SORT_TEXT: Record<Sort, string> = { custom: '有专用设置的在前', recent: '最近聊过', name: '名称' };
const SORT_KEY = 'rbt-ct-sort';

/** 正在聊的卡一直排第一；其余按选的方式排。 */
function sortRows(rows: Row[], sort: Sort): Row[] {
  const name = (a: Row, b: Row) => a.name.localeCompare(b.name, 'zh');
  const by = sort === 'name' ? name : sort === 'recent' ? (a: Row, b: Row) => b.lastChat - a.lastChat || name(a, b) : (a: Row, b: Row) => Number(b.has) - Number(a.has) || name(a, b);
  return [...rows].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || by(a, b));
}

function Toolbar({ q, setQ, sort, setSort, count }: { q: string; setQ: (v: string) => void; sort: Sort; setSort: (v: Sort) => void; count: number }) {
  return (
    <div class="rbt-ct-bar">
      <input class="text_pole rbt-ct-search" type="search" placeholder="搜索角色" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
      <IconPicker icon="fa-arrow-down-wide-short" name="排序" label={`排序：${SORT_TEXT[sort]}`} title="排序方式" value={sort} onChange={(v) => setSort(v as Sort)}
        options={(Object.keys(SORT_TEXT) as Sort[]).map((k) => ({ value: k, text: SORT_TEXT[k] }))} />
      <small class="rbt-muted rbt-ct-count">{count} 张卡</small>
    </div>
  );
}

export function CardsTablePage() {
  const rows = useRows();
  const [q, setQ] = useState('');
  const [sort, setSortState] = useState<Sort>(() => {
    try { const v = localStorage.getItem(SORT_KEY) as Sort; return v in SORT_TEXT ? v : 'custom'; } catch { return 'custom'; }
  });
  const setSort = (v: Sort) => { setSortState(v); try { localStorage.setItem(SORT_KEY, v); } catch { /* ignore */ } };
  const phone = isPhone();
  const shown = sortRows(rows.filter((r) => matchSearch(q, r.name)), sort);
  return (
    <div class="rbt-page rbt-ct">
      <Toolbar q={q} setQ={setQ} sort={sort} setSort={setSort} count={shown.length} />
      {!shown.length && <Empty>没有符合的角色。</Empty>}
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

/** 表格左右还有没露出来的列：那一边固定的列加一道阴影，提示能横着滚。 */
function useEdges(): [preact.RefObject<HTMLDivElement>, string, () => void] {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState('');
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 2, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdge(`${left ? ' more-left' : ''}${right ? ' more-right' : ''}`);
  };
  // 窗口变宽变窄、表格变长变短（筛选、搜索）都要重新量
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);
  return [ref, edge, measure];
}

/** 表头：列名，下面一行小字写全局用的是什么（没设专用的卡就用它），不在每一行重复。 */
function Head({ k, g }: { k: PickKey; g: string }) {
  return <th>{COL[k]}{g && <small class="rbt-ct-th-g" title={`全局：${g}`}>全局：{g}</small>}</th>;
}

function globals(): Record<PickKey, string> {
  const def = String(ctx().powerUserSettings?.default_persona ?? '');
  const model = globalValue('model') as ModelChoice | null;
  return {
    preset: String(globalValue('preset') ?? ''),
    model: model?.model ?? '',
    persona: def && ctx().powerUserSettings?.personas?.[def] ? personaLabel(def) : '',
    theme: globalLookLabel(),
  };
}

function DeskTable({ rows }: { rows: Row[] }) {
  const [ref, edge, measure] = useEdges();
  const g = globals();
  return (
    <div ref={ref} class={`rbt-ct-scroll${edge}`} onScroll={measure}>
      <table class="rbt-ct-table">
        <thead>
          <tr><th>角色</th><Head k="preset" g={g.preset} /><Head k="model" g={g.model} /><Head k="persona" g={g.persona} /><Head k="theme" g={g.theme} /><th>{COL.worlds}</th><th>{COL.regex}</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.avatar} class={r.isCurrent ? 'current' : ''}>
              <td><Who r={r} /></td>
              <td><PresetCell r={r} /></td>
              <td><ModelCell r={r} /></td>
              <td><PersonaCell r={r} /></td>
              <td><ThemeCell r={r} /></td>
              <td><ListCell r={r} k="worlds" /></td>
              <td><ListCell r={r} k="regex" /></td>
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
    r.personas.length ? `用户人设 ${r.personas.map((x) => x.name).join('、')}` : '',
    p?.theme ? `美化 ${lookLabel(p.theme)}` : '',
    listOf(r, 'worlds').length ? `世界书 ${listOf(r, 'worlds').length}` : '',
    listOf(r, 'regex').length ? `正则 ${listOf(r, 'regex').length}` : '',
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
            sub={(a || b) ? <>{a && <span class={r.presetMissing ? 'rbt-ct-warn' : ''}>{a}</span>}{a && b && <br />}{b}</> : '无专用设置'}
            onClick={() => openDetail({ kind: 'bindings', avatar: r.avatar }, GLOBAL_TAB_LABELS.cards)} />
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ 手机：一张卡的整页 ---

function Item({ k, text, sub, tone, onRemove, add }: { k?: string; text: string; sub?: string; tone?: 'warn'; onRemove?: () => void; add?: preact.ComponentChildren }) {
  return (
    <div class="rbt-ct-item">
      {k && <span class="rbt-ct-item-k">{k}</span>}
      <span class="rbt-ct-item-v">
        <span class={tone ? `rbt-ct-warn` : ''}>{text}</span>
        {sub && <small class={tone ? 'rbt-ct-warn' : 'rbt-muted'}>{sub}</small>}
      </span>
      {onRemove && <button type="button" class="rbt-btn rbt-btn-small" onClick={onRemove}>取消专用</button>}
      {add}
    </div>
  );
}

export function BindingsDetail({ avatar }: { avatar: string }) {
  const r = useRows().find((x) => x.avatar === avatar);
  if (!r) return <div class="rbt-page"><Empty>找不到这张卡，可能已经被删除了。</Empty></div>;
  const p = r.profile;
  const list = (k: ListKey) => {
    const l = listOf(r, k);
    if (!l.length) return <Item text="—" />;
    return <>{l.map(([key, text]) => <Item key={key} text={text} onRemove={() => unbindItem(r, k, key, text)} />)}</>;
  };
  return (
    // 小标题（专用设置 / 全局世界书 / 全局正则）上面故意多留空，好分组：ui-audit 不查这页的间距
    <div class="rbt-page rbt-ct-detail" data-lint-spacing="ok">
      <h2 class="rbt-ct-detail-title">{r.name}</h2>
      <div class="rbt-ct-sec">专用设置</div>
      {p?.preset
        ? <Item k={COL.preset} text={p.preset.name} tone={r.presetMissing ? 'warn' : undefined} sub={r.presetMissing ? '预设不可用，保留当前预设。' : r.presetOtherApi ? `预设适用于「${apiLabel(p.preset.api)}」，当前接口不匹配。` : undefined} onRemove={() => unbindPreset(r)} />
        : <Item k={COL.preset} text="—" add={<AddPick r={r} k="preset" big />} />}
      {p?.model
        ? <Item k={COL.model} text={modelLabel(p.model)} onRemove={() => unbindModel(r)} />
        : <Item k={COL.model} text={r.modelFromPreset ? modelLabel(r.modelFromPreset) : '—'} sub={r.modelFromPreset ? '用预设推荐的' : undefined} add={modelsApply() ? <AddPick r={r} k="model" big /> : undefined} />}
      {r.personas.length
        ? r.personas.map((x) => <Item key={x.id} k={COL.persona} text={x.name} onRemove={() => unbindPersonaUndo(r, x.id, x.name)} />)
        : <Item k={COL.persona} text={r.defaultPersona ?? '—'} sub={r.defaultPersona ? '全局人设' : undefined} add={<AddPick r={r} k="persona" big />} />}
      {p?.theme
        ? <Item k={COL.theme} text={lookLabel(p.theme)} tone={r.themeMissing ? 'warn' : undefined} sub={themeNote(r)} onRemove={() => unbindTheme(r)} />
        : <Item k={COL.theme} text="全局美化" add={<AddPick r={r} k="theme" big />} />}
      <small class="rbt-muted rbt-ct-note">{EMPTY_NOTE}</small>
      <div class="rbt-ct-sec">{COL.worlds}</div>
      {list('worlds')}
      <div class="rbt-ct-sec">{COL.regex}</div>
      {list('regex')}
      <div class="rbt-ct-actions">
        <button type="button" class="rbt-btn" onClick={() => openDetail({ kind: 'card', avatar: r.avatar }, r.name)}>打开角色档案</button>
        {r.has && <button type="button" class="rbt-btn rbt-btn-danger" onClick={() => { void unbindAll(r); }}>清除专用设置</button>}
      </div>
    </div>
  );
}
