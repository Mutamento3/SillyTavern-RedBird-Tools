import { useEffect, useMemo, useState } from 'preact/hooks';
import { CATEGORY_META, type AttributedMessage, type Category } from '../core/attribute';
import { truncate } from '../core/text';
import { floorsText, unsentFloors } from '../core/budget';
import { captures, previewBusy, previewNextPrompt, type ActivatedWI, type Capture } from '../tools/flow/capture';
import { ctx, toast } from '../st/st';
import { openDrawer } from '../shell/drawers';

function PreviewButton({ onDone }: { onDone: () => void }) {
  return (
    <button
      class="rbt-btn"
      disabled={previewBusy.value}
      title="把下一轮要发给 AI 的内容先拼出来看看，不会真的发送，不花钱，也不改动聊天"
      onClick={async () => {
        const ok = await previewNextPrompt();
        if (ok) onDone();
        else toast('warning', '没能预览。请先打开一个角色，并使用 Chat Completion。');
      }}
    >
      {previewBusy.value ? '正在预览…' : '预览下一轮'}
    </button>
  );
}
import { CategoryChip, Chip, Empty, Legend, RoleBadge, StackBar, fmtTokens } from './common';

const WI_POSITION: Record<number, string> = {
  0: '角色定义前 ↑Char', 1: '角色定义后 ↓Char', 2: '作者注释前 ↑AN', 3: '作者注释后 ↓AN',
  4: '按深度 @D', 5: '示例对话前 ↑EM', 6: '示例对话后 ↓EM', 7: '出口 Outlet',
};

const ROLE_CN: Record<string, string> = { system: '系统', user: '用户', assistant: 'AI' };

const KIND_LABEL: Record<string, string> = {
  prompt: '预设条目', marker: '占位符', chat: '聊天', injection: '深度注入', utility: '工具提示', extension: '扩展', unknown: '?',
};

// ------------------------------------------------------------ 额度 ---
// 把 API 设置里的两个上限和这一轮的实际用量放在一起看。只写看得到的事实：哪几楼没发、是不是因为长度，算得出来才说。

/** The last AI reply in the open chat: its token count (ST's own count if it kept one, else estimated). */
function useLastReply(): { tokens: number; floor: number } | null {
  const [v, setV] = useState<{ tokens: number; floor: number } | null>(null);
  const list = captures.value;
  useEffect(() => {
    let alive = true;
    const chat = ctx().chat ?? [];
    let i = chat.length - 1;
    while (i >= 0 && (chat[i].is_user || chat[i].is_system)) i--;
    // 第 0 楼是开场白，不是 AI 生成的回复
    if (i <= 0) { setV(null); return; }
    const m = chat[i];
    const known = Number(m.extra?.token_count);
    if (known > 0) { setV({ tokens: known, floor: i }); return; }
    Promise.resolve(ctx().getTokenCountAsync?.(String(m.mes ?? ''), 0)).then((n) => { if (alive && typeof n === 'number') setV({ tokens: n, floor: i }); }).catch(() => {});
    return () => { alive = false; };
  }, [list.length, list[0]?.id]);
  return v;
}

/** 某一楼正文的 token 数（只算正在打开的聊天；别的聊天的那一轮返回 null）。 */
function useFloorTokens(chatId: string, floor: number | null): number | null {
  const [v, setV] = useState<number | null>(null);
  useEffect(() => {
    setV(null);
    const c = ctx();
    if (floor === null || String(c.getCurrentChatId?.() ?? '') !== chatId) return;
    const m = c.chat?.[floor];
    if (!m) return;
    let alive = true;
    Promise.resolve(c.getTokenCountAsync?.(String(m.mes ?? ''), 0)).then((n) => { if (alive && typeof n === 'number') setV(n); }).catch(() => {});
    return () => { alive = false; };
  }, [chatId, floor]);
  return v;
}

