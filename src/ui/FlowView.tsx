import { useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { CATEGORY_META, type AttributedMessage, type Category } from '../core/attribute';
import { truncate } from '../core/text';
import { captures, flowFocus, previewBusy, previewNextPrompt, type ActivatedWI } from '../tools/flow/capture';
import { ctx, toast } from '../st/st';
import { birdOn, costOn, setBirdOn, setCostOn, setTimerOn, setTokensOn, timerOn, tokensOn, usageTick } from '../tools/flow/usage';
import { isPhone } from './Menu';
import { lookShown } from '../look/look';
import { Banner, WholeChatGroup, WholeChatPage, ContextSection, RoundCostSection, TimeSection, bannerFor, cacheBreak, previousCapture, roundTitle } from './FlowRound';
import { USAGE_COPY as U } from './copy';

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
import { CategoryChip, CheckRow, Chip, Empty, fmtTokens } from './common';

const WI_POSITION: Record<number, string> = {
  0: '角色定义前 ↑Char', 1: '角色定义后 ↓Char', 2: '作者注释前 ↑AN', 3: '作者注释后 ↓AN',
  4: '按深度 @D', 5: '示例对话前 ↑EM', 6: '示例对话后 ↓EM', 7: '出口 Outlet',
};

const ROLE_CN: Record<string, string> = { system: '系统', user: '用户', assistant: 'AI' };

const KIND_LABEL: Record<string, string> = {
  prompt: '预设条目', marker: '占位符', chat: '聊天', injection: '深度注入', utility: '工具提示', extension: '扩展', unknown: '?',
};

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
  wi_character: '角色', wi_chat: '聊天', wi_persona: '用户人设', wi_global: '全局', wi_other: '其他',
};

