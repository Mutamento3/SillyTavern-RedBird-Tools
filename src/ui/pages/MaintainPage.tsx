/**
 * 「维护」：偶尔才做的批量整理——补导入缺的世界书、接回找不到卡的档案、反查（推荐预设 / 共用世界书 /
 * 没被任何卡用的世界书）、各处正则的分布、档案的导出导入和世界书备份。原「角色档案 · 全部卡」的下半部分。
 */
import { useRef, useState } from 'preact/hooks';
import { ctx, saveSettings, settings } from '../../st/st';
import {
  allCharacters,
  archiveTarget,
  archiveVersion,
  buildOverview,
  cardInfo,
  cardsMissingWorld,
  currentPresetName,
  dropRecord,
  exportArchive,
  importAllMissingWorlds,
  importArchive,
  presetNames,
  presetRegexCount,
  relink,
  type CardInfo,
} from '../../tools/cards/cards';
import { Chip, SwitchRow } from '../common';
import { openView } from '../views';
import { BAD, OK, Section } from './parts';

/** Show another card's page (from a lookup list). */
export function openCard(avatar: string): void {
  archiveTarget.value = avatar;
  openView('card');
}

function CardLink({ info }: { info: CardInfo }) {
  return <a class="rbt-card-link" onClick={() => openCard(info.avatar)}>{info.name}</a>;
}

function BackupBox() {
  const [auto, setAuto] = useState(settings().autoImportWorld);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'merge' | 'overwrite'>('merge');
  const s = settings();
  const backups = s.worldBackups.slice(-5).reverse();
  const pickFile = (m: 'merge' | 'overwrite') => { setMode(m); fileRef.current?.click(); };
  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await importArchive(await file.text(), mode);
    } catch (err) {
      window.toastr?.error?.((err as Error).message, '导入失败');
    }
  };
  return (
    <Section title="设置与备份">
      <SwitchRow
        label="自动导入卡里的世界书"
        detail="打开一张卡时，如果它自带的世界书还没导入，就自动导入并绑定。不会覆盖已有的同名世界书。"
        checked={auto}
        onChange={(v) => { s.autoImportWorld = v; saveSettings(); setAuto(v); }}
      />
      <div class="rbt-card-sub">
        <small class="rbt-muted">你填的来源、说明、推荐预设和记住的配置，都和酒馆设置存在一起。换电脑或想留个底时，可以导出成一个文件。</small>
        <div class="rbt-row">
          <button class="rbt-btn rbt-btn-primary" onClick={() => exportArchive()}>导出档案</button>
          <button class="rbt-btn" onClick={() => pickFile('merge')}>导入并合并</button>
          <button class="rbt-btn" onClick={() => pickFile('overwrite')}>导入并覆盖</button>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} />
        </div>
        <small class="rbt-muted">合并：同一张卡留下较新的那份。覆盖：全部换成文件里的。</small>
      </div>
      {backups.length > 0 && (
        <div class="rbt-card-sub">
          <small class="rbt-muted">覆盖世界书前自动做的备份：</small>
          {backups.map((b) => <div key={b.file} title={`酒馆的 user/files 文件夹里：${b.file}`}><small>{new Date(b.at).toLocaleString()} 「{b.world}」</small></div>)}
        </div>
      )}
    </Section>
  );
}

