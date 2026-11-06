/**
 * Prompt attribution: given the final chat-completion messages that SillyTavern is about to
 * send, work out where every piece of text came from (preset, character card, which lorebook,
 * which chat floor, which extension injection...).
 *
 * Pure function: all ST state is passed in through AttributionInput, so it can be unit-tested.
 */
import { contentToText, estimateTokens, looseNormalize, nonSpaceLength } from './text';

export type Category =
  | 'preset'
  | 'character'
  | 'persona'
  | 'wi_global'
  | 'wi_character'
  | 'wi_chat'
  | 'wi_persona'
  | 'wi_other'
  | 'chat_user'
  | 'chat_char'
  | 'extension'
  | 'unknown';

export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  preset: { label: '预设', color: '#8b7cf6' },
  character: { label: '角色卡', color: '#f0a43a' },
  persona: { label: '用户设定', color: '#38b6e8' },
  wi_character: { label: '世界书·角色', color: '#2fbf8f' },
  wi_chat: { label: '世界书·聊天', color: '#7fd16b' },
  wi_persona: { label: '世界书·用户', color: '#5fc9c0' },
  wi_global: { label: '世界书·全局', color: '#e5484d' },
  wi_other: { label: '世界书·其他', color: '#4a9c7a' },
  chat_user: { label: '聊天·用户', color: '#9aa7b8' },
  chat_char: { label: '聊天·角色', color: '#c3ccd8' },
  extension: { label: '扩展注入', color: '#e86ab0' },
  unknown: { label: '未识别', color: '#666d78' },
};

export const CATEGORY_ORDER: Category[] = [
  'preset', 'character', 'persona', 'wi_character', 'wi_chat', 'wi_persona', 'wi_global', 'wi_other',
  'extension', 'chat_user', 'chat_char', 'unknown',
];

export interface PresetPromptInfo {
  identifier: string;
  name: string;
  /** Content after macro substitution (best effort). */
  content: string;
  marker: boolean;
  absolute: boolean;
  depth: number;
}

export interface WIEntryInfo {
  key: string;
  book: string;
  title: string;
  content: string;
  category: Category;
  position?: number;
  depth?: number;
}

export interface ExtensionPromptInfo {
  key: string;
  value: string;
  inChat: boolean;
  depth: number;
}

export interface ChatMessageInfo {
  index: number;
  isUser: boolean;
  name: string;
  text: string;
}

export interface AttributionInput {
  chat: { role: string; content: unknown }[];
  /** identifier for each chat message, from ST's prompt manager; null if it could not be aligned. */
  identifiers: (string | undefined)[] | null;
  presetPrompts: PresetPromptInfo[];
  overridden: string[];
  wiEntries: WIEntryInfo[];
  extensionPrompts: ExtensionPromptInfo[];
  chatMessages: ChatMessageInfo[];
  card: { name: string; depthPrompt?: string } | null;
  persona: string;
}

export interface Segment {
  start: number;
  end: number;
  category: Category;
  label: string;
  refKey?: string;
  tokens: number;
}

export type MessageKind = 'prompt' | 'marker' | 'chat' | 'injection' | 'utility' | 'extension' | 'unknown';

export interface AttributedMessage {
  index: number;
  role: string;
  content: string;
  identifier?: string;
  kind: MessageKind;
  category: Category;
  label: string;
  chatIndex?: number;
  /** For in-chat injections: number of chat messages after it (ST "depth"). */
  depth?: number;
  segments: Segment[];
  tokens: number;
}

export interface AttributionResult {
  messages: AttributedMessage[];
  totals: Record<Category, number>;
  totalTokens: number;
  aligned: boolean;
}

// --------------------------------------------------------------- labels ---

