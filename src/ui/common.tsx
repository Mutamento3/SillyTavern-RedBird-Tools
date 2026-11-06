import type { ComponentChildren } from 'preact';
import { CATEGORY_META, CATEGORY_ORDER, type Category } from '../core/attribute';

export function Chip(props: { color?: string; title?: string; children: ComponentChildren; class?: string }) {
  return (
    <span class={`rbt-chip ${props.color ? 'has-color' : ''} ${props.class ?? ''}`} title={props.title} style={props.color ? { '--chip': props.color } : undefined}>
      {props.children}
    </span>
  );
}

export function CategoryChip({ category, children }: { category: Category; children?: ComponentChildren }) {
  const meta = CATEGORY_META[category];
  return <Chip color={meta.color}>{children ?? meta.label}</Chip>;
}

export function RoleBadge({ role }: { role: string }) {
  const label = role === 'system' ? 'SYS' : role === 'user' ? 'USER' : role === 'assistant' ? 'AI' : role.toUpperCase();
  return <span class={`rbt-role rbt-role-${role}`}>{label}</span>;
}

export function fmtTokens(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function StackBar({ totals, total }: { totals: Record<Category, number>; total: number }) {
  if (!total) return null;
  return (
    <div class="rbt-stackbar">
      {CATEGORY_ORDER.filter((c) => totals[c] > 0).map((c) => (
        <div
          key={c}
          class="rbt-stackbar-seg"
          style={{ width: `${(totals[c] / total) * 100}%`, background: CATEGORY_META[c].color }}
          title={`${CATEGORY_META[c].label}：约 ${totals[c]} tokens（${((totals[c] / total) * 100).toFixed(1)}%）`}
        />
      ))}
    </div>
  );
}

export function Legend({ totals, total }: { totals: Record<Category, number>; total: number }) {
  return (
    <div class="rbt-legend">
      {CATEGORY_ORDER.filter((c) => totals[c] > 0).map((c) => (
        <span key={c} class="rbt-legend-item">
          <i style={{ background: CATEGORY_META[c].color }} />
          {CATEGORY_META[c].label} <b>{fmtTokens(totals[c])}</b>
          <small>{((totals[c] / total) * 100).toFixed(0)}%</small>
        </span>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <div class="rbt-empty">{children}</div>;
}

export function Toggle({ checked, onChange, title }: { checked: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <label class="rbt-switch" title={title}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
      <span />
    </label>
  );
}

/** 勾选框本身（18px，清楚的边框和勾），放进整行都能点的 <label> 里用。 */
export function CheckMark({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <input type="checkbox" class="rbt-cb" checked={checked} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />;
}

/** 选项行：勾选框紧挨着名字（下面一行灰色说明）；整行都能点，悬停整行变亮。 */
export function CheckRow({ label, detail, checked, onChange }: { label: ComponentChildren; detail?: ComponentChildren; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="rbt-check-row">
      <CheckMark checked={checked} onChange={onChange} />
      <span class="rbt-check-text">
        <span>{label}</span>
        {detail && <small>{detail}</small>}
      </span>
    </label>
  );
}

/**
 * 可点的一行。规则：整行可点、悬停整行变亮；结尾 › = 在工具箱里打开详情，↗ = 去酒馆面板或网页。
 * 不可点的东西不用这个组件，也不用彩色文字。
 */
export function NavRow({ title, sub, img, trailing, external, onClick, hint }: {
  title: ComponentChildren;
  sub?: ComponentChildren;
  img?: string;
  trailing?: ComponentChildren;
  external?: boolean;
  onClick: () => void;
  hint?: string;
}) {
  return (
    <button type="button" class="rbt-navrow" onClick={onClick} title={hint}>
      {img && <img class="rbt-navrow-img" src={img} alt="" loading="lazy" />}
      <span class="rbt-navrow-main">
        <span class="rbt-navrow-title">{title}</span>
        {sub && <span class="rbt-navrow-sub">{sub}</span>}
      </span>
      {trailing && <span class="rbt-navrow-trail">{trailing}</span>}
      <i class={`fa-solid ${external ? 'fa-arrow-up-right-from-square' : 'fa-chevron-right'} rbt-navrow-icon`} />
    </button>
  );
}

/** A small neutral tag (e.g. 正在用 / 全局开着). `tone` only adds a coloured dot. */
export function Tag({ children, tone }: { children: ComponentChildren; tone?: 'ok' | 'warn' | 'bad' | 'accent' }) {
  return <span class={`rbt-tag ${tone ? `tone-${tone}` : ''}`}>{children}</span>;
}
