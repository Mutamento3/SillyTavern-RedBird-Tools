import { useMemo, useState } from 'preact/hooks';
import { CATEGORY_META, type AttributedMessage, type Category } from '../core/attribute';
import { truncate } from '../core/text';
import { captures, previewBusy, previewNextPrompt, type ActivatedWI, type Capture } from '../tools/flow/capture';
import { toast } from '../st/st';

function PreviewButton({ onDone }: { onDone: () => void }) {
  return (
    <button
      class="rbt-btn"
      disabled={previewBusy.value}
      title="按酒馆的方式组装下一轮提示词，但不发送给 AI（不花钱，也不改聊天）"
      onClick={async () => {
        const ok = await previewNextPrompt();
        if (ok) onDone();
        else toast('warning', '没能生成预览。请确认选中了角色并使用 Chat Completion 模式。');
      }}
    >
      {previewBusy.value ? '组装中…' : '预览下一轮（不发送）'}
    </button>
  );
}
import { CategoryChip, Chip, Empty, Legend, RoleBadge, StackBar, fmtTokens } from './common';

const WI_POSITION: Record<number, string> = {
  0: '角色定义前 ↑Char', 1: '角色定义后 ↓Char', 2: '作者注释前 ↑AN', 3: '作者注释后 ↓AN',
  4: '按深度 @D', 5: '示例对话前 ↑EM', 6: '示例对话后 ↓EM', 7: '出口 Outlet',
};

const KIND_LABEL: Record<string, string> = {
  prompt: '预设条目', marker: '占位符', chat: '聊天', injection: '深度注入', utility: '工具提示', extension: '扩展', unknown: '?',
};

function captureTitle(c: Capture): string {
  const t = c.time.toLocaleTimeString();
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
      <div class="rbt-msg-head" onClick={() => setOpen(!open)}>
        <span class="rbt-msg-idx">{msg.index}</span>
        <RoleBadge role={msg.role} />
        <span class="rbt-msg-label">{msg.label}</span>
        {msg.kind === 'injection' && <Chip class="rbt-chip-depth">深度 {msg.depth}</Chip>}
        {msg.kind !== 'chat' && msg.kind !== 'injection' && <small class="rbt-muted">{KIND_LABEL[msg.kind]}</small>}
        {extraSources > 0 && <small class="rbt-muted">+{extraSources} 个来源</small>}
        <span class="rbt-msg-tokens">{fmtTokens(msg.tokens)}</span>
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
        <span class="rbt-caret">{open ? '▾' : '▸'}</span>
        聊天记录 {range}（{msgs.length} 条）
        <span class="rbt-msg-tokens">{fmtTokens(tokens)}</span>
      </div>
      {open && msgs.map((m) => <MessageRow key={m.index} msg={m} />)}
    </div>
  );
}

const SCOPE_OF: Partial<Record<Category, string>> = {
  wi_character: '角色', wi_chat: '聊天', wi_persona: '用户设定', wi_global: '全局', wi_other: '其他',
};

function WIList({ wi }: { wi: ActivatedWI[] }) {
  const byBook = useMemo(() => {
    const m = new Map<string, ActivatedWI[]>();
    for (const e of wi) m.set(e.book, [...(m.get(e.book) ?? []), e]);
    return [...m.entries()];
  }, [wi]);
  if (!wi.length) return <Empty>这一轮没有触发任何世界书条目。</Empty>;
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
                    : <Chip color="#888" title="最近消息里没找到它的关键词：可能是递归触发、其他条件，或关键词是正则">递归/其他</Chip>}
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
        还没有捕获到提示词。<br />
        正常发送一条消息（或重新生成），这里就会显示这一轮真正发给 AI 的内容。<br />
        也可以先预览一下，不会发送：<br />
        <PreviewButton onDone={() => setSelectedId(null)} /><br />
        <small>目前只支持 Chat Completion 模式。</small>
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
        <div class="rbt-hint">这是预览：没有发送给 AI。预览时酒馆不会报告具体触发了哪些世界书条目，所以世界书内容只显示为整块；真正发送一条消息后能看到逐条来源。</div>
      )}
      <div class="rbt-summary">
        <div class="rbt-summary-line">
          <b>{result.messages.length}</b> 条消息 · 约 <b>{fmtTokens(result.totalTokens)}</b> tokens（估算）
          {cap.presetName && <> · 预设 <b>{cap.presetName}</b></>}
          {!result.aligned && <Chip color="#c98a00" title="没能从提示词管理器拿到结构信息，来源是按文字匹配推断的">推断模式</Chip>}
        </div>
        <StackBar totals={result.totals} total={result.totalTokens} />
        <Legend totals={result.totals} total={result.totalTokens} />
        {globalWI > 0 && (
          <div class="rbt-warn">⚠ 有约 {globalWI} tokens 来自<b>全局世界书</b>：{globalBooks.join('、')}。如果这本书不属于这张卡，就是"串味"了。</div>
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
