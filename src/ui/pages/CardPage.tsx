/**
 * 角色档案：一张卡用的全部东西，每一项写现在用的是什么、谁在用（全局 / 本卡专用 / …），点了在原地改。
 * 顺序：卡面 → 需要注意 → 世界书 → 预设和模型 → 人设 → 正则 → 脚本 → 插件 → 美化 → 改回全局。
 * 规则见 dev/角色档案重做-spec.md；本卡专用的读写在 tools/env/setup.ts。
 */
import { useEffect, useState } from 'preact/hooks';
import { confirmBox, confirmText, ctx, currentCharacter, loaded, toast } from '../../st/st';
import { panelOpen } from '../Panel';
import { bgFiles, currentChatBg, CUSTOM_BG, AVATAR_BG, loadBgFiles, lockedFile, setChatBg } from '../../look/chatBg';
import { apiLabel, archiveTarget, archiveVersion, cardInfo, checkWorld, ensureFullCharacter, findChar, importCardWorld, presetApi, setCardTheme, thumbnailUrl, updateCardBook, worldNames, type CardInfo } from '../../tools/cards/cards';
import { globalValue, liveValue, overriddenKeys, profileOf, regexName, revertCard } from '../../tools/env/setup';
import { modelLabel, sameModel, type ModelChoice } from '../../tools/model';
import type { BookDiff } from '../../core/cards';
import { cardIssues, LEVEL_ICON, statusTick } from '../../shell/EnvStatus';
import { Empty } from '../common';
import { countScripts, currentGroups, thInstalled, thTick, cardGroup, setGroupAllowed } from '../../tools/scripts/th';
import { NodeRows } from './ScriptsPage';
import { EditButton, openRegexManager, openScriptManager } from './GlobalPage';
import { bindPersona, boundPersonas, CardHeader, DiffList, ExtSection, openWorldInST, personaTick, SourceSection, unbindPersona, withCardOpen } from './parts';
import { FoldSection, ItemRow, MenuFoot, MenuOpt, PanelBtn, PickRow, Pill, PersonaSetupSection, PresetModelSection, RegexSetupSection, SetupSection, WorldSetupSection, type Opt } from './setupParts';
import { loadThemes, LOOKS, stThemes, themesLoading } from '../../look/look';
import { appliedCardTheme, cardLookTick, cardThemeOf, globalLookLabel, lookLabel, RBT_LOOK } from '../../look/cardLook';
import { GLOBAL_TAB_LABELS, openDetail, openGlobal } from '../views';
import { extStatus, installedExtensions, requiredExtensions } from '../../tools/cards/cards';

// ------------------------------------------------------------ 卡面 ---

