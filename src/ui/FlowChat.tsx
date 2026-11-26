/**
 * 花费明细 ›「整段聊天」那一组：花费、上下文、用时，每一楼一根柱子（dev/信息流-用量和花费-方案.md，第三步）。
 * 数据是每一楼存在聊天记录里的用量（core/usage.ts floorStats），打开时读一遍，不额外请求。
 * 柱子：一楼一根，整列都能点；点了出这一楼的数字，其余变淡。超过平均一半以上的标橙，图例里写明。
 */
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { floorStats, fmtDuration, fmtMoney, type FloorStat } from '../core/usage';
import { captures, flowFocus } from '../tools/flow/capture';
import { usageTick } from '../tools/flow/usage';
import { ctx } from '../st/st';
import { fmtTokens } from './common';

const C_REPLY = 'var(--rbd-accent, #0a84ff)';
const C_PLUGIN = 'color-mix(in srgb, var(--t1) 45%, transparent)';
const C_HOT = 'var(--warnc, #e0a040)';
const C_CACHE = 'color-mix(in srgb, var(--rbd-accent, #0a84ff) 45%, var(--t1))';
const C_WAIT = 'color-mix(in srgb, var(--rbd-accent, #0a84ff) 25%, var(--t1))';
const C_THINK = 'color-mix(in srgb, var(--rbd-accent, #0a84ff) 55%, var(--t1))';
/** 一屏最多几根柱子，多了分页 */
const PAGE = 60;

interface Bar { floor: number; segs: { v: number; color: string }[]; hot: boolean }

/** 这段聊天每一楼的统计。聊天变了、记了新用量时重算。 */
export function useFloors(): FloorStat[] {
  void usageTick.value;
  const n = ctx().chat?.length ?? 0;
  return useMemo(() => floorStats(ctx().chat ?? []), [n, usageTick.value]);
}

/** 这一楼有抓到的那一轮（这次打开酒馆以后发的）：可以跳到「这一轮」看明细。 */
const roundOf = (floor: number) => captures.value.find((c) => c.targetFloor === floor && c.genType !== 'quiet' && c.genType !== 'preview');

/** 图例：色块 + 名字。图里的横线（平均 / 上限）由 Bars 自己写在图下面。 */
function Legend({ items }: { items: [string, string][] }) {
  return <div class="rbt-legend2">{items.map(([c, t]) => <span key={t}><i class="rbt-swatch" style={{ background: c }} />{t}</span>)}</div>;
}

/**
 * 柱状图。lines：横线（平均 / 上限），按同一个刻度画。detail：选中一楼时下面显示的几行。
 * 楼多（超过 60）时上面有「最近 60 楼 | 全部」：
 * - 最近 60 楼：一楼一根；
 * - 全部：所有楼平均分成不超过 60 段，一段一根（agg = sum：这段加起来；avg：这段的平均），点一段放大看这几楼。
 */
