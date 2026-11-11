/** 快速导入：从 JSON 的样子认出它是哪种酒馆文件（纯函数，可单测）。 */

export type ImportKind = 'preset' | 'world' | 'regex' | 'character' | 'theme' | 'script' | 'unknown';

/** 酒馆助手的一个脚本或一个脚本文件夹（新格式 type: script / folder；旧格式 name + content + buttons）。 */
export function isThScript(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.type === 'script' && typeof o.content === 'string') return true;
  if (o.type === 'folder' && Array.isArray(o.scripts)) return true;
  return typeof o.name === 'string' && typeof o.content === 'string' && Array.isArray(o.buttons);
}

export function detectJson(j: unknown): ImportKind {
  if (!j || typeof j !== 'object') return 'unknown';
  const o = j as Record<string, unknown>;
  const first = Array.isArray(j) ? (j[0] as Record<string, unknown> | undefined) : undefined;
  if (first && typeof first === 'object' && 'findRegex' in first) return 'regex';
  if ('findRegex' in o) return 'regex';
  if (isThScript(o) || (first && isThScript(first))) return 'script';
  const data = o.data as Record<string, unknown> | undefined;
  if (String(o.spec ?? '').startsWith('chara_card') || 'first_mes' in o || (data && 'first_mes' in data)) return 'character';
  if ('entries' in o && typeof o.entries === 'object') return 'world';
  // 美化（酒馆的界面主题）：有名字，再加上主题颜色或自定义 CSS
  if (typeof o.name === 'string' && ('main_text_color' in o || 'blur_tint_color' in o || 'custom_css' in o)) return 'theme';
  if ('prompts' in o || 'prompt_order' in o || 'chat_completion_source' in o || 'openai_max_tokens' in o) return 'preset';
  return 'unknown';
}

/**
 * 美化带的酒馆助手脚本，常见做法是：脚本一直开着，自己看界面上有没有某个 CSS 变量（比如 `--cld-ui:1`），
 * 只有美化写了这个变量才起作用。找出这种配对：脚本读的变量，美化的自定义 CSS 里定义了。
 * 酒馆自己的 --SmartTheme… 变量所有美化都有，不算。
 */
export function scriptWaitsForTheme(scriptCode: string, themeCss: string): boolean {
  const reads = new Set<string>();
  for (const m of scriptCode.matchAll(/getPropertyValue\(\s*['"`](--[\w-]+)['"`]\s*\)/g)) if (!m[1].startsWith('--SmartTheme')) reads.add(m[1]);
  if (!reads.size) return false;
  for (const m of themeCss.matchAll(/(--[\w-]+)\s*:/g)) if (reads.has(m[1])) return true;
  return false;
}