/** 卡名下面一行「作者说明和链接」，点了在原地展开（里面能加链接、写说明）。 */
function AboutRow({ info }: { info: CardInfo }) {
  const [open, setOpen] = useState(false);
  const links = (info.record?.links?.length ?? 0) + info.contacts.length + (info.autoSource ? 1 : 0);
  return (
    <>
      <button type="button" class="rbt-about-row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        <span class="rbt-about-t">作者说明和链接{links > 0 && <small>{links} 个链接</small>}</span>
        <i class={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} rbt-pick-ar`} aria-hidden="true" />
      </button>
      {open && <div class="rbt-about-body"><SourceSection info={info} bare /></div>}
    </>
  );
}

function AttentionBox({ char }: { char: unknown }) {
  void statusTick.value;
  const [busy, setBusy] = useState(false);
  const issues = cardIssues(char);
  if (!issues.length) return null;
  return (
    <div class="rbt-attn">
      <div class="rbt-attn-title">{issues.length} 项需要注意</div>
      {issues.map(({ section, line }, i) => (
        <div key={i} class="rbt-attn-line">
          <i class={`fa-solid ${LEVEL_ICON.warn}`} />
          <span class="rbt-attn-text"><small>{section}</small> {line.text}{line.detail && <small class="rbt-muted"> · {line.detail}</small>}</span>
          {line.edit && <EditButton title="编辑" onClick={line.edit} />}
          {line.action && (
            <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await line.action!.run(); } finally { setBusy(false); statusTick.value++; archiveVersion.value++; }
            }}>{line.action.label}</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------- 世界书 ---

/** 卡自带的那本：没有方框（和这张卡聊天时一直用）；没导入、找不到、和卡里不一样时给按钮。 */
function CardBook({ info }: { info: CardInfo }) {
  const [diff, setDiff] = useState<BookDiff | null | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const w = info.world;
  useEffect(() => {
    let alive = true;
    setDiff('loading');
    checkWorld(info).then((d) => { if (alive) setDiff(d); }).catch(() => { if (alive) setDiff(null); });
    return () => { alive = false; };
  }, [info.avatar, w.name, w.state, archiveVersion.value]);
  if (w.state === 'none') return null;
  const run = async (f: () => Promise<unknown>) => { setBusy(true); try { await f(); } finally { setBusy(false); archiveVersion.value++; } };
  const d = diff !== 'loading' ? diff : null;
  // 用词：「角色卡版本」= 卡里自带的世界书；「当前版本」= 世界书面板里那本现在的内容
  const book = w.state === 'ok' ? w.name : w.importName;
  const overwrite = async () => {
    const total = d ? d.card : w.embedded;
    const count = total !== null && total !== undefined ? `（${total} 条）` : '';
    const lose = d?.onlyWorld.length ? `当前版本里的 ${d.onlyWorld.length} 条将被移除。` : '';
    if (!await confirmBox('用角色卡版本覆盖当前世界书？', `世界书「${book}」将换成角色卡「${info.name}」的版本${count}。${lose}`, '当前版本将自动备份。', '确认覆盖')) return;
    await run(() => importCardWorld(info.avatar, { overwrite: true }));
  };
  const update = async () => {
    if (!await confirmBox('用当前世界书更新角色卡？', `角色卡「${info.name}」将绑定当前世界书版本${d ? `（${d.world} 条）` : ''}。`, '以后导出或分享角色卡时，将附带此版本，而非作者原版。原版本会自动备份。', '确认更新')) return;
    await run(() => updateCardBook(info.avatar));
  };
  const n = w.embedded !== null ? ` · ${w.embedded} 条` : '';
  const taken = worldNames().includes(w.importName);
  const differs = w.state === 'ok' && !!d && (d.onlyCard.length > 0 || d.onlyWorld.length > 0);
  return (
    <>
      {w.state === 'ok' && <ItemRow name={w.name} sub={`来自角色卡${n}。要换掉，在「编辑角色」里改。`} onEdit={() => openWorldInST(w.name)} />}
      {w.state === 'missing' && <ItemRow name={w.name} sub="卡上绑了这本，但它已经不在了。" />}
      {w.state === 'unbound' && <ItemRow name={w.importName} sub={`卡里自带的还没导入${n}`} />}
      {(w.state === 'missing' || w.state === 'unbound') && w.embedded !== null && (
        <div class="rbt-pick-hint">
          {taken
            ? <>已有一本同名世界书「{w.importName}」，所以没有自动导入。 <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={overwrite}>用角色卡版本覆盖当前世界书</button></>
            : <button class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={() => run(() => importCardWorld(info.avatar))}>{busy ? '正在导入…' : '导入'}</button>}
        </div>
      )}
      {differs && d && (
        <div class="rbt-warn rbt-book-diff">
          <div class="rbt-book-diff-t"><i class="fa-solid fa-book-open" aria-hidden="true" /> 世界书版本不一致</div>
          <div>角色卡「{info.name}」自带的世界书与当前版本不同。</div>
          <div class="rbt-book-diff-tbl">
            <small>世界书 · {w.name}</small>
            <div><span>角色卡版本</span><b>{d.card} 条</b></div>
            <div><span>当前版本</span><b>{d.world} 条</b></div>
            <small>其中 {d.same} 条相同</small>
          </div>
          <DiffList title="只在角色卡版本里" entries={d.onlyCard} />
          <DiffList title="只在当前版本里" entries={d.onlyWorld} />
          <div class="rbt-book-diff-btns">
            <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={overwrite}>用角色卡版本覆盖当前世界书</button>
            <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={update}>用当前世界书更新角色卡</button>
          </div>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------- 脚本 ---

function ScriptsSetupSection({ info }: { info: CardInfo }) {
  void thTick.value;
  if (!thInstalled()) {
    return info.scripts.total > 0 ? <FoldSection title="脚本" summary={`${info.scripts.total} 个 · 要先装酒馆助手`} tone="warn">
      <div class="rbt-pick-hint">这张卡的脚本要用酒馆助手运行。 <a class="rbt-btn rbt-btn-small" href="https://github.com/N0VI028/JS-Slash-Runner" target="_blank" rel="noopener noreferrer">怎么装酒馆助手 ↗</a></div>
    </FoldSection> : null;
  }
  const g = cardGroup(info.avatar);
  const others = info.isCurrent ? currentGroups().filter((x) => x.kind !== 'character' && countScripts(x.nodes) > 0) : [];
  const own = g ? countScripts(g.nodes) : 0;
  const total = own + others.reduce((n, x) => n + countScripts(x.nodes), 0);
  const summary = !total ? '没有' : own && g && !g.allowed ? `${own} 个 · 没允许运行` : `${total} 个`;
  return (
    <FoldSection title="脚本" summary={summary} tone={!total ? 'dim' : own && g && !g.allowed ? 'warn' : undefined}
      action={info.isCurrent ? <PanelBtn label="脚本面板" onClick={openScriptManager} /> : undefined}>
      {total > 0 && <>
        {g && own > 0 && <>
          <label class="rbt-allow">
            <input type="checkbox" class="rbt-cb" checked={g.allowed} onChange={(e) => { void setGroupAllowed(g, (e.currentTarget as HTMLInputElement).checked); }} />
            <span>允许角色卡里的脚本运行<small>{g.allowed ? '' : '没允许时，下面的脚本都不运行。'}</small></span>
          </label>
          {!g.editable && <small class="rbt-muted">要开关单个脚本，先打开这张卡。</small>}
          <NodeRows g={g} />
        </>}
        {others.map((x) => (
          <div key={x.kind} class="rbt-sub-list">
            <div class="rbt-sub-head">{x.kind === 'global' ? <Pill kind="global" /> : <small>来自预设「{x.label}」</small>}{!x.allowed && <small>没允许运行</small>}</div>
            {/* 全局、预设的脚本这一版只显示，不在这里开关（在这里点会改到所有卡） */}
            <NodeRows g={{ ...x, editable: false }} />
          </div>
        ))}
      </>}
    </FoldSection>
  );
}

// ----------------------------------------------------------- 插件 ---

function PluginsSetupSection({ info }: { info: CardInfo }) {
  const installed = installedExtensions();
  const list = requiredExtensions(info).map((r) => extStatus(r.req, installed));
  const bad = list.filter((s) => s.status !== 'enabled');
  const missing = bad.filter((s) => s.status === 'missing').length;
  if (!list.length) return null;
  const summary = !list.length ? '没有' : missing ? `${missing} 个没装` : bad.length ? `${bad.length} 个没启用` : list.length === 1 ? `${list[0].match?.name ?? ''}已启用` : '都启用了';
  return (
    <FoldSection title="插件" summary={summary} tone={!list.length ? 'dim' : bad.length ? 'warn' : 'ok'} action={<PanelBtn label="插件面板" onClick={() => openGlobal('plugins')} />}>
      <ExtSection info={info} bare />
    </FoldSection>
  );
}

// ----------------------------------------------------------- 美化 ---

function LookSetupSection({ info }: { info: CardInfo }) {
  void cardLookTick.value;
  void archiveVersion.value;
  useEffect(() => { if (!stThemes.value.length && !themesLoading.value) void loadThemes(); }, []);
  const [open, setOpen] = useState(false);
  const names = stThemes.value.map((t) => t.name);
  const own = cardThemeOf(info.avatar);
  const global = globalLookLabel();
  const shown = info.isCurrent && appliedCardTheme.value ? lookLabel(appliedCardTheme.value) : own ? lookLabel(own) : global;
  const pick = (v: string | null) => { setOpen(false); setCardTheme(info.avatar, info.name, v); };
  const goAll = () => { openGlobal('looks'); if (own && names.includes(own)) openDetail({ kind: 'theme', name: own }, GLOBAL_TAB_LABELS.looks); };
  const gone = own && !own.startsWith(RBT_LOOK) && names.length > 0 && !names.includes(own);
  const options: Opt[] = [
    ...LOOKS.map((l) => ({ key: `${RBT_LOOK}${l.id}`, title: `红鸟自带美化 · ${l.label}`, sub: l.desc, selected: own === `${RBT_LOOK}${l.id}`, onPick: () => pick(`${RBT_LOOK}${l.id}`) })),
    ...(gone ? [{ key: own!, title: own!, sub: '已经删掉了，现在用全局的', selected: true, onPick: () => setOpen(false) }] : []),
    ...names.map((n) => ({ key: n, title: n, selected: own === n, onPick: () => pick(n) })),
  ];
  return (
    <SetupSection title="美化" actions={<PanelBtn label="查看全部美化" onClick={goAll} />}>
      <PickRow k="美化" value={shown} pill={<Pill kind={own ? 'card' : 'global'} img={thumbnailUrl(info.avatar)} />} open={open} onToggle={() => setOpen(!open)} onClose={() => setOpen(false)}
        top={<MenuOpt title="全局" sub={`和其他卡一样：${global}`} selected={!own} onPick={() => pick(null)} />}
        head={`${info.name}专用`} options={options}
        bottom={<MenuFoot label="查看全部美化" onClick={() => { setOpen(false); goAll(); }} />} />
      {info.isCurrent && ctx().getCurrentChatId?.() && <ChatBgRow />}
    </SetupSection>
  );
}

/** 这个存档的背景（酒馆的「锁定到这个聊天」）：选一张只给这个存档用，「跟着全局背景」就解开。 */
function ChatBgRow() {
  const bg = currentChatBg();
  const locked = lockedFile();
  const files = bgFiles.value;
  useEffect(() => { void loadBgFiles(); }, []);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const name = (f: string) => f.replace(/\.[^.]+$/, '');
  const label = locked === AVATAR_BG ? '用卡图' : locked === CUSTOM_BG ? '这个存档自己上传的图' : locked ? name(locked) : '跟着全局背景';
  const pick = async (v: string | null) => { setOpen(false); setBusy(true); try { await setChatBg(v); } finally { setBusy(false); } };
  const opt = (v: string, t: string): Opt => ({ key: v, title: t, selected: locked === v, onPick: () => { void pick(v); } });
  const hasAvatar = String(currentCharacter()?.avatar ?? 'none') !== 'none';
  const options: Opt[] = [
    ...(hasAvatar ? [opt(AVATAR_BG, '用卡图')] : []),
    ...(locked === CUSTOM_BG ? [opt(CUSTOM_BG, '这个存档自己上传的图')] : []),
    ...(locked && locked !== CUSTOM_BG && locked !== AVATAR_BG && !files.includes(locked) ? [opt(locked, name(locked))] : []),
    ...files.map((f) => opt(f, name(f))),
  ];
  return (
    <PickRow k="背景" value={label} pill={<Pill kind={locked ? 'chat' : 'global'} />} thumb={bg.thumb || undefined} disabled={busy} open={open} onToggle={() => setOpen(!open)} onClose={() => setOpen(false)}
      top={<MenuOpt title="跟着全局背景" selected={!locked} onPick={() => { void pick(null); }} />}
      head="只给这个存档用" options={options} />
  );
}

// ------------------------------------------------------- 改回全局 ---

/** 这张卡和全局不一样的项（给「改回全局」列出来）：[名字, 现在, 改回后]。 */
function differences(info: CardInfo): [string, string, string, string][] {
  const p = profileOf(info.avatar);
  const lines: [string, string, string, string][] = [];
  const show = (key: string, v: unknown) => (key === 'model' ? (v ? modelLabel(v as ModelChoice) : '—') : key.startsWith('w:') || key.startsWith('r:') ? (v ? '开' : '关') : String(v ?? '—'));
  for (const k of overriddenKeys(p)) {
    if (k.startsWith('r:') && liveValue(k) === undefined) continue; // 正则已经删掉了
    if (k.startsWith('w:') && worldNames().length && !worldNames().includes(k.slice(2))) continue; // 世界书已经删掉了
    const name = k === 'preset' ? (p?.preset?.api !== presetApi() ? `预设（「${apiLabel(p?.preset?.api ?? '')}」的）` : '预设') : k === 'model' ? '模型' : k.startsWith('w:') ? `世界书「${k.slice(2)}」` : `正则「${regexName(k.slice(2))}」`;
    const now = k === 'preset' ? p?.preset?.name : k === 'model' ? p?.model : k.startsWith('w:') ? p?.worlds?.[k.slice(2)] : p?.regex?.[k.slice(2)];
    // 全局是什么不一定知道（升级前留下来的就是这张卡的）：一样的也列出来，写「全局也是它」
    const g = globalValue(k);
    const same = k === 'model' ? sameModel(now as ModelChoice, g as ModelChoice) : now === g;
    lines.push([k, name, show(k, now), same ? '全局也是它' : `全局：${show(k, g)}`]);
  }
  const persona = boundPersonas(info.avatar);
  const def = String(ctx().powerUserSettings?.default_persona ?? '');
  const pname = (id: string) => (ctx().powerUserSettings?.personas ?? {})[id] || id;
  if (persona.length) lines.push(['persona', '人设', persona.map(pname).join('、'), `全局：${def ? pname(def) : '酒馆里还没设默认人设'}`]);
  const theme = cardThemeOf(info.avatar);
  if (theme) lines.push(['theme', '美化', lookLabel(theme), `全局：${globalLookLabel()}`]);
  return lines;
}

function RevertRow({ info }: { info: CardInfo }) {
  void archiveVersion.value;
  void personaTick.value;
  const [busy, setBusy] = useState(false);
  const lines = differences(info);
  if (!lines.length) return null;
  const go = async () => {
    const text = `${lines.map(([, n, a, b]) => `${n}：${a}（${b}）`).join('\n')}\n\n角色卡里的世界书、正则、脚本不变；这个存档的背景不变。`;
    if (!await confirmText('这张卡改用全局设置？', text)) return;
    setBusy(true);
    try {
      const persona = boundPersonas(info.avatar);
      const theme = cardThemeOf(info.avatar);
      const undo = await revertCard(info.avatar);
      for (const id of persona) unbindPersona(id, info.avatar);
      const def = String(ctx().powerUserSettings?.default_persona ?? '');
      if (info.isCurrent && persona.length && def && def !== loaded.personas?.user_avatar) await loaded.personas?.setUserAvatar?.(def);
      if (theme) setCardTheme(info.avatar, info.name, null);
      toast('success', `已改回全局：${lines.map(([, n]) => n).join('、')}。点这里撤销。`, 'RedBird 工具箱', {
        timeOut: 9000,
        onclick: async () => {
          await undo();
          for (const id of persona) bindPersona(id, info.avatar);
          if (info.isCurrent && persona[0]) await loaded.personas?.setUserAvatar?.(persona[0]);
          if (theme) setCardTheme(info.avatar, info.name, theme);
          archiveVersion.value++;
        },
      });
    } finally { setBusy(false); archiveVersion.value++; personaTick.value++; }
  };
  return (
    <div class="rbt-revert">
      <div class="rbt-revert-t">这张卡有 {lines.length} 项本卡专用</div>
      <ul class="rbt-revert-list">
        {lines.map(([k, n, a, b]) => <li key={k}><span class="rbt-revert-k">{n}：</span>{a}<small>{b}</small></li>)}
      </ul>
      <button type="button" class="rbt-btn rbt-btn-small" disabled={busy} onClick={go}><i class="fa-solid fa-rotate-left" aria-hidden="true" /> 改回全局</button>
    </div>
  );
}

/** 页面最下面：每种标签是什么意思（收起的小说明）。 */
function TagHelp({ info }: { info: CardInfo }) {
  const [open, setOpen] = useState(false);
  return (
    <section class="rbt-card-section rbt-setup rbt-help">
      <button type="button" class="rbt-about-row rbt-help-row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <i class="fa-regular fa-circle-question" aria-hidden="true" />
        <span class="rbt-about-t">这些标签是什么意思</span>
        <i class={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} rbt-pick-ar`} aria-hidden="true" />
      </button>
      {open && (
        <ul class="rbt-help-list">
          <li><Pill kind="global" /><span>所有卡都用。在酒馆自己的面板（预设设置、API 设置等）里改的，改的就是全局。</span></li>
          <li><Pill kind="card" img={thumbnailUrl(info.avatar)} /><span>只这张卡用。在这一页里改的，会自动记成本卡专用，以后进这张卡都用它。</span></li>
          <li><Pill kind="chat" /><span>只这个存档用，比如锁在这个存档上的背景、人设。</span></li>
          <li><Pill kind="preset" /><span>用这个预设时才用，比如预设推荐的模型。</span></li>
          <li><span>想让这张卡全部回到全局，点「改回全局」。想让所有卡都用这张卡的某一项，在那一项的选择框里点「让所有卡都用」。</span></li>
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------- 页面 ---

/** `avatar`: show this card (a detail inside 全局工具箱); otherwise the dock's current / picked card. */
export function CardPage({ avatar: forced, embedded }: { avatar?: string; embedded?: boolean } = {}) {
  void archiveVersion.value;
  void statusTick.value;
  const cur = currentCharacter();
  const avatar = forced ?? archiveTarget.value ?? cur?.avatar;
  useEffect(() => { if (avatar) void ensureFullCharacter(avatar); }, [avatar]);
  const f = avatar ? findChar(avatar) : null;
  if (!f) {
    if (ctx().groupId) return <Empty>群聊没有角色档案，打开一张单人卡再来看。</Empty>;
    return (
      <Empty>
        <p>先打开一张角色卡，这里会显示它的档案。</p>
        <div class="rbt-empty-actions">
          <button type="button" class="rbt-btn" onClick={() => {
            // 回到首页（关掉现在的聊天），收起工具箱，首页就是角色库
            (document.querySelector('#option_close_chat') as HTMLElement | null)?.click();
            panelOpen.value = false;
          }}>去首页选卡</button>
        </div>
      </Empty>
    );
  }
  const info = cardInfo(f.char);
  return (
    <div class="rbt-page rbt-card-page">
      <section class="rbt-card-section rbt-card-hero">
        <CardHeader info={info} embedded={embedded} />
        <AboutRow info={info} />
      </section>
      {info.isCurrent && <AttentionBox char={f.char} />}
      {!info.isCurrent && <p class="rbt-muted rbt-other-note">进这张卡时用这些。在这里改的只给这张卡用。</p>}
      <WorldSetupSection info={info} openWorld={openWorldInST} cardBook={<CardBook info={info} />} />
      <PresetModelSection info={info} />
      <PersonaSetupSection info={info} />
      <RegexSetupSection info={info} openScoped={() => { void withCardOpen(info, () => openRegexManager('scoped')); }} />
      <ScriptsSetupSection info={info} />
      <PluginsSetupSection info={info} />
      <LookSetupSection info={info} />
      <RevertRow info={info} />
      <TagHelp info={info} />
    </div>
  );
}
