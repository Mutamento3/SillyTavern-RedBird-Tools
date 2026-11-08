/**
 * 「这张卡」：一张卡的全部——需要注意的问题、来源与作者说明、配套环境（世界书 / 预设 / 正则与脚本 / 插件），
 * 以及换卡时的自动切换。合并了原来的「环境」弹窗、「角色档案 · 这张卡」和「换卡体检」里跟卡有关的部分。
 */
import { useEffect, useState } from 'preact/hooks';
import { currentCharacter, saveSettings, settings } from '../../st/st';
import { archiveTarget, archiveVersion, cardInfo, ensureFullCharacter, findChar } from '../../tools/cards/cards';
import { lastApplied, undoLastApply } from '../../tools/env/autoapply';
import { applyProfile, buildEnvReport, forgetProfile, rememberProfile } from '../../tools/env/env';
import { cardIssues, LEVEL_ICON, statusTick } from '../../shell/EnvStatus';
import { Empty, CheckRow } from '../common';
import { CardHeader, ExtSection, PresetSection, RegexSection, Section, SourceSection, WorldSection } from './parts';

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

/** 换卡时：自动切换开关、记住的配置、上次自动做了什么（可撤销）。 */
function SwitchSection({ avatar, isCurrent }: { avatar: string; isCurrent: boolean }) {
  void statusTick.value;
  const [auto, setAuto] = useState(settings().autoApplyEnv);
  const [busy, setBusy] = useState(false);
  const profile = settings().profiles[avatar];
  const report = isCurrent ? buildEnvReport() : null;
  const drift = report?.drift;
  const applied = lastApplied.value?.avatar === avatar ? lastApplied.value : null;
  const run = async (f: () => void | Promise<void>) => {
    setBusy(true);
    try { await f(); } finally { setBusy(false); statusTick.value++; archiveVersion.value++; }
  };
  const remembered = profile && (profile.globalWorlds || profile.globalRegexEnabled);

  return (
    <Section title="换到这张卡时">
      <CheckRow
        label="自动换成这张卡的预设、世界书和正则"
        checked={auto}
        onChange={(v) => { settings().autoApplyEnv = v; saveSettings(); setAuto(v); }}
      />

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
            <small class="rbt-muted">记住的设置{isCurrent && !drift?.count && <i class="fa-solid fa-circle-check rbt-inuse" title="和现在的设置一样" />}</small>
            {isCurrent && <span class="rbt-row">
              <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(rememberProfile)}>更新</button>
              <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(forgetProfile)}>不再记住</button>
            </span>}
          </div>
          <ul class="rbt-drift">
            <li>全局世界书：{profile!.globalWorlds?.length ? profile!.globalWorlds.join('、') : '全部关掉'}</li>
            <li>全局正则：{profile!.globalRegexEnabled?.length ? `打开 ${profile!.globalRegexEnabled.length} 条` : '全部关掉'}</li>
            {profile!.preset && <li>预设：{profile!.preset.name}</li>}
          </ul>
          {isCurrent && !!drift?.count && (
            <div class="rbt-differ"><span class="rbt-differ-text">有 {drift.count} 处和现在不一样</span><button class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={() => run(applyProfile)}>恢复</button></div>
          )}
        </div>
      ) : isCurrent && (
        <div class="rbt-card-sub">
          <button class="rbt-btn rbt-btn-small rbt-self-start" disabled={busy} onClick={() => run(rememberProfile)}>记住现在的设置</button>
          <small class="rbt-muted">记住后，每次换到这张卡都恢复成这一套。</small>
        </div>
      )}
    </Section>
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
    <div class="rbt-page">
      {/* 第一块「卡面」：这是哪张卡、谁做的、去哪编辑，以及作者的链接和说明 */}
      <section class="rbt-card-section rbt-card-hero">
        <CardHeader info={info} embedded={embedded} />
        <div class="rbt-card-hero-source">
          <h3 class="rbt-card-section-title rbt-card-hero-sub">来源和作者说明</h3>
          <SourceSection info={info} bare />
        </div>
      </section>
      {info.isCurrent && <AttentionBox char={f.char} />}
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <h2 class="rbt-page-group-title">配套环境</h2>
          <WorldSection info={info} />
          <PresetSection info={info} />
          <RegexSection info={info} />
          <ExtSection info={info} />
        </div>
        <div class="rbt-page-group">
          <SwitchSection avatar={info.avatar} isCurrent={info.isCurrent} />
        </div>
      </div>
    </div>
  );
}
