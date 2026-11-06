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
import { Empty } from '../common';
import { CardHeader, ExtSection, PresetSection, RegexSection, Section, SourceSection, WorldSection } from './parts';

function AttentionBox({ char }: { char: unknown }) {
  void statusTick.value;
  const [busy, setBusy] = useState(false);
  const issues = cardIssues(char);
  if (!issues.length) return <div class="rbt-attn ok"><i class={`fa-solid ${LEVEL_ICON.ok}`} /> 配套环境都已就位</div>;
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
    <Section title="换卡时" hint="换到这张卡时，把全局世界书、全局正则、预设切成它的配套环境">
      <label class="rbt-check">
        <input type="checkbox" checked={auto} onChange={(e) => {
          const v = (e.currentTarget as HTMLInputElement).checked;
          settings().autoApplyEnv = v;
          saveSettings();
          setAuto(v);
        }} />
        换卡时自动切换（所有卡通用的开关；关掉后只提醒，不切换）
      </label>

      {applied && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">{applied.undone ? '已撤销换卡时的自动切换：' : `换到这张卡时自动做了这些（${new Date(applied.at).toLocaleTimeString()}）：`}</small>
          <ul class="rbt-drift">{applied.changes.map((t, i) => <li key={i}>{t}</li>)}</ul>
          {!applied.undone && <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(undoLastApply)}>撤销</button>}
        </div>
      )}

      <div class="rbt-card-sub">
        {remembered ? (
          <>
            <small class="rbt-muted">已记住这张卡的配置（{new Date(profile!.savedAt).toLocaleString()}）：</small>
            <ul class="rbt-drift">
              <li>全局世界书：{profile!.globalWorlds?.length ? profile!.globalWorlds.join('、') : '不开'}</li>
              <li>全局正则：{profile!.globalRegexEnabled?.length ? `开 ${profile!.globalRegexEnabled.length} 条` : '全部关掉'}</li>
              {profile!.preset && <li>预设：{profile!.preset.name}</li>}
            </ul>
            {isCurrent && (drift?.count
              ? <div class="rbt-warn rbt-row-between"><span>现在和记住的有 {drift.count} 处不同。</span><button class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={() => run(applyProfile)}>切回记住的</button></div>
              : <small class="rbt-ok">和现在一致 ✓</small>)}
            {isCurrent && (
              <div class="rbt-row">
                <button class="rbt-btn" disabled={busy} onClick={() => run(rememberProfile)}>用现在的配置覆盖</button>
                <button class="rbt-btn" disabled={busy} onClick={() => run(forgetProfile)}>忘掉</button>
              </div>
            )}
          </>
        ) : (
          <>
            <small class="rbt-muted">
              还没记住这张卡的全局配置。没记住时，换卡只做确定该做的事：关掉别的卡的世界书、关掉标了属于别的卡的全局正则、切到推荐预设。
            </small>
            {isCurrent
              ? <div class="rbt-row"><button class="rbt-btn rbt-btn-primary" disabled={busy} onClick={() => run(rememberProfile)}>记住现在的配置</button></div>
              : <small class="rbt-muted">打开这张卡之后才能记住它的配置。</small>}
          </>
        )}
      </div>
    </Section>
  );
}

export function CardPage() {
  void archiveVersion.value;
  void statusTick.value;
  const cur = currentCharacter();
  const avatar = archiveTarget.value ?? cur?.avatar;
  useEffect(() => { if (avatar) void ensureFullCharacter(avatar); }, [avatar]);
  const f = avatar ? findChar(avatar) : null;
  if (!f) return <Empty>现在没有打开角色卡（或者是群聊）。在左栏「角色」里点一张卡就能看它。</Empty>;
  const info = cardInfo(f.char);
  return (
    <div class="rbt-page">
      <CardHeader info={info} />
      {info.isCurrent && <AttentionBox char={f.char} />}
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <div class="rbt-page-group-title">配套环境</div>
          <WorldSection info={info} />
          <PresetSection info={info} />
          <RegexSection info={info} />
          <ExtSection info={info} />
        </div>
        <div class="rbt-page-group">
          <SourceSection info={info} />
          <SwitchSection avatar={info.avatar} isCurrent={info.isCurrent} />
        </div>
      </div>
    </div>
  );
}
