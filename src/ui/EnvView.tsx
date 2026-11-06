import { useEffect, useState } from 'preact/hooks';
import { saveSettings, settings } from '../st/st';
import { applyProfile, envReport, forgetProfile, refreshEnv, rememberProfile, type EnvItem, type EnvSubItem, type Scope } from '../tools/env/env';
import { Chip, Empty, Toggle } from './common';

const SCOPES: { scope: Scope; title: string; hint: string }[] = [
  { scope: 'global', title: '全局', hint: '对所有卡都生效，最容易串味' },
  { scope: 'preset', title: '预设', hint: '只要用这个预设就生效，换卡不会变' },
  { scope: 'persona', title: '用户设定', hint: '跟着你的用户设定走，换卡不会变' },
  { scope: 'character', title: '角色卡', hint: '跟着这张卡走，换卡时自动切换' },
  { scope: 'chat', title: '聊天', hint: '只在这个聊天里生效' },
];

const KIND_LABEL: Record<EnvItem['kind'], string> = {
  worldbook: '世界书', regex: '正则', script: '脚本', extension: '扩展', preset: '预设',
};

function ItemRow({ item }: { item: EnvItem }) {
  const [busy, setBusy] = useState(false);
  const onToggle = async (on: boolean) => {
    if (!item.toggle) return;
    setBusy(true);
    try {
      await item.toggle(on);
    } finally {
      setBusy(false);
      refreshEnv();
    }
  };
  const body = (
    <div class={`rbt-env-item ${item.enabled ? '' : 'off'}`}>
      <Chip>{KIND_LABEL[item.kind]}</Chip>
      <span class="rbt-env-name">{item.name}</span>
      {item.leaks && item.enabled && <Chip color="#e5484d" title="换卡后它还会继续生效">会串味</Chip>}
      {item.misplaced && <Chip color="#f0a43a" title={`在「角色档案」里标记为${item.misplaced}`}>不属于这张卡</Chip>}
      {item.detail && <small class="rbt-muted">{item.detail}</small>}
      {item.toggle && (
        <span class="rbt-env-toggle">
          <small class={item.enabled ? 'rbt-ok' : 'rbt-muted'}>{busy ? '…' : item.enabled ? '已开启' : '已关闭'}</small>
          <Toggle checked={item.enabled} onChange={onToggle} title="点击开 / 关" />
        </span>
      )}
    </div>
  );
  if (item.subItems?.length) {
    return (
      <details class="rbt-env-details">
        <summary>{body}</summary>
        <SubItemList items={item.subItems} groupOff={!item.enabled} />
      </details>
    );
  }
  if (!item.children?.length) return body;
  return (
    <details class="rbt-env-details">
      <summary>{body}</summary>
      <div class="rbt-env-children">{item.children.map((c, i) => <div key={i}>{c}</div>)}</div>
    </details>
  );
}

function SubItemRow({ sub }: { sub: EnvSubItem }) {
  const [busy, setBusy] = useState(false);
  const onToggle = async (on: boolean) => {
    setBusy(true);
    try {
      await sub.toggle(on);
    } finally {
      setBusy(false);
      refreshEnv();
    }
  };
  return (
    <div class={`rbt-sub-item ${sub.enabled ? '' : 'off'}`}>
      <span class="rbt-sub-name">{sub.name}</span>
      {sub.detail && <small class="rbt-muted">{sub.detail}</small>}
      <span class="rbt-env-toggle">
        <small class={sub.enabled ? 'rbt-ok' : 'rbt-muted'}>{busy ? '…' : sub.enabled ? '开' : '关'}</small>
        <Toggle checked={sub.enabled} onChange={onToggle} title="点击开 / 关这一条" />
      </span>
    </div>
  );
}

