/**
 * 全局工具箱 › 脚本：酒馆助手的脚本在这里开关。
 *
 * 三个分段「全局 / 预设自带 / 角色卡自带」。全局：全局脚本。预设自带、角色卡自带：正在用的预设、正在聊的卡的脚本直接展开，
 * 最上面一个「允许运行」，下面是文件夹和脚本，各自一个开关；再下面列出其他带脚本的预设 / 卡，点进去是详情（详情里也有同一块）。
 * 编辑脚本内容、新建、导入还是去酒馆助手（「编辑脚本 ↗」）。
 */
import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { cardGroup, presetGroup, countRunning, countScripts, currentGroups, presetsWithScripts, cardsWithScripts, setGroupAllowed, setNodeEnabled, thInstalled, thTick, type ThGroup, type ThScript } from '../../tools/scripts/th';
import { guessFrontend } from '../../tools/scripts/frontend';
import { Empty, NavRow, Tag, Toggle } from '../common';
import { openScriptManager } from './GlobalPage';
import { Section } from './parts';
import { ScopePage } from './scope';
import { GLOBAL_TAB_LABELS, openDetail } from '../views';

const KIND_TITLE = (g: ThGroup) => (g.kind === 'global' ? '全局脚本' : g.kind === 'preset' ? `正在用的预设：${g.label}` : `正在聊的角色卡：${g.label}`);
const KIND_HINT = (g: ThGroup) => (g.kind === 'global' ? '酒馆助手（JS-Slash-Runner）的脚本，装了酒馆助手才会运行 · 所有聊天都运行' : g.kind === 'preset' ? '使用此预设时运行' : '与这个角色聊天时运行');

/**
 * 一行：图标、名字（下面一行灰字），行尾一个开关。不能改的（别的卡）开关是灰的。
 * 脚本作者常把整段说明写进简介，手机上一条能占满一屏：灰字最多两行，写不下时右边一个箭头，点了展开 / 收起。
 */
