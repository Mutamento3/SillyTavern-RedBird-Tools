/**
 * 角色档案：每一项写现在用的是什么、谁在用（全局 / 本卡专用 / …），点框在原地改。
 * 规则见 dev/角色档案重做-spec.md；读写本卡专用走 tools/env/setup.ts。
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { isPhone } from '../Menu';
import { ctx, loaded, settings, toast, type Any } from '../../st/st';
import { apiLabel, archiveVersion, currentPresetName, presetApi, presetNames, thumbnailUrl, worldNames, type CardInfo } from '../../tools/cards/cards';
import { currentModel, modelLabel, modelsApply, sameModel, SOURCE_LABEL, stModelList, type ModelChoice } from '../../tools/model';
import { attachBook, attachedBooks, bookOwners, cardUses, detachBook, globalRegex, globalValue, makeGlobal, profileOf, setCardItem, setCardUse, worldFacts } from '../../tools/env/setup';
import { unnamedRegex } from '../../core/setup';
import { buildEnvReport } from '../../tools/env/env';
import { openDrawer } from '../../shell/drawers';
import { working } from '../../st/busy';
import { bindPersona, boundPersonas, personaTick, unbindPersona, watchPersonas } from './parts';
import { editRegex } from './GlobalPage';

// --------------------------------------------------------------- bits ---

export type PillKind = 'global' | 'card' | 'chat' | 'preset' | 'persona';
const PILL_TEXT: Record<PillKind, string> = { global: '全局', card: '本卡专用', chat: '本存档专用', preset: '本预设专用', persona: '本人设专用' };

/** 谁在用这一项：灰色「全局」，其余蓝色带图标。 */
export function Pill({ kind, img }: { kind: PillKind; img?: string }) {
  const icon = kind === 'chat' ? <i class="fa-regular fa-message" aria-hidden="true" />
    : kind === 'preset' ? <i class="fa-solid fa-sliders" aria-hidden="true" />
      : (kind === 'card' || kind === 'persona') && img ? <img class="rbt-pill-av" src={img} alt="" /> : null;
  return <span class={`rbt-pill ${kind === 'global' ? 'rbt-pill-g' : 'rbt-pill-c'}`}>{icon}{PILL_TEXT[kind]}</span>;
}

export const personaThumb = (id: string): string => ctx().getThumbnailUrl?.('persona', id) ?? `User Avatars/${id}`;
const personaName = (id: string): string => (ctx().powerUserSettings?.personas ?? {})[id] || id;

export interface Opt { key: string; title: string; sub?: string; /** 分组：和上一个不同时，前面加一个小标题 */ group?: string; lead?: string; selected?: boolean; disabled?: boolean; onPick: () => void }

/**
 * 一行：左边小字名字，右边整行是框（全名换行、标签在右、箭头图标）。点框弹出选择框：
 * 电脑上盖在下面的内容上；手机上从底部弹出（点外面关掉）。选项多（超过 8 个）时上面有搜索框。
 * 选择框里：top（「全局」和「让所有卡都用」，都是关于全局的，放最上面不用往下翻）→ head（「卡名专用」小标题）+ options → bottom（去面板的按钮）。
 */
