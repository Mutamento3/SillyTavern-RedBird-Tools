/** 快速导入：从 JSON 的样子认出它是哪种酒馆文件（纯函数，可单测）。 */

export type ImportKind = 'preset' | 'world' | 'regex' | 'character' | 'unknown';

export function detectJson(j: unknown): ImportKind {
  if (!j || typeof j !== 'object') return 'unknown';
  const o = j as Record<string, unknown>;
  const first = Array.isArray(j) ? (j[0] as Record<string, unknown> | undefined) : undefined;
  if (first && typeof first === 'object' && 'findRegex' in first) return 'regex';
  if ('findRegex' in o) return 'regex';
  const data = o.data as Record<string, unknown> | undefined;
  if (String(o.spec ?? '').startsWith('chara_card') || 'first_mes' in o || (data && 'first_mes' in data)) return 'character';
  if ('entries' in o && typeof o.entries === 'object') return 'world';
  if ('prompts' in o || 'prompt_order' in o || 'chat_completion_source' in o || 'openai_max_tokens' in o) return 'preset';
  return 'unknown';
}