function WIList({ wi }: { wi: ActivatedWI[] }) {
  const byBook = useMemo(() => {
    const m = new Map<string, ActivatedWI[]>();
    for (const e of wi) m.set(e.book, [...(m.get(e.book) ?? []), e]);
    return [...m.entries()];
  }, [wi]);
  if (!wi.length) return <Empty>本轮没有触发世界书条目。</Empty>;
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

// ------------------------------------------------- 花费、在聊天里显示 ---

/**
 * 消息里的哪个位置：一个小示意图（头像 + 几行字），要说的那个位置用主文字色，其余用弱色。
 * avatar：电脑上头像下面 / 手机上名字下面；bottom：正文底下。
 */
function PlaceIcon({ at, phone }: { at: 'avatar' | 'bottom'; phone: boolean }) {
  const on = 'currentColor';
  const off = 'color-mix(in srgb, currentColor 20%, transparent)';
  return (
    <svg class="rbt-show-place" viewBox="0 0 28 20" aria-hidden="true">
      <circle cx="5" cy="5" r="4" fill={off} />
      {phone
        ? <rect x="11" y="6" width="9" height="2.4" rx="1.2" fill={at === 'avatar' ? on : off} />
        : <rect x="1.5" y="11" width="7" height="2.4" rx="1.2" fill={at === 'avatar' ? on : off} />}
      <rect x="11" y={phone ? 10.5 : 2} width="16" height="2.4" rx="1.2" fill={off} />
      <rect x="11" y={phone ? 14 : 7} width="12" height="2.4" rx="1.2" fill={off} />
      <rect x="11" y={phone ? 17.5 : 12} width={phone ? 0 : 16} height="2.4" rx="1.2" fill={off} />
      {at === 'bottom' && <rect x="11" y={phone ? 17.5 : 16.5} width="11" height="2.4" rx="1.2" fill={on} />}
    </svg>
  );
}

/** 一行开关：左边勾选框和名字，右边是它在聊天里长什么样。前面写「例：」，不然会被当成这段聊天的真实数字。 */
function ShowRow({ label, sample, checked, onChange }: { label: string; sample: ComponentChildren; checked: boolean; onChange: (v: boolean) => void }) {
  return <CheckRow label={<span class="rbt-show-row"><span>{label}</span><small>例：{sample}</small></span>} checked={checked} onChange={onChange} />;
}

/**
 * 在聊天里显示：放在最上面，平时收起来，右边写着现在开了哪些。
 * 点开后按位置分两组，每组标题前一个小示意图标出位置；每行右边是它在聊天里的样子。
 */
function ShowInChat() {
  void usageTick.value;
  const phone = isPhone();
  // 别人做的美化：每一楼用的是酒馆自带的用时和 tokens（写法也是酒馆的），不显示花费
  const ours = lookShown();
  const timer = timerOn(), tokens = tokensOn(), cost = costOn(), bird = birdOn();
  const on = [timer && U.showTimer, tokens && U.showTokens, cost && U.showCost, bird && U.showBird].filter(Boolean) as string[];
  return (
    <details class="rbt-sec rbt-show">
      <summary class="rbt-sec-h">
        <b>{U.showTitle}</b>
        <span class="rbt-show-sum">{on.length ? on.join(' · ') : U.showNone}</span>
        <i class="fa-solid fa-chevron-down rbt-show-ar" aria-hidden="true" />
      </summary>
      <div class="rbt-show-body">
      <div class="rbt-show-block">
      <div class="rbt-show-group"><PlaceIcon at="avatar" phone={phone} />{U.showUnderAvatar(phone)}</div>
      <div class="rbt-show-list">
        <ShowRow label={U.showTimer} sample={!ours ? '54.2s' : phone ? '54 秒' : '54秒'} checked={timer} onChange={setTimerOn} />
        <ShowRow label={U.showTokens} sample={phone && ours ? '949 tokens' : '949t'} checked={tokens} onChange={setTokensOn} />
        <ShowRow label={U.showCost} sample="$0.21" checked={cost} onChange={setCostOn} />
      </div>
      {!ours && <p class="rbt-show-note">{U.showOthersLook}</p>}
      </div>
      <div class="rbt-show-block">
      <div class="rbt-show-group"><PlaceIcon at="bottom" phone={phone} />{U.showBottom}</div>
      <div class="rbt-show-list">
        <ShowRow label={U.showBird} sample={<><i class="fa-solid fa-crow rbt-show-crow" />写完了 · 54 秒 · $0.21</>} checked={bird} onChange={setBirdOn} />
      </div>
      </div>
      </div>
    </details>
  );
}

export function FlowView() {
  const list = captures.value;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sub, setSub] = useState<'stack' | 'wi'>('stack');
  // 第二层页面：sent = 发给 AI 的每一条（从「上下文」进来）；chat = 整段聊天每一楼的图（从「整段聊天」卡片进来）
  const [page, setPage] = useState<'main' | 'sent' | 'chat'>('main');
  const go = (p: 'main' | 'sent' | 'chat') => { setPage(p); requestAnimationFrame(() => document.querySelector('.rbt-panel .rbt-flow')?.scrollIntoView({ block: 'start' })); };
  const back = <button type="button" class="rbt-back" onClick={() => go('main')}><i class="fa-solid fa-chevron-left" /> 花费明细</button>;
  // 从聊天里点了某一楼的用量（或图里的「看这一轮的明细」）：回到主页面，选这一楼最近的那一轮（这次打开酒馆以后才有；没有就照常显示最近一轮）
  const focus = flowFocus.value;
  if (focus != null) {
    const hit = list.find((c) => c.targetFloor === focus && c.genType !== 'quiet' && c.genType !== 'preview');
    flowFocus.value = null;
    if (hit && hit.id !== selectedId) setSelectedId(hit.id);
    if (page !== 'main') go('main');
  }
  // 默认打开最近一次自己的回复（不是插件在后台发的那几次）
  const cap = list.find((c) => c.id === selectedId) ?? list.find((c) => c.genType !== 'quiet') ?? list[0];
  const rows = useMemo(() => (cap ? groupRows(cap.result.messages) : []), [cap]);
  const prev = cap ? previousCapture(list, cap) : null;
  const brk = useMemo(() => (cap && prev ? cacheBreak(prev.result.messages, cap.result.messages) : null), [cap, prev]);

  if (page === 'chat') {
    return (
      <div class="rbt-flow">
        {back}
        <WholeChatPage />
      </div>
    );
  }
  if (!cap) {
    return (
      <div class="rbt-flow">
        {/* 刷新以后还没抓到过：「这一轮」那几块等发了消息才有，存档总览照常看 */}
        <div class="rbt-flow-g">
        <div class="rbt-flow-group">本轮</div>
        <section class="rbt-sec">
          {ctx().mainApi === 'openai' ? (
            <>
              <p class="rbt-sec-note">发一条消息后，这里会显示本轮的花费、输入和输出。也可以先预览下一轮会发什么，不花钱。</p>
              <div><PreviewButton onDone={() => setSelectedId(null)} /></div>
            </>
          ) : <p class="rbt-sec-note">本轮的明细只支持 Chat Completion 接口。</p>}
        </section>
        </div>
        <WholeChatGroup onOpen={() => go('chat')} />
        <ShowInChat />
      </div>
    );
  }
  const banner = bannerFor(cap, brk, prev);
  const { result } = cap;
  const globalWI = result.totals.wi_global;
  const globalBooks = [...new Set(cap.wi.filter((e) => e.category === 'wi_global').map((e) => e.book))];
  // 第二层：发给 AI 的每一条（从「上下文」最下面那一行进来）
  if (page === 'sent') {
    return (
      <div class="rbt-flow">
        {back}
        <section class="rbt-sec">
          <div class="rbt-sec-h">
            <b>发给 AI 的内容 · {roundTitle(cap)}</b>
            {!result.aligned && <Chip color="#c98a00" title="拿不到预设的结构，来源是按文字推测的">推测</Chip>}
          </div>
          <p class="rbt-sec-note">{result.messages.length} 条消息{cap.presetName ? ` · 预设「${cap.presetName}」` : ''}</p>
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
        </section>
      </div>
    );
  }


  return (
    <div class="rbt-flow">
      {/* 按多常看排：这一轮（每次都看）→ 存档总览（偶尔看一眼，图在第二层）→ 在聊天里显示（设好就不动）。
          「这一轮」那一组：先选第几楼，下面的提醒、花费、上下文、用时、发给 AI 的内容都只讲选中的这一轮 */}
      <div class="rbt-flow-g">
      <div class="rbt-flow-group">本轮</div>
      <div class="rbt-toolbar">
        <select class="text_pole rbt-select" value={cap.id} onChange={(e) => setSelectedId(Number((e.currentTarget as HTMLSelectElement).value))}>
          {list.map((c) => <option key={c.id} value={c.id}>{roundTitle(c)}</option>)}
        </select>
        <PreviewButton onDone={() => setSelectedId(null)} />
      </div>
      {cap.genType === 'preview' && (
        <div class="rbt-hint">这是预览，没有发给 AI。预览时看不到具体触发了哪些世界书条目，发一条消息后就能看到。</div>
      )}
      <Banner data={banner} />
      {globalWI > 0 && (
        <div class="rbt-warn">全局世界书「{globalBooks.join('、')}」也发给了 AI，约 {globalWI} tokens。不是这张卡用的话，请把它关掉。</div>
      )}
      <RoundCostSection cap={cap} />
      <ContextSection cap={cap} brk={brk} onOpenSent={() => go('sent')} />
      <TimeSection cap={cap} />
      </div>
      <WholeChatGroup onOpen={() => go('chat')} />
      <ShowInChat />
    </div>
  );
}
