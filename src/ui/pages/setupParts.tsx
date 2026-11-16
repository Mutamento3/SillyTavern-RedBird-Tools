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
import { globalRegex, globalValue, globalWorlds, makeGlobal, profileOf, setCardItem } from '../../tools/env/setup';
import { unnamedRegex } from '../../core/setup';
import { buildEnvReport } from '../../tools/env/env';
import { openDrawer } from '../../shell/drawers';
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

export interface Opt { key: string; title: string; sub?: string; lead?: string; selected?: boolean; onPick: () => void }

/**
 * 一行：左边小字名字，右边整行是框（全名换行、标签在右、箭头图标）。点框弹出选择框：
 * 电脑上盖在下面的内容上；手机上从底部弹出（点外面关掉）。选项多（超过 8 个）时上面有搜索框。
 * 选择框里：top（「全局」和「让所有卡都用」，都是关于全局的，放最上面不用往下翻）→ head（「卡名专用」小标题）+ options → bottom（去面板的按钮）。
 */
export function PickRow({ k, value, sub, lead, pill, thumb, disabled, open, onToggle, onClose, top, head, options, bottom }: {
  k: string; value: ComponentChildren; sub?: string; lead?: string; pill?: ComponentChildren; thumb?: string; disabled?: boolean;
  open: boolean; onToggle: () => void; onClose: () => void;
  top?: ComponentChildren; head?: string; options?: Opt[]; bottom?: ComponentChildren;
}) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) { setQ(''); return; }
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
    <div class={`rbt-pick ${open ? 'open' : ''}`} ref={ref}>
      <div class="rbt-pick-row">
        <span class="rbt-pick-k">{k}</span>
        <button type="button" class={`rbt-pick-box ${open ? 'open' : ''}`} disabled={disabled} aria-expanded={open} aria-haspopup="listbox" onClick={onToggle}>
          {lead && <img class="rbt-pick-lead" src={lead} alt="" />}
          <span class="rbt-pick-v">{value}{sub && <small>{sub}</small>}</span>
          {pill}
          {thumb && <img class="rbt-pick-thumb" src={thumb} alt="" />}
          {!disabled && <i class={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} rbt-pick-ar`} aria-hidden="true" />}
        </button>
      </div>
      {open && sheet(<>
        <div class="rbt-menu-scrim" onClick={onClose} />
        <div class="rbt-menu" role="listbox" aria-label={k} ref={sheetRef}>
          <div class="rbt-menu-title">{k}<button type="button" class="rbt-iconbtn" aria-label="关闭" onClick={onClose}><i class="fa-solid fa-xmark" /></button></div>
          {(options?.length ?? 0) > 8 && <input class="text_pole rbt-input rbt-menu-search" placeholder={`搜${k}名字`} value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />}
          <div class="rbt-menu-scroll">
            {!q.trim() && top}
            {head && <>{!q.trim() && top && <MenuLine />}<MenuHead>{head}</MenuHead></>}
            {list.map((o) => <MenuOpt key={o.key} title={o.title} sub={o.sub} lead={o.lead} selected={o.selected} onPick={o.onPick} />)}
            {q.trim() && !list.length && <div class="rbt-menu-empty">没有找到「{q.trim()}」</div>}
            {!q.trim() && bottom}
          </div>
        </div>
      </>)}
    </div>
  );
}

export function MenuOpt({ title, sub, lead, selected, onPick }: { title: ComponentChildren; sub?: string; lead?: string; selected?: boolean; onPick: () => void }) {
  return (
    <button type="button" role="option" aria-selected={!!selected} class={`rbt-menu-opt ${selected ? 'cur' : ''}`} onClick={onPick}>
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

export function SetupSection({ title, actions, children }: { title: string; actions?: ComponentChildren; children: ComponentChildren }) {
  return (
    <section class="rbt-card-section rbt-setup">
      <div class="rbt-setup-head"><h3 class="rbt-card-section-title">{title}</h3>{actions && <span class="rbt-setup-acts">{actions}</span>}</div>
      {children}
    </section>
  );
}

/** 收起时一行（标题、数量、面板按钮、箭头），点标题那一行在原地展开。 */
export function FoldSection({ title, summary, tone, action, children }: { title: string; summary: string; tone?: 'ok' | 'warn' | 'dim'; action?: ComponentChildren; children?: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const can = !!children;
  return (
    <section class="rbt-card-section rbt-setup rbt-fold">
      <div class={`rbt-fold-head ${can ? 'can' : ''}`} role={can ? 'button' : undefined} tabIndex={can ? 0 : undefined} aria-expanded={can ? open : undefined}
        onClick={() => can && setOpen(!open)} onKeyDown={(e) => { if (can && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(!open); } }}>
        <h3 class="rbt-card-section-title">{title}</h3>
        <span class={`rbt-fold-sum ${tone ?? ''}`}>{summary}</span>
        {action}
        {can && <i class={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} rbt-pick-ar`} aria-hidden="true" />}
      </div>
      {open && can && <div class="rbt-fold-body">{children}</div>}
    </section>
  );
}

