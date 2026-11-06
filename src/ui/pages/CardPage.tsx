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
import { Empty, SwitchRow } from '../common';
import { CardHeader, ExtSection, PresetSection, RegexSection, Section, SourceSection, WorldSection } from './parts';

function AttentionBox({ char }: { char: unknown }) {
  void statusTick.value;
  const [busy, setBusy] = useState(false);
  const issues = cardIssues(char);
  if (!issues.length) return <div class="rbt-attn ok"><i class={`fa-solid ${LEVEL_ICON.ok}`} /> 这张卡需要的都已就位</div>;
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
    <Section title="换卡时" hint="切到这张卡时，把世界书、正则和预设换成它的配置">
      <SwitchRow
        label="自动切换"
        detail="对所有卡生效。关掉后只提醒，不会自动改。"
        checked={auto}
        onChange={(v) => { settings().autoApplyEnv = v; saveSettings(); setAuto(v); }}
      />

      {applied && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">{applied.undone ? '已撤销刚才的自动切换：' : `${new Date(applied.at).toLocaleTimeString()} 切到这张卡时，自动做了这些：`}</small>
          <ul class="rbt-drift">{applied.changes.map((t, i) => <li key={i}>{t}</li>)}</ul>
          {!applied.undone && <button class="rbt-btn rbt-btn-small" disabled={busy} onClick={() => run(undoLastApply)}>撤销</button>}
        </div>
      )}

      <div class="rbt-card-sub">
        {remembered ? (
          <>
            <small class="rbt-muted">记住的配置（{new Date(profile!.savedAt).toLocaleString()}）：</small>
            <ul class="rbt-drift">
              <li>全局世界书：{profile!.globalWorlds?.length ? profile!.globalWorlds.join('、') : '全部关'}</li>
              <li>全局正则：{profile!.globalRegexEnabled?.length ? `开 ${profile!.globalRegexEnabled.length} 条` : '全部关'}</li>
              {profile!.preset && <li>预设：{profile!.preset.name}</li>}
            </ul>
            {isCurrent && (drift?.count
              ? <div class="rbt-warn rbt-row-between"><span>现在的设置和记住的有 {drift.count} 处不同。</span><button class="rbt-btn rbt-btn-small rbt-btn-primary" disabled={busy} onClick={() => run(applyProfile)}>恢复记住的</button></div>
              : <small class="rbt-ok">和现在的设置一致 ✓</small>)}
            {isCurrent && (
              <div class="rbt-row">
                <button class="rbt-btn" disabled={busy} onClick={() => run(rememberProfile)}>改为记住现在的</button>
                <button class="rbt-btn" disabled={busy} onClick={() => run(forgetProfile)}>不再记住</button>
              </div>
            )}
          </>
        ) : (
          <>
            <small class="rbt-muted">
              还没记住这张卡的配置。现在切到这张卡时，只会关掉别的卡的世界书和正则，并换上推荐预设。
            </small>
            {isCurrent
              ? <div class="rbt-row"><button class="rbt-btn rbt-btn-primary" disabled={busy} onClick={() => run(rememberProfile)}>记住现在的配置</button></div>
              : <small class="rbt-muted">打开这张卡后才能记住它的配置。</small>}
          </>
        )}
      </div>
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
      <CardHeader info={info} embedded={embedded} />
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