function Bars({ bars, lines, detail, selected, onSelect, agg }: {
  bars: Bar[];
  /** 横线：name「平均」「上限」，fmt 把数值写成字 */
  lines: { v: number; name: string; fmt: (v: number) => string; dashed?: boolean }[];
  detail: (floor: number) => ComponentChildren;
  selected: number | null;
  onSelect: (floor: number | null) => void;
  agg: 'sum' | 'avg';
}) {
  const many = bars.length > PAGE;
  const [mode, setMode] = useState<'recent' | 'all'>('recent');
  /** 放大看的那一段（bars 的下标，左闭右开） */
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const size = Math.ceil(bars.length / PAGE);
  const selIdx = selected == null ? -1 : bars.findIndex((b) => b.floor === selected);
  // 从排行里点了一楼、它不在眼前：放大到它所在的那一段
  const visible = (i: number) => (zoom ? i >= zoom[0] && i < zoom[1] : mode === 'recent' ? i >= bars.length - PAGE : false);
  const range: [number, number] | null = !many ? null : zoom ?? (selIdx >= 0 && !visible(selIdx) ? [Math.floor(selIdx / size) * size, Math.min(bars.length, Math.floor(selIdx / size) * size + size)] : null);
  const binned = many && !range && mode === 'all';
  const total = (b: Bar) => b.segs.reduce((n, s) => n + s.v, 0);
  let shown: (Bar & { to?: number; at?: number })[];
  if (!many) shown = bars;
  else if (range) shown = bars.slice(range[0], range[1]);
  else if (mode === 'recent') shown = bars.slice(-PAGE);
  else {
    const bins = [];
    for (let k = 0; k * size < bars.length; k++) {
      const chunk = bars.slice(k * size, (k + 1) * size);
      const segs = chunk[0].segs.map((s, si) => ({ color: s.color, v: chunk.reduce((n, b) => n + b.segs[si].v, 0) / (agg === 'avg' ? chunk.length : 1) }));
      bins.push({ floor: chunk[0].floor, to: chunk[chunk.length - 1].floor, at: k * size, segs, hot: false });
    }
    const mean = bins.reduce((n, b) => n + total(b), 0) / bins.length;
    for (const b of bins) b.hot = total(b) > mean * 1.5;
    shown = bins;
  }
  // 「全部」里一根是一段：加起来的那种（花费），平均线换成「平均每 N 楼」；平均的那种（上下文、用时）不用换
  const drawn = (binned && agg === 'sum' ? lines.map((l) => ({ ...l, v: l.v * size, name: `${l.name}每 ${size} 楼` })) : lines).map((l) => ({ ...l, label: `${l.name} ${l.fmt(l.v)}` }));
  const max = Math.max(...shown.map(total), ...drawn.map((l) => l.v), 1e-9);
  const h = (v: number) => `${(v / max) * 100}%`;
  const pick = (b: (typeof shown)[number]) => {
    if (b.to != null) { setZoom([b.at!, Math.min(bars.length, b.at! + size)]); onSelect(null); return; }
    onSelect(b.floor === selected ? null : b.floor);
  };
  return (
    <div class="rbt-chart">
      {many && (
        <div class="rbt-chart-pages">
          {range
            ? <><button type="button" class="rbt-linkbtn" onClick={() => { setZoom(null); setMode('all'); onSelect(null); }}>‹ 全部</button><span>第 {shown[0].floor}–{shown[shown.length - 1].floor} 楼</span></>
            : <span class="rbt-seg2" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'recent'} class={mode === 'recent' ? 'on' : ''} onClick={() => { setMode('recent'); onSelect(null); }}>最近 {PAGE} 楼</button>
              <button type="button" role="tab" aria-selected={mode === 'all'} class={mode === 'all' ? 'on' : ''} onClick={() => { setMode('all'); onSelect(null); }}>全部</button>
            </span>}
          {binned && <span>一根是 {size} 楼{agg === 'avg' ? '的平均' : '加起来'}，点一根放大</span>}
        </div>
      )}
      <div class={`rbt-bars ${selected != null ? 'picked' : ''}`}>
        {drawn.map((l) => (
          <div key={l.label} class={`rbt-bars-line ${l.dashed ? 'dashed' : ''}`} style={{ bottom: h(l.v) }} />
        ))}
        {shown.map((b) => (
          <button key={b.floor} type="button" class={`rbt-bar ${b.floor === selected ? 'on' : ''}`}
            aria-label={b.to != null ? `第 ${b.floor}–${b.to} 楼` : `第 ${b.floor} 楼`} aria-pressed={b.floor === selected} onClick={() => pick(b)}>
            <span class="rbt-bar-stack" style={{ height: h(total(b)) }}>
              {b.segs.map((s, i) => <i key={i} style={{ height: `${total(b) ? (s.v / total(b)) * 100 : 0}%`, background: b.hot ? C_HOT : s.color }} />)}
            </span>
          </button>
        ))}
      </div>
      {drawn.length > 0 && <div class="rbt-legend2">{drawn.map((l) => <span key={l.label}><i class={`rbt-swatch line ${l.dashed ? 'dashed' : ''}`} />{l.label}</span>)}</div>}
      {selected != null && (
        <div class="rbt-chart-detail">
          {detail(selected)}
          {roundOf(selected) && <button type="button" class="rbt-linkbtn" onClick={() => { flowFocus.value = selected; }}>看这一轮的明细</button>}
        </div>
      )}
    </div>
  );
}

