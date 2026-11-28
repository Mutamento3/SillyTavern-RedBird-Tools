/**
 * 花费明细里「发给 AI 的内容」的三层（数据见 core/sentItems.ts）：
 * - 第一层（输入卡片，FlowRound 的 ContextSection）：总数、比上一轮、组成条，一个链接进第二层。
 * - 第二层：同一条组成条 + 发送顺序；和上一轮开头相同的部分可走缓存，分界处画一条线「以上可走缓存，以下按全价」。
 * - 第三层：一条的全文。
 * 三层颜色、名字都用这里的 PART_COLOR / PART_NAME，和第一层的组成条对得上。
 */
import { useState } from 'preact/hooks';
import { CATEGORY_META } from '../core/attribute';
import type { Part } from '../core/costSplit';
import { floorsText } from '../core/budget';
import type { SentGroup, SentItem, SentView } from '../core/sentItems';
import type { ActivatedWI } from '../tools/flow/capture';
import type { WIInfo } from '../core/sentItems';
import { currentPresetName } from '../tools/cards/cards';
import { openDrawer } from '../shell/drawers';
import { openWorldInST } from './pages/parts';

export const PART_NAME: Record<Part, string> = {
  chat: '聊天记录', preset: '预设', character: '角色卡', persona: '用户人设', wi: '世界书', extension: '插件插入', other: '其他',
};
export const PART_COLOR: Record<Part, string> = {
  // 聊天记录用黄色：原来的浅灰和上下文长度条的灰色太像。混一点文字色，深色主题偏浅黄，浅色主题偏橄榄黄，两种底色上都看得清
  chat: 'color-mix(in oklab, #ddd43e 80%, var(--t1))', preset: CATEGORY_META.preset.color, character: CATEGORY_META.character.color,
  persona: CATEGORY_META.persona.color, wi: CATEGORY_META.wi_character.color, extension: CATEGORY_META.extension.color,
  other: CATEGORY_META.unknown.color,
};

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const PLACE: Record<number, string> = {
  0: '角色定义前', 1: '角色定义后', 2: '作者注释前', 3: '作者注释后', 5: '示例对话前', 6: '示例对话后', 7: '出口',
};
/** 这一轮触发的世界书条目 → sentItems 要的样子 */
export function wiInfo(wi: ActivatedWI[]): WIInfo[] {
  return wi.map((e) => ({
    key: e.key, book: e.book, constant: e.constant, matchedKeys: e.matchedKeys,
    place: e.position === 4 ? `深度 ${e.depth ?? 0}` : PLACE[e.position ?? -1] ?? '',
  }));
}

// ---------------------------------------------------------- 第二层 ---

function groupTitle(g: SentGroup): string {
  const n = g.items.length;
  const one = g.items[0].label;
  if (g.part === 'chat') {
    const floors = g.items.map((it) => it.floor).filter((x): x is number => x !== undefined);
    return `聊天记录 · ${floors.length ? floorsText(floors) : `${n} 条`}`;
  }
  if (g.part === 'persona') return PART_NAME.persona;
  return `${PART_NAME[g.part]} · ${n === 1 ? one : `${n} ${g.part === 'preset' || g.part === 'wi' ? '条' : '段'}`}`;
}

/** 这一组 / 这一条后面的小标签：常驻、本轮触发、新增、修改 */
function tagsOf(items: SentItem[]): string[] {
  const tags: string[] = [];
  const wi = items.filter((it) => it.wi);
  if (wi.length === items.length && wi.length) {
    if (wi.every((it) => it.wi!.constant)) tags.push('常驻');
    else if (wi.every((it) => !it.wi!.constant)) tags.push('关键词触发');
  }
  const added = items.filter((it) => it.status === 'new').length;
  const changed = items.filter((it) => it.status === 'changed').length;
  if (added === items.length) tags.push('新增');
  else if (changed === items.length) tags.push('修改');
  else {
    if (added) tags.push(`${added} 条新增`);
    if (changed) tags.push(`${changed} 条修改`);
  }
  return tags;
}

/** 世界书插在聊天记录里（深度 N）：写插在第几楼前（后面紧跟的那一楼），比「深度」好懂。nextFloor：这一组后面第一楼 */
function groupNote(g: SentGroup, nextFloor: number | undefined): string {
  const inChat = g.items.every((it) => it.wi?.place.startsWith('深度'));
  if (!inChat) return '';
  return nextFloor !== undefined ? `插在第 ${nextFloor} 楼前` : '插在聊天记录最后';
}

/** 「预设 · 文风」；名字就是来源名时（用户人设）不重复写 */
const fullName = (it: SentItem) => (it.label === PART_NAME[it.part] ? it.label : `${PART_NAME[it.part]} · ${it.label}`);

