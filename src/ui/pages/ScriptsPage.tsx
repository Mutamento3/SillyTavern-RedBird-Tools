/**
 * 全局工具箱 › 脚本：酒馆助手的脚本在这里开关。
 *
 * 左边「正在用的」：全局、当前预设、当前卡三组，每组最上面一个「允许运行」，下面是文件夹和脚本，各自一个勾选框。
 * 右边：所有带脚本的预设、带脚本的卡，点进去是那个预设 / 那张卡的详情（详情里也有同一块）。
 * 编辑脚本内容、新建、导入还是去酒馆助手（「编辑 ↗」）。
 */
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cardGroup, presetGroup, countRunning, countScripts, currentGroups, presetsWithScripts, cardsWithScripts, setGroupAllowed, setNodeEnabled, thInstalled, thTick, type ThGroup, type ThScript } from '../../tools/scripts/th';
import { CheckRow, Empty, NavRow, Tag } from '../common';
import { openScriptManager } from './GlobalPage';
import { Section } from './parts';
import { GLOBAL_TAB_LABELS, openDetail } from '../views';

const KIND_TITLE = (g: ThGroup) => (g.kind === 'global' ? '全局脚本' : g.kind === 'preset' ? `预设「${g.label}」的脚本` : `「${g.label}」的脚本`);
const KIND_HINT = (g: ThGroup) => (g.kind === 'global' ? '所有聊天都会运行' : g.kind === 'preset' ? '用这个预设时运行' : '和这张卡聊天时运行');

/**
 * 一行：图标、名字（下面一行灰字），左边一个勾选框；整行都能点。不能改的（别的卡）勾选框是灰的。
 * 脚本作者常把整段说明写进简介，手机上一条能占满一屏：灰字最多两行，写不下时右边一个箭头，点了展开 / 收起。
 */
function CheckLine({ icon, name, sub, checked, dim, disabled, nested, onChange }: {
  icon: string; name: string; sub?: string; checked: boolean; dim?: boolean; disabled?: boolean; nested?: boolean; onChange: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const subRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = subRef.current;
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1);
  }, [sub, open]);
  return (
    <label class={`rbt-check-row rbt-script-row ${dim ? 'off' : ''} ${nested ? 'nested' : ''} ${disabled ? 'disabled' : ''}`}>
      <input type="checkbox" class="rbt-cb" checked={checked} disabled={disabled} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
      <i class={`fa-solid ${icon} fa-fw rbt-script-icon`} aria-hidden="true" />
      <span class="rbt-check-text"><span>{name}</span>{sub && <small ref={subRef} class={open ? '' : 'rbt-clamp2'}>{sub}</small>}</span>
      {(long || open) && (
        <button type="button" class="rbt-script-more" aria-expanded={open} aria-label={open ? '收起说明' : '展开说明'} title={open ? '收起说明' : '展开说明'}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}>
          <i class={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
        </button>
      )}
    </label>
  );
}

function scriptSub(s: ThScript): string {
  return [s.buttons > 0 ? `${s.buttons} 个按钮` : '', s.info].filter(Boolean).join(' · ');
}

function NodeRows({ g }: { g: ThGroup }) {
  const set = (id: string) => (v: boolean) => { void setNodeEnabled(g, id, v); };
  const rows: preact.JSX.Element[] = [];
  for (const n of g.nodes) {
    if (n.type === 'folder') {
      rows.push(<CheckLine key={n.id} icon="fa-folder" name={n.name} sub={`文件夹 · ${n.scripts.length} 个脚本`} checked={n.enabled} dim={!g.allowed || !n.enabled} disabled={!g.editable} onChange={set(n.id)} />);
      for (const sc of n.scripts) rows.push(<CheckLine key={sc.id} nested icon="fa-code" name={sc.name} sub={scriptSub(sc)} checked={sc.enabled} dim={!g.allowed || !n.enabled || !sc.enabled} disabled={!g.editable} onChange={set(sc.id)} />);
    } else {
      rows.push(<CheckLine key={n.id} icon="fa-code" name={n.name} sub={scriptSub(n)} checked={n.enabled} dim={!g.allowed || !n.enabled} disabled={!g.editable} onChange={set(n.id)} />);
    }
  }
  return <div class="rbt-script-list">{rows}</div>;
}