function BudgetPanel({ cap }: { cap: Capture }) {
  const b = cap.budget;
  const last = useLastReply();
  const sent = cap.result.messages.map((m) => m.chatIndex).filter((n): n is number => typeof n === 'number');
  // 一楼都没发时看到正在生成的那一楼为止；后台生成（总结之类）本来就可能不带聊天记录，不看
  const unsent = b && !(cap.genType === 'quiet' && !sent.length) ? unsentFloors(sent, b.hidden, cap.targetFloor ?? b.chatLength) : { hidden: [], other: [] };
  // 酒馆从最新的楼往前放，放不下就停：最先没放进去的是没发的楼里最新的那一楼
  const firstLeftOut = unsent.other.length ? unsent.other[unsent.other.length - 1] : null;
  const leftOutTokens = useFloorTokens(cap.chatId, firstLeftOut);
  if (!b || !b.context) return null;
  const used = cap.result.totalTokens;
  const reply = Math.min(b.reply, b.context);
  const free = Math.max(0, b.context - used - reply);
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / b.context) * 100))}%`;
  // 发出去的内容最多 = 上下文上限 − 回复上限
  const promptRoom = b.context - reply;
  const tooLong = leftOutTokens !== null && used + leftOutTokens > promptRoom;
  const nearFull = used > promptRoom * 0.95;
  const cutOff = !!last && b.reply > 0 && last.tokens >= b.reply * 0.9;
  return (
    <div class="rbt-budget">
      <div class="rbt-budget-head rbt-card-titlerow">
        <b>额度</b>
        <small>上下文上限 {fmtTokens(b.context)} · 回复上限 {fmtTokens(b.reply)}</small>
        <button type="button" class="rbt-linkbtn" title="在预设面板里改这两个上限" onClick={() => openDrawer('preset')}>去改 ↗</button>
      </div>
      <div class="rbt-budget-bar" role="img" aria-label={`这一轮发出去约 ${used} tokens，留给回复 ${reply}，上下文上限 ${b.context}`}>
        <span class="used" style={{ width: pct(used) }} />
        <span class="reply" style={{ width: pct(reply) }} />
      </div>
      <div class="rbt-budget-legend">
        <span><i class="used" />这一轮发出去 约 {fmtTokens(used)}</span>
        <span><i class="reply" />留给回复 {fmtTokens(reply)}</span>
        <span><i class="free" />空着 {fmtTokens(free)}</span>
      </div>
      {cutOff && (
        <div class="rbt-budget-alert">
          <i class="fa-solid fa-circle-exclamation" />
          <div>
            <p>上一条回复接近回复上限</p>
            <small>它约 {fmtTokens(last!.tokens)} tokens，回复上限是 {fmtTokens(b.reply)}。AI 写到上限就会停下，哪怕话没说完。如果它没写完，把预设里的「最大回复长度」调大（比如 8000），再重新生成。多数带思考过程的模型，思考的部分也算在回复上限里。</small>
          </div>
        </div>
      )}
      {unsent.other.length > 0 && (
        <div class="rbt-budget-alert">
          <i class="fa-solid fa-circle-exclamation" />
          <div>
            <p>有聊天记录没发出去</p>
            <small>
              {floorsText(unsent.other)}没有隐藏，这一轮也没发出去。
              {tooLong
                ? `发出去的内容最多 ${fmtTokens(promptRoom)}（上下文上限 − 回复上限）。这一轮约 ${fmtTokens(used)}，再加第 ${firstLeftOut} 楼（约 ${fmtTokens(leftOutTokens!)}）就超了，所以酒馆没放进去。要发更多聊天记录，把预设里的「上下文长度」调大（要看模型支持多少），或者少开几本世界书。`
                : leftOutTokens !== null
                  ? `这一轮约 ${fmtTokens(used)}，加上第 ${firstLeftOut} 楼也没超过上限 ${fmtTokens(promptRoom)}，所以不是因为长度。`
                  : ''}
            </small>
          </div>
        </div>
      )}
      {unsent.hidden.length > 0 && <small class="rbt-budget-note">{floorsText(unsent.hidden)}已隐藏，不会发出去。</small>}
      {!unsent.other.length && nearFull && (
        <small class="rbt-budget-note">已用到上限的 {Math.round((used / promptRoom) * 100)}%。超过上限时，酒馆从最早的聊天记录开始不发。</small>
      )}
      {!cutOff && last && b.reply > 0 && (
        <small class="rbt-budget-note">上一条回复约 {fmtTokens(last.tokens)} tokens，没到回复上限。</small>
      )}
    </div>
  );
}

function captureTitle(c: Capture): string {
  // 手写时分秒：toLocaleTimeString 每次都要初始化一遍本地化格式，下拉框里几十条时打开很慢
  const p2 = (n: number) => String(n).padStart(2, '0');
  const t = `${p2(c.time.getHours())}:${p2(c.time.getMinutes())}:${p2(c.time.getSeconds())}`;
  const floor = c.targetFloor !== null ? `生成 #${c.targetFloor}` : c.genTypeLabel;
  return `${t} · ${floor}${c.targetFloor !== null && c.genType !== 'normal' ? `（${c.genTypeLabel}）` : ''} · ~${fmtTokens(c.result.totalTokens)} tokens`;
}