/** 列表里的一条：名字（全名）、标签、来源小字；右边「编辑」和开关。 */
export function ItemRow({ name, pill, sub, onEdit, check, dim }: {
  name: string; pill?: ComponentChildren; sub?: string; onEdit?: () => void; dim?: boolean;
  check?: { on: boolean; disabled?: boolean; onChange?: (v: boolean) => void };
}) {
  const body = <>
    <span class="rbt-item-n">{name}{pill && <span class="rbt-item-pill">{pill}</span>}{sub && <small>{sub}</small>}</span>
    {onEdit && <button type="button" class="rbt-btn rbt-btn-small rbt-item-edit" onClick={(e) => { e.preventDefault(); onEdit(); }}>编辑</button>}
    {check && <span class="rbt-item-cb">
      {(check.onChange
        ? <input type="checkbox" class="rbt-cb" checked={check.on} disabled={check.disabled} aria-label={`${name} 开着`} onChange={(e) => check.onChange!((e.currentTarget as HTMLInputElement).checked)} />
        : <span class={`rbt-item-state ${check.on ? 'on' : ''}`}>{check.on ? '开着' : '关着'}</span>)}
    </span>}
  </>;
  // 能开关的：整行都能点（DESIGN.md：勾选框整行可点）
  return check?.onChange && !check.disabled ? <label class={`rbt-item can ${dim ? 'dim' : ''}`}>{body}</label> : <div class={`rbt-item ${dim ? 'dim' : ''}`}>{body}</div>;
}
export const ColHead = () => <div class="rbt-colh"><span>开着</span></div>;
/** 列表里一段的小标题：来源、条数（不能收起）。 */
export const GroupHead = ({ title, count, note }: { title: string; count: number; note?: string }) => (
  <div class="rbt-group-head"><span>{title}</span><small>{count} 条{note ? ` · ${note}` : ''}</small></div>
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
  const [busy, setBusy] = useState(false);
  const p = profileOf(info.avatar);
  const live = info.isCurrent;
  const api = presetApi();
  const names = presetNames();
  const own = p?.preset && p.preset.api === api ? p.preset.name : undefined;
  const preset = live ? currentPresetName() : own ?? String(globalValue('preset') ?? '');
  const globalPreset = String(globalValue('preset') ?? '');
  const run = async (f: () => Promise<void>) => { close(); setBusy(true); try { await f(); } finally { setBusy(false); } };

  // 模型：本卡专用 > 本预设专用（预设推荐的） > 全局
  const presetModel: ModelChoice | undefined = settings().presetInfo?.[preset]?.model;
  const model: ModelChoice | null = live ? currentModel() : p?.model ?? presetModel ?? (globalValue('model') as ModelChoice | null);
  const modelKind: PillKind = p?.model ? 'card' : presetModel && sameModel(presetModel, model) ? 'preset' : 'global';
  const globalModel = globalValue('model') as ModelChoice | null;
  const cardImg = thumbnailUrl(info.avatar);

  return (
    <SetupSection title="预设和模型" actions={<>
      <PanelBtn label="预设设置" onClick={() => openDrawer('preset')} />
      <PanelBtn label="API 设置" onClick={() => openDrawer('api')} />
    </>}>
      <PickRow k="预设" value={preset || '没有预设'} pill={<Pill kind={own ? 'card' : 'global'} img={cardImg} />} disabled={busy} open={open === 'preset'} onToggle={() => toggle('preset')} onClose={close}
        top={<>
          <MenuOpt title="全局" sub={`和其他卡一样：${globalPreset || '—'}`} selected={!own} onPick={() => run(() => setCardItem(info.avatar, info.name, 'preset', null))} />
          {live && own && own === currentPresetName() && <MenuAll name={own} onPick={() => { close(); allCards(info, 'preset', own); }} />}
        </>}
        head={`${info.name}专用`}
        options={names.map((n) => ({ key: n, title: n, selected: own === n, onPick: () => run(() => setCardItem(info.avatar, info.name, 'preset', n)) }))}
        bottom={<MenuFoot label="预设设置" onClick={() => { close(); openDrawer('preset'); }} />} />
      {p?.preset && p.preset.api === api && !names.includes(p.preset.name) && <div class="rbt-pick-hint warn">这张卡专用的「{p.preset.name}」已经删掉了，现在用全局的。</div>}
      {p?.preset && p.preset.api !== api && <div class="rbt-pick-hint warn">这张卡专用的「{p.preset.name}」是「{apiLabel(p.preset.api)}」的预设，现在用的是「{apiLabel(api)}」，所以没换。</div>}

      {modelsApply() && (
        <PickRow k="模型" value={model ? model.model : 'API 没连上'} sub={model ? (SOURCE_LABEL[model.source] ?? model.source) : undefined}
          pill={model ? <Pill kind={modelKind} img={cardImg} /> : undefined} disabled={busy || (live && !model)} open={open === 'model'} onToggle={() => toggle('model')} onClose={close}
          top={<>
            <MenuOpt title="全局" sub={`和其他卡一样：${globalModel ? modelLabel(globalModel) : '—'}`} selected={!p?.model} onPick={() => run(() => setCardItem(info.avatar, info.name, 'model', null))} />
            {live && p?.model && sameModel(p.model, currentModel()) && <MenuAll name={modelLabel(p.model)} onPick={() => { close(); allCards(info, 'model', modelLabel(p.model!)); }} />}
          </>}
          head={`${info.name}专用`}
          options={stModelList(model?.source ?? '').map((o) => ({ key: o.id, title: o.label, selected: !!p?.model && p.model.source === model?.source && p.model.model === o.id,
            onPick: () => run(() => setCardItem(info.avatar, info.name, 'model', { source: model!.source, model: o.id })) }))}
          bottom={<>
            <MenuHead>列表里没有，手动填写</MenuHead>
            <ModelForm initial={p?.model ?? model ?? undefined} onUse={(m) => run(() => setCardItem(info.avatar, info.name, 'model', m))} />
            <MenuFoot label="API 设置" onClick={() => { close(); openDrawer('api'); }} />
          </>} />
      )}
      {modelsApply() && live && !model && <div class="rbt-pick-hint">连上以后才能选模型。点右上角「API 设置」。</div>}
    </SetupSection>
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
    <SetupSection title="user 人设" actions={<PanelBtn label="人设设置" onClick={() => openDrawer('persona')} />}>
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
    </SetupSection>
  );
}