/** 排行（最贵 / 最慢 / 发送最多的 5 次）：收起来，点开才看；点一行等于点那根柱子。 */
function Top({ title, rows, onSelect }: { title: string; rows: { floor: number; value: string; sub?: string }[]; onSelect: (floor: number) => void }) {
  if (!rows.length) return null;
  return (
    <details class="rbt-top">
      <summary>{title}</summary>
      {rows.map((r) => (
        <button key={r.floor} type="button" class="rbt-top-row" onClick={() => onSelect(r.floor)}>
          <span>第 {r.floor} 楼{r.sub && <small>{r.sub}</small>}</span><b>{r.value}</b>
        </button>
      ))}
    </details>
  );
}

const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ---------------------------------------------------------------- 花费 ---

/** 整段聊天的花费图：一楼一根（这一楼所有回复版本 + 插件），柱子加起来就是上面的总数。 */
export function CostChart() {
  const floors = useFloors().filter((f) => f.cost != null);
  const [sel, setSel] = useState<number | null>(null);
  if (floors.length < 2) return null;
  const avg = avgOf(floors.map((f) => f.cost!));
  const bars: Bar[] = floors.map((f) => ({
    floor: f.floor,
    segs: [{ v: Math.max(0, f.cost! - f.side), color: C_REPLY }, { v: f.side, color: C_PLUGIN }],
    hot: f.cost! > avg * 1.5,
  }));
  const byFloor = new Map(floors.map((f) => [f.floor, f]));
  const hasSide = floors.some((f) => f.side > 0);
  const costLines = [{ v: avg, name: '平均', fmt: fmtMoney }];
  return (
    <>
      <Bars bars={bars} lines={costLines} agg="sum" selected={sel} onSelect={setSel}
        detail={(n) => { const f = byFloor.get(n)!; return (<>
          <b>第 {n} 楼 · {fmtMoney(f.cost!)}</b>
          <small>{[`发送 ${fmtTokens(f.input)}`, f.cached ? `缓存 ${fmtTokens(f.cached)}` : '', f.side ? `插件在后台 ${fmtMoney(f.side)}` : ''].filter(Boolean).join(' · ')}</small>
          {f.model && <small>{f.model}</small>}
        </>); }} />
      <Legend items={[[C_REPLY, '回复'], ...(hasSide ? [[C_PLUGIN, '插件在后台'] as [string, string]] : []), [C_HOT, '比平均贵一半以上']]} />
      <Top title="最贵的 5 次" onSelect={setSel}
        rows={[...floors].sort((a, b) => b.cost! - a.cost!).slice(0, 5).map((f) => ({ floor: f.floor, value: fmtMoney(f.cost!) }))} />
    </>
  );
}

// -------------------------------------------------------------- 上下文 ---

