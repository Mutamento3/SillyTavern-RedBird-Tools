/**
 * 变量：重点是"这张卡在跟踪哪些变量、现在是多少"。
 * 按第一层分组列出所有变量的当前值；这一轮变了的，前面一个小点、值高亮、下面灰字写原来的值。
 * 点一行展开：变量说明、哪些世界书 / 预设条目用到它。可以切换楼层看当时的值。
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { flattenVars, formatValue, type Leaf, type VarChange } from '../core/vars';
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
import { Empty } from './common';

interface Row {
  path: string;
  /** Path without the group prefix. */
  name: string;
  value: unknown;
  desc?: string;
  change?: VarChange;
}

interface Group { key: string; rows: Row[]; changed: number }

function buildGroups(leaves: Leaf[], changes: VarChange[]): Group[] {
  const byPath = new Map(changes.map((c) => [c.path, c]));
  const groups = new Map<string, Group>();
  const add = (path: string, r: Omit<Row, 'name'>) => {
    const dot = path.indexOf('.');
    const key = dot > 0 ? path.slice(0, dot) : '';
    const g = groups.get(key) ?? { key, rows: [], changed: 0 };
    g.rows.push({ ...r, name: dot > 0 ? path.slice(dot + 1) : path });
    if (r.change) g.changed++;
    groups.set(key, g);
  };
  for (const l of leaves) add(l.path, { path: l.path, value: l.value, desc: l.desc, change: byPath.get(l.path) });
  // Removed this turn: still listed (greyed) so it doesn't silently vanish.
  for (const c of changes) if (c.kind === 'removed') add(c.path, { path: c.path, value: undefined, desc: c.desc, change: c });
  // Ungrouped first, then groups in their original order.
  return [...groups.values()].sort((a, b) => Number(!!a.key) - Number(!!b.key));
}

function VarRow({ r, sources }: { r: Row; sources: TextSource[] | null }) {
  const [open, setOpen] = useState(false);
  const refs = useMemo(() => (open && sources ? findReferences(r.path, sources) : []), [open, r.path, sources]);
  const ch = r.change;
  const removed = ch?.kind === 'removed';
  return (
    <div class={`rbt-vrow ${ch ? 'changed' : ''} ${removed ? 'removed' : ''} ${open ? 'open' : ''}`}>
      <button type="button" class="rbt-vrow-main" onClick={() => setOpen(!open)} title={r.desc || r.path}>
        <span class="rbt-vrow-mark" />
        <span class="rbt-vrow-name">{r.name}</span>
        <span class="rbt-vrow-value">{removed ? '已删除' : formatValue(r.value, open ? 2000 : 80)}</span>
      </button>
      {ch && !removed && (
        <div class="rbt-vrow-was">{ch.kind === 'added' ? '这一轮新加的' : <>原来 {formatValue(ch.before, 80)}</>}</div>
      )}
      {removed && <div class="rbt-vrow-was">原来 {formatValue(ch!.before, 80)}</div>}
      {open && (
        <div class="rbt-vrow-detail">
          {r.desc && <div class="rbt-vrow-desc">{r.desc}</div>}
          <div class="rbt-vrow-path">{r.path}</div>
          {sources === null
            ? <small class="rbt-muted">正在查找用到它的地方…</small>
            : refs.length
              ? <div class="rbt-vrow-refs"><small class="rbt-muted">用到它的：</small>{refs.slice(0, 8).map((x, i) => <span key={i} class="rbt-vrow-ref" title={`里面写了「${x.term}」`}>{x.source.label}</span>)}{refs.length > 8 && <small class="rbt-muted">等 {refs.length} 处</small>}</div>
              : <small class="rbt-muted">世界书和预设里没有直接写到它。</small>}
        </div>
      )}
    </div>
  );
}

function GroupBlock({ g, sources, onlyChanged }: { g: Group; sources: TextSource[] | null; onlyChanged: boolean }) {
  const rows = onlyChanged ? g.rows.filter((r) => r.change) : g.rows;
  if (!rows.length) return null;
  return (
    <section class="rbt-vgroup">
      {g.key && <h4 class="rbt-vgroup-title">{g.key}{g.changed > 0 && <span class="rbt-vgroup-badge">{g.changed} 项变了</span>}</h4>}
      <div class="rbt-vgroup-body">
        {rows.map((r) => <VarRow key={r.path} r={r} sources={sources} />)}
      </div>
    </section>
  );
}

function filterGroups(groups: Group[], q: string): Group[] {
  const query = q.trim().toLowerCase();
  if (!query) return groups;
  return groups
    .map((g) => ({ ...g, rows: g.rows.filter((r) => r.path.toLowerCase().includes(query) || formatValue(r.value, 400).toLowerCase().includes(query) || (r.desc ?? '').toLowerCase().includes(query)) }))
    .filter((g) => g.rows.length);
}