const ID_INFO: Record<string, { category: Category; label: string; kind: MessageKind }> = {
  worldInfoBefore: { category: 'wi_other', label: '世界书（角色定义前）', kind: 'marker' },
  worldInfoAfter: { category: 'wi_other', label: '世界书（角色定义后）', kind: 'marker' },
  charDescription: { category: 'character', label: '角色描述', kind: 'marker' },
  charPersonality: { category: 'character', label: '角色性格', kind: 'marker' },
  scenario: { category: 'character', label: '场景', kind: 'marker' },
  personaDescription: { category: 'persona', label: '用户设定', kind: 'marker' },
  newMainChat: { category: 'preset', label: '新聊天提示', kind: 'utility' },
  newChat: { category: 'preset', label: '新示例对话提示', kind: 'utility' },
  groupNudge: { category: 'preset', label: '群聊提示', kind: 'utility' },
  continueNudge: { category: 'preset', label: '继续提示', kind: 'utility' },
  impersonate: { category: 'preset', label: '扮演用户提示', kind: 'utility' },
  quietPrompt: { category: 'extension', label: '后台生成提示（quiet）', kind: 'utility' },
  bias: { category: 'preset', label: '回复开头（bias）', kind: 'utility' },
  continuePrefill: { category: 'chat_char', label: '继续生成的前文', kind: 'utility' },
  emptyUserMessageReplacement: { category: 'preset', label: '空消息替代', kind: 'utility' },
  authorsNote: { category: 'extension', label: '作者注释', kind: 'extension' },
  summary: { category: 'extension', label: '总结（Summarize）', kind: 'extension' },
  vectorsMemory: { category: 'extension', label: '向量记忆', kind: 'extension' },
  vectorsDataBank: { category: 'extension', label: '向量资料库', kind: 'extension' },
  smartContext: { category: 'extension', label: 'Smart Context', kind: 'extension' },
};

export function extensionPromptLabel(key: string): { category: Category; label: string } {
  if (key === '2_floating_prompt') return { category: 'extension', label: '作者注释' };
  if (key === '1_memory') return { category: 'extension', label: '总结（Summarize）' };
  if (key === 'DEPTH_PROMPT') return { category: 'character', label: '角色卡深度提示词' };
  if (key === 'PERSONA_DESCRIPTION') return { category: 'persona', label: '用户设定（按深度）' };
  if (key.startsWith('customDepthWI')) return { category: 'wi_other', label: '世界书 @深度' };
  if (/vector/i.test(key)) return { category: 'extension', label: `向量 · ${key}` };
  return { category: 'extension', label: `扩展 · ${key}` };
}

// ------------------------------------------------------------ painting ---

interface Known {
  text: string;
  category: Category;
  label: string;
  refKey?: string;
  /** Higher priority paints first and wins overlaps. */
  priority: number;
  /** Counts as an in-chat injection when deciding whether a chat-history slot is injected. */
  injection: boolean;
}

function findRange(content: string, text: string): [number, number] | null {
  const t = text.trim();
  if (t.length < 2) return null;
  let i = content.indexOf(t);
  if (i >= 0) return [i, i + t.length];
  // Long texts may be altered by macros/EJS in the middle: anchor on the first substantial line.
  if (t.length > 60) {
    const firstLine = t.split('\n').map((l) => l.trim()).find((l) => l.length >= 12 && !/[{<]/.test(l));
    if (firstLine) {
      i = content.indexOf(firstLine);
      if (i >= 0) return [i, Math.min(content.length, i + t.length)];
    }
  }
  return null;
}

function paint(content: string, knowns: Known[]): Int32Array {
  const owner = new Int32Array(content.length).fill(-1);
  const order = knowns
    .map((k, i) => ({ k, i }))
    .sort((a, b) => b.k.priority - a.k.priority || b.k.text.length - a.k.text.length);
  for (const { k, i } of order) {
    const r = findRange(content, k.text);
    if (!r) continue;
    for (let p = r[0]; p < r[1]; p++) if (owner[p] === -1) owner[p] = i;
  }
  return owner;
}

function segmentsFrom(
  content: string,
  owner: Int32Array,
  knowns: Known[],
  base: { category: Category; label: string; refKey?: string },
): Segment[] {
  const segs: Segment[] = [];
  let start = 0;
  for (let p = 1; p <= content.length; p++) {
    if (p === content.length || owner[p] !== owner[start]) {
      const o = owner[start];
      const k = o >= 0 ? knowns[o] : undefined;
      const text = content.slice(start, p);
      if (k || nonSpaceLength(text) > 0) {
        segs.push({
          start,
          end: p,
          category: k?.category ?? base.category,
          label: k?.label ?? base.label,
          refKey: k?.refKey ?? base.refKey,
          tokens: estimateTokens(text),
        });
      }
      start = p;
    }
  }
  // Merge whitespace-only gaps into neighbours with the same owner label.
  const merged: Segment[] = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && last.label === s.label && last.category === s.category && last.refKey === s.refKey) {
      last.end = s.end;
      last.tokens += s.tokens;
    } else merged.push({ ...s });
  }
  return merged;
}