/** 整段聊天的上下文：每一轮发了多少（现在显示的这一版），分缓存和全价；上限画一条虚线。 */
export function ContextChart() {
  const floors = useFloors().filter((f) => f.input > 0);
  const [sel, setSel] = useState<number | null>(null);
  if (floors.length < 2) return <p class="rbt-sec-note">发两轮以上才有这张图。</p>;
  const avg = avgOf(floors.map((f) => f.input));
  const withCache = floors.filter((f) => f.cached != null);
  const cacheWorks = floors.some((f) => (f.cached ?? 0) > 0);
  const share = withCache.length ? Math.round((withCache.reduce((n, f) => n + f.cached!, 0) / withCache.reduce((n, f) => n + f.input, 0)) * 100) : null;
  const s = ctx().chatCompletionSettings;
  const limit = ctx().mainApi === 'openai' ? Number(s?.openai_max_context) || 0 : 0;
  const maxIn = Math.max(...floors.map((f) => f.input));
  // 上限比最高的柱子高太多就不画（不然柱子都挤在底下）
  const lines = limit && limit <= maxIn * 1.6 ? [{ v: limit, name: '上限', fmt: fmtTokens, dashed: true }] : [];
  const bars: Bar[] = floors.map((f) => {
    const c = Math.min(f.cached ?? 0, f.input);
    return { floor: f.floor, segs: [{ v: c, color: C_CACHE }, { v: f.input - c, color: C_REPLY }], hot: cacheWorks && f.cached != null && c < f.input * 0.5 };
  });
  const byFloor = new Map(floors.map((f) => [f.floor, f]));
  return (
    <>
      <div class="rbt-big"><b>{fmtTokens(Math.round(avg))}<small>tokens</small></b><span>{share != null ? `每轮平均发送，其中缓存占 ${share}%` : '每轮平均发送'}</span></div>
      <Bars bars={bars} lines={lines} agg="avg" selected={sel} onSelect={setSel}
        detail={(n) => { const f = byFloor.get(n)!; const c = f.cached ?? 0; return (<>
          <b>第 {n} 楼 · {fmtTokens(f.input)}</b>
          {f.cached != null && <small>缓存 {fmtTokens(c)} · 全价 {fmtTokens(f.input - c)}</small>}
        </>); }} />
      <Legend items={[...(withCache.length ? [[C_CACHE, '缓存'] as [string, string]] : []), [C_REPLY, withCache.length ? '全价' : '发送'], ...(cacheWorks ? [[C_HOT, '缓存不到一半'] as [string, string]] : [])]} />
      <Top title="发送最多的 5 次" onSelect={setSel}
        rows={[...floors].sort((a, b) => b.input - a.input).slice(0, 5).map((f) => ({ floor: f.floor, value: fmtTokens(f.input) }))} />
    </>
  );
}

// ---------------------------------------------------------------- 用时 ---

const PHASE = ['等待回复', '思考', '正文回复'] as const;

/** 整段聊天的用时：每一轮三段（现在显示的这一版）；记录明显不对的不画、不算平均。 */
export function TimeChart() {
  const all = useFloors().filter((f) => f.timing);
  const floors = all.filter((f) => f.timing!.ok);
  const bad = all.length - floors.length;
  const [sel, setSel] = useState<number | null>(null);
  if (floors.length < 2) return <p class="rbt-sec-note">发两轮以上才有这张图。</p>;
  const avg = avgOf(floors.map((f) => f.timing!.total));
  const bars: Bar[] = floors.map((f) => {
    const t = f.timing!;
    return { floor: f.floor, segs: [{ v: t.wait, color: C_WAIT }, { v: t.think, color: C_THINK }, { v: t.write, color: C_REPLY }], hot: t.total > avg * 1.5 };
  });
  const timeLines = [{ v: avg, name: '平均', fmt: fmtDuration }];
  const byFloor = new Map(floors.map((f) => [f.floor, f]));
  const longest = (f: FloorStat) => { const t = f.timing!; const v = [t.wait, t.think, t.write]; const i = v.indexOf(Math.max(...v)); return `${PHASE[i]} ${fmtDuration(v[i])}`; };
  return (
    <>
      <div class="rbt-big"><b>{fmtDuration(avg)}</b><span>平均每次，共 {floors.length} 次回复</span></div>
      <Bars bars={bars} lines={timeLines} agg="avg" selected={sel} onSelect={setSel}
        detail={(n) => { const t = byFloor.get(n)!.timing!; return (<>
          <b>第 {n} 楼 · {fmtDuration(t.total)}</b>
          <small>{[`等待回复 ${fmtDuration(t.wait)}`, t.think ? `思考 ${fmtDuration(t.think)}` : '', `正文回复 ${fmtDuration(t.write)}`].filter(Boolean).join(' · ')}</small>
        </>); }} />
      <Legend items={[[C_WAIT, '等待回复'], [C_THINK, '思考'], [C_REPLY, '正文回复'], [C_HOT, '比平均慢一半以上']]} />
      {bad > 0 && <p class="rbt-sec-note">有 {bad} 次的用时记录有误（比如不到 1 秒写了几千 tokens），没算进平均。</p>}
      <Top title="用时最长的 5 次" onSelect={setSel}
        rows={[...floors].sort((a, b) => b.timing!.total - a.timing!.total).slice(0, 5).map((f) => ({ floor: f.floor, value: fmtDuration(f.timing!.total), sub: `最久的是${longest(f)}` }))} />
    </>
  );
}
