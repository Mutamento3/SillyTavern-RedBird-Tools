/**
 * 「这张卡」：一张卡的全部——需要注意的问题、来源与作者说明、配套环境（世界书 / 预设 / 正则与脚本 / 插件），
 * 以及换卡时的自动切换。合并了原来的「环境」弹窗、「角色档案 · 这张卡」和「换卡体检」里跟卡有关的部分。
 */
import { useEffect, useState } from 'preact/hooks';
import { currentCharacter, saveSettings, settings, toast } from '../../st/st';
import { undoable } from '../undo';
import { archiveTarget, archiveVersion, cardInfo, ensureFullCharacter, findChar } from '../../tools/cards/cards';
import { lastApplied, undoLastApply } from '../../tools/env/autoapply';
import { applyProfile, forgetProfile, rememberProfile, snapshotNow, worldExists } from '../../tools/env/env';
import { modelLabel } from '../../tools/model';
import type { EnvProfile } from '../../st/st';
import { cardIssues, envReportForView, LEVEL_ICON, statusTick } from '../../shell/EnvStatus';
import { Empty, CheckRow } from '../common';
import { CardScriptsSection } from './ScriptsPage';
import { CardHeader, ExtSection, PersonaSection, PresetSection, RegexSection, Section, SourceSection, WorldSection } from './parts';
import { loadThemes, stThemes, themesLoading } from '../../look/look';
import { appliedCardTheme, cardLookEnabled, cardLookTick, cardThemeOf, setCardLookEnabled } from '../../look/cardLook';
import { setCardTheme, setProfile } from '../../tools/cards/cards';
import { GLOBAL_TAB_LABELS, openDetail, openGlobal } from '../views';

/** 美化（试用）：这张卡用哪套美化。和它聊天时整个界面换过去。 */
function CardLookSection({ avatar, name, isCurrent }: { avatar: string; name: string; isCurrent: boolean }) {
  void cardLookTick.value;
  void archiveVersion.value;
  useEffect(() => { if (!stThemes.value.length && !themesLoading.value) void loadThemes(); }, []);
  const names = stThemes.value.map((t) => t.name);
  const rec = cardThemeOf(avatar);
  const on = cardLookEnabled();
  const inUse = isCurrent && !!rec && appliedCardTheme.value === rec;
  // 美化的颜色和 CSS 在酒馆「用户设置」里改的是全局美化，不是这张卡的，所以这里打开全局工具箱 › 美化
  const open = () => {
    openGlobal('looks');
    if (rec && names.includes(rec)) openDetail({ kind: 'theme', name: rec }, GLOBAL_TAB_LABELS.looks);
  };
  return (
    <Section title="美化" hint="和这张卡聊天时，整个界面换成这套美化。回首页或换到别的卡，换回全局美化。" actions={<button type="button" class="rbt-btn rbt-btn-small" onClick={open}>查看全部美化</button>}>
      <div class="rbt-frow">
        <span class="rbt-frow-k">美化</span>
        <select class="text_pole rbt-select" value={rec ?? ''} onChange={(e) => {
          const v = (e.currentTarget as HTMLSelectElement).value || null;
          setCardTheme(avatar, name, v);
          if (!v && rec) { const was = rec; undoable(was, () => setCardTheme(avatar, name, was)); }
        }}>
          <option value="">用全局美化</option>
          {rec && !names.includes(rec) && <option value={rec}>{rec}（已经删掉了）</option>}
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {inUse ? <i class="fa-solid fa-circle-check rbt-inuse" title="正在用这套美化" aria-label="正在用这套美化" /> : <span />}
      </div>
      {rec && !on && (
        <div class="rbt-differ"><span class="rbt-differ-text">「换成这张卡的美化」关着，现在不会换</span><button class="rbt-btn rbt-btn-small" onClick={() => setCardLookEnabled(true)}>打开</button></div>
      )}
    </Section>
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

/** 记住的（或将要记住的）一套：预设、模型、全局世界书、全局正则，每样一行。 */
function ProfileLines({ p }: { p: Partial<EnvProfile> }) {
  return (
    <ul class="rbt-drift">
      <li>预设：{p.preset?.name ?? '没指定'}</li>
      <li>模型：{p.model ? modelLabel(p.model) : '没指定，用预设里的'}</li>
      <li>全局世界书：{p.globalWorlds?.length ? p.globalWorlds.map((w) => (worldExists(w) ? w : `${w}（已经删掉了）`)).join('、') : '全部关掉'}</li>
      <li>全局正则：{p.globalRegexEnabled?.length ? `打开 ${p.globalRegexEnabled.length} 条` : '全部关掉'}</li>
    </ul>
  );
}

/** 换卡时：自动切换开关、记住的配置、上次自动做了什么（可撤销）。 */
function SwitchSection({ avatar, isCurrent }: { avatar: string; isCurrent: boolean }) {
  void statusTick.value;
  const [auto, setAuto] = useState(settings().autoApplyEnv);
  void cardLookTick.value;
  const [busy, setBusy] = useState(false);
  const profile = settings().profiles[avatar];
  const report = isCurrent ? envReportForView(currentCharacter()) : null;
  const drift = report?.drift;
  const applied = lastApplied.value?.avatar === avatar ? lastApplied.value : null;
  const run = async (f: () => void | Promise<void>) => {
    setBusy(true);
    try { await f(); } finally { setBusy(false); statusTick.value++; archiveVersion.value++; }
  };
  const remembered = profile && (profile.globalWorlds || profile.globalRegexEnabled);

  return (
    <Section title="换到这张卡时">
      <div>
        <CheckRow
          label="自动换成这张卡的预设、世界书和正则"
          checked={auto}
          onChange={(v) => { settings().autoApplyEnv = v; saveSettings(); setAuto(v); }}
        />
        <CheckRow label="换成这张卡的美化" detail="回首页或换卡时，换回全局美化" checked={cardLookEnabled()} onChange={setCardLookEnabled} />
      </div>

      {applied && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">{applied.undone ? '已撤销：' : '刚才自动做了：'}</small>
          <ul class="rbt-drift">{applied.changes.map((t, i) => <li key={i}>{t}</li>)}</ul>
          {!applied.undone && <button class="rbt-btn rbt-btn-small rbt-self-start" disabled={busy} onClick={() => run(undoLastApply)}>撤销</button>}
        </div>
      )}

      {remembered ? (
        <div class="rbt-card-sub">
          <div class="rbt-row-between">
            <small class="rbt-muted">记住的配套{isCurrent && !drift?.count && <i class="fa-solid fa-circle-check rbt-inuse" title="和现在的一样" />}</small>
            {isCurrent && <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(() => {
              const before = forgetProfile();
              if (before) toast('success', `已不再记住「${before.cardName}」的世界书和正则。点这里撤销。`, 'RedBird 工具箱', { onclick: () => setProfile(avatar, before), timeOut: 8000 });
            })}>不再记住</button>}
          </div>
          <ProfileLines p={profile!} />
        </div>
      ) : isCurrent && (
        <div class="rbt-card-sub">
          {/* 点之前先列出会记住什么（推荐模型是角色档案里设的，记住时会留着） */}
          <small class="rbt-muted">记住后，每次换到这张卡都恢复成这一套：</small>
          <ProfileLines p={{ ...snapshotNow(), model: profile?.model }} />
          <button class="rbt-btn rbt-btn-small rbt-self-start" disabled={busy} onClick={() => run(() => rememberProfile())}>记住现在的配套</button>
        </div>
      )}
    </Section>
  );
}

