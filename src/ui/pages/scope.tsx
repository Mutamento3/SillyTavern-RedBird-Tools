/**
 * 正则、脚本标签的三个分段「全局 N / 预设自带 N / 角色卡自带 N」：一次只看一段，一栏从上到下。
 * 电脑和手机一样。选了哪段按标签记住：点进详情再返回还是原来那段。
 */
import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';

export type Seg = 'now' | 'presets' | 'cards';

const remembered = signal<Record<string, Seg>>({});
/** 从别处跳过来时先选好分段（比如预设脚本的通知 → 「预设自带」） */
export function showSeg(id: string, seg: Seg): void { remembered.value = { ...remembered.value, [id]: seg }; }

export function ScopePage({ id, lead, nowCount, presetCount, cardCount, now, presets, cards, focus }: {
  /** 记住选了哪段用的名字（正则 / 脚本各一个） */
  id: string;
  /** 分段上面一行字，说清这页管的是什么（脚本页：标签叫「脚本」，这里写全名） */
  lead?: string;
  nowCount: number;
  presetCount: number;
  cardCount: number;
  now: ComponentChildren;
  presets: ComponentChildren;
  cards: ComponentChildren;
  /** 只看「全局」这一块（列表在「选择」时），分段先藏起来 */
  focus?: boolean;
}) {
  const seg = focus ? 'now' : remembered.value[id] ?? 'now';
  const all: { id: Seg; label: string }[] = [
    { id: 'now', label: `全局 ${nowCount}` },
    { id: 'presets', label: `预设自带 ${presetCount}` },
    { id: 'cards', label: `角色卡自带 ${cardCount}` },
  ];
  return (
    <div class="rbt-page">
      {lead && <p class="rbt-page-lead">{lead}</p>}
      {!focus && (
        <div class="rbt-vseg rbt-scope-seg" role="tablist">
          {all.map((it) => (
            <button key={it.id} type="button" role="tab" aria-selected={seg === it.id} class={seg === it.id ? 'active' : ''}
              onClick={() => showSeg(id, it.id)}>{it.label}</button>
          ))}
        </div>
      )}
      <div class="rbt-page-group">{seg === 'now' ? now : seg === 'presets' ? presets : cards}</div>
    </div>
  );
}
