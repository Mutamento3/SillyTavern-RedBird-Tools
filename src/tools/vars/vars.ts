/**
 * 变量：per-floor MVU stat_data snapshots, diffs against the previous floor, and a static
 * search for which lorebook entries / preset prompts read a variable.
 */
import { signal } from '@preact/signals';
import { diffVars, referenceTerms, type VarChange } from '../../core/vars';
import { ctx, type Any } from '../../st/st';
import { currentBookScopes } from '../flow/capture';

export interface FloorVars {
  index: number;
  name: string;
  isUser: boolean;
  /** Whole message-level variable object for the active swipe. */
  vars: Record<string, unknown>;
  statData: unknown;
  hasDelta: boolean;
}

export interface FloorDiff {
  floor: FloorVars;
  prev: FloorVars | null;
  changes: VarChange[];
}

/** Bumped whenever chat variables may have changed; views read it to re-render. */
export const varsTick = signal(0);

export function messageVars(m: Any): Record<string, unknown> | null {
  const v = m?.variables;
  if (Array.isArray(v)) {
    const sv = v[Number(m.swipe_id ?? 0)];
    return sv && typeof sv === 'object' ? sv : null;
  }
  return v && typeof v === 'object' ? v : null;
}

export function collectFloors(): FloorVars[] {
  const chat: Any[] = ctx().chat ?? [];
  const out: FloorVars[] = [];
  chat.forEach((m, index) => {
    const vars = messageVars(m);
    if (!vars || !Object.keys(vars).length) return;
    out.push({
      index,
      name: String(m.name ?? ''),
      isUser: !!m.is_user,
      vars,
      statData: vars.stat_data,
      hasDelta: vars.delta_data !== undefined && vars.delta_data !== null,
    });
  });
  return out;
}

export function floorDiffs(floors: FloorVars[]): FloorDiff[] {
  return floors.map((floor, i) => {
    const prev = i > 0 ? floors[i - 1] : null;
    const before = prev ? (prev.statData ?? prev.vars) : undefined;
    const after = floor.statData ?? floor.vars;
    return { floor, prev, changes: diffVars(before, after) };
  });
}

/** ST /setvar chat-local variables live in chat metadata. */
export function chatLocalVars(): Record<string, unknown> {
  return (ctx().chatMetadata?.variables ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------- references ---

export interface TextSource {
  kind: 'lorebook' | 'preset';
  label: string;
  content: string;
}

export interface Reference {
  source: TextSource;
  term: string;
}

let sourceCache: { chatId: string; sources: TextSource[] } | null = null;

export async function loadTextSources(force = false): Promise<TextSource[]> {
  const c = ctx();
  const chatId = String(c.getCurrentChatId?.() ?? '');
  if (!force && sourceCache?.chatId === chatId) return sourceCache.sources;
  const scopes = currentBookScopes();
  const books = new Set<string>([...scopes.character, ...scopes.chat, ...scopes.persona, ...scopes.global]);
  const sources: TextSource[] = [];
  for (const name of books) {
    try {
      const data = await c.loadWorldInfo(name);
      for (const e of Object.values<Any>(data?.entries ?? {})) {
        if (e.disable) continue;
        sources.push({ kind: 'lorebook', label: `${name} · ${e.comment || (e.key ?? []).join(',') || `#${e.uid}`}`, content: String(e.content ?? '') });
      }
    } catch (err) {
      console.warn('[RedBird] loadWorldInfo failed', name, err);
    }
  }
  for (const p of c.chatCompletionSettings?.prompts ?? []) {
    if (p?.content) sources.push({ kind: 'preset', label: `预设 · ${p.name || p.identifier}`, content: String(p.content) });
  }
  sourceCache = { chatId, sources };
  return sources;
}

export function findReferences(path: string, sources: TextSource[]): Reference[] {
  const terms = referenceTerms(path);
  const out: Reference[] = [];
  for (const s of sources) {
    const term = terms.find((t) => s.content.includes(t));
    if (term) out.push({ source: s, term });
  }
  return out;
}

/** Entries that read the whole stat_data tree (e.g. {{format_message_variable::stat_data}}). */
export function wholeTreeReaders(sources: TextSource[]): TextSource[] {
  return sources.filter((s) => /stat_data(?![.\w])|getvar\(\s*['"]stat_data['"]\s*\)/.test(s.content));
}

export function installVarsWatch(): void {
  const c = ctx();
  const es = c.eventSource;
  const et = c.eventTypes;
  const bump = () => { varsTick.value++; };
  for (const ev of [et.MESSAGE_RECEIVED, et.MESSAGE_UPDATED, et.MESSAGE_SWIPED, et.MESSAGE_DELETED, et.CHAT_CHANGED, et.MESSAGE_EDITED, et.GENERATION_ENDED]) {
    if (ev) es.on(ev, bump);
  }
  es.on(et.CHAT_CHANGED, () => { sourceCache = null; });
  // MVU emits its own events when it finishes updating variables.
  for (const ev of ['mag_variable_update_ended', 'mag_variable_updated']) es.on(ev, bump);
}