// ------------------------------------------------------------ matching ---

function probes(text: string): string[] {
  const n = looseNormalize(text);
  if (n.length <= 16) return n.length >= 2 ? [n] : [];
  const mid = Math.floor(n.length / 2);
  return [n.slice(0, 16), n.slice(mid - 8, mid + 8), n.slice(-16)];
}

function similar(promptText: string, chatText: string): boolean {
  const hay = looseNormalize(promptText);
  return probes(chatText).some((p) => hay.includes(p));
}

// ---------------------------------------------------------------- main ---

export function attribute(input: AttributionInput): AttributionResult {
  const presetById = new Map(input.presetPrompts.map((p) => [p.identifier, p]));
  const knowns: Known[] = [];

  for (const e of input.wiEntries) {
    if (e.content.trim()) {
      knowns.push({ text: e.content, category: e.category, label: `${e.book} · ${e.title}`, refKey: e.key, priority: 3, injection: true });
    }
  }
  for (const ep of input.extensionPrompts) {
    if (!ep.value.trim()) continue;
    if (ep.key.startsWith('customDepthWI')) {
      // Combined text of all @depth lorebook entries at one depth. Individual entries (priority 3)
      // win where known; this fills in when entry details are missing (e.g. dry-run previews).
      knowns.push({ text: ep.value, category: 'wi_other', label: `世界书 @深度 ${ep.depth}`, priority: 1, injection: true });
      continue;
    }
    const { category, label } = extensionPromptLabel(ep.key);
    knowns.push({ text: ep.value, category, label, priority: 2, injection: ep.inChat });
  }
  for (const p of input.presetPrompts) {
    if (p.absolute && !p.marker && p.content.trim()) {
      knowns.push({ text: p.content, category: 'preset', label: `${p.name}（@深度 ${p.depth}）`, refKey: p.identifier, priority: 2, injection: true });
    }
  }
  if (input.card?.depthPrompt?.trim()) {
    knowns.push({ text: input.card.depthPrompt, category: 'character', label: '角色卡深度提示词', priority: 2, injection: true });
  }
  if (!input.identifiers) {
    // Without structural info, also try to recognise top-level prompts by their text.
    for (const p of input.presetPrompts) {
      if (!p.absolute && !p.marker && p.content.trim()) {
        knowns.push({ text: p.content, category: 'preset', label: p.name, refKey: p.identifier, priority: 1, injection: false });
      }
    }
    if (input.persona.trim()) knowns.push({ text: input.persona, category: 'persona', label: '用户设定', priority: 1, injection: false });
  }

  const draft = input.chat.map((m, index) => {
    const content = contentToText(m.content);
    const identifier = input.identifiers?.[index];
    const owner = paint(content, knowns);
    let injected = 0;
    for (let p = 0; p < content.length; p++) {
      const o = owner[p];
      if (o >= 0 && knowns[o].injection && content.charCodeAt(p) > 32) injected++;
    }
    const coverage = injected / Math.max(1, nonSpaceLength(content));
    return { index, role: m.role, content, identifier, owner, coverage };
  });

  // Decide the base meaning of every message.
  type Base = { kind: MessageKind; category: Category; label: string; refKey?: string };
  const bases: (Base | 'chat?')[] = draft.map((d) => {
    const id = d.identifier;
    if (id === undefined) {
      if ((d.role === 'user' || d.role === 'assistant') && d.coverage < 0.5) return 'chat?';
      if (d.coverage >= 0.5) return { kind: 'injection', category: 'unknown', label: '注入内容' };
      return { kind: 'unknown', category: 'unknown', label: '未识别' };
    }
    if (id.startsWith('chatHistory')) {
      // Real chat floors are user/assistant; system-role slots in the history are always injections.
      const isChatRole = d.role === 'user' || d.role === 'assistant';
      return d.coverage >= 0.5 || !isChatRole ? { kind: 'injection', category: 'unknown', label: '深度注入' } : 'chat?';
    }
    if (id.startsWith('dialogueExamples')) return { kind: 'marker', category: 'character', label: '示例对话' };
    if (id === 'main' && input.overridden.includes('main')) {
      return { kind: 'prompt', category: 'character', label: '角色卡系统提示词（覆盖了预设主提示词）' };
    }
    if (id === 'jailbreak' && input.overridden.includes('jailbreak')) {
      return { kind: 'prompt', category: 'character', label: '角色卡后历史指令（覆盖了预设）' };
    }
    if (ID_INFO[id]) return { ...ID_INFO[id] };
    const p = presetById.get(id);
    if (p) return { kind: 'prompt', category: 'preset', label: p.name, refKey: p.identifier };
    const ext = extensionPromptLabel(id);
    return { kind: 'extension', category: ext.category, label: ext.label };
  });

  // Map chat-history slots onto real chat floors, walking backwards from the newest message.
  const chatSlots = bases.map((b, i) => (b === 'chat?' ? i : -1)).filter((i) => i >= 0);
  const floorOf = new Map<number, ChatMessageInfo>();
  const orphanSlots = new Set<number>();
  let ptr = input.chatMessages.length - 1;
  for (let s = chatSlots.length - 1; s >= 0; s--) {
    const slot = chatSlots[s];
    if (ptr < 0) { orphanSlots.add(slot); continue; }
    let found = -1;
    for (let k = ptr; k >= Math.max(0, ptr - 3); k--) {
      if (similar(draft[slot].content, input.chatMessages[k].text)) { found = k; break; }
    }
    // More slots than floors left and this one matches nothing → it is not a chat floor.
    if (found < 0 && s + 1 > ptr + 1) { orphanSlots.add(slot); continue; }
    const pick = found >= 0 ? found : ptr;
    floorOf.set(slot, input.chatMessages[pick]);
    ptr = pick - 1;
  }

  const messages: AttributedMessage[] = draft.map((d, i) => {
    let base = bases[i];
    let chatIndex: number | undefined;
    if (base === 'chat?' && orphanSlots.has(i)) {
      base = { kind: 'injection', category: 'unknown', label: '没对上楼层的消息' };
    }
    if (base === 'chat?') {
      const floor = floorOf.get(i);
      chatIndex = floor?.index;
      const isUser = floor ? floor.isUser : d.role === 'user';
      base = {
        kind: 'chat',
        category: isUser ? 'chat_user' : 'chat_char',
        label: floor ? `#${floor.index} ${floor.name}` : (d.role === 'user' ? '用户消息' : '角色消息'),
      };
    }
    const segments = segmentsFrom(d.content, d.owner, knowns, base);
    // An injection's own label is whatever source dominates it.
    if (base.kind === 'injection' && segments.length) {
      const top = [...segments].sort((a, b) => b.tokens - a.tokens)[0];
      base = { ...base, category: top.category, label: top.label };
    }
    return {
      index: i,
      role: d.role,
      content: d.content,
      identifier: d.identifier,
      kind: base.kind,
      category: base.category,
      label: base.label,
      chatIndex,
      segments,
      tokens: segments.reduce((n, s) => n + s.tokens, 0),
    };
  });

  // Depth of in-chat injections = number of real chat messages after them.
  let after = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.kind === 'chat') after++;
    else if (m.kind === 'injection') m.depth = after;
  }

  const totals = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<Category, number>;
  for (const m of messages) for (const s of m.segments) totals[s.category] += s.tokens;
  const totalTokens = messages.reduce((n, m) => n + m.tokens, 0);
  return { messages, totals, totalTokens, aligned: input.identifiers !== null };
}