/** 一组脚本：最上面「允许运行」，下面是文件夹和脚本；右上角「编辑 ↗」去酒馆助手。预设详情、角色档案里也用这一块。 */
export function ScriptGroupSection({ g, title, hint }: { g: ThGroup; title?: string; hint?: string }) {
  const total = countScripts(g.nodes);
  const running = countRunning(g.nodes, g.allowed);
  return (
    <Section title={title ?? KIND_TITLE(g)} hint={hint ?? `${KIND_HINT(g)}${total ? ` · ${running} / ${total} 个在运行` : ''}`} actions={
      // 别的卡：酒馆助手只能编辑正在聊的卡，所以不放「编辑」
      g.editable ? <button type="button" class="rbt-btn rbt-btn-small" title="在酒馆助手里编辑、新建或导入脚本" onClick={openScriptManager}>编辑 ↗</button> : undefined
    }>
      {total === 0 ? <small class="rbt-muted">没有脚本。</small> : <>
        <CheckRow label="允许运行" detail={g.allowed ? '关掉后，下面的脚本都不运行。' : '现在关着，下面的脚本都不运行。'} checked={g.allowed} onChange={(v) => setGroupAllowed(g, v)} />
        {!g.editable && <small class="rbt-muted">要开关单个脚本，先打开这张卡。</small>}
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
        没装酒馆助手（JS-Slash-Runner），所以没有脚本。
        <br />
        <a href="https://github.com/N0VI028/JS-Slash-Runner" target="_blank" rel="noopener noreferrer">去看看酒馆助手 ↗</a>
      </Empty>
    );
  }
  const groups = currentGroups();
  const presets = presetsWithScripts();
  const cards = cardsWithScripts();
  const back = GLOBAL_TAB_LABELS.scripts;
  return (
    <div class="rbt-page">
      <div class="rbt-page-cols">
        <div class="rbt-page-group">
          <h2 class="rbt-page-group-title">正在用的</h2>
          {/* 全局一直显示；当前预设、当前卡没有脚本就不占一块 */}
          {groups.filter((g) => g.kind === 'global' || countScripts(g.nodes) > 0).map((g) => <ScriptGroupSection key={g.kind} g={g} />)}
        </div>
        <div class="rbt-page-group">
          <Section title="带脚本的预设" hint="点进去可以开关，不用先换过去">
            {presets.map((p) => (
              <NavRow key={p.name} title={p.name} sub={`${p.count} 个脚本`} trailing={!p.allowed ? <Tag tone="bad">未允许运行</Tag> : groups.some((g) => g.kind === 'preset' && g.key === p.name) ? <Tag tone="accent">正在用</Tag> : undefined}
                onClick={() => openDetail({ kind: 'preset', name: p.name }, back)} />
            ))}
            {!presets.length && <small class="rbt-muted">没有。</small>}
          </Section>
          <Section title="带脚本的卡" hint="和那张卡聊天时运行">
            {cards.map((c) => (
              <NavRow key={c.avatar} title={c.name} sub={`${c.count} 个脚本`} trailing={!c.allowed ? <Tag tone="bad">未允许运行</Tag> : undefined}
                onClick={() => openDetail({ kind: 'card', avatar: c.avatar }, back)} />
            ))}
            {!cards.length && <small class="rbt-muted">没有。</small>}
          </Section>
        </div>
      </div>
    </div>
  );
}

/** 预设详情里用：这个预设带的脚本（没有就不显示）。不用先换到这个预设也能开关。 */
export function PresetScriptsSection({ name }: { name: string }) {
  void thTick.value;
  if (!thInstalled()) return null;
  const g = presetGroup(name);
  if (!countScripts(g.nodes)) return null;
  return <ScriptGroupSection g={g} title="预设带的脚本" />;
}

/** 角色档案里用：这张卡的脚本（没有就不显示）。 */
export function CardScriptsSection({ avatar }: { avatar: string }) {
  void thTick.value;
  if (!thInstalled()) return null;
  const g = cardGroup(avatar);
  if (!g || !countScripts(g.nodes)) return null;
  return <ScriptGroupSection g={g} title="角色脚本" />;
}
