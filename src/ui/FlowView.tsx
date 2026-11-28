import { useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { buildSent, type SentItem } from '../core/sentItems';
import { captures, currentChat, flowFocus, previewBusy, previewNextPrompt, type Capture } from '../tools/flow/capture';
import { ctx, toast } from '../st/st';
import { birdOn, costOn, floorOn, setBirdOn, setCostOn, setFloorOn, setTimerOn, setTokensOn, timerOn, tokensOn, usageTick } from '../tools/flow/usage';
import { isPhone } from './Menu';
import { lookShown } from '../look/look';
import { Banner, Big, WholeChatGroup, WholeChatPage, ContextSection, ContextZoom, OutputSection, RoundCostSection, TimeSection, UnitToggle, bannerFor, cacheBreak, previousCapture, roundTitle, showPct, vsLast } from './FlowRound';
import { USAGE_COPY as U } from './copy';
import { SentItemPage, SentList, wiInfo } from './FlowSent';

/** 「第 23 楼（AI 回复）」：这一轮写的是哪一楼、谁写的 */
function floorText(c: Capture): string {
  if (c.genType === 'preview') return '下一轮（预览，未发送）';
  const who: Record<string, string> = { swipe: 'AI 回复 · 重新生成', regenerate: 'AI 回复 · 重新生成', continue: 'AI 回复 · 继续', impersonate: '用户 · AI 代写' };
  return `${c.targetFloor != null ? `第 ${c.targetFloor} 楼` : '新的一楼'}（${who[c.genType] ?? 'AI 回复'}）`;
}

/** 发给 AI 的时间：今天写「今天 02:10」，别的日子写「11-27 02:10」 */
function sentAt(t: Date): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  const hm = `${p2(t.getHours())}:${p2(t.getMinutes())}`;
  return new Date().toDateString() === t.toDateString() ? `今天 ${hm}` : `${p2(t.getMonth() + 1)}-${p2(t.getDate())} ${hm}`;
}