// --------------------------------------------------------- 世界书 ---

export function WorldSetupSection({ info, openWorld, cardBook }: { info: CardInfo; openWorld: (name: string) => void; cardBook: ComponentChildren }) {
  void archiveVersion.value;
  const p = profileOf(info.avatar);
  const live = info.isCurrent;
  // 别的卡：全局开着的书看进卡前的值（正在聊的卡换上的不算）
  const on = live ? globalWorlds() : [...new Set([...globalWorlds(), ...Object.keys(settings().baseline?.items ?? {}).filter((k) => k.startsWith('w:')).map((k) => k.slice(2))])].filter((w) => !!globalValue(`w:${w}`));
  const set = p?.worlds ?? {};
  const names = [...new Set([...on, ...Object.keys(set)])];
  const bound = new Set([info.world.name, ...info.world.extra].filter(Boolean));
  const report = live ? buildEnvReport() : null;
  const chat = report ? report.items.filter((i) => i.scope === 'chat' && i.kind === 'worldbook').map((i) => i.name) : [];
  const persona = report ? report.items.filter((i) => i.scope === 'persona' && i.kind === 'worldbook').map((i) => i.name) : [];
  // 只列正在起作用的书。全局的书在这里不开关：要关去世界书面板（那里改的是全局）
  const known = worldNames();
  // 已经删掉的书不列（本卡专用里可能还记着它）；世界书列表还没读到时不筛
  const rows = names.filter((w) => (!known.length || known.includes(w)) && !bound.has(w) && (w in set ? set[w] : on.includes(w))).map((w) => (
    w in set && !globalValue(`w:${w}`)
      ? <ItemRow key={w} name={w} pill={<Pill kind="card" img={thumbnailUrl(info.avatar)} />} sub="只这张卡开着" onEdit={() => openWorld(w)} />
      : <ItemRow key={w} name={w} sub="全局 · 所有卡都开着" onEdit={() => openWorld(w)} />
  ));
  const has = !!cardBook || rows.length || chat.length || persona.length || info.world.extra.length;
  return (
    <SetupSection title="世界书" actions={<PanelBtn label="世界书面板" onClick={() => openDrawer('worldinfo')} />}>
      {!has && <div class="rbt-muted">没有开着的世界书。</div>}
      {cardBook}
      {info.world.extra.map((w) => <ItemRow key={`x${w}`} name={w} sub="附加在这张卡上。要去掉，在「编辑角色」里改。" onEdit={() => openWorld(w)} />)}
      {chat.map((w) => <ItemRow key={`c${w}`} name={w} sub="绑在这个存档上，只对这个存档" onEdit={() => openWorld(w)} />)}
      {persona.map((w) => <ItemRow key={`p${w}`} name={w} sub={`来自人设「${personaName(String(loaded.personas?.user_avatar ?? ''))}」，用这个人设时都会用`} onEdit={() => openWorld(w)} />)}
      {rows}
    </SetupSection>
  );
}