export function PickRow({ k, title, placeholder, value, sub, lead, pill, thumb, disabled, busy, open, onToggle, onClose, top, head, options, bottom }: {
  k: string; title?: string; placeholder?: string; value: ComponentChildren; sub?: string; lead?: string; pill?: ComponentChildren; thumb?: string; disabled?: boolean;
  /** 正在换：箭头换成转圈，框不变淡（变淡 + 还是旧的值，看着像卡住了） */
  busy?: boolean;
  open: boolean; onToggle: () => void; onClose: () => void;
  top?: ComponentChildren; head?: string; options?: Opt[]; bottom?: ComponentChildren;
}) {
  return (
    <Popup title={title ?? k} placeholder={placeholder} open={open} onClose={onClose} top={top} head={head} options={options} bottom={bottom}>
      <div class="rbt-pick-row">
        <span class="rbt-pick-k">{k}</span>
        <button type="button" class={`rbt-pick-box ${open ? 'open' : ''}`} disabled={disabled || busy} aria-busy={busy || undefined} aria-expanded={open} aria-haspopup="listbox" onClick={onToggle}>
          {lead && <img class="rbt-pick-lead" src={lead} alt="" />}
          <span class="rbt-pick-v">{value}{sub && <small>{sub}</small>}</span>
          {pill}
          {thumb && <img class="rbt-pick-thumb" src={thumb} alt="" />}
          {busy ? <span class="rbt-spin rbt-pick-ar" role="status" aria-label="正在换" />
            : !disabled && <i class={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} rbt-pick-ar`} aria-hidden="true" />}
        </button>
      </div>
    </Popup>
  );
}

/** 点一个按钮（children）弹出的选择框，PickRow、「＋ 附加世界书」、首页的排序和筛选共用。 */
export function Popup({ title, placeholder, open, onClose, top, head, options, bottom, wide, cls, children }: {
  title: string; placeholder?: string; open: boolean; onClose: () => void; top?: ComponentChildren; head?: string; options?: Opt[]; bottom?: ComponentChildren;
  /** 选择框和按钮左边对齐（PickRow 里是和框对齐） */
  wide?: boolean;
  /** 外层再加的 class（各处自己定选择框在电脑上的位置和宽度） */
  cls?: string;
  children: ComponentChildren;
}) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) { setQ(''); return; }
    // 电脑上选择框往下展开，按钮在面板底部时会被面板挡住一截：把面板滚到能看全
    if (!isPhone()) sheetRef.current?.scrollIntoView({ block: 'nearest' });
    // 手机上点外面是点到遮罩上，遮罩自己会关（这里再关，那一下点击会落到下面的按钮上）
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!isPhone() && !ref.current?.contains(t) && !sheetRef.current?.contains(t)) onClose(); };
    // Esc 只关这个选择框，不要连带关掉外面的全局工具箱或酒馆面板
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc, true); };
  }, [open]);
  // 手机上从底部弹出：放到页面最外层（工具箱面板里的 fixed 会被面板裁掉）
  const sheet = (node: ComponentChildren) => (isPhone() ? createPortal(<div class="rbt-scope rbt-menu-portal">{node}</div>, document.body) : node);
  const list = (options ?? []).filter((o) => !q.trim() || o.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div class={`rbt-pick ${open ? 'open' : ''} ${wide ? 'wide' : ''} ${cls ?? ''}`} ref={ref}>
      {children}
      {open && sheet(<>
        <div class="rbt-menu-scrim" onClick={onClose} />
        <div class="rbt-menu" role="listbox" aria-label={title} ref={sheetRef}>
          <div class="rbt-menu-title">{title}<button type="button" class="rbt-iconbtn" aria-label="关闭" onClick={onClose}><i class="fa-solid fa-xmark" /></button></div>
          {(options?.length ?? 0) > 8 && <input class="text_pole rbt-input rbt-menu-search" placeholder={placeholder ?? `搜${title}名字`} value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />}
          <div class="rbt-menu-scroll">
            {!q.trim() && top}
            {head && <>{!q.trim() && top && <MenuLine />}<MenuHead>{head}</MenuHead></>}
            {list.map((o, i) => [o.group && o.group !== list[i - 1]?.group && <MenuHead key={`g:${o.group}`}>{o.group}</MenuHead>, <MenuOpt key={o.key} title={o.title} sub={o.sub} lead={o.lead} selected={o.selected} disabled={o.disabled} onPick={o.onPick} />])}
            {q.trim() && !list.length && <div class="rbt-menu-empty">没有找到「{q.trim()}」</div>}
            {!q.trim() && bottom}
          </div>
        </div>
      </>)}
    </div>
  );
}

export function MenuOpt({ title, sub, lead, selected, disabled, onPick }: { title: ComponentChildren; sub?: string; lead?: string; selected?: boolean; disabled?: boolean; onPick: () => void }) {
  return (
    <button type="button" role="option" aria-selected={!!selected} aria-disabled={disabled || undefined} disabled={disabled} class={`rbt-menu-opt ${selected ? 'cur' : ''}`} onClick={onPick}>
      <span class="rbt-menu-tick">{selected && <i class="fa-solid fa-check" aria-hidden="true" />}</span>
      {lead && <img class="rbt-pick-lead" src={lead} alt="" />}
      <span class="rbt-menu-t">{title}{sub && <small>{sub}</small>}</span>
    </button>
  );
}
const MenuHead = ({ children }: { children: ComponentChildren }) => <div class="rbt-menu-head">{children}</div>;
const MenuLine = () => <div class="rbt-menu-line" />;
function MenuAll({ name, onPick }: { name: string; onPick: () => void }) {
  return (
    <button type="button" class="rbt-menu-opt rbt-menu-all" onClick={onPick}>
      <span class="rbt-menu-tick"><i class="fa-solid fa-arrow-right" aria-hidden="true" /></span>
      <span class="rbt-menu-t">让所有卡都用「{name}」<small>没设本卡专用的卡也会换成它</small></span>
    </button>
  );
}
export function MenuFoot({ label, onClick }: { label: string; onClick: () => void }) {
  return <div class="rbt-menu-foot"><button type="button" class="rbt-btn rbt-btn-small" onClick={onClick}>{label} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></button></div>;
}

/** 去酒馆面板的入口（分区右上角）。 */
export function PanelBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" class="rbt-btn rbt-btn-small" onClick={(e) => { e.stopPropagation(); onClick(); }}>{label} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></button>;
}

/**
 * 角色档案的一块：标题行（标题、收起时的摘要、面板按钮、箭头），点标题那一行在原地展开 / 收起。
 * 常用的几块（预设和模型、世界书、人设）默认展开，其余默认收起。
 */
export function FoldSection({ title, summary, tone, action, defaultOpen = false, children }: {
  title: string; summary?: string; tone?: 'ok' | 'warn' | 'dim'; action?: ComponentChildren; defaultOpen?: boolean; children?: ComponentChildren;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const can = !!children;
  return (
    <section class="rbt-card-section rbt-setup rbt-fold">
      <div class={`rbt-fold-head ${can ? 'can' : ''}`} role={can ? 'button' : undefined} tabIndex={can ? 0 : undefined} aria-expanded={can ? open : undefined}
        onClick={() => can && setOpen(!open)} onKeyDown={(e) => { if (can && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(!open); } }}>
        <h3 class="rbt-card-section-title">{title}</h3>
        <span class={`rbt-fold-sum ${tone ?? ''}`}>{open && can ? '' : summary}</span>
        {action && <span class="rbt-setup-acts">{action}</span>}
        {can && <i class={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} rbt-pick-ar`} aria-hidden="true" />}
      </div>
      {open && can && <div class="rbt-fold-body">{children}</div>}
    </section>
  );
}

