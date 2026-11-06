import { useEffect, useMemo, useState } from 'preact/hooks';
import { flattenVars, formatValue, type VarChange } from '../core/vars';
import {
  chatLocalVars,
  collectFloors,
  findReferences,
  floorDiffs,
  loadTextSources,
  varsTick,
  wholeTreeReaders,
  type TextSource,
} from '../tools/vars/vars';
import { Chip, Empty } from './common';

const KIND: Record<VarChange['kind'], { label: string; color: string }> = {
  added: { label: '新增', color: '#2fbf8f' },
  removed: { label: '删除', color: '#e5484d' },
  changed: { label: '修改', color: '#f0a43a' },
};

function ChangeRow({ ch, sources }: { ch: VarChange; sources: TextSource[] | null }) {
  const refs = useMemo(() => (sources ? findReferences(ch.path, sources) : []), [ch.path, sources]);
  return (
    <div class="rbt-var-change">
      <div class="rbt-var-head">
        <Chip color={KIND[ch.kind].color}>{KIND[ch.kind].label}</Chip>
        <code class="rbt-var-path">{ch.path}</code>
      </div>
      <div class="rbt-var-values">
        {ch.kind !== 'added' && <span class="rbt-var-before">{formatValue(ch.before)}</span>}
        {ch.kind === 'changed' && <span class="rbt-arrow">→</span>}
        {ch.kind !== 'removed' && <span class="rbt-var-after">{formatValue(ch.after)}</span>}
      </div>
      {ch.desc && <div class="rbt-var-desc">{ch.desc}</div>}
      {sources && (
        <div class="rbt-var-refs">
          {refs.length
            ? <>用到它的：{refs.slice(0, 4).map((r, i) => <Chip key={i} color={r.source.kind === 'preset' ? '#8b7cf6' : '#2fbf8f'} title={`里面写了「${r.term}」`}>{r.source.label}</Chip>)}{refs.length > 4 && <small class="rbt-muted"> 等 {refs.length} 处</small>}</>
            : <small class="rbt-muted">世界书和预设里没有直接用到它</small>}
        </div>
      )}
    </div>
  );
}

function VarTree({ data, highlight }: { data: unknown; highlight: Set<string> }) {
  const [filter, setFilter] = useState('');
  const leaves = useMemo(() => [...flattenVars(data).values()], [data]);
  const shown = leaves.filter((l) => !filter || l.path.includes(filter) || formatValue(l.value).includes(filter));
  return (
    <div class="rbt-vartree">
      <input class="text_pole rbt-input" placeholder="搜索变量…" value={filter} onInput={(e) => setFilter((e.currentTarget as HTMLInputElement).value)} />
      <div class="rbt-vartree-list">
        {shown.slice(0, 500).map((l) => (
          <div key={l.path} class={`rbt-vartree-row ${highlight.has(l.path) ? 'changed' : ''}`} title={l.desc}>
            <code>{l.path}</code>
            <span>{formatValue(l.value, 200)}</span>
          </div>
        ))}
        {shown.length > 500 && <small class="rbt-muted">只显示前 500 项</small>}
      </div>
    </div>
  );
}

export function VarsView() {
  void varsTick.value; // re-render when chat variables change
  const floors = collectFloors();
  const diffs = floorDiffs(floors);
  const [selected, setSelected] = useState<number | null>(null);
  const [sources, setSources] = useState<TextSource[] | null>(null);
  const local = chatLocalVars();

  useEffect(() => {
    let alive = true;
    loadTextSources().then((s) => { if (alive) setSources(s); }).catch(() => setSources([]));
    return () => { alive = false; };
  }, [floors.length]);

  if (!diffs.length) {
    return (
      <div class="rbt-vars">
        <Empty>
          这个聊天还没有变量。<br />
          用 MVU 的卡在 AI 回复后会把变量存进每一楼，这里会显示每一轮变了什么。
        </Empty>
        {Object.keys(local).length > 0 && (
          <details class="rbt-section" open>
            <summary>聊天变量（/setvar）{Object.keys(local).length} 个</summary>
            <VarTree data={local} highlight={new Set()} />
          </details>
        )}
      </div>
    );
  }

  const current = diffs.find((d) => d.floor.index === selected) ?? diffs[diffs.length - 1];
  const changedPaths = new Set(current.changes.map((c) => c.path));
  const readers = sources ? wholeTreeReaders(sources) : [];

  return (
    <div class="rbt-vars">
      <div class="rbt-toolbar">
        <select class="text_pole rbt-select" value={current.floor.index} onChange={(e) => setSelected(Number((e.currentTarget as HTMLSelectElement).value))}>
          {[...diffs].reverse().map((d) => (
            <option key={d.floor.index} value={d.floor.index}>
              #{d.floor.index} {d.floor.name} · {d.prev ? `${d.changes.length} 处变化` : '初始值'}
            </option>
          ))}
        </select>
      </div>
      <div class="rbt-summary">
        <div class="rbt-summary-line">
          {current.prev
            ? <>第 <b>{current.floor.index}</b> 楼比第 {current.prev.index} 楼：<b>{current.changes.length}</b> 处变化</>
            : <>第 <b>{current.floor.index}</b> 楼是第一个有变量的楼层，下面是初始值</>}
        </div>
        {readers.length > 0 && (
          <div class="rbt-hint">
            这些条目会把全部变量发给 AI，所以任何变化都会影响下一轮：
            {readers.slice(0, 5).map((r, i) => <Chip key={i} color="#2fbf8f">{r.label}</Chip>)}
          </div>
        )}
      </div>
      {current.changes.length > 0 && (
        <div class="rbt-var-changes">
          {current.changes.map((ch) => <ChangeRow key={ch.path} ch={ch} sources={sources} />)}
        </div>
      )}
      {/* 没有变化时直接展开完整变量，不留一块空盒子 */}
      <details class="rbt-section" key={`full-${current.floor.index}`} open={current.changes.length === 0}>
        <summary>这一楼的全部变量</summary>
        <VarTree data={current.floor.statData ?? current.floor.vars} highlight={changedPaths} />
      </details>
      {Object.keys(local).length > 0 && (
        <details class="rbt-section">
          <summary>聊天变量（/setvar）{Object.keys(local).length} 个</summary>
          <VarTree data={local} highlight={new Set()} />
        </details>
      )}
    </div>
  );
}
