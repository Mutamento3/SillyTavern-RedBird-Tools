/**
 * 正则、脚本标签的「分段」：一次只看一组，后面的列表不会被前面的长列表埋住。
 *
 * - 窄的时候（手机、窄面板，一栏）：顶上三段「正在用 / 预设 N / 角色卡 N」（正则第一段叫「全局 N」），一次显示一段。
 * - 宽的时候（两栏）：左栏一直显示第一段；右栏顶上两段「预设 N / 角色卡 N」，一次显示一个列表。
 *
 * 宽窄跟着面板宽度（和 .rbt-page-cols 两栏的断点一样，820px），用 CSS 容器查询切换，所以三组内容都渲染，
 * 只是按选中的那段藏起来。选了哪段按标签记住：点进详情再返回还是原来那段。
 */
import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';

export type Seg = 'now' | 'presets' | 'cards';

const remembered = signal<Record<string, { seg: Seg; side: 'presets' | 'cards' }>>({});

function useScope(key: string): [{ seg: Seg; side: 'presets' | 'cards' }, (seg: Seg) => void] {
  const st = remembered.value[key] ?? { seg: 'now', side: 'presets' };
  const set = (seg: Seg) => {
    remembered.value = { ...remembered.value, [key]: { seg, side: seg === 'now' ? st.side : seg } };
  };
  return [st, set];
}

function Segs({ items, value, onPick, cls }: { items: { id: Seg; label: string }[]; value: Seg; onPick: (s: Seg) => void; cls: string }) {
  return (
    <div class={`rbt-vseg rbt-scope-seg ${cls}`} role="tablist">
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={value === it.id} class={value === it.id ? 'active' : ''} onClick={() => onPick(it.id)}>{it.label}</button>
      ))}
    </div>
  );
}

export function ScopePage({ id, nowLabel, presetCount, cardCount, now, presets, cards }: {
  /** 记住选了哪段用的名字（正则 / 脚本各一个） */
  id: string;
  nowLabel: string;
  presetCount: number;
  cardCount: number;
  now: ComponentChildren;
  presets: ComponentChildren;
  cards: ComponentChildren;
}) {
  const [st, pick] = useScope(id);
  const all: { id: Seg; label: string }[] = [
    { id: 'now', label: nowLabel },
    { id: 'presets', label: `预设 ${presetCount}` },
    { id: 'cards', label: `角色卡 ${cardCount}` },
  ];
  return (
    <div class="rbt-page rbt-segpage" data-seg={st.seg} data-side={st.side}>
      <Segs cls="rbt-scope-narrow" items={all} value={st.seg} onPick={pick} />
      <div class="rbt-page-cols">
        <div class="rbt-page-group rbt-scope-now">{now}</div>
        <div class="rbt-page-group rbt-scope-side">
          <Segs cls="rbt-scope-wide" items={all.slice(1)} value={st.side} onPick={pick} />
          <div class="rbt-scope-presets">{presets}</div>
          <div class="rbt-scope-cards">{cards}</div>
        </div>
      </div>
    </div>
  );
}