/**
 * 列表里的一条：圆点（绿 = 启用，灰 = 停用）、名字（全名）、原因小字；右边动作按钮（停用 / 启用 / 移除）、编辑。
 */
export function UseRow({ name, on, sub, action, onEdit }: {
  name: string; on: boolean; sub?: string;
  /** tone：quiet = 淡的文字按钮（停用），go = 绿色（启用），不写 = 普通按钮（移除） */
  action?: { label: string; onClick: () => void; tone?: 'quiet' | 'go' };
  onEdit?: () => void;
}) {
  return (
    <div class={`rbt-use ${on ? 'on' : ''}`}>
      <span class="rbt-use-dot" role="img" aria-label={on ? '启用' : '停用'} />
      <span class="rbt-use-n">{name}{sub && <small>{sub}</small>}</span>
      {action && <button type="button" class={`rbt-btn rbt-btn-small rbt-use-act ${action.tone ?? ''}`} onClick={action.onClick}>{action.label}</button>}
      {onEdit && <button type="button" class="rbt-iconbtn rbt-use-edit" title={`编辑「${name}」`} aria-label={`编辑「${name}」`} onClick={onEdit}><i class="fa-solid fa-pen" /></button>}
    </div>
  );
}
/** 列表里一段的小标题：来源、数量、一句说明（不能收起）。 */
export const GroupHead = ({ title, count, unit = '条', note }: { title: string; count?: number; unit?: string; note?: string }) => {
  const small = [count !== undefined ? `${count} ${unit}` : '', note ?? ''].filter(Boolean).join(' · ');
  return <div class="rbt-group-head"><span>{title}</span>{small && <small>{small}</small>}</div>;
};
/** 一段里出了问题（没允许运行）：一句话 + 去改的按钮。 */
const GroupIssue = ({ text, button, onClick }: { text: string; button?: string; onClick?: () => void }) => (
  <div class="rbt-group-issue"><span>{text}</span>{button && onClick && <button type="button" class="rbt-btn rbt-btn-small" onClick={onClick}>{button}</button>}</div>
);