function CheckLine({ icon, name, sub, checked, dim, disabled, nested, onChange, fold }: {
  icon: string; name: string; sub?: string; checked: boolean; dim?: boolean; disabled?: boolean; nested?: boolean; onChange: (v: boolean) => void;
  /** 文件夹：右边一个箭头，收起 / 展开里面的脚本 */
  fold?: { open: boolean; onToggle: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const subRef = useRef<HTMLElement>(null);
  // 画完再量（useEffect）：画之前量，每一行都会让浏览器把整页样式重算一遍，换到带大美化的卡时会卡一下
  useEffect(() => {
    const el = subRef.current;
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1);
  }, [sub, open]);
  return (
    <div class={`rbt-script-row ${dim ? 'off' : ''} ${nested ? 'nested' : ''} ${disabled ? 'disabled' : ''}`}>
      <i class={`fa-solid ${icon} fa-fw rbt-script-icon`} aria-hidden="true" />
      <span class="rbt-check-text"><span>{name}</span>{sub && <small ref={subRef} class={open ? '' : 'rbt-clamp2'}>{sub}</small>}</span>
      {fold && (
        <button type="button" class="rbt-script-more" aria-expanded={fold.open} aria-label={fold.open ? `收起「${name}」` : `展开「${name}」`} title={fold.open ? '收起文件夹' : '展开文件夹'}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); fold.onToggle(); }}>
          <i class={`fa-solid ${fold.open ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
        </button>
      )}
      {!fold && (long || open) && (
        <button type="button" class="rbt-script-more" aria-expanded={open} aria-label={open ? '收起说明' : '展开说明'} title={open ? '收起说明' : '展开说明'}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}>
          <i class={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
        </button>
      )}
      <Toggle checked={checked} disabled={disabled} onChange={onChange} title={`开 / 关「${name}」`} />
    </div>
  );
}

/** 灰字：可能有前端 · 按钮「…」 · 脚本简介。前两样放最前面，简介再长也能看到。 */
function scriptSub(s: ThScript): string {
  const b = s.buttons;
  const btn = b.length ? `按钮${b.slice(0, 3).map((x) => `「${x}」`).join('')}${b.length > 3 ? ` 等 ${b.length} 个` : ''}` : '';
  return [guessFrontend(s.id, s.content) ? '可能有前端' : '', btn, s.info].filter(Boolean).join(' · ');
}

/** 文件夹展开 / 收起，按「组 + 文件夹」记住。没点过的：里面超过 5 个脚本就先收起来。 */
const folderOpen = signal<Record<string, boolean>>({});
const FOLD_OVER = 5;

export function NodeRows({ g }: { g: ThGroup }) {
  const set = (id: string) => (v: boolean) => { void setNodeEnabled(g, id, v); };
  const rows: preact.JSX.Element[] = [];
  for (const n of g.nodes) {
    if (n.type === 'folder') {
      const k = `${g.kind}:${g.key}:${n.id}`;
      const open = folderOpen.value[k] ?? n.scripts.length <= FOLD_OVER;
      const fold = n.scripts.length ? { open, onToggle: () => { folderOpen.value = { ...folderOpen.value, [k]: !open }; } } : undefined;
      rows.push(<CheckLine key={n.id} icon={open ? 'fa-folder-open' : 'fa-folder'} name={n.name} sub={`文件夹 · ${n.scripts.length} 个脚本`} checked={n.enabled} dim={!g.allowed || !n.enabled} disabled={!g.editable} onChange={set(n.id)} fold={fold} />);
      if (open) for (const sc of n.scripts) rows.push(<CheckLine key={sc.id} nested icon="fa-code" name={sc.name} sub={scriptSub(sc)} checked={sc.enabled} dim={!g.allowed || !n.enabled || !sc.enabled} disabled={!g.editable} onChange={set(sc.id)} />);
    } else {
      rows.push(<CheckLine key={n.id} icon="fa-code" name={n.name} sub={scriptSub(n)} checked={n.enabled} dim={!g.allowed || !n.enabled} disabled={!g.editable} onChange={set(n.id)} />);
    }
  }
  return <div class="rbt-script-list">{rows}</div>;
}

/** 「允许运行」是酒馆助手自己的安全开关：预设、角色卡里的脚本要玩家允许一次才跑。 */
const ALLOW: Record<ThGroup['kind'], [string, string]> = {
  global: ['允许全局脚本运行', '关掉后，全局脚本都不运行。'],
  preset: ['允许这个预设的脚本运行', '预设里的脚本是作者写的代码，酒馆助手要你允许后才会运行。'],
  character: ['允许这张卡的脚本运行', '角色卡里的脚本是作者写的代码，酒馆助手要你允许后才会运行。'],
};

/** 一组脚本最上面的「允许运行」：一行字 + 开关，和下面每个脚本的开关同一个样子。 */
export function AllowRow({ g }: { g: ThGroup }) {
  return (
    <div class="rbt-switch-row rbt-script-allow">
      <div class="rbt-switch-text"><span>{ALLOW[g.kind][0]}</span><small>{ALLOW[g.kind][1]}</small></div>
      <Toggle checked={g.allowed} onChange={(v) => { void setGroupAllowed(g, v); }} title={ALLOW[g.kind][0]} />
    </div>
  );
}

/** 一组脚本：最上面「允许运行」，下面是文件夹和脚本；右上角「编辑脚本 ↗」去酒馆助手。预设详情、角色档案里也用这一块。 */
export function ScriptGroupSection({ g, title, hint }: { g: ThGroup; title?: string; hint?: string }) {
  const total = countScripts(g.nodes);
  const running = countRunning(g.nodes, g.allowed);
  return (
    <Section title={title ?? KIND_TITLE(g)} hint={hint ?? `${KIND_HINT(g)}${total ? ` · ${running} / ${total} 个在运行` : ''}`} actions={
      // 别的卡：酒馆助手只能编辑正在聊的卡，所以不放「编辑」
      g.editable ? <button type="button" class="rbt-btn rbt-btn-small" title="在酒馆助手里编辑、新建或导入脚本" onClick={openScriptManager}>编辑脚本 <i class="fa-solid fa-arrow-up-right-from-square" /></button> : undefined
    }>
      {total === 0 ? <small class="rbt-muted">没有脚本。</small> : <>
        <AllowRow g={g} />
        {!g.editable && <small class="rbt-muted">打开这张角色卡后，可开关单个脚本。</small>}
        <NodeRows g={g} />
      </>}
    </Section>
  );
}

export function ScriptsPage() {
  void thTick.value;
  if (!thInstalled()) {
    return (
      <Empty>
        未安装酒馆助手（JS-Slash-Runner）。
        <br />
        <a href="https://github.com/N0VI028/JS-Slash-Runner" target="_blank" rel="noopener noreferrer">查看酒馆助手 ↗</a>
      </Empty>
    );
  }
  const groups = currentGroups();
  const presets = presetsWithScripts();
  const cards = cardsWithScripts();
  const back = GLOBAL_TAB_LABELS.scripts;
  const cur = (kind: ThGroup['kind']) => groups.find((g) => g.kind === kind && countScripts(g.nodes) > 0);
  const glob = groups.find((g) => g.kind === 'global')!;
  const curPreset = cur('preset'), curCard = cur('character');
  const runHint = (g: ThGroup, pre = '') => { const n = countScripts(g.nodes); return n ? `${pre}${n} 个脚本里 ${countRunning(g.nodes, g.allowed)} 个正在运行` : pre.replace(/ · $/, ''); };
  // 正在用的预设、正在聊的卡排第一；它们的脚本直接展开在上面，别的点进去看
  const otherPresets = presets.filter((p) => p.name !== curPreset?.key);
  const otherCards = cards.filter((c) => c.avatar !== curCard?.key);
  return (
    <ScopePage id="scripts" lead="这里管的是酒馆助手脚本。" nowCount={countScripts(glob.nodes)} presetCount={presets.length} cardCount={cards.length}
      now={<ScriptGroupSection g={glob} hint={runHint(glob, '所有聊天都会运行 · ')} />}
      presets={<>
        {curPreset && <ScriptGroupSection g={curPreset} hint={runHint(curPreset)} />}
        <Section title={curPreset ? '其他含脚本的预设' : '含脚本的预设'} hint="不用换预设，点进去就能开关">
          {otherPresets.map((p) => (
            <NavRow key={p.name} title={p.name} sub={`${p.count} 个脚本`} trailing={!p.allowed ? <Tag tone="bad">未允许运行</Tag> : undefined}
              onClick={() => openDetail({ kind: 'preset', name: p.name }, back, '预设脚本')} />
          ))}
          {!otherPresets.length && <small class="rbt-muted">{curPreset ? '没有其他含脚本的预设。' : '暂无含脚本的预设。'}</small>}
        </Section>
      </>}
      cards={<>
        {curCard && <ScriptGroupSection g={curCard} hint={runHint(curCard)} />}
        <Section title={curCard ? '其他含脚本的角色卡' : '含脚本的角色卡'} hint="和对应的角色聊天时运行">
          {otherCards.map((c) => (
            <NavRow key={c.avatar} title={c.name} sub={`${c.count} 个脚本`} trailing={!c.allowed ? <Tag tone="bad">未允许运行</Tag> : undefined}
              onClick={() => openDetail({ kind: 'card', avatar: c.avatar }, back, '脚本')} />
          ))}
          {!otherCards.length && <small class="rbt-muted">{curCard ? '没有其他含脚本的角色卡。' : '暂无含脚本的角色卡。'}</small>}
        </Section>
      </>}
    />
  );
}

/** 预设详情里用：这个预设带的脚本（没有就不显示）。不用先换到这个预设也能开关。 */
export function PresetScriptsSection({ name }: { name: string }) {
  void thTick.value;
  if (!thInstalled()) return null;
  const g = presetGroup(name);
  if (!countScripts(g.nodes)) return null;
  return <ScriptGroupSection g={g} title="预设脚本" />;
}