function SegmentedContent({ msg }: { msg: AttributedMessage }) {
  const [full, setFull] = useState(false);
  const LIMIT = 12000;
  let used = 0;
  const parts: preact.JSX.Element[] = [];
  for (const [i, s] of msg.segments.entries()) {
    if (!full && used >= LIMIT) break;
    let text = msg.content.slice(s.start, s.end);
    if (!full && used + text.length > LIMIT) text = `${text.slice(0, LIMIT - used)}…`;
    used += text.length;
    const color = CATEGORY_META[s.category].color;
    parts.push(
      <span key={i} class="rbt-seg" style={{ '--seg': color }} title={`${s.label} · ~${s.tokens} tokens`}>
        {text}
      </span>,
    );
  }
  return (
    <div class="rbt-content-wrap">
      {msg.segments.filter((s) => s.tokens > 0).length > 1 && (
        <div class="rbt-seglist">
          {msg.segments.filter((s) => s.tokens > 0).map((s, i) => (
            <CategoryChip key={i} category={s.category}>{s.label} · {s.tokens}</CategoryChip>
          ))}
        </div>
      )}
      <pre class="rbt-content">{parts}</pre>
      {!full && msg.content.length > LIMIT && (
        <button class="rbt-btn rbt-btn-small" onClick={() => setFull(true)}>显示全部（{msg.content.length} 字）</button>
      )}
    </div>
  );
}

function MessageRow({ msg }: { msg: AttributedMessage }) {
  const [open, setOpen] = useState(false);
  const color = CATEGORY_META[msg.category].color;
  const extraSources = new Set(msg.segments.filter((s) => s.tokens > 0).map((s) => s.label)).size - 1;
  return (
    <div class={`rbt-msg ${open ? 'open' : ''} rbt-kind-${msg.kind}`} style={{ '--cat': color }}>
      {/* 第一层：标题；第二层：序号、角色、类型这些说明；第三层：内容预览 */}
      <div class="rbt-msg-head" onClick={() => setOpen(!open)}>
        <span class="rbt-msg-label">{msg.label}</span>
        <span class="rbt-msg-tokens">{fmtTokens(msg.tokens)}</span>
      </div>
      <div class="rbt-msg-meta" onClick={() => setOpen(!open)}>
        {[
          `#${msg.index}`,
          ROLE_CN[msg.role] ?? msg.role,
          msg.kind === 'injection' ? `深度 ${msg.depth}` : msg.kind !== 'chat' ? KIND_LABEL[msg.kind] : '',
          extraSources > 0 ? `另有 ${extraSources} 个来源` : '',
        ].filter(Boolean).join(' · ')}
      </div>
      {!open && <div class="rbt-msg-preview">{truncate(msg.content, 140)}</div>}
      {open && <SegmentedContent msg={msg} />}
    </div>
  );
}

type Row = { type: 'msg'; msg: AttributedMessage } | { type: 'chat'; msgs: AttributedMessage[] };

function groupRows(msgs: AttributedMessage[]): Row[] {
  const rows: Row[] = [];
  for (const m of msgs) {
    const last = rows[rows.length - 1];
    if (m.kind === 'chat') {
      if (last?.type === 'chat') last.msgs.push(m);
      else rows.push({ type: 'chat', msgs: [m] });
    } else rows.push({ type: 'msg', msg: m });
  }
  return rows;
}

function ChatGroup({ msgs }: { msgs: AttributedMessage[] }) {
  const [open, setOpen] = useState(false);
  const floors = msgs.map((m) => m.chatIndex).filter((x): x is number => x !== undefined);
  const tokens = msgs.reduce((n, m) => n + m.tokens, 0);
  const range = floors.length ? `#${Math.min(...floors)}–#${Math.max(...floors)}` : '';
  return (
    <div class="rbt-chatgroup">
      <div class="rbt-chatgroup-head" onClick={() => setOpen(!open)}>
        <i class={`fa-solid fa-chevron-${open ? 'down' : 'right'} rbt-caret`} />
        <span class="rbt-chatgroup-title">聊天记录</span>
        <span class="rbt-chatgroup-sub">{range ? `${range} · ` : ''}{msgs.length} 条</span>
        <span class="rbt-msg-tokens">{fmtTokens(tokens)}</span>
      </div>
      {open && msgs.map((m) => <MessageRow key={m.index} msg={m} />)}
    </div>
  );
}

const SCOPE_OF: Partial<Record<Category, string>> = {
  wi_character: '角色', wi_chat: '聊天', wi_persona: 'user 人设', wi_global: '全局', wi_other: '其他',
};