/** 同一时间只开一个选择框。 */
function useOpen(): [string | null, (k: string) => void, () => void] {
  const [open, set] = useState<string | null>(null);
  return [open, (k) => set(open === k ? null : k), () => set(null)];
}

/** 「让所有卡都用」：改完弹提示，能撤销。 */
function allCards(info: CardInfo, key: string, label: string): void {
  const undo = makeGlobal(info.avatar, info.name, key);
  toast('success', `所有卡都用「${label}」了。点这里撤销。`, 'RedBird 工具箱', { onclick: () => { void undo(); }, timeOut: 8000 });
}

// ------------------------------------------------------ 预设和模型 ---

export function PresetModelSection({ info }: { info: CardInfo }) {
  void archiveVersion.value;
  const [open, toggle, close] = useOpen();
  // 刚选的值：换好之前就显示它（框里还写着旧的，看着像没点上）
  const [pending, setPending] = useState<{ k: 'preset' | 'model'; value: string; sub?: string } | null>(null);
  const p = profileOf(info.avatar);
  const live = info.isCurrent;
  // 换卡时自动换、提示里点「换回」也算：正在聊的这张卡，那一行一样转圈
  const presetBusy = pending?.k === 'preset' || (live && working.value.has('preset'));
  const modelBusy = pending?.k === 'model' || (live && working.value.has('model'));
  const busy = presetBusy || modelBusy;
  const api = presetApi();
  const names = presetNames();
  const own = p?.preset && p.preset.api === api ? p.preset.name : undefined;
  const preset = live ? currentPresetName() : own ?? String(globalValue('preset') ?? '');
  const globalPreset = String(globalValue('preset') ?? '');
  const run = async (next: NonNullable<typeof pending>, f: () => Promise<void>) => { close(); setPending(next); try { await f(); } finally { setPending(null); } };
  const pickModel = (m: ModelChoice) => run({ k: 'model', value: m.model, sub: SOURCE_LABEL[m.source] ?? m.source }, () => setCardItem(info.avatar, info.name, 'model', m));

  // 模型：本卡专用 > 本预设专用（预设推荐的） > 全局
  const presetModel: ModelChoice | undefined = settings().presetInfo?.[preset]?.model;
  const model: ModelChoice | null = live ? currentModel() : p?.model ?? presetModel ?? (globalValue('model') as ModelChoice | null);
  const modelKind: PillKind = p?.model ? 'card' : presetModel && sameModel(presetModel, model) ? 'preset' : 'global';
  const globalModel = globalValue('model') as ModelChoice | null;
  const cardImg = thumbnailUrl(info.avatar);

  return (
    <FoldSection title="预设和模型" summary={preset || '没有预设'} defaultOpen action={<>
      <PanelBtn label="预设设置" onClick={() => openDrawer('preset')} />
      <PanelBtn label="API 设置" onClick={() => openDrawer('api')} />
    </>}>
      <PickRow k="预设" value={pending?.k === 'preset' ? pending.value : preset || '没有预设'} pill={<Pill kind={own ? 'card' : 'global'} img={cardImg} />} disabled={busy} busy={presetBusy} open={open === 'preset'} onToggle={() => toggle('preset')} onClose={close}
        top={<>
          <MenuOpt title="全局" sub={`和其他卡一样：${globalPreset || '—'}`} selected={!own} onPick={() => run({ k: 'preset', value: globalPreset }, () => setCardItem(info.avatar, info.name, 'preset', null))} />
          {live && own && own === currentPresetName() && <MenuAll name={own} onPick={() => { close(); allCards(info, 'preset', own); }} />}
        </>}
        head={`${info.name}专用`}
        options={names.map((n) => ({ key: n, title: n, selected: own === n, onPick: () => run({ k: 'preset', value: n }, () => setCardItem(info.avatar, info.name, 'preset', n)) }))}
        bottom={<MenuFoot label="预设设置" onClick={() => { close(); openDrawer('preset'); }} />} />
      {p?.preset && p.preset.api === api && !names.includes(p.preset.name) && <div class="rbt-pick-hint warn">这张卡专用的「{p.preset.name}」已经删掉了，现在用全局的。</div>}
      {p?.preset && p.preset.api !== api && <div class="rbt-pick-hint warn">这张卡专用的「{p.preset.name}」是「{apiLabel(p.preset.api)}」的预设，现在用的是「{apiLabel(api)}」，所以没换。</div>}

      {modelsApply() && (
        <PickRow k="模型" value={pending?.k === 'model' ? pending.value : model ? model.model : 'API 没连上'}
          sub={pending?.k === 'model' ? pending.sub : model ? (SOURCE_LABEL[model.source] ?? model.source) : undefined}
          pill={model ? <Pill kind={modelKind} img={cardImg} /> : undefined} disabled={busy || (live && !model)} busy={modelBusy} open={open === 'model'} onToggle={() => toggle('model')} onClose={close}
          top={<>
            <MenuOpt title="全局" sub={`和其他卡一样：${globalModel ? modelLabel(globalModel) : '—'}`} selected={!p?.model} onPick={() => run({ k: 'model', value: globalModel?.model ?? '', sub: globalModel ? SOURCE_LABEL[globalModel.source] ?? globalModel.source : undefined }, () => setCardItem(info.avatar, info.name, 'model', null))} />
            {live && p?.model && sameModel(p.model, currentModel()) && <MenuAll name={modelLabel(p.model)} onPick={() => { close(); allCards(info, 'model', modelLabel(p.model!)); }} />}
          </>}
          head={`${info.name}专用`}
          options={stModelList(model?.source ?? '').map((o) => ({ key: o.id, title: o.label, selected: !!p?.model && p.model.source === model?.source && p.model.model === o.id,
            onPick: () => pickModel({ source: model!.source, model: o.id }) }))}
          bottom={<>
            <MenuHead>列表里没有，手动填写</MenuHead>
            <ModelForm initial={p?.model ?? model ?? undefined} onUse={pickModel} />
            <MenuFoot label="API 设置" onClick={() => { close(); openDrawer('api'); }} />
          </>} />
      )}
      {modelsApply() && live && !model && <div class="rbt-pick-hint">连上以后才能选模型。点右上角「API 设置」。</div>}
    </FoldSection>
  );
}