/** 这一轮输入的总 Token：接口给的准数，没有就用估算 */
const inputOf = (c: Capture): number => c.usage?.input || c.result.totalTokens;

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
import { CheckRow, Chip } from './common';

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
  const floor = floorOn(), timer = timerOn(), tokens = tokensOn(), cost = costOn(), bird = birdOn();
  const on = [floor && U.showFloor, timer && U.showTimer, tokens && U.showTokens, cost && U.showCost, bird && U.showBird].filter(Boolean) as string[];
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
        <ShowRow label={U.showFloor} sample="#23" checked={floor} onChange={setFloorOn} />
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
  // 只看当前存档的轮次（换了存档，上一个存档的本轮不显示在这里）
  const chatId = currentChat.value;
  const list = captures.value.filter((c) => c.chatId === chatId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // 第二层：sent = 按发送顺序看全部内容（从「输入」进来），chat = 整段聊天每一楼的图；第三层：item = 某一条的全文
  const [page, setPage] = useState<'main' | 'sent' | 'chat' | 'item'>('main');
  // 第三层打开的是哪一条：记 key，每次从当前这一轮的列表里找（来了新的一轮，就显示新一轮里的这一条；找不到回第二层）
  const [itemKey, setItemKey] = useState<string | null>(null);
  // 换了存档：回到第一层，不留上一个存档选中的轮次和打开的那一条
  const [shownChat, setShownChat] = useState(chatId);
  if (shownChat !== chatId) { setShownChat(chatId); setPage('main'); setItemKey(null); setSelectedId(null); }
  // 「输入内容」每一行写 Token 还是百分比：记住上次选的
  const go = (p: 'main' | 'sent' | 'chat' | 'item') => { setPage(p); requestAnimationFrame(() => document.querySelector('.rbt-panel .rbt-flow')?.scrollIntoView({ block: 'start' })); };
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
  const prev = cap ? previousCapture(list, cap) : null;
  const brk = useMemo(() => (cap && prev ? cacheBreak(prev.result.messages, cap.result.messages) : null), [cap, prev]);
  const sent = useMemo(() => (cap ? buildSent(
    { messages: cap.result.messages, wi: wiInfo(cap.wi), total: inputOf(cap) },
    prev ? { messages: prev.result.messages, wi: wiInfo(prev.wi), total: inputOf(prev) } : null,
  // 接口的用量是回复写完后才挂到同一个对象上的：总数变了也要重算
  ) : null), [cap, prev, cap && inputOf(cap), prev && inputOf(prev)]);

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
              <p class="rbt-sec-note">发一条消息后，这里会显示本轮的花费、输入和回复。也可以先预览下一轮会发什么，不花钱。</p>
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
  // 第三层：某一条的全文
  const item = page === 'item' && sent ? sent.items.find((it) => it.key === itemKey) : undefined;
  if (item) {
    return (
      <div class="rbt-flow">
        <button type="button" class="rbt-back" onClick={() => go('sent')}><i class="fa-solid fa-chevron-left" /> 输入明细</button>
        <section class="rbt-sec"><SentItemPage it={item} presetName={cap.presetName} /></section>
      </div>
    );
  }
  // 第二层：输入明细（从「输入」卡片的「查看输入明细」或缓存提醒进来）
  if ((page === 'sent' || page === 'item') && sent) {
    return (
      <div class="rbt-flow">
        {back}
        {/* 上下文长度条、虚线、组成条故意排得紧，看得出是一组：ui-audit 不查这张卡片的间距 */}
        <section class="rbt-sec" data-lint-spacing="ok">
          {/* 标题只写这一页是什么；是哪一轮、哪个预设写在下面 */}
          <div class="rbt-sec-h">
            <b>输入明细</b>
            {!result.aligned && <Chip color="#c98a00" title="拿不到预设的结构，来源是按文字推测的">推测</Chip>}
            <span class="rbt-push"><UnitToggle /></span>
          </div>
          {/* 一行一件事：哪一楼（谁写的）、什么时候发给 AI 的、用的哪个预设 */}
          <div class="rbt-sent-meta">
            <span>楼层</span><span>{floorText(cap)}</span>
            {cap.genType !== 'preview' && <><span>发送时间</span><span>{sentAt(cap.time)}</span></>}
            {cap.presetName && <><span>预设</span><span>{cap.presetName}</span></>}
          </div>
          <div class="rbt-in-top">
            <Big value={`${cap.usage?.input ? '' : '约 '}${sent.total.toLocaleString('en-US')}`} unit="Token" />
            {sent.delta !== null && <span class="rbt-in-cmp">{vsLast(sent.delta)}</span>}
          </div>
          {/* 上下文长度条 → 放大「本轮输入」→ 按来源的组成条；下面是按发送顺序的每一条。
              括号：接口给了缓存就画实际缓存了多少；否则画和上一轮开头相同、可走缓存的那一段 */}
          <ContextZoom cap={cap} used={sent.total} bracket={cap.usage?.cached != null ? { tokens: cap.usage.cached, label: `已缓存 ${cap.usage.cached.toLocaleString('en-US')}` }
            : prev ? { tokens: sent.same, label: `可走缓存 约 ${sent.same.toLocaleString('en-US')}` } : null} />
        </section>
        {/* 每一条单独一张卡片：上面看总量，这里看具体是哪一条。标题下那句说明故意紧贴标题：ui-audit 不查这张卡片的间距 */}
        <section class="rbt-sec" data-lint-spacing="ok">
          <div class="rbt-sec-h">
            <b>输入内容</b>
            <UnitToggle />
          </div>
          <p class="rbt-sec-note rbt-sent-order">从上到下是实际发送顺序。</p>
          <SentList v={sent} onOpen={(it) => { setItemKey(it.key); go('item'); }} pct={showPct.value} />
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
          {/* 只列回复和预览：插件后台调用的花费已经在「花费」表里单独列出 */}
          {list.filter((c) => c.genType !== 'quiet' || c.id === cap.id).map((c) => <option key={c.id} value={c.id}>{roundTitle(c)}</option>)}
        </select>
        <PreviewButton onDone={() => setSelectedId(null)} />
      </div>
      {cap.genType === 'preview' && (
        <div class="rbt-hint">这是预览，没有发给 AI。预览时看不到具体触发了哪些世界书条目，发一条消息后就能看到。</div>
      )}
      <Banner data={banner} onOpenSent={() => go('sent')} />
      {globalWI > 0 && (
        <div class="rbt-warn">全局世界书「{globalBooks.join('、')}」也发给了 AI，约 {globalWI} tokens。不是这张卡用的话，请把它关掉。</div>
      )}
      <RoundCostSection cap={cap} />
      {sent && <ContextSection cap={cap} v={sent} onOpenSent={() => go('sent')} />}
      <OutputSection cap={cap} />
      <TimeSection cap={cap} />
      </div>
      <WholeChatGroup onOpen={() => go('chat')} />
      <ShowInChat />
    </div>
  );
}
