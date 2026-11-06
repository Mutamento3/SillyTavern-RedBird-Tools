/**
 * 信息流：capture every real chat-completion request and attribute its pieces to sources.
 */
import { signal } from '@preact/signals';
import { alignIdentifiers, type StructuredMessage } from '../../core/align';
import {
  attribute,
  type AttributionResult,
  type Category,
  type ChatMessageInfo,
  type ExtensionPromptInfo,
  type PresetPromptInfo,
  type WIEntryInfo,
} from '../../core/attribute';
import { contentToText } from '../../core/text';
import { charaFileName, ctx, currentCharacter, loaded, substitute, type Any } from '../../st/st';

export interface ActivatedWI extends WIEntryInfo {
  uid: string;
  keys: string[];
  matchedKeys: string[];
  constant: boolean;
  order: number;
}

export interface Capture {
  id: number;
  time: Date;
  chatId: string;
  genType: string;
  genTypeLabel: string;
  targetFloor: number | null;
  presetName: string;
  cardName: string;
  result: AttributionResult;
  wi: ActivatedWI[];
  rawChat: { role: string; content: string }[];
}

export const captures = signal<Capture[]>([]);
const MAX_CAPTURES = 40;
let nextId = 1;

let pendingWI: Any[] = [];
let lastGen: { type: string; quiet: boolean } = { type: 'normal', quiet: false };

const GEN_LABELS: Record<string, string> = {
  normal: '正常发送',
  swipe: '重新生成（滑动）',
  regenerate: '重新生成',
  continue: '继续',
  impersonate: '扮演用户',
  quiet: '后台生成',
  preview: '预览',
  ask_command: '/ask',
};

// ------------------------------------------------------------- scopes ---

export interface BookScopes {
  global: Set<string>;
  character: Set<string>;
  chat: Set<string>;
  persona: Set<string>;
}

export function currentBookScopes(): BookScopes {
  const c = ctx();
  const wi = loaded.worldInfo;
  const char = currentCharacter();
  const character = new Set<string>();
  if (char) {
    const linked = char.data?.extensions?.world;
    if (linked) character.add(linked);
    const extra = wi?.world_info?.charLore?.find((e: Any) => e.name === charaFileName(char.avatar));
    for (const b of extra?.extraBooks ?? []) character.add(b);
  }
  const chatBook = c.chatMetadata?.world_info;
  const personaBook = c.powerUserSettings?.persona_description_lorebook;
  return {
    global: new Set<string>(wi?.selected_world_info ?? []),
    character,
    chat: new Set<string>(chatBook ? [chatBook] : []),
    persona: new Set<string>(personaBook ? [personaBook] : []),
  };
}

export function bookCategory(book: string, scopes: BookScopes): Category {
  if (scopes.chat.has(book)) return 'wi_chat';
  if (scopes.character.has(book)) return 'wi_character';
  if (scopes.persona.has(book)) return 'wi_persona';
  if (scopes.global.has(book)) return 'wi_global';
  return 'wi_other';
}

// ------------------------------------------------------------ helpers ---

function keyMatches(key: string, haystack: string): boolean {
  const m = key.match(/^\/([\s\S]+)\/([a-z]*)$/i);
  if (m) {
    try {
      return new RegExp(m[1], m[2].replace(/g/g, '')).test(haystack);
    } catch {
      return false;
    }
  }
  return haystack.toLowerCase().includes(key.toLowerCase());
}

function collectWI(entries: Any[], scopes: BookScopes, chat: Any[]): ActivatedWI[] {
  const depth = Number(loaded.worldInfo?.world_info_depth ?? 2);
  return entries.map((e: Any) => {
    const scanDepth = typeof e.scanDepth === 'number' ? e.scanDepth : depth;
    const recent = chat.filter((m: Any) => !m.is_system).slice(-Math.max(1, scanDepth)).map((m: Any) => m.mes ?? '').join('\n');
    const keys: string[] = Array.isArray(e.key) ? e.key.filter(Boolean) : [];
    const book = String(e.world ?? '');
    return {
      key: `${book}:${e.uid}`,
      uid: String(e.uid),
      book,
      title: e.comment || keys.slice(0, 3).join(', ') || `#${e.uid}`,
      content: substitute(String(e.content ?? '')),
      category: bookCategory(book, scopes),
      position: typeof e.position === 'number' ? e.position : undefined,
      depth: typeof e.depth === 'number' ? e.depth : undefined,
      keys,
      matchedKeys: keys.filter((k) => keyMatches(k, recent)),
      constant: !!e.constant,
      order: Number(e.order ?? 100),
    };
  });
}

function flattenCollection(coll: Any, out: StructuredMessage[] = []): StructuredMessage[] {
  for (const item of coll?.collection ?? []) {
    if (Array.isArray(item?.collection)) flattenCollection(item, out);
    else if (item && (item.content || item.tool_calls)) out.push({ identifier: item.identifier, content: item.content });
  }
  return out;
}

function presetPrompts(): { prompts: PresetPromptInfo[]; overridden: string[] } {
  const pm = loaded.openai?.promptManager;
  const c = ctx();
  const list: Any[] = c.chatCompletionSettings?.prompts ?? [];
  const prompts: PresetPromptInfo[] = [];
  for (const p of list) {
    if (!p?.identifier) continue;
    let enabled = true;
    try {
      if (pm?.activeCharacter) enabled = pm.getPromptOrderEntry(pm.activeCharacter, p.identifier)?.enabled ?? false;
    } catch { /* ignore */ }
    if (!enabled) continue;
    prompts.push({
      identifier: p.identifier,
      name: p.name || p.identifier,
      content: substitute(String(p.content ?? '')),
      marker: !!p.marker,
      absolute: Number(p.injection_position) === 1,
      depth: Number(p.injection_depth ?? 4),
    });
  }
  return { prompts, overridden: Array.isArray(pm?.overriddenPrompts) ? pm.overriddenPrompts : [] };
}

