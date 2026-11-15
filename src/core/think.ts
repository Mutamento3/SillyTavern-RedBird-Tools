/**
 * 回复开头的思考块：认出来、切开。只处理字符串，不碰酒馆（接线见 tools/thinkFold.ts）。
 */

/** 默认当作思考的标签名（不分大小写）。玩家可以在扩展设置里改。 */
export const DEFAULT_THINK_TAGS = ['thinking', 'think', 'thought', 'reasoning', 'cot', 'ecot', 'foundation'];

export interface ThinkSplit {
  /** 思考块前面的空白和 HTML 注释（原样留着） */
  lead: string;
  /** 思考块里面的文字 */
  think: string;
  /** 思考块后面的正文 */
  rest: string;
  /** 结束标签已经出现（生成中还没写到时是 false，这时 rest 为空） */
  closed: boolean;
}

/**
 * 回复最开头（跳过空白和 HTML 注释）是不是名单里的标签开头的一段。
 * 只认开头：正文中间的标签一律不管。
 */
export function splitThink(text: string, tags: readonly string[]): ThinkSplit | null {
  const lead = /^(?:\s|<!--[\s\S]*?-->)*/.exec(text)![0];
  const open = /^<([A-Za-z][\w-]*)(?:\s[^>]*)?>/.exec(text.slice(lead.length));
  if (!open || !tags.includes(open[1].toLowerCase())) return null;
  const start = lead.length + open[0].length;
  const close = new RegExp(`</${open[1]}\\s*>`, 'i').exec(text.slice(start));
  if (!close) return { lead, think: text.slice(start), rest: '', closed: false };
  return {
    lead,
    think: text.slice(start, start + close.index),
    rest: text.slice(start + close.index + close[0].length),
    closed: true,
  };
}

/**
 * 生成刚开始、开头标签还没写完（`<thin`）：这几个字母先别显示，免得闪一下。
 * 只在除了开头空白和注释以外只剩半个标签时成立，所以写完的消息不会被藏掉。
 */
export function partialThinkOpen(text: string, tags: readonly string[]): boolean {
  const rest = text.replace(/^(?:\s|<!--[\s\S]*?-->)*/, '').toLowerCase();
  return /^<[a-z][\w-]*$|^<$/.test(rest) && tags.some((t) => `<${t}`.startsWith(rest));
}

/** 设置里输入的标签：逗号、顿号、空格都能分开，尖括号和斜杠去掉，统一小写，去重。 */
export function parseThinkTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,，、;；\s]+/)) {
    const tag = raw.replace(/[<>/]/g, '').trim().toLowerCase();
    if (/^[a-z][\w-]*$/.test(tag) && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/** 酒馆「推理」里填的前缀最后一个标签名，比如 `<!-- x --> <think>` → think。没有就是 null。 */
export function prefixTag(prefix: string): string | null {
  const m = /<([A-Za-z][\w-]*)(?:\s[^>]*)?>\s*$/.exec(prefix ?? '');
  return m ? m[1].toLowerCase() : null;
}
