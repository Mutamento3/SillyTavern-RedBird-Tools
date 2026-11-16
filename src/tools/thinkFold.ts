/**
 * 收起回复开头的思考过程。只改两处「副本」，消息原文和酒馆设置都不动，关掉就和没开过一样：
 * - 画消息时：酒馆的消息格式化钩子（正则之后）把开头的思考块切走，Markdown 之后拼成一个收起的框。
 *   预设自带正则已经藏起来 / 美化过的，到这一步已经没有标签，自然不会动；酒馆的「自动解析」挪走了的也一样。
 * - 发给 AI 前：generate_interceptor 拿到的是聊天记录的副本（酒馆已经跑完只发送正则），去掉旧回复开头的思考块。
 * 钩子是 2026-05 加进酒馆的（1.19 起）；更老的酒馆没有，整个功能不启用。
 */
import { DEFAULT_THINK_TAGS, partialThinkOpen, prefixTag, splitThink } from '../core/think';
import { ctx, escHtml, settings, type Any } from '../st/st';
import { openDrawer } from '../shell/drawers';

/** 正则之后到 Markdown 之后，思考块先换成这个记号，Markdown 不会改动它 */
const MARK = 'RBTTHINKFOLDMARK';
/** 同一次格式化里，正则之后切下来的思考块，等 Markdown 之后拼回去（酒馆的格式化是同步的） */
let pending: { think: string; closed: boolean } | null = null;
/** 玩家展开过的（按消息序号）：生成中每次刷新都会重画，不记着就会自己收回去 */
const opened = new Set<number>();

/** 现在当作思考的标签：设置里的名单，加上酒馆「推理」里填的前缀。 */
export function thinkTags(): string[] {
  const tags = [...(settings().thinkTags ?? DEFAULT_THINK_TAGS)];
  const own = prefixTag(String(ctx().powerUserSettings?.reasoning?.prefix ?? ''));
  if (own && !tags.includes(own)) tags.push(own);
  return tags;
}

export function thinkFoldSupported(): boolean {
  return typeof ctx().messageFormatter?.addHook === 'function';
}

/** 这条消息正在流式生成（没写完的思考块才是「思考中」；停了、断了就不是）。 */
function generating(id: number): boolean {
  const sp = ctx().streamingProcessor;
  return !!sp && Number(sp.messageId) === id && !sp.isFinished && !sp.isStopped;
}

function foldHtml(think: string, closed: boolean, id: number): string {
  const open = id >= 0 && opened.has(id) ? ' open' : '';
  const stopped = !closed && !generating(id);
  // 停在思考中途：框外面放「继续生成」，不用展开就看得到。只有最后一条能接着写。
  const last = id === (ctx().chat?.length ?? 0) - 1;
  return `<details class="rbt-think"${open} data-rbt-mesid="${id}"><summary>${closed ? '思考过程' : stopped ? '思考到一半停了' : '思考中…'}</summary>`
    + `<div class="rbt-think-body">${escHtml(think.trim())}</div>`
    + '<div class="rbt-think-foot"><span class="rbt-think-set">在设置里修改 ›</span></div></details>'
    + (stopped && last ? '<div class="rbt-think-stop"><span class="rbt-think-go">继续生成</span></div>' : '');
}

/** 打开扩展设置里工具箱的「聊天」分组（思考框底部那行字点进来）。 */
function openThinkSettings(): void {
  openDrawer('extensions');
  setTimeout(() => {
    const box = document.getElementById('rbt_settings');
    const content = box?.querySelector<HTMLElement>('.inline-drawer-content');
    if (content && getComputedStyle(content).display === 'none') box?.querySelector<HTMLElement>('.inline-drawer-toggle')?.click();
    setTimeout(() => document.getElementById('rbt_chat_group')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 200);
  }, 300);
}

/** 设置改了：重画开头是思考块的消息（只重画这些，别的消息里有前端界面，重画会重新加载）。 */
export function refreshThinkFold(oldTags: readonly string[] = thinkTags()): void {
  const c = ctx();
  const tags = thinkTags();
  (c.chat as Any[] ?? []).forEach((m, id) => {
    if (m?.is_user || m?.is_system) return;
    const text = String(m?.extra?.display_text ?? m?.mes ?? '');
    if (splitThink(text, oldTags) || splitThink(text, tags)) c.updateMessageBlock?.(id, m);
  });
}

export function installThinkFold(): void {
  const c = ctx();
  const mf = c.messageFormatter;
  if (!thinkFoldSupported()) {
    console.info('[RedBird] 酒馆没有消息格式化钩子（1.19 以前），不收起思考过程');
    return;
  }
  mf.addHook((mes: string, f: Any) => {
    pending = null;
    if (!settings().thinkFold || f.isUser || f.isSystem || f.isReasoning) return mes;
    const tags = thinkTags();
    const s = splitThink(mes, tags);
    if (!s) return partialThinkOpen(mes, tags) ? '' : mes;
    pending = { think: s.think, closed: s.closed };
    return `${s.lead}${MARK}\n\n${s.rest.replace(/^\s+/, '')}`;
  }, { stage: mf.stage.AFTER_REGEX });
  mf.addHook((html: string, f: Any) => {
    const p = pending;
    pending = null;
    if (!p || !html.includes(MARK)) return html;
    return html.replace(new RegExp(`<p>\\s*${MARK}\\s*</p>|${MARK}`), () => foldHtml(p.think, p.closed, Number(f.messageId)));
  }, { stage: mf.stage.AFTER_MARKDOWN });

  // 酒馆会给消息里的 class 加上 custom- 前缀（见 CSS）
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest('.custom-rbt-think-set')) { e.preventDefault(); openThinkSettings(); return; }
    if (t?.closest('.custom-rbt-think-go')) { e.preventDefault(); void ctx().executeSlashCommandsWithOptions?.('/continue'); return; }
    const sum = t?.closest('.custom-rbt-think > summary');
    if (!sum) return;
    const box = sum.parentElement as HTMLDetailsElement;
    const id = Number(box.dataset.rbtMesid);
    // click 在展开 / 收起之前触发
    if (id >= 0) { if (box.open) opened.delete(id); else opened.add(id); }
  });

  // 发给 AI 的那份：去掉旧回复开头已经写完的思考块（继续生成时，最后一条是接着写的，不动）
  (globalThis as Any).rbtThinkInterceptor = (chat: Any[], _size: number, _abort: unknown, type: string) => {
    if (!settings().thinkFold) return;
    const tags = thinkTags();
    chat.forEach((m, i) => {
      if (!m || m.is_user || m.is_system || typeof m.mes !== 'string') return;
      if (type === 'continue' && i === chat.length - 1) return;
      const s = splitThink(m.mes, tags);
      if (s?.closed) m.mes = (s.lead + s.rest).replace(/^\s+/, '');
    });
  };
  // 生成停了（点停止、出错）：酒馆不一定重画最后一条，「思考中…」会一直留着。停了以后重画一次。
  const redrawLast = () => setTimeout(() => {
    const id = (c.chat?.length ?? 0) - 1;
    const m = c.chat?.[id];
    if (!m || m.is_user || m.is_system || !settings().thinkFold) return;
    const s = splitThink(String(m.extra?.display_text ?? m.mes ?? ''), thinkTags());
    if (s && !s.closed) c.updateMessageBlock?.(id, m);
  }, 300);
  for (const k of ['GENERATION_STOPPED', 'GENERATION_ENDED']) {
    const ev = c.eventTypes?.[k];
    if (ev) c.eventSource?.on(ev, redrawLast);
  }
  // 工具箱加载前已经画好的消息
  refreshThinkFold();
}