/** 模型没有列表可选：选服务、填模型名。 */
function ModelForm({ initial, onUse }: { initial?: ModelChoice; onUse: (m: ModelChoice) => void }) {
  const [source, setSource] = useState(initial?.source ?? 'openrouter');
  const [name, setName] = useState(initial?.model ?? '');
  const sources = Object.keys(SOURCE_LABEL);
  const ok = name.trim().length > 0;
  return (
    <div class="rbt-menu-form">
      <select class="text_pole rbt-select" value={source} onChange={(e) => setSource((e.currentTarget as HTMLSelectElement).value)}>
        {!sources.includes(source) && <option value={source}>{source}</option>}
        {sources.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
      </select>
      <input class="text_pole rbt-input" placeholder="模型名，和 API 面板里的一样" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && ok) onUse({ source, model: name.trim() }); }} />
      <button type="button" class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={!ok} onClick={() => onUse({ source, model: name.trim() })}>用这个</button>
    </div>
  );
}

// ----------------------------------------------------------- 人设 ---

export function PersonaSetupSection({ info }: { info: CardInfo }) {
  void personaTick.value;
  useEffect(watchPersonas, []);
  const [open, toggle, close] = useOpen();
  const c = ctx();
  const pu = c.powerUserSettings ?? {};
  const all = Object.keys(pu.personas ?? {}).sort((a, b) => personaName(a).localeCompare(personaName(b), 'zh'));
  const bound = boundPersonas(info.avatar);
  const def = String(pu.default_persona ?? '');
  const live = info.isCurrent;
  const cur = live ? String(loaded.personas?.user_avatar ?? '') : bound[0] ?? def;
  const locked = live ? String(c.chatMetadata?.persona ?? '') : '';
  const kind: PillKind = locked && locked === cur ? 'chat' : bound.length ? 'card' : 'global';
  const use = async (id: string | null) => {
    close();
    const before = bound.slice();
    const was = String(loaded.personas?.user_avatar ?? '');
    // 选「全局」= 解开这张卡绑的人设；选一个 = 绑上它（酒馆没开「一张卡连多个人设」时会换掉原来的）
    if (id) bindPersona(id, info.avatar); else for (const b of before) unbindPersona(b, info.avatar);
    const to = id ?? def;
    if (live && to && to !== was) await loaded.personas?.setUserAvatar?.(to);
    personaTick.value++;
    if (before.length && !before.includes(id ?? '')) {
      toast('success', id ? `已把「${info.name}」的人设换成「${personaName(id)}」。点这里撤销。` : `「${info.name}」的人设改回全局了。点这里撤销。`, 'RedBird 工具箱', {
        timeOut: 8000,
        onclick: async () => { if (id) unbindPersona(id, info.avatar); for (const b of before) bindPersona(b, info.avatar); if (live && was) await loaded.personas?.setUserAvatar?.(was); personaTick.value++; },
      });
    }
  };
  const makeDefault = (id: string) => {
    close();
    const prevDef = def;
    const before = bound.slice();
    pu.default_persona = id;
    for (const b of before) unbindPersona(b, info.avatar);
    c.saveSettingsDebounced();
    personaTick.value++;
    toast('success', `所有卡都用「${personaName(id)}」了。点这里撤销。`, 'RedBird 工具箱', {
      onclick: () => { pu.default_persona = prevDef; for (const b of before) bindPersona(b, info.avatar); c.saveSettingsDebounced(); personaTick.value++; }, timeOut: 8000,
    });
  };
  return (
    <FoldSection title="user 人设" summary={cur ? personaName(cur) : '没有人设'} defaultOpen action={<PanelBtn label="人设设置" onClick={() => openDrawer('persona')} />}>
      <PickRow k="人设" value={cur ? personaName(cur) : '没有人设'} lead={cur ? personaThumb(cur) : undefined}
        pill={<Pill kind={kind} img={thumbnailUrl(info.avatar)} />} open={open === 'p'} onToggle={() => toggle('p')} onClose={close}
        top={<>
          <MenuOpt title="全局" lead={def ? personaThumb(def) : undefined} sub={def ? `和其他卡一样：${personaName(def)}` : '酒馆里还没设默认人设，会沿用上次用的'} selected={!bound.length} onPick={() => { void use(null); }} />
          {bound.length === 1 && <MenuAll name={personaName(bound[0])} onPick={() => makeDefault(bound[0])} />}
        </>}
        head={`${info.name}专用`}
        options={all.map((id) => ({ key: id, title: personaName(id), lead: personaThumb(id), selected: bound.includes(id), onPick: () => { void use(id); } }))}
        bottom={<MenuFoot label="人设设置" onClick={() => { close(); openDrawer('persona'); }} />} />
      {locked && <div class="rbt-pick-hint">这个存档锁定了人设「{personaName(locked)}」，只对这个存档。{bound.length ? `换到这张卡的其他存档，用「${personaName(bound[0])}」。` : ''}</div>}
    </FoldSection>
  );
}

