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
      <input type="checkbox" checked={checked} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
      <span />
    </label>
  );
}

/** 设置行：左边名字（下面一行灰色说明），右边开关。 */
export function SwitchRow({ label, detail, checked, onChange }: { label: ComponentChildren; detail?: ComponentChildren; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div class="rbt-switch-row">
      <div class="rbt-switch-text">
        <span>{label}</span>
        {detail && <small>{detail}</small>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