function LocalVars({ data }: { data: Record<string, unknown> }) {
  const leaves = useMemo(() => [...flattenVars(data).values()], [data]);
  if (!leaves.length) return null;
  return (
    <details class="rbt-vlocal">
      <summary>聊天变量（/setvar）{leaves.length} 个</summary>
      <div class="rbt-vgroup-body">
        {leaves.map((l) => (
          <div key={l.path} class="rbt-vrow">
            <div class="rbt-vrow-main static"><span class="rbt-vrow-mark" /><span class="rbt-vrow-name">{l.path}</span><span class="rbt-vrow-value">{formatValue(l.value, 120)}</span></div>
          </div>
        ))}
      </div>
    </details>
  );
}

export function VarsView() {
  void varsTick.value; // re-render when chat variables change
  const floors = collectFloors();
  const diffs = floorDiffs(floors);
  const [selected, setSelected] = useState<number | null>(null);
  const [sources, setSources] = useState<TextSource[] | null>(null);
  const [q, setQ] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const local = chatLocalVars();

  useEffect(() => {
    let alive = true;
    loadTextSources().then((s) => { if (alive) setSources(s); }).catch(() => setSources([]));
    return () => { alive = false; };
  }, [floors.length]);

  const current = diffs.find((d) => d.floor.index === selected) ?? diffs[diffs.length - 1];
  const latest = current && current === diffs[diffs.length - 1];
  const leaves = useMemo(() => (current ? [...flattenVars(current.floor.statData ?? current.floor.vars).values()] : []), [current]);
  const changes = current?.prev ? current.changes : [];
  const groups = useMemo(() => buildGroups(leaves, changes), [leaves, changes]);
  const shown = filterGroups(groups, q);

  if (!current) {
    return (
      <div class="rbt-vars">
        <Empty>
          这个聊天还没有变量。<br />
          用 MVU 的卡在 AI 回复后会把变量存进每一楼，这里会列出它在跟踪的所有变量和每一轮的变化。
        </Empty>
        <LocalVars data={local} />
      </div>
    );
  }

  const readers = sources ? wholeTreeReaders(sources) : [];
  const nChanged = changes.length;

  return (
    <div class="rbt-vars">
      <div class="rbt-vhead">
        <div class="rbt-vhead-line">
          <span class="rbt-vhead-count">跟踪 <b>{leaves.length}</b> 个变量</span>
          <span class="rbt-vhead-sub">
            {current.prev
              ? nChanged ? <>这一轮变了 <b class="rbt-accent">{nChanged}</b> 个</> : '这一轮没有变化'
              : '这是初始值'}
          </span>
          <select class="text_pole rbt-select rbt-vfloor" value={current.floor.index} title="看某一楼当时的变量" onChange={(e) => setSelected(Number((e.currentTarget as HTMLSelectElement).value))}>
            {[...diffs].reverse().map((d, i) => (
              <option key={d.floor.index} value={d.floor.index}>
                {i === 0 ? '最新 · ' : ''}第 {d.floor.index} 楼{d.prev ? (d.changes.length ? ` · 变了 ${d.changes.length} 个` : '') : ' · 初始值'}
              </option>
            ))}
          </select>
        </div>
        {!latest && <small class="rbt-muted">正在看第 {current.floor.index} 楼当时的值。<button type="button" class="rbt-linkbtn" onClick={() => setSelected(null)}>回到最新</button></small>}
        {readers.length > 0 && <small class="rbt-muted">「{readers.slice(0, 2).map((r) => r.label).join('」「')}」{readers.length > 2 ? ` 等 ${readers.length} 处` : ''}会把全部变量发给 AI，所以任何变化都会影响下一轮。</small>}
      </div>

      <div class="rbt-vtools">
        <label class="rbt-vsearch">
          <i class="fa-solid fa-magnifying-glass" />
          <input type="search" placeholder="搜索变量、值、说明" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
        </label>
        {nChanged > 0 && (
          <div class="rbt-vseg" role="tablist">
            <button type="button" class={!onlyChanged ? 'active' : ''} onClick={() => setOnlyChanged(false)}>全部</button>
            <button type="button" class={onlyChanged ? 'active' : ''} onClick={() => setOnlyChanged(true)}>只看变了的</button>
          </div>
        )}
      </div>

      {shown.map((g) => <GroupBlock key={g.key || '_'} g={g} sources={sources} onlyChanged={onlyChanged} />)}
      {!shown.length && <Empty>没有符合的变量。</Empty>}
      <LocalVars data={local} />
    </div>
  );
}