// --------------------------------------------------------- 世界书 ---

export function WorldSetupSection({ info, openWorld, cardBook }: { info: CardInfo; openWorld: (name: string) => void; cardBook: ComponentChildren }) {
  void archiveVersion.value;
  const [open, setOpen] = useState(false);
  const avatar = info.avatar;
  const live = info.isCurrent;
  const set = profileOf(avatar)?.worlds ?? {};
  const facts = worldFacts(avatar);
  const owners = bookOwners(avatar);
  const attached = attachedBooks(avatar);
  const known = worldNames();
  // 世界书列表还没读到时不筛（不然全都当成删掉了）
  const exists = (w: string) => !known.length || known.includes(w);
  // 全局的：真正的全局 + 这张卡单独设过的（停用了的也列出来）；这张卡自己的书在上面两组里，不重复
  const globals = [...new Set([...facts.global, ...Object.keys(set)])].filter((w) => exists(w) && !facts.mine.has(w)).sort((a, b) => a.localeCompare(b, 'zh'));
  const report = live ? buildEnvReport() : null;
  const chat = report ? report.items.filter((i) => i.scope === 'chat' && i.kind === 'worldbook').map((i) => i.name) : [];
  const persona = report ? report.items.filter((i) => i.scope === 'persona' && i.kind === 'worldbook').map((i) => i.name) : [];
  const detach = (w: string) => {
    detachBook(avatar, w);
    toast('success', `已从「${info.name}」移除附加世界书「${w}」。点这里撤销。`, 'RedBird 工具箱', { onclick: () => attachBook(avatar, w), timeOut: 8000 });
  };
  // 所有书都列出来，不能附加的灰掉、写原因（不然看着像列表不全）
  const whyNot = (w: string) => (attached.includes(w) ? '已附加' : facts.mine.has(w) ? '这张卡自带' : facts.global.has(w) ? '已是全局' : '');
  const addOpts: Opt[] = [...known].sort((a, b) => a.localeCompare(b, 'zh')).map((w) => {
    const why = whyNot(w);
    return { key: w, title: w, sub: why || undefined, disabled: !!why, onPick: () => { setOpen(false); attachBook(avatar, w); } };
  });
  const onCount = (info.world.state === 'ok' ? 1 : 0) + attached.filter(exists).length + globals.filter((w) => cardUses(avatar, `w:${w}`)).length + chat.length + persona.length;
  return (
    <FoldSection title="世界书" summary={onCount ? `${onCount} 本启用` : '没有'} defaultOpen action={<PanelBtn label="世界书面板" onClick={() => openDrawer('worldinfo')} />}>
      {info.world.state !== 'none' && <div class="rbt-use-group"><GroupHead title="角色卡自带" />{cardBook}</div>}
      {attached.length > 0 && <div class="rbt-use-group">
        <GroupHead title="附加给这张卡" count={attached.length} unit="本" />
        {attached.map((w) => <UseRow key={`x${w}`} name={w} on={exists(w)} sub={exists(w) ? undefined : '这本已经不在了'} action={{ label: '移除', onClick: () => detach(w) }} onEdit={exists(w) ? () => openWorld(w) : undefined} />)}
      </div>}
      {globals.length > 0 && <div class="rbt-use-group">
        <GroupHead title="全局" count={globals.length} unit="本" note="所有卡共用" />
        {globals.map((w) => {
          const key = `w:${w}`;
          const on = !!cardUses(avatar, key);
          const owner = owners.get(w);
          const sub = owner ? (on ? `角色卡「${owner}」的书，这张卡也启用` : `角色卡「${owner}」的书，进别的卡自动停用`)
            : w in set ? (set[w] ? '只在这张卡启用' : '只在这张卡停用') : undefined;
          return <UseRow key={`g${w}`} name={w} on={on} sub={sub} action={{ label: on ? '停用' : '启用', tone: on ? 'quiet' : 'go', onClick: () => { void setCardUse(avatar, info.name, key, !on); } }} onEdit={() => openWorld(w)} />;
        })}
      </div>}
      {chat.length > 0 && <div class="rbt-use-group"><GroupHead title="这个存档的" />{chat.map((w) => <UseRow key={`c${w}`} name={w} on onEdit={() => openWorld(w)} />)}</div>}
      {persona.length > 0 && <div class="rbt-use-group"><GroupHead title={`人设「${personaName(String(loaded.personas?.user_avatar ?? ''))}」的`} />{persona.map((w) => <UseRow key={`p${w}`} name={w} on onEdit={() => openWorld(w)} />)}</div>}
      <Popup title="附加世界书" open={open} onClose={() => setOpen(false)} wide
        options={addOpts}
        bottom={addOpts.length ? undefined : <div class="rbt-menu-empty">还没有世界书。</div>}>
        <div class="rbt-use-add"><button type="button" class="rbt-btn rbt-btn-small" aria-expanded={open} onClick={() => setOpen(!open)}><i class="fa-solid fa-plus" aria-hidden="true" /> 附加世界书</button></div>
      </Popup>
    </FoldSection>
  );
}