// ----------------------------------------------------------- 正则 ---

export function RegexSetupSection({ info, openScoped }: { info: CardInfo; openScoped: () => void }) {
  void archiveVersion.value;
  const [q, setQ] = useState('');
  const p = profileOf(info.avatar);
  const live = info.isCurrent;
  const owners = settings().regexOwners ?? {};
  const report = live ? buildEnvReport() : null;
  const cardItem = report?.items.find((i) => i.id === 'rx:c');
  const presetItem = report?.items.find((i) => i.id === 'rx:p');
  const card: Any[] = (live ? [] : (ctx().characters ?? []).find((c: Any) => c.avatar === info.avatar)?.data?.extensions?.regex_scripts) ?? [];
  const glob = globalRegex();
  const preset = currentPresetName();
  const match = (n: string) => !q || n.toLowerCase().includes(q.toLowerCase());
  const cardRows = live ? (cardItem?.subItems ?? []).map((s) => ({ key: s.id, name: s.name, on: s.enabled, toggle: s.toggle }))
    : card.map((r, i) => ({ key: String(r.id ?? i), name: unnamedRegex(r.scriptName), on: !r.disabled, toggle: undefined }));
  const presetRows = (presetItem?.subItems ?? []).map((s) => ({ key: s.id, name: s.name, on: s.enabled, toggle: s.toggle }));
  const globalOn = (r: Any) => { const id = String(r.id); return live ? !r.disabled : p?.regex?.[id] ?? !!(globalValue(`r:${id}`) ?? !r.disabled); };
  const total = cardRows.filter((r) => r.on).length + glob.filter(globalOn).length + presetRows.filter((r) => r.on).length;
  const count = cardRows.length + glob.length + presetRows.length;
  const allowed = live ? !!cardItem?.enabled : info.regex.allowed;
  return (
    <FoldSection title="正则" summary={count ? `${total} 条开着` : '没有'} tone={count ? undefined : 'dim'} action={<PanelBtn label="正则面板" onClick={openScoped} />}>
      {count > 0 && <>
        {count > 8 && <input class="text_pole rbt-input rbt-search" placeholder="搜正则名字" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />}
        {/* 按来源分成几段，每段一个小标题（不再套一层收起，免得收起里面还有收起） */}
        {cardRows.length > 0 && <>
          <GroupHead title="角色卡里的" count={cardRows.length} />
          <label class="rbt-allow">
            <input type="checkbox" class="rbt-cb" checked={allowed} disabled={!live} onChange={(e) => { void cardItem?.toggle?.((e.currentTarget as HTMLInputElement).checked); }} />
            <span>允许角色卡里的正则运行<small>{allowed ? '关掉后，下面这几条都不生效（各自的开关不变）。' : '现在关着，下面这几条都不生效。打开后，打勾的那几条才生效。'}</small></span>
          </label>
          <ColHead />
          {cardRows.filter((r) => match(r.name)).map((r) => (
            <ItemRow key={`c${r.key}`} name={r.name} dim={!allowed} onEdit={live ? () => editRegex(r.key) : undefined}
              check={{ on: r.on, disabled: !allowed, onChange: r.toggle ? (v) => { void r.toggle!(v); } : undefined }} />
          ))}
        </>}
        {glob.length > 0 && <>
          <GroupHead title="全局的" count={glob.length} />
          <ColHead />
          {glob.filter((r) => match(unnamedRegex(r.scriptName))).map((r) => {
            const id = String(r.id);
            const o = owners[r.id];
            const own = p?.regex && id in p.regex;
            const byPreset = !own && o?.kind === 'preset';
            const kind: PillKind = own || (o?.kind === 'card' && o.key === info.avatar) ? 'card' : 'global';
            const sub = !own && o?.kind === 'card' && o.key === info.avatar ? '标为属于这张卡' : byPreset ? `标为属于预设「${o.label}」，用这个预设时开` : undefined;
            return <ItemRow key={`g${id}`} name={unnamedRegex(r.scriptName)} pill={byPreset ? undefined : <Pill kind={kind} img={thumbnailUrl(info.avatar)} />} sub={sub} onEdit={() => editRegex(id)}
              check={{ on: globalOn(r), onChange: (v) => { void setCardItem(info.avatar, info.name, `r:${id}`, v); } }} />;
          })}
        </>}
        {presetRows.length > 0 && <>
          <GroupHead title={`预设「${preset}」里的`} count={presetRows.length} note={presetItem?.enabled ? undefined : '没允许运行'} />
          <ColHead />
          {presetRows.filter((r) => match(r.name)).map((r) => (
            <ItemRow key={`p${r.key}`} name={r.name} dim={!presetItem?.enabled} onEdit={() => editRegex(r.key)} check={{ on: r.on, disabled: !presetItem?.enabled, onChange: (v) => { void r.toggle(v); } }} />
          ))}
        </>}
      </>}
    </FoldSection>
  );
}