export function MaintainPage() {
  void archiveVersion.value;
  const [busy, setBusy] = useState(false);
  const ov = buildOverview();
  const missing = cardsMissingWorld();
  const sharedWorlds = [...ov.byWorld.entries()].filter(([, cs]) => cs.length > 1);
  const presetRx = presetNames().map((p) => ({ p, n: presetRegexCount(p) })).filter((x) => x.n > 0);
  const cardRx = allCharacters().map(cardInfo).filter((c) => c.regex.total > 0).sort((a, b) => b.regex.total - a.regex.total);
  const curPreset = currentPresetName();

  return (
    <div class="rbt-page">
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <Section title="待处理">
            {!missing.length && !ov.orphans.length && <div class="rbt-ok">一切正常</div>}
            {missing.length > 0 && (
              <div class="rbt-warn rbt-row-between">
                <span>{missing.length} 张卡自带的世界书还没导入：{missing.map((m) => m.name).join('、')}</span>
                <button class="rbt-btn rbt-btn-primary rbt-btn-small" disabled={busy} onClick={async () => { setBusy(true); try { await importAllMissingWorlds(); } finally { setBusy(false); } }}>全部导入</button>
              </div>
            )}
            {ov.orphans.length > 0 && (
              <div class="rbt-warn">
                <div>{ov.orphans.length} 份档案找不到对应的卡。卡可能被删了，或重新导入后换了文件名。</div>
                {ov.orphans.map((o) => (
                  <div key={o.avatar} class="rbt-link-row">
                    <span>「{o.cardName}」<small class="rbt-muted">{o.avatar}</small></span>
                    {o.candidates.map((c) => <button key={c} class="rbt-btn rbt-btn-small" onClick={() => relink(o.avatar, c)}>转给「{c}」</button>)}
                    <button class="rbt-btn rbt-btn-small" onClick={async () => { if (await ctx().Popup?.show?.confirm?.('删除这份档案？', `「${o.cardName}」的来源、说明和记住的配置都会删除。`)) dropRecord(o.avatar); }}>删除</button>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <Section title="推荐预设" hint="哪些卡推荐了哪个预设，点卡名查看">
            {!ov.byPreset.size && <small class="rbt-muted">还没有卡设了推荐预设。</small>}
            {[...ov.byPreset.entries()].map(([p, cs]) => (
              <div key={p} class="rbt-lookup-row"><b>{p}</b>：{cs.map((c, i) => <span key={c.avatar}>{i > 0 && '、'}<CardLink info={c} /></span>)}</div>
            ))}
          </Section>
          <Section title="多张卡共用的世界书" hint={sharedWorlds.length ? `${sharedWorlds.length} 本` : undefined}>
            {!sharedWorlds.length && <small class="rbt-muted">没有。</small>}
            {sharedWorlds.map(([w, cs]) => (
              <div key={w} class="rbt-lookup-row"><b>{w}</b>：{cs.map((c, i) => <span key={c.avatar}>{i > 0 && '、'}<CardLink info={c} /></span>)}</div>
            ))}
          </Section>
          <Section title="没有卡在用的世界书" hint={ov.unusedWorlds.length ? `${ov.unusedWorlds.length} 本` : undefined}>
            {!ov.unusedWorlds.length && <small class="rbt-muted">没有。</small>}
            {ov.unusedWorlds.map((w) => (
              <div key={w.name} class="rbt-lookup-row">{w.name} {w.global && <Chip color={BAD} title="作为全局世界书开着，对所有卡生效">全局开着</Chip>}</div>
            ))}
          </Section>
        </div>
        <div class="rbt-page-group">
          <Section title="带正则的预设" hint="只在用这个预设时生效">
            {!presetRx.length && <div class="rbt-muted">没有。</div>}
            {presetRx.map(({ p, n }) => <div key={p} class="rbt-link-row"><span>{p}</span><b>{n} 条</b>{p === curPreset && <Chip color="#3d8bfd">正在用</Chip>}</div>)}
          </Section>
          <Section title="带正则的卡" hint="只对那张卡生效，点卡名查看">
            {!cardRx.length && <div class="rbt-muted">没有。</div>}
            {cardRx.map((c) => (
              <div key={c.avatar} class="rbt-link-row">
                <CardLink info={c} />
                <b>{c.regex.total} 条</b>
                {!c.regex.allowed && <Chip color={BAD}>未允许运行</Chip>}
              </div>
            ))}
          </Section>
          <BackupBox />
        </div>
      </div>
    </div>
  );
}