function extensionPrompts(): ExtensionPromptInfo[] {
  const eps = ctx().extensionPrompts ?? {};
  return Object.entries(eps)
    .filter(([, v]: [string, Any]) => v && typeof v.value === 'string' && v.value.trim())
    .map(([key, v]: [string, Any]) => ({ key, value: substitute(v.value), inChat: Number(v.position) === 1, depth: Number(v.depth ?? 0) }));
}

function presetName(): string {
  try {
    return ctx().getPresetManager()?.getSelectedPresetName?.() ?? '';
  } catch {
    return '';
  }
}

// ------------------------------------------------------------- capture ---

function buildCapture(chatOut: Any[], structured: StructuredMessage[], wiRaw: Any[], gen: typeof lastGen): Capture {
  const c = ctx();
  const char = currentCharacter();
  const scopes = currentBookScopes();
  const chat: Any[] = c.chat ?? [];
  const wi = collectWI(wiRaw, scopes, chat);
  const { prompts, overridden } = presetPrompts();
  const chatMessages: ChatMessageInfo[] = chat
    .map((m: Any, index: number) => ({ index, isUser: !!m.is_user, name: String(m.name ?? ''), text: String(m.mes ?? ''), sys: !!m.is_system }))
    .filter((m) => !m.sys)
    .map(({ sys: _sys, ...m }) => m);

  const result = attribute({
    chat: chatOut,
    identifiers: structured.length ? alignIdentifiers(chatOut, structured) : null,
    presetPrompts: prompts,
    overridden,
    wiEntries: wi,
    extensionPrompts: extensionPrompts(),
    chatMessages,
    card: char ? { name: char.name, depthPrompt: substitute(char.data?.extensions?.depth_prompt?.prompt ?? '') } : null,
    persona: substitute(c.powerUserSettings?.persona_description ?? ''),
  });

  const type = gen.quiet ? 'quiet' : gen.type;
  const targetFloor = type === 'quiet' || type === 'impersonate'
    ? null
    : ['swipe', 'regenerate', 'continue'].includes(type) ? chat.length - 1 : chat.length;

  return {
    id: nextId++,
    time: new Date(),
    chatId: String(c.getCurrentChatId?.() ?? ''),
    genType: type,
    genTypeLabel: GEN_LABELS[type] ?? type,
    targetFloor,
    presetName: presetName(),
    cardName: char?.name ?? (c.groupId ? '群聊' : ''),
    result,
    wi,
    rawChat: chatOut.map((m: Any) => ({ role: String(m.role), content: contentToText(m.content) })),
  };
}

let previewing = false;
export const previewBusy = signal(false);

/**
 * Build the next prompt without sending it (ST's dry run, the same path its token counter uses).
 * Note: ST does not emit WORLD_INFO_ACTIVATED in dry runs, so lorebook text shows up as a block
 * without per-entry detail.
 */
export async function previewNextPrompt(): Promise<boolean> {
  if (previewBusy.value) return false;
  previewBusy.value = true;
  previewing = true;
  const before = captures.value[0]?.id;
  try {
    await ctx().generate('normal', {}, true);
    // Analysis is deferred with setTimeout; wait for it.
    await new Promise((r) => setTimeout(r, 50));
    return captures.value[0]?.id !== before;
  } catch (e) {
    console.error('[RedBird] preview failed', e);
    return false;
  } finally {
    previewing = false;
    previewBusy.value = false;
  }
}

export function installFlowCapture(): void {
  const c = ctx();
  const es = c.eventSource;
  const et = c.eventTypes;

  es.on(et.GENERATION_STARTED, (type: string, params: Any, dryRun: boolean) => {
    if (dryRun) return;
    lastGen = { type: type || 'normal', quiet: !!params?.quiet_prompt };
    pendingWI = [];
  });

  es.on(et.WORLD_INFO_ACTIVATED, (entries: Any[]) => {
    pendingWI = Array.isArray(entries) ? [...entries] : [];
  });

  const onPromptReady = (data: Any) => {
    if (!data || !Array.isArray(data.chat)) return;
    if (data.dryRun && !previewing) return;
    // Snapshot synchronously (later code may mutate), analyse after the request is on its way.
    const chatOut = data.chat.map((m: Any) => ({ role: m.role, content: m.content }));
    const structured = flattenCollection(loaded.openai?.promptManager?.messages);
    const wiRaw = pendingWI;
    const gen = data.dryRun ? { type: 'preview', quiet: false } : lastGen;
    pendingWI = [];
    setTimeout(() => {
      try {
        const cap = buildCapture(chatOut, structured, wiRaw, gen);
        captures.value = [cap, ...captures.value].slice(0, MAX_CAPTURES);
      } catch (e) {
        console.error('[RedBird] failed to analyse prompt', e);
      }
    }, 0);
  };

  // Run after every other listener (e.g. EJS templates) so we see the final text.
  if (typeof es.makeLast === 'function') es.makeLast(et.CHAT_COMPLETION_PROMPT_READY, onPromptReady);
  else es.on(et.CHAT_COMPLETION_PROMPT_READY, onPromptReady);
}