function WIList({ wi }: { wi: ActivatedWI[] }) {
  const byBook = useMemo(() => {
    const m = new Map<string, ActivatedWI[]>();
    for (const e of wi) m.set(e.book, [...(m.get(e.book) ?? []), e]);
    return [...m.entries()];
  }, [wi]);
  if (!wi.length) return <Empty>这一轮没有触发世界书条目。</Empty>;
  return (
    <div class="rbt-wi">
      {byBook.map(([book, entries]) => (
        <div key={book} class="rbt-wi-book">
          <div class="rbt-wi-book-head">
            <CategoryChip category={entries[0].category}>{SCOPE_OF[entries[0].category]}</CategoryChip>
            <b>{book}</b> <small class="rbt-muted">{entries.length} 条</small>
          </div>
          {entries.sort((a, b) => a.order - b.order).map((e) => (
            <details key={e.key} class="rbt-wi-entry">
              <summary>
                <span class="rbt-wi-title">{e.title}</span>
                <small class="rbt-muted">{e.position !== undefined ? WI_POSITION[e.position] ?? `位置 ${e.position}` : ''}{e.position === 4 ? ` ${e.depth}` : ''}</small>
                {e.constant
                  ? <Chip color="#3d8bfd">常驻</Chip>
                  : e.matchedKeys.length
                    ? e.matchedKeys.slice(0, 4).map((k) => <Chip key={k} color="#2fbf8f">{k}</Chip>)
                    : <Chip color="#888" title="最近的消息里没有它的关键词。可能是被别的条目带出来的，或关键词是正则">其他方式触发</Chip>}
              </summary>
              <pre class="rbt-content">{e.content}</pre>
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}

export function FlowView() {
  const list = captures.value;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sub, setSub] = useState<'stack' | 'wi'>('stack');
  const cap = list.find((c) => c.id === selectedId) ?? list[0];
  const rows = useMemo(() => (cap ? groupRows(cap.result.messages) : []), [cap]);

  if (!cap) {
    return (
      <Empty>
        发一条消息或重新生成后，这里会显示这一轮实际发给 AI 的全部内容。<br />
        也可以先预览，不会发送：<br />
        <PreviewButton onDone={() => setSelectedId(null)} /><br />
        <small>仅支持 Chat Completion。</small>
      </Empty>
    );
  }
  const { result } = cap;
  const globalWI = result.totals.wi_global;
  const globalBooks = [...new Set(cap.wi.filter((e) => e.category === 'wi_global').map((e) => e.book))];

  return (
    <div class="rbt-flow">
      <div class="rbt-toolbar">
        <select class="text_pole rbt-select" value={cap.id} onChange={(e) => setSelectedId(Number((e.currentTarget as HTMLSelectElement).value))}>
          {list.map((c) => <option key={c.id} value={c.id}>{captureTitle(c)}</option>)}
        </select>
        <PreviewButton onDone={() => setSelectedId(null)} />
      </div>
      {cap.genType === 'preview' && (
        <div class="rbt-hint">这是预览，没有发给 AI。预览时看不到具体触发了哪些世界书条目，发一条消息后就能看到。</div>
      )}
      <BudgetPanel cap={cap} />
      <div class="rbt-summary">
        <div class="rbt-card-titlerow">
          <b>这一轮发了什么</b>
          <small>{result.messages.length} 条消息 · 约 {fmtTokens(result.totalTokens)} tokens{cap.presetName ? ` · 预设「${cap.presetName}」` : ''}</small>
          {!result.aligned && <Chip color="#c98a00" title="拿不到预设的结构，来源是按文字推测的">推测</Chip>}
        </div>
        <StackBar totals={result.totals} total={result.totalTokens} />
        <Legend totals={result.totals} total={result.totalTokens} />
        {globalWI > 0 && (
          <div class="rbt-warn">约 {globalWI} tokens 来自全局世界书「{globalBooks.join('、')}」。如果它不属于这张卡，别的设定就混进来了。</div>
        )}
      </div>
      <div class="rbt-subtabs">
        <button class={sub === 'stack' ? 'active' : ''} onClick={() => setSub('stack')}>组装顺序</button>
        <button class={sub === 'wi' ? 'active' : ''} onClick={() => setSub('wi')}>触发的世界书（{cap.wi.length}）</button>
      </div>
      {sub === 'stack' && (
        <div class="rbt-stack">
          {rows.map((r, i) => (r.type === 'chat' ? <ChatGroup key={`g${i}`} msgs={r.msgs} /> : <MessageRow key={r.msg.index} msg={r.msg} />))}
        </div>
      )}
      {sub === 'wi' && <WIList wi={cap.wi} />}
    </div>
  );
}