function SubItemList({ items, groupOff }: { items: EnvSubItem[]; groupOff: boolean }) {
  const [filter, setFilter] = useState('');
  const [onlyOn, setOnlyOn] = useState(false);
  const shown = items.filter((s) => (!filter || s.name.includes(filter)) && (!onlyOn || s.enabled));
  return (
    <div class="rbt-sub-list">
      {groupOff && <div class="rbt-hint">总开关是关的，下面这些即使显示"开"也不会运行。</div>}
      {items.length > 10 && (
        <div class="rbt-sub-tools">
          <input class="text_pole rbt-input" placeholder="搜索正则名…" value={filter} onInput={(e) => setFilter((e.currentTarget as HTMLInputElement).value)} />
          <label class="rbt-check"><input type="checkbox" checked={onlyOn} onChange={(e) => setOnlyOn((e.currentTarget as HTMLInputElement).checked)} />只看开着的</label>
        </div>
      )}
      {shown.map((s) => <SubItemRow key={s.id} sub={s} />)}
      {!shown.length && <small class="rbt-muted">没有匹配的正则</small>}
    </div>
  );
}

export function EnvView() {
  const report = envReport.value;
  const [toastOn, setToastOn] = useState(settings().toastOnCardSwitch);
  useEffect(() => { refreshEnv(); }, []);
  if (!report) return <Empty>正在读取…</Empty>;

  const { drift, profile } = report;
  return (
    <div class="rbt-env">
      <div class="rbt-summary">
        <div class="rbt-summary-line">
          当前卡 <b>{report.cardName || '（未选择角色 / 群聊）'}</b>
          {report.presetName && <> · 预设 <b>{report.presetName}</b></>}
          <button class="rbt-btn rbt-btn-small" onClick={() => refreshEnv()}>刷新</button>
        </div>
        {report.avatar && (
          <div class="rbt-profile">
            {profile ? (
              <>
                <div>
                  {profile.globalWorlds ? <>已记住这张卡的环境（{new Date(profile.savedAt).toLocaleString()}）。</> : <>只记了推荐预设「{profile.preset?.name}」（在「角色档案」里设的）。</>}
                  {drift?.count ? <b class="rbt-danger">和现在有 {drift.count} 处不同：</b> : <span class="rbt-ok">和现在一致 ✓</span>}
                </div>
                {drift && drift.count > 0 && (
                  <ul class="rbt-drift">
                    {drift.preset && <li>预设应为 <b>{drift.preset}</b></li>}
                    {drift.worldsOff.map((w) => <li key={`wo${w}`}>关闭全局世界书 <b>{w}</b></li>)}
                    {drift.worldsOn.map((w) => <li key={`wn${w}`}>打开全局世界书 <b>{w}</b></li>)}
                    {drift.regexOff.map((w) => <li key={`ro${w}`}>关闭全局正则 <b>{w}</b></li>)}
                    {drift.regexOn.map((w) => <li key={`rn${w}`}>打开全局正则 <b>{w}</b></li>)}
                  </ul>
                )}
                <div class="rbt-row">
                  {drift && drift.count > 0 && <button class="rbt-btn rbt-btn-primary" onClick={() => applyProfile()}>一键恢复</button>}
                  <button class="rbt-btn" onClick={() => rememberProfile()}>用现在的环境覆盖</button>
                  <button class="rbt-btn" onClick={() => forgetProfile()}>忘掉</button>
                </div>
              </>
            ) : (
              <>
                <div>还没记住这张卡的环境。先把下面的全局世界书、全局正则、预设调成这张卡需要的样子，再点"记住"。以后换回这张卡时，如果不一样会提醒你，并能一键恢复。</div>
                <div class="rbt-row"><button class="rbt-btn rbt-btn-primary" onClick={() => rememberProfile()}>记住现在的环境</button></div>
              </>
            )}
          </div>
        )}
        <label class="rbt-check">
          <input type="checkbox" checked={toastOn} onChange={(e) => {
            const v = (e.currentTarget as HTMLInputElement).checked;
            settings().toastOnCardSwitch = v;
            saveSettings();
            setToastOn(v);
          }} />
          换卡时弹出提示
        </label>
      </div>
      {SCOPES.map(({ scope, title, hint }) => {
        const items = report.items.filter((i) => i.scope === scope);
        if (!items.length) return null;
        return (
          <div key={scope} class={`rbt-env-scope rbt-scope-${scope}`}>
            <div class="rbt-env-scope-head"><b>{title}</b> <small class="rbt-muted">{hint}</small></div>
            {items.map((i) => <ItemRow key={i.id} item={i} />)}
          </div>
        );
      })}
    </div>
  );
}