function Tags({ tags }: { tags: string[] }) {
  return <>{tags.map((t) => <span key={t} class={`rbt-sent-tag ${/新增|修改/.test(t) ? 'new' : ''}`}>{t}</span>)}</>;
}

/** 每一行右边的数：Token（带小 t）或占本轮输入的百分比，由「输入内容」标题右边的切换决定 */
type Val = (tokens: number) => preact.ComponentChildren;

function ItemRow({ it, onOpen, sub, val }: { it: SentItem; onOpen: (it: SentItem) => void; sub?: boolean; val: Val }) {
  return (
    <button type="button" class={`rbt-sent-row ${sub ? 'sub' : ''}`} onClick={() => onOpen(it)}>
      {!sub && <span class="rbt-sent-line" style={{ background: PART_COLOR[it.part] }} />}
      <span class="rbt-sent-name">{sub ? it.label : fullName(it)}<Tags tags={tagsOf([it])} /></span>
      <span class="rbt-sent-tok">{val(it.tokens)}</span>
      <i class="fa-solid fa-chevron-right" aria-hidden="true" />
    </button>
  );
}

function GroupRow({ g, note, onOpen, val }: { g: SentGroup; note: string; onOpen: (it: SentItem) => void; val: Val }) {
  const [open, setOpen] = useState(false);
  if (g.items.length === 1 && g.part !== 'chat' && !note) return <ItemRow it={g.items[0]} onOpen={onOpen} val={val} />;
  return (
    <div class="rbt-sent-group">
      <button type="button" class="rbt-sent-row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class="rbt-sent-line" style={{ background: PART_COLOR[g.part] }} />
        <span class="rbt-sent-name">{groupTitle(g)}<Tags tags={tagsOf(g.items)} />{note && <small>{note}</small>}</span>
        <span class="rbt-sent-tok">{val(g.tokens)}</span>
        <i class={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
      </button>
      {open && <div class="rbt-sent-items">{g.items.map((it) => <ItemRow key={it.key} it={it} onOpen={onOpen} sub val={val} />)}</div>}
    </div>
  );
}

export function SentList({ v, onOpen, pct }: { v: SentView; onOpen: (it: SentItem) => void; pct: boolean }) {
  const val: Val = (n) => {
    if (!pct) return <>{fmt(n)}<small>t</small></>;
    const p = v.total ? (n / v.total) * 100 : 0;
    return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`;
  };
  // 每一组后面紧跟的第一楼（世界书插在聊天记录里时，说它插在哪一楼前）
  const next: (number | undefined)[] = [];
  let floor: number | undefined;
  for (let i = v.groups.length - 1; i >= 0; i--) {
    next[i] = floor;
    const first = v.groups[i].items.find((it) => it.floor !== undefined);
    if (first) floor = first.floor;
  }
  return (
    <div class="rbt-sent-list">
      {v.groups.map((g, i) => (
        <div key={`${i}:${g.items[0].key}`}>
          {/* 第一组就和上一轮不同：上面没有可走缓存的部分 */}
          {i === v.cutGroup && <div class="rbt-sent-cut">{i === 0 ? '与上一轮开头不同，全部按全价' : '以上可走缓存，以下按全价'}</div>}
          <GroupRow g={g} note={groupNote(g, next[i])} onOpen={onOpen} val={val} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------- 第三层 ---

export function SentItemPage({ it, presetName }: { it: SentItem; presetName: string }) {
  const w = it.wi;
  const where = it.part === 'wi' && w ? `世界书「${w.book}」${w.place ? ` · 插在${w.place}` : ''}`
    : it.part === 'preset' && presetName ? `预设「${presetName}」`
    : PART_NAME[it.part];
  const canEditPreset = it.part === 'preset' && presetName && presetName === currentPresetName();
  return (
    <div class="rbt-sent-item">
      <h3 class="rbt-sent-title">{it.part === 'chat' ? it.label : fullName(it)}<Tags tags={tagsOf([it])} /></h3>
      <p class="rbt-sec-note">{where} · {fmt(it.tokens)} Token</p>
      {w && !w.constant && w.matchedKeys.length > 0 && <p class="rbt-sec-note">触发词：{w.matchedKeys.slice(0, 6).join('、')}</p>}
      <pre class="rbt-content">{it.text}</pre>
      {(w || canEditPreset) && (
        <div class="rbt-row rbt-sent-actions">
          {w && <button type="button" class="rbt-btn rbt-btn-small" onClick={() => openWorldInST(w.book)}>编辑世界书 <i class="fa-solid fa-arrow-up-right-from-square" /></button>}
          {canEditPreset && <button type="button" class="rbt-btn rbt-btn-small" onClick={() => openDrawer('preset')}>编辑预设 <i class="fa-solid fa-arrow-up-right-from-square" /></button>}
        </div>
      )}
    </div>
  );
}