/**
 * 底部常驻的一条：现在的设置和这张卡记住的不一样时，问要不要记住改动。
 * 只在正在聊的这张卡上、而且记住过设置时出现（别的卡比不了；没记住过的卡不提醒，免得每张卡都有一条）。
 */
function SaveBar({ avatar }: { avatar: string }) {
  void statusTick.value;
  void archiveVersion.value;
  const [busy, setBusy] = useState(false);
  const profile = settings().profiles[avatar];
  const remembered = !!profile && !!(profile.globalWorlds || profile.globalRegexEnabled);
  const d = remembered ? envReportForView(currentCharacter()).drift : null;
  // 只看世界书和正则：预设和推荐的不一样，「需要注意」和「推荐预设和模型」里已经在说，不在这里再说一遍
  const worlds = d ? d.worldsOn.length + d.worldsOff.length : 0;
  const regex = d ? d.regexOn.length + d.regexOff.length : 0;
  if (!worlds && !regex) return null;
  const what = [worlds && `世界书 ${worlds} 处`, regex && `正则 ${regex} 处`].filter(Boolean).join('、');
  const run = async (f: () => void | Promise<void>) => {
    setBusy(true);
    try { await f(); } finally { setBusy(false); statusTick.value++; archiveVersion.value++; }
  };
  return (
    <div class="rbt-save-bar" role="status">
      <span class="rbt-save-bar-text">{what}和记住的不一样</span>
      <span class="rbt-save-bar-actions">
        <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(() => applyProfile({ worldsAndRegexOnly: true }))}>恢复</button>
        <button class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={() => run(() => rememberProfile({ keepPreset: true }))}>记住改动</button>
      </span>
    </div>
  );
}

/** `avatar`: show this card (a detail inside 全局工具箱); otherwise the dock's current / picked card. */
export function CardPage({ avatar: forced, embedded }: { avatar?: string; embedded?: boolean } = {}) {
  void archiveVersion.value;
  void statusTick.value;
  const cur = currentCharacter();
  const avatar = forced ?? archiveTarget.value ?? cur?.avatar;
  useEffect(() => { if (avatar) void ensureFullCharacter(avatar); }, [avatar]);
  const f = avatar ? findChar(avatar) : null;
  if (!f) return <Empty>没有打开单人角色卡。在左栏「角色」里点一张卡，就能看到它的档案。</Empty>;
  const info = cardInfo(f.char);
  return (
    <div class="rbt-page rbt-card-page">
      {/* 第一块「卡面」：这是哪张卡、谁做的、去哪编辑，以及作者的链接和说明 */}
      <section class="rbt-card-section rbt-card-hero">
        <CardHeader info={info} embedded={embedded} />
        <div class="rbt-card-hero-source">
          <h3 class="rbt-card-section-title rbt-card-hero-sub">来源和作者说明</h3>
          <SourceSection info={info} bare />
        </div>
      </section>
      {info.isCurrent && <AttentionBox char={f.char} />}
      {/* 一列排下来：聊天工具箱里和全局工具箱里点进来的样子一样 */}
      <div class="rbt-page-group">
          <h2 class="rbt-page-group-title">配套</h2>
          <WorldSection info={info} />
          <PresetSection info={info} />
          <PersonaSection info={info} />
          <RegexSection info={info} />
          <CardScriptsSection avatar={info.avatar} />
          <ExtSection info={info} />
          <CardLookSection avatar={info.avatar} name={info.name} isCurrent={info.isCurrent} />
      </div>
      <SwitchSection avatar={info.avatar} isCurrent={info.isCurrent} />
      {info.isCurrent && <SaveBar avatar={info.avatar} />}
    </div>
  );
}