// ----------------------------------------------------------- 正则 ---

export function RegexSetupSection({ info, openScoped }: { info: CardInfo; openScoped: () => void }) {
  void archiveVersion.value;
  const [q, setQ] = useState('');
  const avatar = info.avatar;
  const p = profileOf(avatar);
  const live = info.isCurrent;
  const owners = settings().regexOwners ?? {};
  const report = live ? buildEnvReport() : null;
  const cardItem = report?.items.find((i) => i.id === 'rx:c');
  const presetItem = report?.items.find((i) => i.id === 'rx:p');
  const card: Any[] = (live ? [] : (ctx().characters ?? []).find((c: Any) => c.avatar === avatar)?.data?.extensions?.regex_scripts) ?? [];
  const preset = currentPresetName();
  const match = (n: string) => !q || n.toLowerCase().includes(q.toLowerCase());
  const allowed = live ? !!cardItem?.enabled : info.regex.allowed;
  const presetAllowed = !!presetItem?.enabled;
  const cardRows = live ? (cardItem?.subItems ?? []).map((s) => ({ key: s.id, name: s.name, on: s.enabled, toggle: s.toggle }))
    : card.map((r, i) => ({ key: String(r.id ?? i), name: unnamedRegex(r.scriptName), on: !r.disabled, toggle: undefined }));
  const presetRows = (presetItem?.subItems ?? []).map((s) => ({ key: s.id, name: s.name, on: s.enabled, toggle: s.toggle }));
  const globRows = globalRegex().map((r: Any) => {
    const id = String(r.id);
    const key = `r:${id}`;
    const on = !!cardUses(avatar, key);
    const o = owners[id];
    const sub = p?.regex && id in p.regex ? (on ? '只在这张卡启用' : '只在这张卡停用')
      : o?.kind === 'card' ? (o.key === avatar ? '属于这张卡，进这张卡自动启用' : `属于角色卡「${o.label}」，进别的卡自动停用`)
        : o?.kind === 'preset' && !on ? `属于预设「${o.label}」，用这个预设时才启用`
          : !on ? '所有卡都停用' : undefined;
    return { id, key, name: unnamedRegex(r.scriptName), on, sub };
  });
  const total = cardRows.filter((r) => r.on && allowed).length + globRows.filter((r) => r.on).length + presetRows.filter((r) => r.on && presetAllowed).length;
  const count = cardRows.length + globRows.length + presetRows.length;
  // 卡和预设里的正则：开关改在卡 / 预设里（和酒馆一样）；没允许运行时不能开关
  const flip = (r: { on: boolean; toggle?: (v: boolean) => unknown }, ok: boolean) => (r.toggle && ok ? { label: r.on ? '停用' : '启用', tone: r.on ? 'quiet' as const : 'go' as const, onClick: () => { void r.toggle!(!r.on); } } : undefined);
  return (
    <FoldSection title="正则" summary={count ? `${total} 条启用` : '没有'} tone={count ? undefined : 'dim'} action={<PanelBtn label="正则面板" onClick={openScoped} />}>
      {count > 0 && <>
        {count > 8 && <input class="text_pole rbt-input rbt-search" placeholder="搜正则名字" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />}
        {cardRows.length > 0 && <div class="rbt-use-group">
          <GroupHead title="角色卡里的" count={cardRows.length} />
          {!allowed && <GroupIssue text="酒馆还没允许这张卡的正则运行" button={live ? '允许运行' : undefined} onClick={() => { void cardItem?.toggle?.(true); }} />}
          {cardRows.filter((r) => match(r.name)).map((r) => (
            <UseRow key={`c${r.key}`} name={r.name} on={r.on && allowed} action={flip(r, allowed)} onEdit={live ? () => editRegex(r.key) : undefined} />
          ))}
        </div>}
        {globRows.length > 0 && <div class="rbt-use-group">
          <GroupHead title="全局" count={globRows.length} note="所有卡共用" />
          {globRows.filter((r) => match(r.name)).map((r) => (
            <UseRow key={`g${r.id}`} name={r.name} on={r.on} sub={r.sub} onEdit={() => editRegex(r.id)}
              action={{ label: r.on ? '停用' : '启用', tone: r.on ? 'quiet' : 'go', onClick: () => { void setCardUse(avatar, info.name, r.key, !r.on); } }} />
          ))}
        </div>}
        {presetRows.length > 0 && <div class="rbt-use-group">
          <GroupHead title={`预设「${preset}」里的`} count={presetRows.length} note="改了会存进预设" />
          {!presetAllowed && <GroupIssue text={`酒馆还没允许预设「${preset}」的正则运行`} button="允许运行" onClick={() => { void presetItem?.toggle?.(true); }} />}
          {presetRows.filter((r) => match(r.name)).map((r) => (
            <UseRow key={`p${r.key}`} name={r.name} on={r.on && presetAllowed} action={flip(r, presetAllowed)} onEdit={() => editRegex(r.key)} />
          ))}
        </div>}
      </>}
    </FoldSection>
  );
}
